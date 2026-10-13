import { supabase } from "./supabase";

export type Summary = {
  orders: number; stores: number; since: number | null;
  recent: number; onTheWay: number; spent: number;
  top: { store: string; n: number }[];
};

type Row = { store: string; kind: string; order_no: string | null; amount: number | null; sent_at: string; gmail_id: string };

// Turns her saved emails into the numbers on "What we found".
export async function loadSummary(): Promise<Summary | null> {
  const { data, error } = await supabase().from("orders").select("store, kind, order_no, amount, sent_at, gmail_id").order("sent_at", { ascending: false }).limit(5000);
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
  key: string; store: string; order_no: string | null; amount: number | null;
  ordered_at: string; last_at: string; events: Event[];
  stage: "placed" | "shipped" | "delivered" | "returning" | "refunded";
};

type FullRow = Row & { subject: string | null };
const STAGE: Record<string, number> = { order: 0, receipt: 0, shipping: 1, delivered: 2, return: 3, refund: 4 };
const STAGES = ["placed", "shipped", "delivered", "returning", "refunded"] as const;

export function groupOrders(rows: FullRow[]): OrderGroup[] {
  const map = new Map<string, OrderGroup>();
  for (const r of rows) {
    const key = r.order_no ? `${r.store}|${r.order_no}` : r.gmail_id;
    const g = map.get(key) ?? { key, store: r.store, order_no: r.order_no, amount: null, ordered_at: r.sent_at, last_at: r.sent_at, events: [], stage: "placed" as const };
    g.events.push({ kind: r.kind, at: r.sent_at, gmail_id: r.gmail_id, subject: r.subject });
    if (r.amount != null && (g.amount == null || r.amount > g.amount)) g.amount = r.amount;
    if (r.sent_at < g.ordered_at) g.ordered_at = r.sent_at;
    if (r.sent_at > g.last_at) g.last_at = r.sent_at;
    map.set(key, g);
  }
  for (const g of map.values()) {
    g.events.sort((a, b) => a.at.localeCompare(b.at));
    g.stage = STAGES[Math.max(...g.events.map(e => STAGE[e.kind] ?? 0))];
  }
  return [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function loadOrders(): Promise<OrderGroup[] | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getSession();
  if (!auth.session) return null;
  const { data } = await sb.from("orders").select("store, kind, order_no, amount, sent_at, gmail_id, subject").order("sent_at", { ascending: false }).limit(5000);
  return groupOrders((data ?? []) as FullRow[]);
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

// Short title for an order, since we don't have item names yet.
export function orderTitle(g: OrderGroup) {
  return g.order_no ? `Order ${g.order_no}` : (g.events[0]?.subject ?? "Order").slice(0, 60);
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const gmailLink = (id: string) => `https://mail.google.com/mail/u/0/#all/${id}`;
