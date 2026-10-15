"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type OrderGroup, dayLabel, fmtDate, isArriving, isReturn, loadOrders, matches, orderTitle, returnBy, returnDaysLeft, ruleText, SOON } from "@/lib/orders";
import { Progress, ItemImage, TabBar } from "@/lib/tabs";
import { delay } from "@/lib/motion";

// A photo card for the clothes-and-shoes view.
function PhotoCard({ g, chipText, chipBg, i }: { g: OrderGroup; chipText: string | null; chipBg: string; i: number }) {
  return (
    <Link href={`/order/${encodeURIComponent(g.key)}`} className="press up" style={{ ...delay(i, 60), textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ position: "relative" }}>
        <ItemImage src={g.photo} store={g.store} name={g.items[0] ?? g.what ?? undefined} label="" w="100%" h={196} radius={22} size={48} />
        {chipText && <div style={{ position: "absolute", left: 10, top: 10, background: chipBg, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{chipText}</div>}
        {g.pieces.length > 1 && <div style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(20,18,16,.78)", color: "#fff", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>+{g.pieces.length - 1}</div>}
      </div>
      <div className="kicker" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.store}</div>
      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25, marginTop: -3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{g.items[0] ?? orderTitle(g)}</div>
    </Link>
  );
}

type Tab = "arriving" | "canreturn" | "delivered" | "returns" | "cancelled" | "all";
const TABS: [Tab, string][] = [["arriving", "Arriving"], ["canreturn", "Can return"], ["delivered", "Delivered"], ["returns", "Returns"], ["cancelled", "Cancelled"], ["all", "All"]];
const FILTER: Record<Tab, (g: OrderGroup) => boolean> = {
  arriving: isArriving,
  canreturn: g => returnDaysLeft(g) != null,
  delivered: g => g.stage === "delivered",
  returns: isReturn,
  cancelled: g => g.stage === "cancelled",
  all: () => true,
};
// Tabs that only show up when they have something in them.
const OPTIONAL: Tab[] = ["returns", "cancelled"];
const STEP = { placed: 0, shipped: 1, delivered: 3, returning: 3, refunded: 3, cancelled: 0 };


function status(g: OrderGroup) {
  if (g.inStore) return `Bought in store ${fmtDate(g.ordered_at)}`;
  if (g.assumed) return `Likely arrived · last email ${fmtDate(g.last_at)}`;
  switch (g.stage) {
    case "placed": return `Ordered ${fmtDate(g.ordered_at)}`;
    case "shipped": return `Shipped ${fmtDate(g.last_at)}`;
    case "delivered": return `Delivered ${fmtDate(g.last_at)}`;
    case "returning": return `Return started ${fmtDate(g.last_at)}`;
    case "refunded": return `Refunded ${fmtDate(g.last_at)}`;
    case "cancelled": return `Cancelled ${fmtDate(g.last_at)}`;
  }
}

function chip(g: OrderGroup): [string, string] | null {
  const left = returnDaysLeft(g);
  if (left != null) return [`${left}d to return`, left <= SOON ? "#FF6159" : "#F1EDE8"];
  if (g.stage === "cancelled") return ["Cancelled", "#F1EDE8"];
  if (g.stage === "refunded") return ["Refunded", "#DCEFDF"];
  if (g.stage === "returning") return ["Return", "#FFE1DC"];
  if (isArriving(g)) return [g.stage === "shipped" ? "On the way" : "Placed", "#FFF0BF"];
  return null;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderGroup[] | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("arriving");
  const [q, setQ] = useState("");
  const findRef = useRef<HTMLInputElement>(null);
  // From the search button on Today: ready to type.
  useEffect(() => { if (new URLSearchParams(location.search).get("find")) findRef.current?.focus(); }, []);
  // "photos": clothes, shoes and accessories as big photo cards. "list": every order, by tab.
  const [view, setViewState] = useState<"photos" | "list">("photos");
  const setView = (v: "photos" | "list", t?: Tab) => {
    setViewState(v);
    if (t) setTab(t);
    history.replaceState(history.state, "", v === "list" ? `?view=list&tab=${t ?? tab}` : location.pathname);
  };

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get("tab") as Tab | null;
    loadOrders().then(list => {
      setOrders(list);
      // A link to a tab, or no clothes at all, opens the list.
      if (t || sp.get("view") === "list" || sp.get("find") || !list?.some(g => g.wear && g.photo)) setViewState("list");
      // Open on the first tab that has something in it.
      if (t && FILTER[t]) setTab(t);
      else if (list && !list.some(isArriving)) setTab(list.some(g => g.stage === "delivered") ? "delivered" : "all");
    });
  }, []);

  const all = orders ?? [];
  const query = q.trim().toLowerCase();
  const rows = query
    ? all.filter(g => matches(`${g.store} ${g.order_no ?? ""} ${g.what ?? ""} ${g.items.join(" ")} ${g.pieces.map(p => p.name).join(" ")} ${g.events.map(e => e.subject).join(" ")}`, query))
    : tab === "canreturn" ? all.filter(FILTER.canreturn).sort((a, b) => returnDaysLeft(a)! - returnDaysLeft(b)!)
    : all.filter(FILTER[tab]);
  const soon = tab === "canreturn" && !query ? rows.filter(g => returnDaysLeft(g)! <= SOON) : [];
  // The photo view: only orders with clothes, shoes, bags or accessories.
  const wear = all.filter(g => g.wear && g.stage !== "cancelled");
  const pArriving = wear.filter(isArriving);
  const pReturn = wear.filter(g => returnDaysLeft(g) != null).sort((a, b) => returnDaysLeft(a)! - returnDaysLeft(b)!);
  const pRecent = wear.filter(g => !isArriving(g) && returnDaysLeft(g) == null).slice(0, 12);
  const other = all.filter(g => !g.wear && g.stage !== "cancelled").length;
  const photos = view === "photos" && !query;

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}><h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Orders</h1></div>
        <label style={{ margin: "16px 16px 0", height: 50, borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input ref={findRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Find any order or receipt" aria-label="Find any order or receipt" style={{ border: 0, outline: 0, background: "transparent", font: "500 15px var(--font-sans), sans-serif", flex: 1, color: "var(--ink)", minWidth: 0 }} />
        </label>

        {!query && (
          <div role="tablist" style={{ display: "flex", gap: 6, padding: "14px 16px 0" }}>
            {([["photos", "Clothes and shoes"], ["list", "Every order"]] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className="press" style={{ border: "1.5px solid var(--ink)", background: view === k ? "var(--ink)" : "#fff", color: view === k ? "#fff" : "var(--ink)", borderRadius: 999, padding: "8px 14px", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        )}

        {photos && orders && (
          <>
            {([["On the way", pArriving, (g: OrderGroup) => [g.stage === "shipped" ? "On the way" : "Placed", "#FFF0BF"]], ["Can return", pReturn, (g: OrderGroup) => [`${returnDaysLeft(g)} days left`, returnDaysLeft(g)! <= SOON ? "#FF6159" : "#fff"]], ["Recent", pRecent, (g: OrderGroup) => [g.stage === "refunded" ? "Refunded" : g.stage === "returning" ? "Returning" : null, "#fff"]]] as [string, OrderGroup[], (g: OrderGroup) => [string | null, string]][])
              .filter(([, list]) => list.length).map(([title, list, chipOf]) => (
                <div key={title}>
                  <div className="section"><div>{title}</div>{title === "Can return" && list.some(g => returnDaysLeft(g)! <= SOON) && <span style={{ fontSize: 13, fontWeight: 700, color: "#C9402F" }}>{list.filter(g => returnDaysLeft(g)! <= SOON).length} closing soon</span>}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: "12px 16px 0" }}>
                    {list.map((g, i) => { const [t, bg] = chipOf(g); return <PhotoCard key={g.key} g={g} chipText={t} chipBg={bg} i={i} />; })}
                  </div>
                </div>
              ))}
            {other > 0 && (
              <button onClick={() => setView("list", "all")} className="press up" style={{ margin: "18px 16px 0", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid var(--line)", background: "#fff", borderRadius: 22, padding: "14px 16px", font: "inherit", color: "var(--ink)", textAlign: "left", cursor: "pointer" }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Home and everything else</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{other} orders: household, garden, pets and more</div></div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
          </>
        )}

        {!query && !photos && (
          <div style={{ display: "flex", gap: 18, padding: "18px 36px 0 20px", borderBottom: "1px solid var(--line)", overflowX: "auto", WebkitMaskImage: "linear-gradient(to right, #000 82%, transparent)", maskImage: "linear-gradient(to right, #000 82%, transparent)" }}>
            {TABS.filter(([k]) => !OPTIONAL.includes(k) || all.some(FILTER[k])).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={k === tab} onClick={() => { setTab(k); history.replaceState(history.state, "", `?view=list&tab=${k}`); }} style={{ border: 0, background: "transparent", padding: "10px 0 12px", font: "700 15px var(--font-sans), sans-serif", color: k === tab ? "var(--ink)" : "var(--muted)", borderBottom: `3px solid ${k === tab ? "var(--ink)" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>
                {label} <span style={{ fontSize: 11, marginLeft: 2, verticalAlign: "super" }}>{all.filter(FILTER[k]).length}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: photos && orders ? "none" : "flex", flexDirection: "column", gap: 12, padding: "16px 16px 0" }}>
          {orders === undefined && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>Loading your orders…</div>}
          {orders === null && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}><Link href="/login" style={{ fontWeight: 700 }}>Sign in</Link> to see your orders.</div>}
          {orders && rows.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>{query ? "No orders match that." : tab === "canreturn" ? "Nothing to return right now. New orders show up here once they arrive." : "Nothing here right now."}</div>}
          {tab === "canreturn" && !query && rows.length > 0 && <div style={{ fontSize: 13, color: "var(--muted)", padding: "0 4px", lineHeight: 1.45 }}>Return windows start on delivery day. We use each store&apos;s rules when its emails say them.</div>}
          {soon.length > 0 && <div className="kicker" style={{ color: "#C9402F", padding: "6px 4px 0" }}>Closing soon</div>}
          {!(photos && orders) && rows.slice(0, 200).map((g, n) => {
            const later = tab === "canreturn" && !query && soon.length > 0 && n === soon.length;
            const c = chip(g);
            const rule = tab === "canreturn" ? ruleText(g) : null;
            return (
              <div key={g.key} style={{ display: "contents" }}>
              {later && <div className="kicker" style={{ padding: "8px 4px 0" }}>Later</div>}
              <Link href={`/order/${encodeURIComponent(g.key)}`} className="orow up" style={{ ...delay(n, 40), textDecoration: "none", display: "flex", gap: 14, alignItems: "center", background: "#FAF8F6", borderRadius: 24, padding: "10px 14px 10px 10px" }}>
                <ItemImage src={g.photo} store={g.store} name={g.items[0] ?? g.what ?? undefined} domain={g.store_domain} w={78} h={96} radius={18} size={30} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="kicker" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.store}</div>
                    {c && <div style={{ flex: "none", background: c[1], borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{c[0]}</div>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{orderTitle(g)}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)" }}>{tab === "canreturn" ? `Return by ${dayLabel(returnBy(g))}${rule ? ` · ${rule}` : ""}` : `${status(g)}${g.amount != null ? ` · $${g.amount.toFixed(2)}` : ""}`}</div>
                  {isArriving(g) && <div style={{ marginTop: 2 }}><Progress step={STEP[g.stage]} h={5} /></div>}
                </div>
              </Link>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
