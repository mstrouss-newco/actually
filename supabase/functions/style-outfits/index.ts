// Puts together outfits from her own closet: 3 looks for an occasion, or 3 ways to wear one piece.
// The AI sees only each piece's type, brand, name and color. Never her emails, sizes or prices.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const Result = z.object({
  looks: z.array(z.object({
    name: z.string().describe("A short, warm name for the look, 1 to 3 words, like 'Easy Saturday'."),
    why: z.string().describe("One short plain sentence on why it works, naming 2 or 3 of the pieces. No prices or sizes."),
    pieces: z.array(z.number().int()).describe("The numbers of the pieces in the look, from the list."),
  })),
});

const WEAR = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];
const SYSTEM = `You are a friendly personal stylist. Build complete, wearable outfits only from the numbered pieces in her closet.
Each look: 3 to 6 pieces. Either a dress, or a top with bottoms. Add shoes when she has them, and a layer, bag or accessory when it helps.
Never two pieces of the same type except accessories. Colors and styles should go together and suit the occasion.
Make the 3 looks clearly different from each other. Use only numbers from the list.`;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);

  // Up to 40 styling runs a day per person, so one person can't use up the shared AI budget.
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await admin.from("ai_runs").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("kind", "style").gte("created_at", since);
  if ((count ?? 0) >= 40) return json({ error: "limit" }, 429);

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 160) : [];
  const occasion = typeof body.occasion === "string" ? body.occasion.slice(0, 30) : "";
  const anchor = typeof body.anchor === "string" ? body.anchor : null;
  const avoid: string[] = Array.isArray(body.avoid) ? body.avoid.filter((x: unknown) => typeof x === "string").slice(0, 12).map((s: string) => s.slice(0, 40)) : [];
  if (!ids.length) return json({ looks: [] });

  // Only her own pieces, and only things you wear.
  const { data: items } = await admin.from("items").select("id, brand, store, name, color, category")
    .eq("user_id", auth.user.id).in("id", ids).in("category", WEAR);
  if (!items?.length) return json({ looks: [] });
  const list = items.map((i, n) => `${n + 1}. ${i.category}: ${i.brand || i.store} ${i.name}${i.color ? `, ${i.color}` : ""}`).join("\n");
  const a = anchor ? items.findIndex(i => i.id === anchor) : -1;

  const ask = [
    a >= 0 ? `Make 3 different outfits that each include piece ${a + 1}.` : `Make 3 outfits for: ${occasion || "an easy everyday day"}.`,
    avoid.length ? `She has already seen looks called: ${avoid.join(", ")}. Make new ones.` : "",
    "", "Her closet:", list,
  ].join("\n");

  await admin.from("ai_runs").insert({ user_id: auth.user.id, kind: "style" });
  let out: z.infer<typeof Result> | null = null;
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: ask }],
    });
    if (res.stop_reason !== "refusal") out = res.parsed_output;
  } catch (e) {
    return json({ error: "ai failed" }, e instanceof Anthropic.RateLimitError ? 429 : 502);
  }

  const looks = (out?.looks ?? []).map(l => {
    const seen = new Set<string>();
    const picked = l.pieces.map(n => items[n - 1]).filter(i => i && !seen.has(i.id) && seen.add(i.id));
    if (a >= 0 && !seen.has(items[a].id)) picked.unshift(items[a]);
    return { name: l.name.slice(0, 40), why: l.why.slice(0, 160), ids: picked.slice(0, 6).map(i => i.id) };
  }).filter(l => l.ids.length >= 2).slice(0, 3);
  return json({ looks });
});
