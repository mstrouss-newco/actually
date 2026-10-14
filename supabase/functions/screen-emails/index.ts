// Decides which emails are real shopping orders. Sensitive ones (health, pharmacy and
// similar) and non-orders (software bills, school notes) are never kept.
// Two modes: screen a batch before saving, or clean up what she already saved.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

// Known health, pharmacy, telehealth, testing and adult senders. Blocked without asking the AI.
const SENSITIVE = /(^|\.)(ro\.co|getroman\.com|hims\.com|forhers\.com|hers\.com|nurx\.com|keeps\.com|thirtymadison\.com|cove\.com|picnicallergy\.com|curology\.com|apostrophe\.com|musely\.com|agencyskincare\.com|cerebral\.com|donefirst\.com|done\.com|betterhelp\.com|talkspace\.com|brightline\.com|lemonaidhealth\.com|plushcare\.com|teladoc\.com|mdlive\.com|amwell\.com|onemedical\.com|zocdoc\.com|goodrx\.com|cvs\.com|caremark\.com|walgreens\.com|riteaid\.com|capsule\.com|alto\.com|altopharmacy\.com|pillpack\.com|truepill\.com|expressscripts\.com|express-scripts\.com|optumrx\.com|optum\.com|honeybeehealth\.com|costplusdrugs\.com|blinkhealth\.com|everlywell\.com|letsgetchecked\.com|myLAB(box)?\.com|mylabbox\.com|labcorp\.com|questdiagnostics\.com|23andme\.com|natalist\.com|modernfertility\.com|proovtest\.com|kindbody\.com|plannedparenthood\.org|pandiahealth\.com|thepill\.com|wisp\.com|hellowisp\.com|lovehoney\.com|adameve\.com|dameproducts\.com|lelo\.com|babeland\.com|hims-hers\.com|weightwatchers\.com|noom\.com|found\.com|joinfound\.com|calibrate\.com|henrymeds\.com|ivim\.com|sesamecare\.com|1800contacts\.com|kaiserpermanente\.org|mychart\.com|pharmacy\.amazon\.com|healthequity\.com|hsastore\.com|fsastore\.com)$/i;

const Verdicts = z.object({
  emails: z.array(z.object({
    n: z.number().int().describe("The email number from the list."),
    verdict: z.enum(["shopping", "sensitive", "other"]),
  })),
});

const SYSTEM = `You sort emails for a personal shopping app. For each email, answer with one verdict:
- "shopping": an order, shipping, delivery, return, refund or receipt for physical goods bought from a store. Clothing, shoes, bags, accessories, jewelry, beauty and cosmetics, home goods, furniture, electronics, toys, gifts, sports gear, books.
- "sensitive": anything about health or privacy, even if it is an order. Pharmacy, prescriptions, medicine, vitamins sold for a condition, telehealth, doctors, labs and tests, mental health, fertility, pregnancy, birth control, sexual health or adult products, weight-loss programs, hair-loss treatment, medical devices, insurance, legal, debt or banking.
- "other": everything else. Software and online services, app and cloud bills, subscriptions, utilities, phone bills, school or kids' activity notices, events and tickets, travel, rides, food delivery and restaurants, groceries, donations, newsletters, marketing and promotions without a purchase.
If unsure between shopping and sensitive, choose sensitive. If unsure whether it is a purchase at all, choose other.`;

type Email = { id: string; from: string; subject: string; snippet?: string };

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const domainOf = (from: string) => ((from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase().split("@")[1]) ?? from.toLowerCase();

// Blocklist first, then the AI, 50 at a time. "unsure" holds emails the AI gave no answer for.
async function screen(emails: Email[], blocked: Set<string>) {
  const keep = new Set<string>(), unsure = new Set<string>();
  const ask = emails.filter(e => {
    const d = domainOf(e.from);
    return !SENSITIVE.test(d) && ![...blocked].some(b => d === b || d.endsWith(`.${b}`));
  });
  for (let i = 0; i < ask.length; i += 50) {
    const batch = ask.slice(i, i + 50);
    const list = batch.map((e, n) => `${n + 1}. From: ${e.from.slice(0, 120)} | Subject: ${e.subject.slice(0, 200)}${e.snippet ? ` | Preview: ${e.snippet.slice(0, 160)}` : ""}`).join("\n");
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 3000,
      output_config: { effort: "low", format: zodOutputFormat(Verdicts) },
      system: SYSTEM,
      messages: [{ role: "user", content: list }],
    });
    const verdicts = new Map((res.stop_reason === "refusal" ? [] : res.parsed_output?.emails ?? []).map(v => [v.n, v.verdict]));
    batch.forEach((e, n) => {
      const v = verdicts.get(n + 1);
      if (v === "shopping") keep.add(e.id);
      else if (!v) unsure.add(e.id);
    });
  }
  return { keep, unsure };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);
  const uid = auth.user.id;

  const { data: blocks } = await admin.from("blocked_stores").select("store_domain").eq("user_id", uid);
  const blocked = new Set((blocks ?? []).map(b => b.store_domain as string));
  const body = await req.json().catch(() => ({}));

  try {
    // Mode 1: screen a batch of emails before the browser saves them.
    if (Array.isArray(body.emails)) {
      const emails = (body.emails as Email[]).slice(0, 200).filter(e => typeof e?.id === "string" && typeof e?.from === "string" && typeof e?.subject === "string");
      return json({ keep: [...(await screen(emails, blocked)).keep] });
    }

    // Mode 2: clean up what she already saved. Removes non-orders and sensitive ones, with their items.
    if (body.clean) {
      const { data: rows } = await admin.from("orders").select("gmail_id, store, store_domain, subject").eq("user_id", uid).limit(5000);
      const emails = (rows ?? []).map(r => ({ id: r.gmail_id, from: `${r.store} <orders@${r.store_domain ?? "unknown"}>`, subject: r.subject ?? "" }));
      const { keep, unsure } = await screen(emails, blocked);
      const drop = emails.map(e => e.id).filter(id => !keep.has(id) && !unsure.has(id));
      for (let i = 0; i < drop.length; i += 200) {
        const ids = drop.slice(i, i + 200);
        await admin.from("items").delete().eq("user_id", uid).in("gmail_id", ids);
        await admin.from("orders").delete().eq("user_id", uid).in("gmail_id", ids);
      }
      // Rewards from sensitive or blocked stores go too.
      const { data: rewards } = await admin.from("rewards").select("id, store_domain").eq("user_id", uid);
      const badRewards = (rewards ?? []).filter(r => r.store_domain && (SENSITIVE.test(r.store_domain) || blocked.has(r.store_domain))).map(r => r.id);
      if (badRewards.length) await admin.from("rewards").delete().in("id", badRewards);
      await admin.from("profiles").update({ screened_at: new Date().toISOString() }).eq("id", uid);
      return json({ kept: keep.size, removed: drop.length });
    }
  } catch (e) {
    return json({ error: "ai failed" }, e instanceof Anthropic.RateLimitError ? 429 : 502);
  }
  return json({ error: "bad request" }, 400);
});
