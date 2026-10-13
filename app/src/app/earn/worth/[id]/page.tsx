"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SITES, listingText, money } from "@/lib/earn";
import { type Item, loadItems, setPick } from "@/lib/items";
import { ItemImage, TabBar, tint } from "@/lib/tabs";

export default function WorthItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => { loadItems().then(all => setItem(all.find(i => i.id === id) ?? null)); }, [id]);

  if (item === undefined) return <main className="tabscreen"><TabBar /></main>;
  if (item === null) {
    return (
      <main className="tabscreen">
        <div className="scroll" style={{ padding: "22px 20px 110px" }}><Link href="/earn/worth" className="back">← Worth</Link><p className="lead">We couldn&apos;t find that piece.</p></div>
        <TabBar />
      </main>
    );
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(listingText(item)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const toggleSell = async () => {
    const next = item.pick === "sell" ? null : "sell";
    setItem({ ...item, pick: next });
    await setPick(item.id, next);
  };

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div style={{ background: tint(item.store), padding: "20px 20px 26px", borderRadius: "0 0 36px 36px" }}>
          <Link href="/earn/worth" style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 14px", borderRadius: 999, background: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>← Worth</Link>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: 20 }}>
            <div style={{ transform: "rotate(-3deg)", boxShadow: "0 10px 24px rgba(20,18,16,.12)", borderRadius: 22 }}>
              <ItemImage src={item.image_url} store={item.store} w={110} h={138} radius={22} size={52} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div className="kicker">{item.brand || item.store}{item.size ? ` · size ${item.size}` : ""}</div>
              <h1 className="serif" style={{ fontWeight: 400, fontSize: 30, lineHeight: 1.05, margin: "6px 0 0" }}>{item.name}</h1>
              <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>
                {item.price != null ? `You paid ${money(item.price)} ` : "Bought "}in {new Date(item.ordered_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
              </div>
            </div>
          </div>
        </div>

        <div style={{ margin: "18px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px" }}>
          <div style={{ fontSize: 14, color: "#C9C3BC" }}>Worth about</div>
          <div className="serif" style={{ fontSize: 44, lineHeight: 1, marginTop: 4 }}>{money(item.resale_low ?? 0)}–{money(item.resale_high ?? 0)}</div>
          {item.resale_note && <div style={{ fontSize: 14, color: "#C9C3BC", marginTop: 10, lineHeight: 1.45 }}>{item.resale_note}</div>}
          <div style={{ fontSize: 12, color: "#8F8983", marginTop: 8 }}>AI estimate for good used condition.</div>
        </div>

        <div className="section"><div>Sell it</div></div>
        <div style={{ margin: "12px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={copy} className="btn" style={{ height: 50, fontSize: 15 }}>{copied ? "Listing copied" : "Copy listing"}</button>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 4 }}>Title, size and description, ready to paste.</div>
          {SITES.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "12px 16px", textDecoration: "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.note}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Open →</span>
            </a>
          ))}
          <button onClick={toggleSell} className="btn btn-line" style={{ height: 48, fontSize: 15 }}>{item.pick === "sell" ? "✓ Marked to sell" : "Mark to sell"}</button>
        </div>
      </div>
      <TabBar />
    </main>
  );
}
