// Reads one order email with Claude and saves the items in it.
// The browser fetches the email from Gmail and sends its text here.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const CATEGORIES = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "beauty", "home", "other"] as const;

const Result = z.object({
  is_order: z.boolean().describe("True only if this email confirms a purchase and lists what was bought."),
  items: z.array(z.object({
    name: z.string().describe("Short product name as a shopper would say it, without size or color. Example: 'Pegasus 41 running shoe'."),
    brand: z.string().nullable().describe("Brand of the product. Often the store itself."),
    size: z.string().nullable().describe("Size exactly as written, e.g. 'M', '10', '28x30', 'One size'."),
    color: z.string().nullable(),
    price: z.number().nullable().describe("Price paid for one unit, in dollars."),
    quantity: z.number().int(),
    image_url: z.string().nullable().describe("The product photo URL from the email, if one clearly belongs to this item. Never a logo, banner or tracking pixel."),
    category: z.enum(CATEGORIES),
  })),
});

const SYSTEM = `You read online shopping emails and list the products that were bought.
Rules:
- Only list items that were actually purchased in this order. Ignore ads, recommendations, "you may also like" and loyalty offers.
- If the email is a shipping or receipt update that repeats the items, list them anyway.
- If no specific products are listed, return is_order false and no items.
- Use null when a detail is not in the email. Never guess sizes or prices.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = await admin.auth.getUser(jwt);
  if (!auth.user) return json({ error: "signed out" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ai not set up" }, 503);

  const { gmail_id, text } = await req.json().catch(() => ({}));
  if (typeof gmail_id !== "string" || typeof text !== "string") return json({ error: "bad request" }, 400);

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
  if (items.length) await admin.from("items").upsert(items, { onConflict: "user_id,gmail_id,name,size", ignoreDuplicates: true });
  await admin.from("orders").update({ items_read: true }).eq("user_id", auth.user.id).eq("gmail_id", gmail_id);
  return json({ items: items.length });
});
