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
