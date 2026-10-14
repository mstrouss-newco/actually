import { supabase } from "./supabase";

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
};

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
    (/autoship/i.test(s) ? "Autoship delivery" : null);
  return m ? m.replace(/,? and (more|other)( items)?$/i, "").replace(/\.{2,}$/, "").trim() || null : null;
}

const WINDOW = 21 * 86400000;
const DAY_MS = 86400000;

// "Amazon.com" and "Chewy.com" read better without the .com.
export const cleanStore = (s: string) => s.replace(/\.(com|co|net|shop)$/i, "").replace(/\s*\(do not reply\)/i, "").trim();
// One key per store, so "Epic Sports" and "Epicsports", "The Bouqs Co" and "The Bouqs Company" match.
const storeKey = (s: string) => cleanStore(s).toLowerCase().replace(/^the\s+/, "").replace(/\s+(co|company|inc|llc)\.?$/, "").replace(/[^a-z0-9]/g, "");
// Shipping and receipt services that send mail for many stores. Their address says nothing about the store.
export const RELAY = /(^|\.)(narvar|lightspeedhq|shopify|shopifyemail|squareup|clover|toasttab|aftership|route|klaviyo|mailchimp|sendgrid)\.(com|net|io)$/i;
// Delay notices are news about an order, not a sign it shipped.
const kindOf = (e: { kind: string; subject: string | null }) => e.kind === "shipping" && /delivery estimate|delayed/i.test(e.subject ?? "") ? "order" : e.kind;

export function groupOrders(rows: FullRow[], itemNames: Map<string, string[]> = new Map()): OrderGroup[] {
  const byKey = new Map<string, OrderGroup>();
  const byWhat = new Map<string, OrderGroup[]>();
  const all: OrderGroup[] = [];
  const names = new Map<string, Map<string, number>>();
  const sorted = [...rows].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  for (const r of sorted) {
    const sk = storeKey(r.store);
    const nm = names.get(sk) ?? new Map<string, number>();
    nm.set(cleanStore(r.store), (nm.get(cleanStore(r.store)) ?? 0) + 1);
    names.set(sk, nm);
    const what = describe(r.subject);
    const at = Date.parse(r.sent_at);
    // Same order number, or (no number) the same store and contents within three weeks.
    let g = r.order_no ? byKey.get(`${sk}|${r.order_no}`) : undefined;
    const whatKey = what ? `${sk}|${what.toLowerCase()}` : null;
    if (!g && !r.order_no && whatKey) g = byWhat.get(whatKey)?.find(x => at - Date.parse(x.last_at) < WINDOW);
    // "Arrives today" and "was delivered" often have no order number (Chewy). Attach them to the
    // store's one order that shipped in the 10 days before and hasn't been delivered yet.
    if (!g && !r.order_no && (r.kind === "shipping" || r.kind === "delivered")) {
      const open = all.filter(o => o.order_no && storeKey(o.store) === sk && at - Date.parse(o.last_at) < 10 * DAY_MS
        && o.events.some(e => e.kind === "shipping") && !o.events.some(e => e.kind === "delivered"));
      if (open.length === 1) g = open[0];
    }
    if (!g) {
      g = { key: r.order_no ? `${sk}|${r.order_no}` : r.gmail_id, store: r.store, store_domain: r.store_domain && !RELAY.test(r.store_domain) ? r.store_domain : null,
        order_no: r.order_no, amount: null, ordered_at: r.sent_at, last_at: r.sent_at, events: [], stage: "placed", what, items: [], inStore: false };
      all.push(g);
      if (r.order_no) byKey.set(g.key, g);
      if (whatKey) byWhat.set(whatKey, [...(byWhat.get(whatKey) ?? []), g]);
    }
    g.events.push({ kind: r.kind, at: r.sent_at, gmail_id: r.gmail_id, subject: r.subject });
    if (r.amount != null && (g.amount == null || r.amount > g.amount)) g.amount = r.amount;
    if (!g.what && what) g.what = what;
    if (r.sent_at > g.last_at) g.last_at = r.sent_at;
    g.items.push(...(itemNames.get(r.gmail_id) ?? []));
  }
  const now = Date.now();
  for (const g of all) {
    const nm = names.get(storeKey(g.store));
    // The store's most used name, preferring one with spaces ("Epic Sports" over "Epicsports").
    g.store = nm ? [...nm.entries()].sort((a, b) => (b[1] + (b[0].includes(" ") ? 0.5 : 0)) - (a[1] + (a[0].includes(" ") ? 0.5 : 0)))[0][0] : cleanStore(g.store);
    g.events.sort((a, b) => a.at.localeCompare(b.at));
    g.stage = STAGES[Math.max(...g.events.map(e => STAGE[kindOf(e)] ?? 0))];
    // A receipt with no shipping at all was bought in person.
    g.inStore = g.events.every(e => e.kind === "receipt");
    // Nothing heard in a month: it arrived.
    if (g.inStore || ((g.stage === "placed" || g.stage === "shipped") && now - Date.parse(g.last_at) > 30 * DAY_MS)) g.stage = "delivered";
    g.items = [...new Set(g.items)];
  }
  return all.sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function loadOrders(): Promise<OrderGroup[] | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getSession();
  if (!auth.session) return null;
  const [{ data }, { data: items }] = await Promise.all([
    sb.from("orders").select("store, store_domain, kind, order_no, amount, sent_at, gmail_id, subject").neq("kind", "other").order("sent_at", { ascending: false }).limit(5000),
    sb.from("items").select("gmail_id, name").limit(5000),
  ]);
  const names = new Map<string, string[]>();
  for (const i of (items ?? []) as { gmail_id: string; name: string }[]) names.set(i.gmail_id, [...(names.get(i.gmail_id) ?? []), i.name]);
  return groupOrders((data ?? []) as FullRow[], names);
}

const DAY = 86400000;
export const daysAgo = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / DAY);

// Still on its way: shipped or placed recently, no delivery email yet.
export const isArriving = (g: OrderGroup) => (g.stage === "shipped" && daysAgo(g.last_at) < 14) || (g.stage === "placed" && daysAgo(g.ordered_at) < 7);
export const isReturn = (g: OrderGroup) => g.stage === "returning" || g.stage === "refunded";

// Most stores give 30 days from delivery. This is a guess until we read each store's policy.
export function returnDaysLeft(g: OrderGroup) {
  if (g.stage !== "delivered") return null;
  const left = 30 - daysAgo(g.last_at);
  return left > 0 ? left : null;
}

// What to call an order: the items in it, else what the email says it is, else the order number.
export function orderTitle(g: OrderGroup) {
  if (g.items.length) return g.items.length > 1 ? `${g.items[0]}, +${g.items.length - 1} more` : g.items[0];
  if (g.what) return g.what;
  return g.order_no ? `Order ${g.order_no}` : (g.events[0]?.subject ?? "Order").slice(0, 60);
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
