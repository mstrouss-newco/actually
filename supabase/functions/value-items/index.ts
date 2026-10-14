// Estimates what her items would sell for secondhand, 40 at a time.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const Result = z.object({
  estimates: z.array(z.object({
    n: z.number().int().describe("The item number from the list."),
    low: z.number().describe("Low end of a typical secondhand sale price in dollars, in good used condition."),
    high: z.number().describe("High end of a typical secondhand sale price in dollars."),
    note: z.string().describe("One short plain sentence on why, e.g. 'Classic style that holds value well.'"),
  })),
});

// Only things you wear are priced. Same list as WEAR in app/src/lib/items.ts.
const WEAR = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];

const SYSTEM = `You estimate what clothing, shoes and accessories sell for on resale sites like Poshmark, eBay, Depop and ThredUp.
Assume good used condition. Consider brand demand, how old the purchase is and the original price.
Beauty products, underwear and opened consumables usually have no resale value: give 0 to 0.
Give honest, conservative ranges. One estimate per item, using its number.`;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);

  const { data: items } = await admin.from("items").select("id, store, brand, name, size, color, price, category, ordered_at")
    .eq("user_id", auth.user.id).is("resale_at", null).in("category", WEAR).limit(40);
  if (!items?.length) return json({ valued: 0, remaining: 0 });

  const list = items.map((i, n) =>
    `${n + 1}. ${i.brand || i.store} ${i.name}${i.color ? `, ${i.color}` : ""}${i.size ? `, size ${i.size}` : ""} (${i.category}). Paid ${i.price != null ? `$${i.price}` : "unknown"}, bought ${String(i.ordered_at).slice(0, 7)}.`).join("\n");

  let out: z.infer<typeof Result> | null = null;
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 6000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${list}` }],
    });
    if (res.stop_reason !== "refusal") out = res.parsed_output;
  } catch (e) {
    return json({ error: "ai failed" }, e instanceof Anthropic.RateLimitError ? 429 : 502);
  }

  const now = new Date().toISOString();
  const byN = new Map((out?.estimates ?? []).map(e => [e.n, e]));
  await Promise.all(items.map((i, n) => {
    const e = byN.get(n + 1);
    const low = e ? Math.max(0, Math.round(Math.min(e.low, e.high))) : null;
    const high = e ? Math.max(0, Math.round(Math.max(e.low, e.high))) : null;
    return admin.from("items").update({ resale_low: low, resale_high: high, resale_note: e?.note.slice(0, 200) ?? null, resale_at: now }).eq("id", i.id);
  }));

  const { count } = await admin.from("items").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).is("resale_at", null).in("category", WEAR);
  return json({ valued: items.length, remaining: count ?? 0 });
});
