import { gmailToken, supabase } from "./supabase";
import { cardProgram, listRewardEmails, readFullText } from "./gmail";
import { type Item, WEAR } from "./items";
import { type OrderGroup, isArriving, isReturn } from "./orders";

export type Reward = { gmail_id: string; store: string; store_domain: string | null; kind: string; points: number | null; value: number | null; expires_on: string | null; sent_at: string };

const NOT_REWARD = /\b(card|visa|mastercard|amex|credit union|bank)\b|openai|anthropic|chatgpt/i;
const NOT_REWARD_DOMAIN = /(^|\.)(openai|anthropic|chase|citi|capitalone|americanexpress|discover|barclays|synchronybank|bankofamerica|wellsfargo)\.com$/i;

// Her current balance at each store: the newest email per store and kind, skipping anything expired or stale.
export async function loadRewards(): Promise<Reward[]> {
  const { data } = await supabase().from("rewards").select("gmail_id, store, store_domain, kind, points, value, expires_on, sent_at").not("kind", "is", null).order("sent_at", { ascending: false }).limit(1000);
  const today = new Date().toISOString().slice(0, 10);
  const stale = new Date(Date.now() - 365 * 86400000).toISOString();
  const seen = new Set<string>();
  return ((data ?? []) as Reward[]).filter(r => {
    const key = `${r.store}|${r.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    // Nothing to show: no money value and no points.
    if (!r.value && !r.points) return false;
    // Card points programs and points she typed in are kept. Other bank and app or AI credit aren't rewards.
    const kept = r.gmail_id.startsWith("manual:") || cardProgram(r.store_domain);
    if (!kept && (NOT_REWARD.test(r.store) || (r.store_domain && NOT_REWARD_DOMAIN.test(r.store_domain)))) return false;
    return (!r.expires_on || r.expires_on >= today) && r.sent_at > stale;
  }).sort((a, b) => (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999"));
}

// "Dunkin' Rewards" and "MileagePlus Partner" read better as the program's own name.
export const programName = (s: string) => s.replace(/\s+(rewards?|partners?|loyalty|perks|club|program)$/i, "").trim() || s;
// Plain list: "A, B and C".
export const listNames = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

export const daysUntil = (d: string) => Math.ceil((Date.parse(`${d}T23:59:59`) - Date.now()) / 86400000);
export const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const KIND: Record<string, string> = { points: "Points", credit: "Store credit", gift_card: "Gift card", reward: "Reward" };

// Points she types in herself, for programs whose emails we don't read.
export async function addPoints(name: string, points: number | null, value: number | null, expires: string | null) {
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return false;
  const { error } = await sb.from("rewards").insert({
    user_id: data.user.id, gmail_id: `manual:${crypto.randomUUID()}`, store: name.trim().slice(0, 80), store_domain: null,
    kind: points != null ? "points" : "reward", points, value, expires_on: expires || null, sent_at: new Date().toISOString(),
  });
  return !error;
}

export async function removeReward(gmail_id: string) {
  await supabase().from("rewards").delete().eq("gmail_id", gmail_id);
}

type Progress = (done: number, total: number, found: number) => void;
type Outcome = "done" | "expired" | "not-ready";

// Finds rewards emails in Gmail and has the AI read each new one.
export async function scanRewards(onProgress: Progress): Promise<Outcome> {
  const sb = supabase();
  const token = await gmailToken();
  if (!token) return "expired";
  const { data: done } = await sb.from("rewards").select("gmail_id").limit(5000);
  let emails;
  try { emails = await listRewardEmails(token, new Set(((done ?? []) as { gmail_id: string }[]).map(r => r.gmail_id))); } catch { return "expired"; }

  let next = 0, n = 0, found = 0, state: Outcome = "done";
  onProgress(0, emails.length, 0);
  const worker = async () => {
    while (next < emails.length && state === "done") {
      const e = emails[next++];
      try {
        const text = await readFullText(e.gmail_id, token);
        const { data, error } = await sb.functions.invoke("read-reward", { body: { ...e, text } });
        if (error && (error as { context?: Response }).context?.status === 503) state = "not-ready";
        if (data?.found) found++;
      } catch (err) {
        if ((err as Error).message === "expired") state = "expired";
      }
      onProgress(++n, emails.length, found);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return state;
}

// Asks the AI to price every item that has no estimate yet, 40 at a time.
export async function valueItems(onProgress: Progress): Promise<Outcome> {
  const sb = supabase();
  const { count } = await sb.from("items").select("id", { count: "exact", head: true }).is("resale_at", null).in("category", WEAR);
  const total = count ?? 0;
  let done = 0;
  onProgress(0, total, 0);
  for (let round = 0; round < 60 && done < total; round++) {
    const { data, error } = await sb.functions.invoke("value-items", { body: {} });
    if (error) return (error as { context?: Response }).context?.status === 503 ? "not-ready" : "done";
    done += data?.valued ?? 0;
    onProgress(Math.min(done, total), total, done);
    if (!data?.remaining) break;
  }
  return "done";
}

// Which of her pieces count toward what the closet is worth, and why the others don't.
export type Skip = { item: Item; why: string };
export function closetWorth(mine: Item[], groups: OrderGroup[] | null) {
  const byEmail = new Map<string, OrderGroup>();
  for (const g of groups ?? []) for (const e of g.events) byEmail.set(e.gmail_id, g);
  const counted: Item[] = [], skipped: Skip[] = [];
  // The same product in another color sells for about the same.
  const priced = new Map<string, Item>();
  for (const i of mine) if (i.resale_high != null) priced.set(`${i.store}|${i.name}`.toLowerCase(), i);
  for (const raw of mine) {
    const twin = raw.resale_high == null ? priced.get(`${raw.store}|${raw.name}`.toLowerCase()) : undefined;
    const i = twin ? { ...raw, resale_low: twin.resale_low, resale_high: twin.resale_high } : raw;
    const g = byEmail.get(i.gmail_id ?? "");
    if (g && isArriving(g) && i.resale_high != null && i.resale_high >= 10) counted.push(i);
    else if (g && isReturn(g) && !i.kept) skipped.push({ item: i, why: "Sent back" });
    else if (i.resale_high == null) skipped.push({ item: i, why: "Not priced yet" });
    else if (i.resale_high < 10) skipped.push({ item: i, why: "Sells for under $10" });
    else counted.push(i);
  }
  return { counted, skipped, unpriced: skipped.filter(s => s.why === "Not priced yet").length };
}

export const worth = (items: Item[]) => items.reduce((s, i) => [s[0] + (i.resale_low ?? 0), s[1] + (i.resale_high ?? 0)], [0, 0]);
export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// Ready-to-paste listing for resale sites, built from the order details.
export function listingText(i: Item) {
  const brand = i.brand || i.store;
  const title = [brand, i.name, i.color, i.size && `Size ${i.size}`].filter(Boolean).join(" ");
  const bought = new Date(i.ordered_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const body = [
    `${brand} ${i.name}${i.color ? ` in ${i.color}` : ""}.`,
    i.size ? `Size: ${i.size}.` : null,
    `Bought new from ${i.store} in ${bought}${i.price != null ? ` for $${i.price.toFixed(0)}` : ""}.`,
    "Good used condition. Smoke-free home.",
  ].filter(Boolean).join("\n");
  return `${title}\n\n${body}`;
}

export type Site = { name: string; url: string; note: string; titleMax: number; at: "high" | "mid"; tags?: boolean; bag?: boolean };
export const SITES: Site[] = [
  { name: "Poshmark", url: "https://poshmark.com/create-listing", note: "Best for mall and designer brands. Buyers make offers, so list a little high.", titleMax: 80, at: "high" },
  { name: "Depop", url: "https://www.depop.com/products/create/", note: "Best for trendy and vintage pieces.", titleMax: 0, at: "mid", tags: true },
  { name: "eBay", url: "https://www.ebay.com/sl/sell", note: "Best for sneakers and rare finds.", titleMax: 80, at: "mid" },
  { name: "Mercari", url: "https://www.mercari.com/sell/", note: "Quick sales on everyday brands.", titleMax: 80, at: "high" },
  { name: "ThredUp", url: "https://www.thredup.com/cleanout", note: "Send a free bag and they sell it for you. Easiest, but you get less.", titleMax: 0, at: "mid", bag: true },
];
export const CONDITIONS = ["New with tags", "Like new", "Good", "Fair"] as const;
export type Condition = typeof CONDITIONS[number];
const COND_LINE: Record<Condition, string> = {
  "New with tags": "New with tags, never worn.",
  "Like new": "Like new, worn once or twice. No flaws.",
  "Good": "Good used condition. Light wear, no holes or stains.",
  "Fair": "Worn, with some signs of wear (see photos).",
};
// A suggested asking price for one site, rounded to a friendly number.
export function askPrice(i: Item, site: Site) {
  if (i.resale_high == null) return null;
  const lo = i.resale_low ?? i.resale_high;
  const raw = site.at === "high" ? i.resale_high : (lo + i.resale_high) / 2;
  return Math.max(5, Math.round(raw / 5) * 5);
}
// The post for one site: a title that fits, a description, and hashtags where the site uses them.
export function buildListing(i: Item, site: Site, cond: Condition) {
  const brand = i.brand || i.store;
  const full = [brand, i.name, i.color, i.size && `Size ${i.size}`].filter(Boolean).join(" ");
  const title = site.titleMax && full.length > site.titleMax ? full.slice(0, site.titleMax - 1).replace(/\s+\S*$/, "") : full;
  const tag = (x: string) => `#${x.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const body = [
    `${brand} ${i.name}${i.color ? ` in ${i.color}` : ""}.`,
    i.size ? `Size ${i.size}.` : null,
    COND_LINE[cond],
    i.price != null ? `Retail $${Math.round(i.price)}.` : null,
    "Smoke-free home. Ships fast.",
    site.tags ? [brand, i.category, i.color].filter(Boolean).map(x => tag(x!)).join(" ") : null,
  ].filter(Boolean).join("\n");
  return { title: site.titleMax ? title : "", body };
}
