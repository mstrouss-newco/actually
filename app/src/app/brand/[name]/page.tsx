"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CATS, type Item, brandOf, loadItems, sizesByBrand, whoFor } from "@/lib/items";
import { type OrderGroup, fmtDate, isArriving, isReturn, loadOrders, orderTitle, returnDaysLeft } from "@/lib/orders";
import { ItemImage, TabBar, tint } from "@/lib/tabs";

const month = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

function OrderRow({ g }: { g: OrderGroup }) {
  const left = returnDaysLeft(g);
  const [sub, pill, bg] = isArriving(g) ? ["On its way", "Arriving", "#FFF0BF"]
    : left ? [`Delivered ${fmtDate(g.last_at)}`, `${left} ${left === 1 ? "day" : "days"} to return`, "#FFE1DC"]
    : isReturn(g) ? [g.stage === "refunded" ? "Refunded" : "Return started", "Returned", "#F4F1EE"]
    : [`Ordered ${fmtDate(g.ordered_at)}`, null, ""];
  return (
    <Link href={`/order/${encodeURIComponent(g.key)}`} className="orow" style={{ display: "flex", alignItems: "center", gap: 14, background: "#FAF8F6", borderRadius: 22, padding: "12px 16px 12px 12px", textDecoration: "none" }}>
      <ItemImage src={g.photo} store={g.store} domain={g.store_domain} w={56} h={68} radius={14} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orderTitle(g)}</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{sub}</div>
      </div>
      {pill && <div style={{ background: bg, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{pill}</div>}
    </Link>
  );
}

export default function Brand({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent(use(params).name);
  const [items, setItems] = useState<Item[] | null>(null);
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  useEffect(() => {
    loadItems().then(all => setItems(all.filter(i => brandOf(i) === name && whoFor(i, all) === "me")));
    loadOrders().then(g => setOrders(g ?? []));
  }, [name]);

  const mine = items ?? [];
  const emails = new Set(mine.map(i => i.gmail_id));
  const key = name.toLowerCase();
  const theirs = orders.filter(g => g.store.toLowerCase() === key || g.events.some(e => emails.has(e.gmail_id)));
  const open = theirs.filter(g => isArriving(g) || returnDaysLeft(g) || isReturn(g)).slice(0, 6);
  const past = theirs.filter(g => !open.includes(g)).slice(0, 8);
  const sizes = sizesByBrand(mine)[0]?.sizes.slice(0, 4) ?? [];
  const first = [...theirs.map(g => g.ordered_at), ...mine.map(i => i.ordered_at)].sort()[0];
  const count = theirs.length || new Set(mine.map(i => i.gmail_id)).size;

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div style={{ background: tint(name), padding: `20px 20px ${sizes.length ? 64 : 28}px`, borderRadius: "0 0 36px 36px" }}>
          <Link href="/closet?view=brands" className="back" style={{ height: 40, padding: "0 14px 0 8px", background: "#fff", fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>Brands
          </Link>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: name.length > 12 ? 44 : 64, lineHeight: 1, letterSpacing: "-0.03em", margin: "28px 0 0", overflowWrap: "anywhere" }}>{name}</h1>
          {items && <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>{count} {count === 1 ? "order" : "orders"}{first ? ` since ${new Date(first).getFullYear()}` : ""}{mine[0] ? ` · last one ${fmtDate(mine[0].ordered_at)}` : ""}</div>}
        </div>

        {sizes.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "0 20px", marginTop: -40, position: "relative" }}>
              {sizes.map(s => (
                <div key={s.cat} className="tilt" style={{ flex: "1 1 0", maxWidth: 84, minWidth: 0, background: "#fff", borderRadius: 20, padding: "10px 4px 12px", boxShadow: "0 10px 24px rgba(20,18,16,.12)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.1 }}>{s.size}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 2 }}>{CATS.find(c => c[0] === s.cat)?.[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Your usual size here, from what you bought</div>
          </>
        )}

        {open.length > 0 && (
          <>
            <div className="serif" style={{ padding: "24px 20px 0", fontSize: 24 }}>Open with {name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>{open.map(g => <OrderRow key={g.key} g={g} />)}</div>
          </>
        )}

        <div style={{ margin: "22px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="serif" style={{ fontSize: 24 }}>Returning to {name}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "#B9B3AC" }}>Window</span><span style={{ fontWeight: 700 }}>About 30 days</span></div>
          <div style={{ height: 1, background: "#2E2B28" }} />
          <div style={{ fontSize: 13, color: "#B9B3AC", lineHeight: 1.4 }}>Our estimate for now. We&apos;ll add each store&apos;s own rules soon.</div>
        </div>

        {mine.length > 0 && (
          <>
            <div className="section"><div>Your {name} pieces</div><Link href="/closet">In closet</Link></div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 20px 4px" }}>
              {mine.slice(0, 20).map(i => (
                <div key={i.id} style={{ flex: "none", width: 132, display: "flex", flexDirection: "column", gap: 6 }}>
                  <ItemImage src={i.image_url} store={i.store} w={132} h={164} radius={22} size={44} />
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{[i.size && `Size ${i.size}`, month(i.ordered_at)].filter(Boolean).join(" · ")}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <div className="section"><div>Past orders</div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>{past.map(g => <OrderRow key={g.key} g={g} />)}</div>
          </>
        )}
        {items && !mine.length && !theirs.length && <p className="lead" style={{ padding: "0 20px" }}>Nothing from {name} in your closet yet.</p>}
      </div>
      <TabBar />
    </main>
  );
}
