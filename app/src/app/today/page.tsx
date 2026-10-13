"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type OrderGroup, isArriving, loadOrders, orderTitle, returnDaysLeft, fmtDate, isReturn } from "@/lib/orders";
import { loadProfile } from "@/lib/profile";
import { Progress, StoreTile, TabBar } from "@/lib/tabs";

const STEP = { placed: 0, shipped: 1, delivered: 3, returning: 3, refunded: 3 };

export default function Today() {
  const [orders, setOrders] = useState<OrderGroup[] | null | undefined>(undefined);
  const [name, setName] = useState("");
  useEffect(() => {
    setName(loadProfile().handle);
    loadOrders().then(setOrders);
  }, []);

  const arriving = (orders ?? []).filter(isArriving);
  const returnable = (orders ?? []).filter(g => returnDaysLeft(g) != null).sort((a, b) => returnDaysLeft(a)! - returnDaysLeft(b)!);
  const returns = (orders ?? []).filter(isReturn);
  const hero = returnable[0];
  const left = hero ? returnDaysLeft(hero)! : 0;
  const greet = name ? name.split(".")[0].replace(/^./, c => c.toUpperCase()) : "";

  const line = [
    returnable.length && `${returnable.length} still returnable`,
    arriving.length && `${arriving.length} ${arriving.length === 1 ? "order" : "orders"} on the way`,
  ].filter(Boolean).join(". ");

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <div className="logo">Actually</div>
          <Link href="/orders" aria-label="Find an order" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #EAE6E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </Link>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          <div className="serif" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.02em" }}>Hi{greet ? `, ${greet}` : ""}.</div>
          <div style={{ fontSize: 15, lineHeight: 1.4, color: "var(--soft)", marginTop: 8 }}>
            {orders === undefined ? "Checking your orders…" : orders === null ? "Sign in to see your orders." : orders.length === 0 ? "No orders yet." : line ? `${line}.` : "All quiet. Nothing due."}
          </div>
        </div>

        {(orders === null || orders?.length === 0) && (
          <div style={{ margin: "18px 16px 0", background: "var(--chip)", borderRadius: 28, padding: "22px 18px" }}>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.05 }}>Bring in your past <em>orders.</em></div>
            <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>Connect Gmail and we&apos;ll find your orders, deliveries and returns.</div>
            <Link href={orders === null ? "/claim" : "/permission"} className="btn" style={{ marginTop: 16, height: 48, fontSize: 15 }}>{orders === null ? "Sign in" : "Connect Gmail"}</Link>
          </div>
        )}

        {hero && (
          <Link href={`/order/${encodeURIComponent(hero.key)}`} style={{ margin: "14px 16px 0", background: "#FFE1DC", borderRadius: 28, padding: "20px 18px", display: "flex", gap: 14, position: "relative", textDecoration: "none" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              <div className="kicker" style={{ color: "#C9402F" }}>Still returnable</div>
              <div className="serif" style={{ fontSize: 28, lineHeight: 1.04, letterSpacing: "-0.02em" }}>Your {hero.store} order, delivered <em>{fmtDate(hero.last_at)}</em></div>
              <div style={{ fontSize: 13, color: "#6B4A44" }}>Most stores allow 30 days.</div>
            </div>
            <StoreTile store={hero.store} w={96} h={124} radius={20} size={44} />
            <div style={{ position: "absolute", top: -10, right: 14, width: 58, height: 58, borderRadius: "50%", background: "#FF6159", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(10deg)", boxShadow: "0 6px 14px rgba(0,0,0,.12)" }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 22, lineHeight: 1 }}>{left}</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{left === 1 ? "day" : "days"}</div>
            </div>
          </Link>
        )}

        {arriving.length > 0 && (
          <>
            <div className="section"><div>On the way</div><Link href="/orders">All orders</Link></div>
            <div className="rail">
              {arriving.map(g => (
                <Link key={g.key} href={`/order/${encodeURIComponent(g.key)}`} className="lift" style={{ width: 148, flex: "none", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none" }}>
                  <div style={{ position: "relative" }}>
                    <StoreTile store={g.store} w={148} h={180} radius={22} size={64} />
                    <div style={{ position: "absolute", top: 10, left: 10, background: "#fff", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{g.stage === "shipped" ? "Shipped" : "Ordered"}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{g.store}</div>
                  <Progress step={STEP[g.stage]} />
                </Link>
              ))}
            </div>
          </>
        )}

        {orders && orders.length > 0 && (
          <>
            <div className="section"><div>Recent</div><Link href="/orders?tab=all">See all</Link></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 0" }}>
              {orders.filter(g => !isArriving(g)).slice(0, 5).map(g => (
                <Link key={g.key} href={`/order/${encodeURIComponent(g.key)}`} className="orow" style={{ display: "flex", gap: 12, alignItems: "center", background: "#FAF8F6", borderRadius: 20, padding: "10px 14px 10px 10px", textDecoration: "none" }}>
                  <StoreTile store={g.store} w={46} h={56} radius={12} size={22} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{g.store}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orderTitle(g)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(g.last_at)}</div>
                </Link>
              ))}
            </div>
            {returns.length > 0 && <div style={{ padding: "14px 20px 0", fontSize: 13, color: "var(--muted)" }}>{returns.length} {returns.length === 1 ? "return" : "returns"} in progress. <Link href="/orders?tab=returns" style={{ fontWeight: 700 }}>See returns</Link></div>}
          </>
        )}
      </div>
      <TabBar />
    </main>
  );
}
