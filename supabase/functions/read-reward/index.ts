// Reads one rewards email (points, store credit, gift card) with Claude and saves the balance.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const Result = z.object({
  has_balance: z.boolean().describe("True only if the email states a specific balance the shopper owns right now."),
  kind: z.enum(["points", "credit", "gift_card", "reward"]).nullable().describe("points = loyalty points; credit = store credit or refund to store credit; gift_card = gift card balance; reward = a dollar reward or certificate."),
  points: z.number().int().nullable().describe("Number of points, if stated."),
  value: z.number().nullable().describe("Dollar value of the balance, if stated or clearly convertible (e.g. '$10 reward')."),
  expires_on: z.string().nullable().describe("Expiry date as YYYY-MM-DD, only if the email states one."),
});

const SYSTEM = `You read emails from stores about loyalty points, rewards, store credit and gift cards.
Report the shopper's current balance only if the email states it. Generic promotions ("earn double points this weekend") have no balance.
Use null for anything the email does not say. Never guess values or dates.`;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);

  const b = await req.json().catch(() => ({}));
  if (![b.gmail_id, b.store, b.sent_at, b.text].every(v => typeof v === "string")) return json({ error: "bad request" }, 400);

  const { data: seen } = await admin.from("rewards").select("id").eq("user_id", auth.user.id).eq("gmail_id", b.gmail_id).maybeSingle();
  if (seen) return json({ skipped: true });

  let r: z.infer<typeof Result> | null = null;
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 1000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Store: ${b.store}\nSent: ${b.sent_at.slice(0, 10)}\nSubject: ${b.subject ?? ""}\n\n${b.text.slice(0, 20000)}` }],
    });
    if (res.stop_reason !== "refusal") r = res.parsed_output;
  } catch (e) {
    return json({ error: "ai failed" }, e instanceof Anthropic.RateLimitError ? 429 : 502);
  }

  const ok = r?.has_balance && r.kind && (r.points != null || r.value != null);
  const expires = r?.expires_on && /^\d{4}-\d{2}-\d{2}$/.test(r.expires_on) ? r.expires_on : null;
  await admin.from("rewards").insert({
    user_id: auth.user.id, gmail_id: b.gmail_id, store: b.store.slice(0, 80), store_domain: typeof b.store_domain === "string" ? b.store_domain.slice(0, 100) : null,
    sent_at: b.sent_at, kind: ok ? r!.kind : null, points: ok ? r!.points : null, value: ok ? r!.value : null, expires_on: ok ? expires : null,
  });
  return json({ found: !!ok });
});
