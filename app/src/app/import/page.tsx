"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { type Order, listIds, readOne } from "@/lib/gmail";
import { ReadItems } from "@/lib/read-items";

const TAGS: Record<string, [string, string]> = {
  order: ["Order", "#DCEBFF"], receipt: ["Receipt", "#DCEFDF"], shipping: ["Shipping", "#FFF0BF"],
  delivered: ["Delivered", "#DCEFDF"], return: ["Return", "#FF6159"], refund: ["Refund", "#EBE3FF"],
};

type Stage = "start" | "scan" | "done" | "reconnect" | "no-access" | "error";

export default function Import() {
  const [stage, setStage] = useState<Stage>("start");
  const [orders, setOrders] = useState(0);
  const [read, setRead] = useState(0);
  const [total, setTotal] = useState(0);
  const [latest, setLatest] = useState<Order[]>([]);
  const [skipped, setSkipped] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const sb = supabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.provider_token;
      if (!token) return setStage("reconnect");
      setStage("scan");
      try {
        const ids = await listIds(token);
        setTotal(ids.length);
        const pending: Order[] = [];
        const keys = new Set<string>();
        // Only real shopping orders are saved. Each batch is screened first;
        // non-orders and sensitive emails are dropped and never stored.
        const flush = async () => {
          if (!pending.length) return;
          const batch = pending.splice(0);
          const { data: res, error } = await sb.functions.invoke("screen-emails", {
            body: { emails: batch.map(o => ({ id: o.gmail_id, from: o.from ?? o.store, subject: o.subject, snippet: o.snippet })) },
          });
          if (error) { setSkipped(n => n + batch.length); return; }
          const keep = new Set<string>(res?.keep ?? []);
          const rows = batch.filter(o => keep.has(o.gmail_id)).map(o => {
            const row = { ...o };
            delete row.from;
            delete row.snippet;
            return row;
          });
          if (rows.length) await sb.from("orders").upsert(rows, { onConflict: "user_id,gmail_id", ignoreDuplicates: true });
          for (const o of rows) {
            const key = o.order_no ? `${o.store}|${o.order_no}` : o.gmail_id;
            if ((o.kind === "order" || o.kind === "receipt" || o.order_no) && !keys.has(key)) {
              keys.add(key);
              setOrders(keys.size);
              setLatest(l => [o, ...l.filter(x => x.store !== o.store)].slice(0, 4));
            }
          }
        };
        let next = 0;
        const worker = async () => {
          while (next < ids.length) {
            const id = ids[next++];
            const o = await readOne(id, token).catch(e => { if (e.message === "expired" || e.message === "no-access") throw e; return null; });
            setRead(r => r + 1);
            if (!o) continue;
            pending.push(o);
            if (pending.length >= 40) await flush();
          }
        };
        await Promise.all(Array.from({ length: 4 }, worker));
        await flush();
        setStage("done");
      } catch (e) {
        const m = (e as Error).message;
        setStage(m === "expired" ? "reconnect" : m === "no-access" ? "no-access" : "error");
      }
    })();
  }, []);

  const working = stage === "scan" || stage === "start";
  const pct = total ? Math.round((read / total) * 100) : 0;

  if (stage === "reconnect" || stage === "error" || stage === "no-access") {
    return (
      <main className="screen">
        <h1 className="h1">{stage === "error" ? <>Something went <em>wrong.</em></> : stage === "no-access" ? <>One box to <em>tick.</em></> : <>Let&apos;s connect <em>Gmail.</em></>}</h1>
        <p className="lead">{stage === "error" ? "We couldn't finish reading your inbox. Try again in a minute."
          : stage === "no-access" ? "You're signed in, but Google didn't give us permission to read your email. Try again and tick the box that says Actually can read your email."
          : "We need a quick okay from Google to find your past orders."}</p>
        <div className="spacer" />
        <Link href="/permission" className="btn">Connect Gmail</Link>
        <Link href="/today" className="btn btn-ghost">Not now</Link>
      </main>
    );
  }

  return (
    <main className="screen" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
        {working && <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>}
        {working ? (total ? `Reading ${read} of ${total} shopping emails` : "Finding your shopping emails") : "All done"}
      </div>
      <div className="serif" style={{ fontSize: 120, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 18 }}>{orders}</div>
      <div style={{ fontSize: 17, marginTop: 6 }}>past orders found</div>
      <div style={{ marginTop: 18, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${stage === "done" ? 100 : pct}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
      </div>

      {latest.length > 0 && <div className="serif" style={{ marginTop: 24, fontSize: 22 }}>Just found</div>}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {latest.map(o => {
          const [tag, bg] = TAGS[o.kind] ?? TAGS.order;
          return (
            <div key={o.gmail_id} className="found" style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 14px 10px 10px" }}>
              <div className="art serif" style={{ width: 42, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontStyle: "italic" }}>{o.store.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.store}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.subject}</div>
              </div>
              <div style={{ background: bg, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{tag}</div>
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      {working && <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Keep this screen open for a minute while we read.</p>}
      {stage === "done" && orders > 0 && (
        <div style={{ margin: "0 0 16px" }}>
          <div className="serif" style={{ fontSize: 20, marginBottom: 8 }}>Now finding what you bought</div>
          <ReadItems auto />
        </div>
      )}
      {stage === "done" && skipped > 0 && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{skipped} emails couldn&apos;t be checked and were skipped. Run this again later to pick them up.</p>}
      {stage === "done" && orders === 0 && <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>No orders found in this inbox. Try another email you shop with.</p>}
      <Link href="/reveal" className="btn" style={working ? { opacity: 0.4, pointerEvents: "none" } : undefined}>See my orders</Link>
    </main>
  );
}
