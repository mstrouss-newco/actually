"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type OrderGroup, blockStore, fmtDate, gmailLink, loadOrders, orderTitle, removeOrder, returnDaysLeft } from "@/lib/orders";
import { StoreTile, TabBar, tint } from "@/lib/tabs";

const LABEL: Record<string, string> = {
  order: "Ordered", receipt: "Receipt", shipping: "Shipped", delivered: "Delivered", return: "Return started", refund: "Refunded",
};

export default function OrderDetail({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderGroup | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<"remove" | "block" | null>(null);
  const [removed, setRemoved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Keep the confirm buttons in view, above the menu.
  useEffect(() => { if (confirm) box.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [confirm]);
  // Removing waits 8 seconds so Undo can catch a slip.
  const removeSoon = (g: OrderGroup) => {
    setRemoved(true);
    timer.current = setTimeout(async () => { await removeOrder(g); router.replace("/orders"); }, 8000);
  };
  const undoRemove = () => { if (timer.current) clearTimeout(timer.current); setRemoved(false); setConfirm(null); };
  useEffect(() => {
    const k = decodeURIComponent(key);
    loadOrders().then(list => setOrder(list?.find(g => g.key === k) ?? null));
  }, [key]);

  if (order === undefined) return <main className="tabscreen"><TabBar /></main>;
  if (order === null) {
    return (
      <main className="tabscreen">
        <div className="scroll" style={{ padding: "22px 20px 110px" }}>
          <Link href="/orders" className="back">← Orders</Link>
          <p className="lead">We couldn&apos;t find that order.</p>
        </div>
        <TabBar />
      </main>
    );
  }

  const left = returnDaysLeft(order);
  const first = order.events[0];
  const bg = tint(order.store);

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div style={{ background: bg, padding: "20px 20px 26px", borderRadius: "0 0 36px 36px" }}>
          <Link href="/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 40, padding: "0 14px 0 8px", borderRadius: 999, background: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>Orders
          </Link>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: 20 }}>
            <div style={{ transform: "rotate(-3deg)", boxShadow: "0 10px 24px rgba(20,18,16,.12)", borderRadius: 22 }}>
              <StoreTile store={order.store} domain={order.store_domain} w={104} h={130} radius={22} size={52} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div className="kicker">{order.store}</div>
              <h1 className="serif" style={{ fontWeight: 400, fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.02em", margin: "6px 0 0", overflowWrap: "anywhere" }}>{orderTitle(order)}</h1>
              <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>Ordered {fmtDate(order.ordered_at)}</div>
            </div>
          </div>
        </div>

        {left != null && (
          <div style={{ margin: "18px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div className="serif" style={{ fontSize: 24 }}>Probably still returnable</div>
              <div style={{ background: "#FF6159", color: "var(--ink)", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>~{left} days</div>
            </div>
            <div style={{ fontSize: 14, color: "#C9C3BC", marginTop: 8, lineHeight: 1.45 }}>Delivered {fmtDate(order.last_at)}. Most stores allow 30 days. Check {order.store}&apos;s policy to be sure.</div>
          </div>
        )}

        <div style={{ padding: "26px 20px 0" }} className="serif"><span style={{ fontSize: 24 }}>Updates</span></div>
        <div style={{ margin: "12px 16px 0", background: "#FAF8F6", borderRadius: 24, padding: 18 }}>
          {order.events.map((e, i) => (
            <div key={e.gmail_id} style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--ink)", flex: "none", marginTop: 3 }} />
                <span style={{ width: 2, flex: 1, background: i < order.events.length - 1 ? "var(--ink)" : "transparent", minHeight: 22 }} />
              </div>
              <div style={{ paddingBottom: 14, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{LABEL[e.kind] ?? "Update"}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{fmtDate(e.at)}{e.subject ? ` · ${e.subject}` : ""}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "26px 20px 0" }} className="serif"><span style={{ fontSize: 24 }}>Receipt</span></div>
        <div style={{ margin: "12px 16px 0", border: "1.5px solid var(--line)", borderRadius: 24, padding: 18, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Ordered</span><span style={{ fontWeight: 700 }}>{new Date(order.ordered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
          {order.order_no && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Order number</span><span style={{ fontWeight: 700 }}>{order.order_no}</span></div>}
          {order.amount != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Total</span><span style={{ fontWeight: 700 }}>${order.amount.toFixed(2)}</span></div>}
          {first.gmail_id.startsWith("rs_")
            ? <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>Came in through your shopping email. A copy is in your inbox.</div>
            : <a href={gmailLink(first.gmail_id)} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", height: 46, borderRadius: 999, border: "1.5px solid var(--ink)", fontWeight: 700, textDecoration: "none" }}>Open the original email</a>}
        </div>

        <div ref={box} style={{ margin: "22px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {removed ? (
            <div style={{ background: "var(--ink)", color: "#fff", borderRadius: 22, padding: "12px 12px 12px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <span style={{ flex: 1 }}>Removed. Taking you back to Orders.</span>
              <button onClick={undoRemove} style={{ border: 0, background: "#fff", color: "var(--ink)", borderRadius: 999, padding: "8px 16px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Undo</button>
            </div>
          ) : confirm ? (
            <div style={{ background: "#FFE1DC", borderRadius: 22, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{confirm === "remove" ? "Remove this order?" : `Never show ${order.store}?`}</div>
              <div style={{ fontSize: 13, color: "#6B4A44", marginTop: 4, lineHeight: 1.4 }}>
                {confirm === "remove" ? "It's removed from Actually. Your email stays in your inbox. You'll have 8 seconds to undo." : `Everything from ${order.store} is deleted, and future emails from them are skipped.`}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-line" style={{ marginTop: 0, height: 44, fontSize: 14 }} onClick={() => setConfirm(null)}>Cancel</button>
                <button className="btn" style={{ height: 44, fontSize: 14, background: "#C9402F" }} onClick={async () => {
                  if (confirm === "remove") return removeSoon(order);
                  await blockStore(order);
                  router.replace("/orders");
                }}>{confirm === "remove" ? "Remove" : "Never show"}</button>
              </div>
              {confirm === "remove" && <button onClick={() => setConfirm("block")} style={{ border: 0, background: "none", padding: 0, marginTop: 12, font: "inherit", fontSize: 13, color: "#6B4A44", textDecoration: "underline", cursor: "pointer" }}>Hide everything from {order.store} instead</button>}
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ marginTop: 0, fontSize: 14, color: "var(--soft)" }} onClick={() => setConfirm("remove")}>Not an order? Remove it</button>
          )}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
