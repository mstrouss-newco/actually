"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KIND, type Reward, daysUntil, fmtDay, loadRewards, money, scanRewards } from "@/lib/earn";
import { Job } from "@/lib/read-items";
import { StoreTile, TabBar } from "@/lib/tabs";

export default function Points() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const load = useCallback(() => { loadRewards().then(setRewards); }, []);
  useEffect(load, [load]);

  const list = rewards ?? [];
  const cash = list.reduce((s, r) => s + (r.value ?? 0), 0);
  const expiring = list.filter(r => r.expires_on && daysUntil(r.expires_on) <= 30).reduce((s, r) => s + (r.value ?? 0), 0);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <Link href="/earn" className="back">← Earn</Link>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>Points and credit</h1>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Everything stores owe you, found in your email.</div>
        </div>

        {list.length > 0 && (
          <div style={{ margin: "18px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px" }}>
            <div className="kicker" style={{ color: "#C9C3BC" }}>Ready to use</div>
            <div className="serif" style={{ fontSize: 52, lineHeight: 1, marginTop: 6 }}>{money(cash)}</div>
            {expiring > 0 && <div style={{ fontSize: 14, color: "#FFB4AB", marginTop: 6 }}>{money(expiring)} of it expires in the next 30 days.</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 0" }}>
          {rewards !== null && list.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>No balances found yet.</div>}
          {list.map(r => {
            const left = r.expires_on ? daysUntil(r.expires_on) : null;
            return (
              <div key={`${r.store}|${r.kind}`} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 22, padding: "12px 14px 12px 12px" }}>
                <StoreTile store={r.store} w={46} h={46} radius={14} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.store}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)" }}>
                    {r.points != null ? `${r.points.toLocaleString("en-US")} points` : KIND[r.kind]}
                    {r.expires_on ? ` · gone after ${fmtDay(r.expires_on)}` : " · no expiry found"}
                  </div>
                  {r.store_domain && <a href={`https://www.${r.store_domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700 }}>Use at {r.store} →</a>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="serif" style={{ fontSize: 22 }}>{r.value != null ? money(r.value) : "–"}</div>
                  {left != null && left <= 30 && <div style={{ background: "#FF6159", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 700, marginTop: 4 }}>{left}d left</div>}
                </div>
              </div>
            );
          })}
        </div>

        {rewards !== null && (
          <div style={{ padding: "18px 16px 0" }}>
            <Job run={scanRewards} label="Check for new points" working="Checking email" noun={["balance found", "balances found"]} onDone={load} />
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--muted)", padding: "14px 20px 0", lineHeight: 1.45 }}>Balances come from the latest email each store sent. Check the store&apos;s app to be sure before you shop.</div>
      </div>
      <TabBar />
    </main>
  );
}
