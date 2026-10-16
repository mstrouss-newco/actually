"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Skip, closetWorth, money, worth } from "@/lib/earn";
import { loadOrders } from "@/lib/orders";
import { type Item, loadItems, whoFor } from "@/lib/items";
import { ItemImage, TabBar } from "@/lib/tabs";

type Tab = "most" | "sell" | "recent";
const TABS: [Tab, string][] = [["most", "Worth the most"], ["sell", "Selling"], ["recent", "Recent"]];

export default function Worth() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [skipped, setSkipped] = useState<Skip[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<Tab>("most");
  useEffect(() => {
    Promise.all([loadItems(), loadOrders()]).then(([all, groups]) => {
      const mine = all.filter(i => whoFor(i, all) === "me");
      const w = closetWorth(mine, groups);
      setItems(w.counted);
      setSkipped(w.skipped);
      setTotal(mine.length);
    });
  }, []);

  const list = items ?? [];
  const [lo, hi] = worth(list);
  const rows = tab === "most" ? [...list].sort((a, b) => (b.resale_high ?? 0) - (a.resale_high ?? 0))
    : tab === "sell" ? list.filter(i => i.pick === "sell") : list;

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <Link href="/earn" className="back">← Earn</Link>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>What your closet is worth</h1>
        </div>
        <div style={{ margin: "18px 16px 0", background: "#EBE3FF", borderRadius: 26, padding: "20px 18px" }}>
          <div style={{ fontSize: 14, color: "#5B4A8A" }}>Your closet could sell for about</div>
          <div className="serif" style={{ fontSize: list.length ? 46 : 30, lineHeight: 1.05, marginTop: 6 }}>{items === null ? "…" : list.length ? `${money(lo)}–${money(hi)}` : "Not priced yet"}</div>
          <div style={{ fontSize: 13, color: "#5B4A8A", marginTop: 8, lineHeight: 1.4 }}>Counting {list.length} of the {total} {total === 1 ? "piece" : "pieces"} in your closet.{skipped.length ? " The rest are listed below with why." : ""}</div>
          <div style={{ fontSize: 12, color: "#5B4A8A", marginTop: 6, lineHeight: 1.4 }}>AI estimates for good used condition. Real prices depend on wear and demand.</div>
        </div>

        <div style={{ display: "flex", gap: 20, padding: "18px 20px 0", borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ border: 0, background: "transparent", padding: "10px 0 12px", font: "700 15px var(--font-sans), sans-serif", color: k === tab ? "var(--ink)" : "var(--muted)", borderBottom: `3px solid ${k === tab ? "var(--ink)" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 0" }}>
          {tab === "sell" && <div style={{ fontSize: 13, color: "var(--muted)", padding: "0 4px", lineHeight: 1.45 }}>Pieces you want to sell. Tap Sell on any piece to write a post for Poshmark, Depop, eBay or Mercari.</div>}
          {tab !== "sell" && rows.length > 0 && <div style={{ fontSize: 13, color: "var(--muted)", padding: "0 4px" }}>Tap Sell to write a resale post for any piece.</div>}
          {items !== null && rows.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>{tab === "sell" ? "Nothing here yet." : "No prices yet. Go to Earn to price your closet."}</div>}
          {rows.map(i => (
            <Link key={i.id} href={`/earn/worth/${i.id}`} className="orow" style={{ display: "flex", gap: 12, alignItems: "center", background: "#FAF8F6", borderRadius: 22, padding: "10px 14px 10px 10px", textDecoration: "none" }}>
              <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} w={64} h={78} radius={16} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kicker">{i.brand || i.store}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{i.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{i.price != null ? `Paid ${money(i.price)}` : "Price paid unknown"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flex: "none" }}>
                <div className="serif" style={{ fontSize: 17, whiteSpace: "nowrap" }}>{money(i.resale_low ?? 0)}–{money(i.resale_high ?? 0)}</div>
                <span className="press" style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 12px", borderRadius: 999, background: i.pick === "sell" ? "#FF6159" : "var(--ink)", color: i.pick === "sell" ? "var(--ink)" : "#fff", fontSize: 12, fontWeight: 700 }}>{i.pick === "sell" ? "Selling" : "Sell"} →</span>
              </div>
            </Link>
          ))}
        </div>

        {tab !== "sell" && skipped.length > 0 && (
          <>
            <div className="serif" style={{ padding: "24px 20px 0", fontSize: 22 }}>Not counted</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>
              {skipped.map(({ item: i, why }) => (
                <div key={i.id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1.5px solid var(--line)", borderRadius: 20, padding: "8px 14px 8px 8px" }}>
                  <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} w={48} h={60} radius={12} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.brand || i.store} {i.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{why}</div>
                  </div>
                </div>
              ))}
            </div>
            {skipped.some(s => s.why === "Not priced yet") && <div style={{ fontSize: 13, color: "var(--muted)", padding: "10px 20px 0" }}><Link href="/earn" style={{ fontWeight: 700 }}>Price new pieces on Earn</Link></div>}
          </>
        )}
      </div>
      <TabBar />
    </main>
  );
}
