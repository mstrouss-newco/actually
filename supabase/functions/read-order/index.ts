// Reads one order email with Claude and saves the items in it.
// The browser fetches the email from Gmail and sends its text here.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const CATEGORIES = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "beauty", "home", "other"] as const;

const Result = z.object({
  is_order: z.boolean().describe("True only if this email is about a purchase (order, receipt or shipment) and lists what was bought."),
  items: z.array(z.object({
    name: z.string().describe("Short product name as a shopper would say it, without size or color. Example: 'Pegasus 41 running shoe'."),
    brand: z.string().nullable().describe("Brand of the product. Often the store itself."),
    size: z.string().nullable().describe("Size exactly as written, e.g. 'M', '10', '28x30', 'One size'."),
    color: z.string().nullable(),
    price: z.number().nullable().describe("Price paid for one unit, in dollars."),
    quantity: z.number().int(),
    image_url: z.string().nullable().describe("The product photo URL from the email that sits with this item. Each color usually has its own photo next to it; use that one. Never a logo, banner, tracking pixel or another item's photo."),
    category: z.enum(CATEGORIES),
  })),
  return_days: z.number().int().nullable().describe("How many days the shopper has to return items, exactly as this email states. Null if it doesn't say."),
  return_note: z.string().nullable().describe("The return policy in 6 words or fewer, from this email only, e.g. 'Free and easy returns', 'Store credit only'. Not instructions on how to start a return. Null if no policy is stated."),
  final_sale: z.boolean().describe("True only if the email says the items are final sale or can't be returned."),
  arrive_from: z.string().nullable().describe("Earliest expected delivery date the email states, as YYYY-MM-DD. Null if none."),
  arrive_to: z.string().nullable().describe("Latest expected delivery date the email states, as YYYY-MM-DD (same as arrive_from for a single day). Null if none."),
});

// Each store's return rules, as the email states them.
const Rules = z.object({
  return_days: z.number().int().nullable().describe("How many days the shopper has to return items, exactly as this email states. Null if the email does not say."),
  note: z.string().nullable().describe("The return policy in 6 words or fewer, from this email only, e.g. 'Free returns', 'Free and easy returns', 'Store credit only'. Not instructions on how to start a return. Null if the email states no policy."),
  final_sale: z.boolean().describe("True only if the email says these items are final sale or can't be returned."),
  arrive_from: z.string().nullable().describe("Earliest expected delivery date the email states, as YYYY-MM-DD. Null if none."),
  arrive_to: z.string().nullable().describe("Latest expected delivery date the email states, as YYYY-MM-DD (same as arrive_from for a single day). Null if none."),
});
const RULES_SYSTEM = `You read one online shopping email and report the store's return rules as written in it.
Only use what the email says. Never use what you know about the store. The shopper is in the US: ignore rules that only apply to other countries (for example "EU customers only"). If returns aren't mentioned, return nulls and final_sale false. Also report the expected delivery dates if the email states them (e.g. "Est. Delivery Oct 15 - Oct 18"); use the email's year.`;

// Matches product photos to pieces that came in without one.
const Photos = z.object({
  photos: z.array(z.object({
    n: z.number().int().describe("The number of the piece in the list."),
    image_url: z.string().nullable().describe("The product photo URL from the email that shows this exact piece in this color. Null if none clearly does. Never a logo, banner or another color's photo."),
  })),
});

const SYSTEM = `You read online shopping emails and list the products that were bought.
Rules:
- Only list items that were actually purchased in this order. Ignore ads, recommendations, "you may also like" and loyalty offers.
- If the email is a shipping or receipt update that repeats the items, list them anyway.
- If no specific products are listed, return is_order false and no items.
- Use null when a detail is not in the email. Never guess sizes or prices.
- Also report the return rules only if this email states them (days to return, free returns, final sale) for a US shopper. Ignore rules for other countries. Never use outside knowledge.
- Report expected delivery dates only if the email states them, as YYYY-MM-DD.
- The same product in two colors is two items. List each color separately with its own photo.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const iso = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
const eta = (r: { arrive_from?: string | null; arrive_to?: string | null } | null) => {
  const from = iso(r?.arrive_from), to = iso(r?.arrive_to) ?? from;
  return to ? { arrive_from: from ?? to, arrive_to: to } : {};
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = await admin.auth.getUser(jwt);
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);

  const { gmail_id, text, mode, item_ids } = await req.json().catch(() => ({}));
  if (typeof gmail_id !== "string" || typeof text !== "string") return json({ error: "bad request" }, 400);
  const ask = async <T extends z.ZodType>(schema: T, system: string, content: string): Promise<z.infer<T> | null> => {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5", max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system, messages: [{ role: "user", content }],
    });
    return res.stop_reason === "refusal" ? null : res.parsed_output as z.infer<T>;
  };

  // Return rules for one saved email.
  if (mode === "rules") {
    const { data: row } = await admin.from("orders").select("store").eq("user_id", auth.user.id).eq("gmail_id", gmail_id).maybeSingle();
    if (!row) return json({ error: "unknown email" }, 404);
    let r: z.infer<typeof Rules> | null = null;
    try { r = await ask(Rules, RULES_SYSTEM, `Store: ${row.store}\n\n${text.slice(0, 40000)}`); } catch { return json({ error: "ai failed" }, 502); }
    const days = r?.final_sale ? 0 : r?.return_days != null && r.return_days > 0 && r.return_days <= 400 ? r.return_days : null;
    const note = r?.final_sale ? "Final sale" : r?.note?.trim().slice(0, 60) || null;
    await admin.from("orders").update({ rules_read: true, return_days: days, return_note: note, ...eta(r) }).eq("user_id", auth.user.id).eq("gmail_id", gmail_id);
    return json({ return_days: days, note, ...eta(r) });
  }

  // Photos for her pieces that have none. The email must be one of hers.
  if (mode === "photos") {
    if (!Array.isArray(item_ids) || !item_ids.length) return json({ error: "bad request" }, 400);
    const { data: row } = await admin.from("orders").select("store").eq("user_id", auth.user.id).eq("gmail_id", gmail_id).maybeSingle();
    if (!row) return json({ error: "unknown email" }, 404);
    const { data: need } = await admin.from("items").select("id, name, brand, color, size").eq("user_id", auth.user.id)
      .in("id", item_ids.slice(0, 40).map(String)).or("image_url.is.null,image_url.eq.");
    if (!need?.length) return json({ filled: 0 });
    const list = need.map((i, n) => `${n + 1}. ${i.brand ?? ""} ${i.name}${i.color ? `, color ${i.color}` : ""}${i.size ? `, size ${i.size}` : ""}`).join("\n");
    let r: z.infer<typeof Photos> | null = null;
    try { r = await ask(Photos, "You match product photos in a shopping email to the pieces listed. Photos appear as [image: alt | url]. Only pick a photo that clearly sits with that exact piece and color.", `Pieces:\n${list}\n\nEmail:\n${text.slice(0, 40000)}`); } catch { return json({ error: "ai failed" }, 502); }
    let filled = 0;
    const used = new Set<string>();
    for (const p of r?.photos ?? []) {
      const it = need[p.n - 1];
      const url = p.image_url?.trim() ?? "";
      if (!it || !url.startsWith("https://") || used.has(url) || !text.includes(url)) continue;
      used.add(url);
      await admin.from("items").update({ image_url: url.slice(0, 1000) }).eq("id", it.id).eq("user_id", auth.user.id);
      filled++;
    }
    return json({ filled });
  }

  // Only read emails we already saved for her, and only once.
  const { data: order } = await admin.from("orders").select("store, sent_at, items_read")
    .eq("user_id", auth.user.id).eq("gmail_id", gmail_id).maybeSingle();
  if (!order) return json({ error: "unknown email" }, 404);
  if (order.items_read) return json({ items: [], skipped: true });

  let parsed: z.infer<typeof Result> | null = null;
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Store: ${order.store}\n\n${text.slice(0, 40000)}` }],
    });
    if (res.stop_reason === "refusal") return json({ items: [] });
    parsed = res.parsed_output;
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    return json({ error: "ai failed" }, status);
  }

  const items = (parsed?.is_order ? parsed.items : []).slice(0, 40).map(i => ({
    user_id: auth.user!.id, gmail_id, store: order.store, ordered_at: order.sent_at,
    name: i.name.slice(0, 200), brand: i.brand?.slice(0, 100) ?? null, size: i.size?.slice(0, 40) ?? null,
    color: i.color?.slice(0, 60) ?? null, price: i.price, quantity: Math.max(1, i.quantity || 1),
    image_url: i.image_url?.startsWith("https://") ? i.image_url.slice(0, 1000) : null, category: i.category,
  }));
  if (items.length) await admin.from("items").upsert(items, { onConflict: "user_id,gmail_id,name,size,color", ignoreDuplicates: true });
  const days = parsed?.final_sale ? 0 : parsed?.return_days != null && parsed.return_days > 0 && parsed.return_days <= 400 ? parsed.return_days : null;
  const note = parsed?.final_sale ? "Final sale" : parsed?.return_note?.trim().slice(0, 60) || null;
  await admin.from("orders").update({ items_read: true, rules_read: true, return_days: days, return_note: note, ...eta(parsed) }).eq("user_id", auth.user.id).eq("gmail_id", gmail_id);
  return json({ items: items.length });
});
