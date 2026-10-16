"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGoBack } from "@/lib/nav";
import { HUE_SWATCH, type Item, brandOf, hueRank, loadItems, monthPieces, whoFor } from "@/lib/items";
import { type OrderGroup, loadOrders, returnDaysLeft } from "@/lib/orders";
import { closetWorth, money, worth } from "@/lib/earn";
import { ItemImage } from "@/lib/tabs";

// "Your month in style": a tap-through story built from what she bought this month.
export default function Story() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [groups, setGroups] = useState<OrderGroup[] | null>(null);
  const [i, setI] = useState(0);
  const leave = useGoBack("/today");
  useEffect(() => { loadItems().then(setItems); loadOrders().then(setGroups); }, []);

  const all = items ?? [];
  let pieces = monthPieces(all);
  const thisMonth = pieces.length >= 3;
  if (!thisMonth) pieces = all.filter(x => whoFor(x, all) === "me" && Date.now() - Date.parse(x.ordered_at) < 30 * 86400000);
  const label = thisMonth ? `Your ${new Date().toLocaleDateString("en-US", { month: "long" })}` : "Your last 30 days";
  const photos = pieces.filter(x => x.image_url);

  const byBrand = new Map<string, Item[]>();
  for (const p of pieces) byBrand.set(brandOf(p), [...(byBrand.get(brandOf(p)) ?? []), p]);
  const [topBrand, topPieces] = [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? ["", []];
  const sizes = [...new Set(topPieces.map(p => p.size).filter(Boolean))];

  const hues = new Map<number, number>();
  for (const p of pieces) { const h = hueRank(p.color); if (h < HUE_SWATCH.length) hues.set(h, (hues.get(h) ?? 0) + 1); }
  const colors = [...hues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h]) => HUE_SWATCH[h]);

  const mine = all.filter(x => whoFor(x, all) === "me");
  const returnable = (groups ?? []).filter(g => g.wear && returnDaysLeft(g) != null).length;
  const [, hi] = worth(closetWorth(mine, groups).counted);

  const cards = ["new", ...(topBrand ? ["brand"] : []), ...(colors.length ? ["colors"] : []), "end"];
  const n = cards.length;
  const card = cards[Math.min(i, n - 1)];
  useEffect(() => {
    if (items === null) return;
    const t = setTimeout(() => setI(x => (x + 1 < n ? x + 1 : x)), 5000);
    return () => clearTimeout(t);
  }, [i, n, items]);

  const big = (txt: React.ReactNode, size = 46) => <div className="serif up" style={{ ...{ animationDelay: "120ms" }, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.02em", marginTop: 12 }}>{txt}</div>;
  const kick = (txt: string) => <div className="up" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: .7, marginTop: 48 }}>{txt}</div>;
  const row = (list: Item[]) => (
    <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
      {list.slice(0, 3).map((p, k) => <div key={p.id} className="up" style={{ animationDelay: `${250 + k * 110}ms`, borderRadius: 18 }}><ItemImage cutId={p.id} src={p.image_url} store={p.store} name={p.name} w={100} h={126} radius={18} size={36} /></div>)}
    </div>
  );

  return (
    <main style={{ position: "relative", width: "100%", height: "100%", background: "#141210", color: "#fff", fontFamily: "var(--font-sans), sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, padding: "18px 18px 26px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", gap: 5 }}>
                    {cards.map((c, k) => <div key={c} className="seg"><i key={`${c}${i}`} className={k === i ? "segrun" : ""} style={{ width: k < i ? "100%" : k === i ? undefined : 0 }} /></div>)}
          </div>
          <button type="button" onClick={leave} aria-label="Close" style={{ flex: "none", width: 34, height: 34, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.14)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <div className="logo" style={{ color: "#fff" }}>Actually</div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: .7 }}>{label}</div>
        </div>

        <button type="button" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX - r.left < r.width / 3 && i > 0) setI(i - 1); else if (i + 1 < n) setI(i + 1); else leave(); }} aria-label={i + 1 < n ? "Next card" : "Close"} style={{ flex: 1, border: 0, background: "transparent", color: "#fff", cursor: "pointer", padding: 0, textAlign: "left", font: "inherit", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {items === null ? <div style={{ marginTop: 60, opacity: .7 }}>Putting your month together…</div>
          : pieces.length === 0 ? <>{kick(label)}{big("Nothing new yet.")}<div style={{ fontSize: 16, opacity: .8, marginTop: 10 }}>Your story fills in as orders come in.</div></>
          : card === "new" ? (
            <div key="new">
              <div style={{ position: "relative", height: 300, marginTop: 24 }}>
                {photos.slice(0, 3).map((p, k) => (
                  <div key={p.id} className="float" style={{ position: "absolute", left: [8, 170, 92][k], top: [30, 0, 120][k], transform: `rotate(${[-8, 6, -2][k]}deg)`, animationDelay: `${k * 1.1}s`, borderRadius: 24, boxShadow: "0 16px 30px rgba(0,0,0,.35)", zIndex: k === 2 ? 1 : 0 }}>
                    <ItemImage cutId={p.id} src={p.image_url} store={p.store} name={p.name} w={150} h={180} radius={24} size={52} />
                  </div>
                ))}
              </div>
              {big(<>{pieces.length} new <em>{pieces.length === 1 ? "piece." : "pieces."}</em></>)}
              <div className="up" style={{ animationDelay: "240ms", fontSize: 16, opacity: .8, marginTop: 10 }}>From {byBrand.size} {byBrand.size === 1 ? "brand" : "brands"}.</div>
            </div>
          ) : card === "brand" ? (
            <div key="brand">
              {kick("Your brand")}
              {big(topBrand, topBrand.length > 14 ? 44 : 60)}
              {row(topPieces)}
              <div className="up" style={{ animationDelay: "600ms", fontSize: 16, opacity: .8, marginTop: 18 }}>{topPieces.length} {topPieces.length === 1 ? "piece" : "pieces"}{sizes.length === 1 ? `, all size ${sizes[0]}` : ""}.</div>
            </div>
          ) : card === "colors" ? (
            <div key="colors">
              {kick("Your colors")}
              {big(<>Mostly <em>{colors[0][0]}</em>{colors[1] ? <> and {colors[1][0]}</> : ""}.</>)}
              <div style={{ display: "flex", gap: 12, marginTop: 34 }}>
                {colors.map(([nm, hex], k) => <span key={nm} className="sw" aria-label={nm} style={{ width: 64, height: 64, borderRadius: "50%", background: hex, border: "2px solid rgba(255,255,255,.2)", animationDelay: `${200 + k * 110}ms` }} />)}
              </div>
            </div>
          ) : (
            <div key="end">
              {kick("Before you go")}
              {big(<>{returnable ? <>{returnable} clothes {returnable === 1 ? "order" : "orders"} still <em>returnable.</em></> : <>Nothing to <em>return.</em></>}{hi ? <> Up to {money(hi)} in your closet.</> : null}</>, 42)}
              {row(photos.slice(0, 3))}
            </div>
          )}
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/sort" className="press" style={{ flex: 1, height: 52, borderRadius: 999, background: "#fff", color: "var(--ink)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Share pieces to my feed</Link>
          <Link href="/today" onClick={e => { e.preventDefault(); leave(); }} className="press" style={{ height: 52, padding: "0 20px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,.45)", color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", textDecoration: "none" }}>Close</Link>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, opacity: .6, marginTop: 10 }}>{i + 1 < n ? "Tap for the next card" : "Tap to finish"}</div>
      </div>
    </main>
  );
}
