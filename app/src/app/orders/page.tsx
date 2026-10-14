"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type OrderGroup, fmtDate, isArriving, isReturn, loadOrders, orderTitle, returnDaysLeft } from "@/lib/orders";
import { Progress, StoreTile, TabBar } from "@/lib/tabs";

type Tab = "arriving" | "delivered" | "returns" | "all";
const TABS: [Tab, string][] = [["arriving", "Arriving"], ["delivered", "Delivered"], ["returns", "Returns"], ["all", "All"]];
const FILTER: Record<Tab, (g: OrderGroup) => boolean> = {
  arriving: isArriving,
  delivered: g => g.stage === "delivered",
  returns: isReturn,
  all: () => true,
};
const STEP = { placed: 0, shipped: 1, delivered: 3, returning: 3, refunded: 3 };

function status(g: OrderGroup) {
  switch (g.stage) {
    case "placed": return `Ordered ${fmtDate(g.ordered_at)}`;
    case "shipped": return `Shipped ${fmtDate(g.last_at)}`;
    case "delivered": return `Delivered ${fmtDate(g.last_at)}`;
    case "returning": return `Return started ${fmtDate(g.last_at)}`;
    case "refunded": return `Refunded ${fmtDate(g.last_at)}`;
  }
}

function chip(g: OrderGroup): [string, string] | null {
  const left = returnDaysLeft(g);
  if (left != null) return [`${left}d to return`, left <= 5 ? "#FF6159" : "#F1EDE8"];
  if (g.stage === "refunded") return ["Refunded", "#DCEFDF"];
  if (g.stage === "returning") return ["Return", "#FFE1DC"];
  if (isArriving(g)) return [g.stage === "shipped" ? "On the way" : "Placed", "#FFF0BF"];
  return null;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderGroup[] | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("arriving");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab") as Tab | null;
    loadOrders().then(list => {
      setOrders(list);
      // Open on the first tab that has something in it.
      if (t && FILTER[t]) setTab(t);
      else if (list && !list.some(isArriving)) setTab(list.some(g => g.stage === "delivered") ? "delivered" : "all");
    });
  }, []);

  const all = orders ?? [];
  const query = q.trim().toLowerCase();
  const rows = query
    ? all.filter(g => `${g.store} ${g.order_no ?? ""} ${g.events.map(e => e.subject).join(" ")}`.toLowerCase().includes(query))
    : all.filter(FILTER[tab]);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}><h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Orders</h1></div>
        <label style={{ margin: "16px 16px 0", height: 50, borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find any order or receipt" aria-label="Find any order or receipt" style={{ border: 0, outline: 0, background: "transparent", font: "500 15px var(--font-sans), sans-serif", flex: 1, color: "var(--ink)", minWidth: 0 }} />
        </label>

        {!query && (
          <div style={{ display: "flex", gap: 20, padding: "18px 20px 0", borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
            {TABS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} style={{ border: 0, background: "transparent", padding: "10px 0 12px", font: "700 15px var(--font-sans), sans-serif", color: k === tab ? "var(--ink)" : "var(--muted)", borderBottom: `3px solid ${k === tab ? "var(--ink)" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>
                {label} <span style={{ fontSize: 11, marginLeft: 2, verticalAlign: "super" }}>{all.filter(FILTER[k]).length}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 16px 0" }}>
          {orders === undefined && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>Loading your orders…</div>}
          {orders === null && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}><Link href="/login" style={{ fontWeight: 700 }}>Sign in</Link> to see your orders.</div>}
          {orders && rows.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>{query ? "No orders match that." : "Nothing here right now."}</div>}
          {rows.slice(0, 200).map(g => {
            const c = chip(g);
            return (
              <Link key={g.key} href={`/order/${encodeURIComponent(g.key)}`} className="orow" style={{ textDecoration: "none", display: "flex", gap: 14, alignItems: "center", background: "#FAF8F6", borderRadius: 24, padding: "10px 14px 10px 10px" }}>
                <StoreTile store={g.store} w={70} h={86} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div className="kicker">{g.store}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orderTitle(g)}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)" }}>{status(g)}{g.amount != null ? ` · $${g.amount.toFixed(2)}` : ""}</div>
                  {isArriving(g) && <div style={{ marginTop: 2 }}><Progress step={STEP[g.stage]} h={5} /></div>}
                </div>
                {c && <div style={{ alignSelf: "flex-start", marginTop: 4, background: c[1], borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{c[0]}</div>}
              </Link>
            );
          })}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
