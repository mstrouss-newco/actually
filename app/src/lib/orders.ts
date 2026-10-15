import { supabase } from "./supabase";
import { WEAR } from "./items";

export type Summary = {
  orders: number; stores: number; since: number | null;
  recent: number; onTheWay: number; spent: number;
  top: { store: string; n: number }[];
};

type Row = { store: string; kind: string; order_no: string | null; amount: number | null; sent_at: string; gmail_id: string };

// Turns her saved emails into the numbers on "What we found".
export async function loadSummary(): Promise<Summary | null> {
  const { data, error } = await supabase().from("orders").select("store, kind, order_no, amount, sent_at, gmail_id").neq("kind", "other").order("sent_at", { ascending: false }).limit(5000);
  if (error || !data?.length) return null;
  return summarize(data as Row[]);
}

export function summarize(rows: Row[]): Summary {
  // One order can send several emails. Group by store and order number when there is one.
  const orders = new Map<string, Row>();
  for (const r of rows) {
    if (!["order", "receipt"].includes(r.kind) && r.order_no == null) continue;
    const key = r.order_no ? `${r.store}|${r.order_no}` : r.gmail_id;
    if (!orders.has(key) || r.kind === "order") orders.set(key, r);
  }
  const list = [...orders.values()];
  const now = Date.now(), day = 86400000;
  const byStore = new Map<string, number>();
  for (const o of list) byStore.set(o.store, (byStore.get(o.store) ?? 0) + 1);

  const delivered = new Set(rows.filter(r => r.kind === "delivered" && r.order_no).map(r => `${r.store}|${r.order_no}`));
  const onTheWay = new Set(
    rows.filter(r => r.kind === "shipping" && now - Date.parse(r.sent_at) < 10 * day && r.order_no && !delivered.has(`${r.store}|${r.order_no}`))
      .map(r => `${r.store}|${r.order_no}`),
  ).size;

  return {
    orders: list.length,
    stores: byStore.size,
    since: list.length ? new Date(Math.min(...list.map(o => Date.parse(o.sent_at)))).getFullYear() : null,
    recent: list.filter(o => now - Date.parse(o.sent_at) < 30 * day).length,
    onTheWay,
    spent: Math.round(list.reduce((s, o) => s + (o.amount ?? 0), 0)),
    top: [...byStore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([store, n]) => ({ store, n })),
  };
}

// ---------- grouping emails into orders ----------

export type Event = { kind: string; at: string; gmail_id: string; subject: string | null };
export type OrderGroup = {
  key: string; store: string; store_domain: string | null; order_no: string | null; amount: number | null;
  ordered_at: string; last_at: string; events: Event[];
  what: string | null; items: string[];
  stage: "placed" | "shipped" | "delivered" | "returning" | "refunded";
  inStore: boolean;
  // Counted as delivered because it went quiet, not because a delivery email came ("Likely arrived").
  assumed: boolean;
  // Has clothes, shoes, bags or accessories in it.
  wear: boolean;
  // Product photo for the order (clothes first), and each piece with its photo.
  photo: string | null;
  pieces: Piece[];
};
export type Piece = { name: string; img: string | null; wear: boolean };

type FullRow = Row & { subject: string | null; store_domain: string | null };
const STAGE: Record<string, number> = { order: 0, receipt: 0, shipping: 1, delivered: 2, return: 3, refund: 4 };
const STAGES = ["placed", "shipped", "delivered", "returning", "refunded"] as const;

// What's in the order, from the subject line. Amazon says it outright:
// "Shipped 1 item: Garden Supplies", "Delivered: 2 Snack Foods and Sports items".
export function describe(subject: string | null): string | null {
  if (!subject) return null;
  const s = subject.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "").trim();
  const m =
    s.match(/^(?:ordered|shipped|delivered|out for delivery|arriving[^:]*|delivery[^:]*):?\s*\d+\s+items?:\s*(.+)$/i)?.[1] ??
    s.match(/^(?:ordered|shipped|delivered|out for delivery):\s*\d+\s+(.+?)\s+items?$/i)?.[1] ??
    s.match(/["\u201c]([^"\u201d]{3,80})["\u201d]/)?.[1] ??
    s.match(/(?:return request confirmed|refund issued|dropoff confirmed|advance refund issued) for (.+?)\.*$/i)?.[1] ??
    s.match(/^(?:delivery estimate update|out for delivery|arriving[^:]*):\s*(?!\d)([^"\u201c#]{3,80})$/i)?.[1] ??
    null;
  return m ? m.replace(/,? and (more|other)( items)?$/i, "").replace(/\.{2,}$/, "").trim() || null : null;
}

const WINDOW = 21 * 86400000;
const DAY_MS = 86400000;

// "Amazon.com" and "Chewy.com" read better without the .com.
export const cleanStore = (s: string) => s.replace(/\.(com|co|net|shop)$/i, "").replace(/\s*\(do not reply\)/i, "").replace(/\s+confirmations?$/i, "").trim();
// One key per store, so "Epic Sports" and "Epicsports", "The Bouqs Co" and "The Bouqs Company" match.
const storeKey = (s: string) => cleanStore(s).toLowerCase().replace(/^the\s+/, "").replace(/\s+(co|company|inc|llc)\.?$/, "").replace(/[^a-z0-9]/g, "");
// Shipping and receipt services that send mail for many stores. Their address says nothing about the store.
export const RELAY = /(^|\.)(narvar|lightspeedhq|shopify|shopifyemail|squareup|clover|toasttab|aftership|route|klaviyo|mailchimp|sendgrid)\.(com|net|io)$/i;
// Delay notices are news about an order, not a sign it shipped.
const isDelay = (e: { subject: string | null }) => /delivery estimate|delayed/i.test(e.subject ?? "");
const kindOf = (e: { kind: string; subject: string | null }) =>
  e.kind === "refund" && /dropoff confirmed/i.test(e.subject ?? "") ? "return" :
  e.kind === "shipping" && isDelay(e) ? "order" : e.kind === "order" && /picked up|ready to ship|has shipped/i.test(e.subject ?? "") ? "shipping" : e.kind;

export function groupOrders(rows: FullRow[], itemNames: Map<string, string[]> = new Map(), wearIds: Set<string> = new Set(), itemPieces: Map<string, Piece[]> = new Map()): OrderGroup[] {
  const byKey = new Map<string, OrderGroup>();
  const byWhat = new Map<string, OrderGroup[]>();
  const all: OrderGroup[] = [];
  const names = new Map<string, Map<string, number>>();
  const keyOf = new Map<OrderGroup, string>();
  const sorted = [...rows].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  // Store names that have their own web address, so "The Bouqs Co" via Narvar matches bouqs.com.
  const nameToDomain = new Map<string, string>();
  for (const r of sorted) if (r.store_domain && !RELAY.test(r.store_domain)) nameToDomain.set(storeKey(r.store), r.store_domain);
  for (const r of sorted) {
    // One key per store: its web address, or its name when the email came through a shipping service.
    const sk = r.store_domain && !RELAY.test(r.store_domain) ? r.store_domain : nameToDomain.get(storeKey(r.store)) ?? storeKey(r.store);
    const nm = names.get(sk) ?? new Map<string, number>();
    nm.set(cleanStore(r.store), (nm.get(cleanStore(r.store)) ?? 0) + 1);
    names.set(sk, nm);
    const what = describe(r.subject);
    const at = Date.parse(r.sent_at);
    // The store's latest order from the last 10 days that hasn't arrived yet.
    const open = () => all.filter(o => keyOf.get(o) === sk && at - Date.parse(o.last_at) < 10 * DAY_MS
      && !o.events.some(e => e.kind === "delivered" || e.kind === "refund")).sort((a, b) => b.last_at.localeCompare(a.last_at))[0];
    // 1. Same order number. 2. Same store and contents within three weeks (Amazon).
    let g = r.order_no ? byKey.get(`${sk}|${r.order_no}`) : undefined;
    const whatKey = what ? `${sk}|${what.toLowerCase()}` : null;
    if (!g && !r.order_no && whatKey) g = byWhat.get(whatKey)?.find(x => at - Date.parse(x.last_at) < WINDOW);
    // 3. Emails that don't say which order ("Your order is out for delivery") join the store's open order.
    if (!g && !r.order_no && !what) g = open();
    // 4. A numbered email can name an order whose first email had no number (EPI).
    if (!g && r.order_no) {
      const o = open();
      if (o && !o.order_no && !o.what) { g = o; g.order_no = r.order_no; g.key = `${sk}|${r.order_no}`; byKey.set(g.key, g); }
    }
    if (!g) {
      g = { key: r.order_no ? `${sk}|${r.order_no}` : r.gmail_id, store: r.store, store_domain: sk.includes(".") ? sk : null,
        order_no: r.order_no, amount: null, ordered_at: r.sent_at, last_at: r.sent_at, events: [], stage: "placed", what, items: [], inStore: false, assumed: false, wear: false, photo: null, pieces: [] };
      all.push(g);
      keyOf.set(g, sk);
      if (r.order_no) byKey.set(g.key, g);
      if (whatKey) byWhat.set(whatKey, [...(byWhat.get(whatKey) ?? []), g]);
    }
    g.events.push({ kind: r.kind, at: r.sent_at, gmail_id: r.gmail_id, subject: r.subject });
    if (r.amount != null && (g.amount == null || r.amount > g.amount)) g.amount = r.amount;
    if (!g.what && what) g.what = what;
    if (r.sent_at > g.last_at) g.last_at = r.sent_at;
    g.items.push(...(itemNames.get(r.gmail_id) ?? []));
    if (wearIds.has(r.gmail_id)) g.wear = true;
    g.pieces.push(...(itemPieces.get(r.gmail_id) ?? []));
  }
  // Amazon sends "Delivery estimate update" with only an order number. Fold it into the store's
  // order with contents that was moving in the two weeks around it.
  for (const g of [...all]) {
    if (!g.events.every(isDelay) || g.what || g.items.length) continue;
    const at = Date.parse(g.events[0].at);
    const near = all.filter(o => o !== g && keyOf.get(o) === keyOf.get(g) && (o.what || o.items.length) && Math.abs(Date.parse(o.ordered_at) - at) < 14 * DAY_MS)
      .sort((a, b) => Math.abs(Date.parse(a.ordered_at) - at) - Math.abs(Date.parse(b.ordered_at) - at))[0];
    if (near) { near.events.push(...g.events); near.pieces.push(...g.pieces); near.order_no ??= g.order_no; all.splice(all.indexOf(g), 1); }
  }
  const now = Date.now();
  for (const g of all) {
    const nm = names.get(keyOf.get(g)!);
    // The store's most used name, preferring one with spaces ("Epic Sports" over "Epicsports").
    g.store = nm ? [...nm.entries()].sort((a, b) => (b[1] + (b[0].includes(" ") ? 0.5 : 0)) - (a[1] + (a[0].includes(" ") ? 0.5 : 0)))[0][0] : cleanStore(g.store);
    g.events.sort((a, b) => a.at.localeCompare(b.at));
    g.stage = STAGES[Math.max(...g.events.map(e => STAGE[kindOf(e)] ?? 0))];
    // A receipt with no shipping at all was bought in person.
    g.inStore = g.events.every(e => e.kind === "receipt");
    const quiet = now - Date.parse(g.last_at);
    // "Out for delivery" two days ago: it arrived.
    const outForDelivery = g.events.some(e => /out for delivery|arriv(es|ing) today/i.test(e.subject ?? ""));
    if (g.inStore || (g.stage === "shipped" && outForDelivery && quiet > 2 * DAY_MS)) g.stage = "delivered";
    // Shipped a week ago, or ordered two weeks ago, with no news since: it most likely arrived.
    else if ((g.stage === "shipped" && quiet > 7 * DAY_MS) || (g.stage === "placed" && quiet > 14 * DAY_MS)) { g.stage = "delivered"; g.assumed = true; }
    g.items = dedupeNames(g.items);
    const seen = new Set<string>();
    g.pieces = g.pieces.filter(p => { const k = baseName(p.name); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => Number(b.wear) - Number(a.wear) || Number(!!b.img) - Number(!!a.img));
    g.photo = g.pieces.find(p => p.img)?.img ?? null;
  }
  return all.sort((a, b) => b.last_at.localeCompare(a.last_at));
}

// "Lima" and "Men's Lima" from two emails about one order are the same thing.
const baseName = (n: string) => n.toLowerCase().replace(/\b(men|women|boy|girl|kid)s?['’]?s?\b/g, "").replace(/[^a-z0-9]/g, "");
function dedupeNames(list: string[]) {
  const out = new Map<string, string>();
  for (const n of list) {
    const k = baseName(n);
    if (!out.has(k) || n.length > out.get(k)!.length) out.set(k, n);
  }
  return [...out.values()];
}

export async function loadOrders(): Promise<OrderGroup[] | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getSession();
  if (!auth.session) return null;
  const [{ data }, { data: items }] = await Promise.all([
    sb.from("orders").select("store, store_domain, kind, order_no, amount, sent_at, gmail_id, subject").neq("kind", "other").order("sent_at", { ascending: false }).limit(5000),
    sb.from("items").select("gmail_id, name, category, image_url").limit(5000),
  ]);
  const names = new Map<string, string[]>();
  const wear = new Set<string>();
  const pieces = new Map<string, Piece[]>();
  for (const i of (items ?? []) as { gmail_id: string; name: string; category: string; image_url: string | null }[]) {
    names.set(i.gmail_id, [...(names.get(i.gmail_id) ?? []), i.name]);
    if (WEAR.includes(i.category)) wear.add(i.gmail_id);
    pieces.set(i.gmail_id, [...(pieces.get(i.gmail_id) ?? []), { name: i.name, img: i.image_url, wear: WEAR.includes(i.category) }]);
  }
  return groupOrders((data ?? []) as FullRow[], names, wear, pieces);
}

const DAY = 86400000;
export const daysAgo = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / DAY);

// Still on its way: shipped or placed recently, no delivery email yet.
export const isArriving = (g: OrderGroup) => g.stage === "shipped" || g.stage === "placed";
export const isReturn = (g: OrderGroup) => g.stage === "returning" || g.stage === "refunded";

// Most stores give 30 days from delivery. This is a guess until we read each store's policy.
export function returnDaysLeft(g: OrderGroup) {
  if (g.stage !== "delivered" || g.assumed) return null;
  const left = 30 - calendarDaysSince(deliveredAt(g));
  return left > 0 ? left : null;
}
// When it was delivered: the delivery email, else the last email.
export const deliveredAt = (g: OrderGroup) => g.events.filter(e => e.kind === "delivered").map(e => e.at).sort().at(-1) ?? g.last_at;
// Whole days on her calendar, so "Sep 21" is the same day all day long.
function calendarDaysSince(iso: string) {
  const d = new Date(iso), now = new Date();
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY);
}

// Return status for each email, so a piece can say "Return by Fri" or "Returned".
export type Ret = { left: number | null; returned: boolean; by: number | null };
export function returnsByEmail(groups: OrderGroup[]) {
  const out = new Map<string, Ret>();
  for (const g of groups) {
    const left = returnDaysLeft(g);
    const r = { left, returned: isReturn(g), by: left ? Date.parse(deliveredAt(g)) + 30 * DAY : null };
    for (const e of g.events) out.set(e.gmail_id, r);
  }
  return out;
}
// "Fri" when it's this week, else "Oct 30".
export const dayLabel = (t: number) =>
  t - Date.now() < 6 * DAY ? new Date(t).toLocaleDateString("en-US", { weekday: "short" }) : fmtDate(new Date(t).toISOString());

// What to call an order: the items in it, else what the email says it is, else the order number.
export function orderTitle(g: OrderGroup) {
  if (g.items.length) return g.items.length > 1 ? `${g.items[0]}, +${g.items.length - 1} more` : g.items[0];
  if (g.what) return g.what;
  return `${g.store} order`;
}

// "Oct 11", or "Oct 11, 2025" when it isn't this year.
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
};
export const gmailLink = (id: string) => `https://mail.google.com/mail/u/0/#all/${id}`;

// Removes one order, its emails and any items read from it.
export async function removeOrder(g: OrderGroup) {
  const sb = supabase();
  const ids = g.events.map(e => e.gmail_id);
  await sb.from("items").delete().in("gmail_id", ids);
  await sb.from("orders").delete().in("gmail_id", ids);
}

// Hides a store for good: removes everything from it and skips it from now on.
export async function blockStore(g: OrderGroup) {
  const sb = supabase();
  const domain = g.store_domain;
  if (!domain) return removeOrder(g);
  await sb.from("blocked_stores").upsert({ store_domain: domain, store: g.store });
  const { data } = await sb.from("orders").select("gmail_id").eq("store_domain", domain);
  const ids = ((data ?? []) as { gmail_id: string }[]).map(r => r.gmail_id);
  for (let i = 0; i < ids.length; i += 200) await sb.from("items").delete().in("gmail_id", ids.slice(i, i + 200));
  await sb.from("orders").delete().eq("store_domain", domain);
  await sb.from("rewards").delete().eq("store_domain", domain);
}

// Runs once per account: re-checks saved orders and removes non-orders and sensitive ones.
export async function cleanupOnce(): Promise<boolean> {
  const sb = supabase();
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return false;
  const { data: p } = await sb.from("profiles").select("screened_at").eq("id", s.session.user.id).maybeSingle();
  if (!p || p.screened_at) return false;
  const { data } = await sb.functions.invoke("screen-emails", { body: { clean: true } });
  return !!data?.removed;
}
