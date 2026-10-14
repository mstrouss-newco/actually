import { gmailToken, supabase } from "./supabase";
import { listRewardEmails, readFullText } from "./gmail";
import { type Item, WEAR } from "./items";

export type Reward = { store: string; store_domain: string | null; kind: string; points: number | null; value: number | null; expires_on: string | null; sent_at: string };

const NOT_REWARD = /\b(card|visa|mastercard|amex|credit union|bank)\b|openai|anthropic|chatgpt/i;
const NOT_REWARD_DOMAIN = /(^|\.)(openai|anthropic|chase|citi|capitalone|americanexpress|discover|barclays|synchronybank|bankofamerica|wellsfargo)\.com$/i;

// Her current balance at each store: the newest email per store and kind, skipping anything expired or stale.
export async function loadRewards(): Promise<Reward[]> {
  const { data } = await supabase().from("rewards").select("store, store_domain, kind, points, value, expires_on, sent_at").not("kind", "is", null).order("sent_at", { ascending: false }).limit(1000);
  const today = new Date().toISOString().slice(0, 10);
  const stale = new Date(Date.now() - 365 * 86400000).toISOString();
  const seen = new Set<string>();
  return ((data ?? []) as Reward[]).filter(r => {
    const key = `${r.store}|${r.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    // Nothing to show: no money value and no points.
    if (!r.value && !r.points) return false;
    // Bank cards and app or AI credit aren't store rewards.
    if (NOT_REWARD.test(r.store) || (r.store_domain && NOT_REWARD_DOMAIN.test(r.store_domain))) return false;
    return (!r.expires_on || r.expires_on >= today) && r.sent_at > stale;
  }).sort((a, b) => (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999"));
}

export const daysUntil = (d: string) => Math.ceil((Date.parse(`${d}T23:59:59`) - Date.now()) / 86400000);
export const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const KIND: Record<string, string> = { points: "Points", credit: "Store credit", gift_card: "Gift card", reward: "Reward" };

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

export const SITES = [
  { name: "Poshmark", url: "https://poshmark.com/create-listing", note: "Best for mall and designer brands" },
  { name: "Depop", url: "https://www.depop.com/products/create/", note: "Best for trendy and vintage pieces" },
  { name: "eBay", url: "https://www.ebay.com/sl/sell", note: "Best for sneakers and rare finds" },
  { name: "ThredUp", url: "https://www.thredup.com/cleanout", note: "Send a bag, they sell it for you" },
];
