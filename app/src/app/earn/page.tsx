"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type Reward, daysUntil, fmtDay, loadRewards, money, scanRewards, valueItems, worth } from "@/lib/earn";
import { type Item, loadItems } from "@/lib/items";
import { Job } from "@/lib/read-items";
import { TabBar } from "@/lib/tabs";

export default function Earn() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(() => { loadRewards().then(setRewards); loadItems().then(setItems); }, []);
  useEffect(load, [load]);

  const cash = (rewards ?? []).reduce((s, r) => s + (r.value ?? 0), 0);
  const soon = (rewards ?? []).find(r => r.expires_on && daysUntil(r.expires_on) <= 30);
  const priced = (items ?? []).filter(i => i.resale_high != null);
  const unpriced = (items ?? []).length - priced.length;
  // Pieces worth under $10 (socks, cases) aren't worth listing, so they don't count.
  const valued = priced.filter(i => (i.resale_high ?? 0) >= 10);
  const [lo, hi] = worth(valued);
  const top = [...valued].sort((a, b) => (b.resale_high ?? 0) - (a.resale_high ?? 0))[0];

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Earn</h1>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Money you already have, and money in your closet.</div>
        </div>

        <div style={{ margin: "18px 16px 0", background: "#FFF0BF", borderRadius: 28, padding: "20px 18px" }}>
          <div className="kicker" style={{ color: "#8A6D1E" }}>Points and credit</div>
          {rewards && rewards.length > 0 ? (
            <Link href="/earn/points" style={{ textDecoration: "none", display: "block" }}>
              <div className="serif" style={{ fontSize: 52, lineHeight: 1, marginTop: 8 }}>{money(cash)}</div>
              <div style={{ fontSize: 14, color: "#7A6A3A", marginTop: 6, lineHeight: 1.4 }}>
                Ready to use across {rewards.length} {rewards.length === 1 ? "store" : "stores"}.
                {soon && <> {soon.store} {soon.value != null ? money(soon.value) : "points"} expire {fmtDay(soon.expires_on!)}.</>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }}>See all →</div>
            </Link>
          ) : (
            <>
              <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 8 }}>Find points and credit stores owe you.</div>
              <div style={{ fontSize: 14, color: "#7A6A3A", margin: "8px 0 14px", lineHeight: 1.4 }}>We check your rewards and store credit emails and list what&apos;s still good.</div>
              {rewards !== null && <Job run={scanRewards} label="Find my points" working="Checking email" noun={["balance found", "balances found"]} onDone={load} />}
            </>
          )}
        </div>

        <div style={{ margin: "12px 16px 0", background: "#EBE3FF", borderRadius: 28, padding: "20px 18px" }}>
          <div className="kicker" style={{ color: "#5B44B0" }}>What your closet is worth</div>
          {priced.length > 0 ? (
            <Link href="/earn/worth" style={{ textDecoration: "none", display: "block" }}>
              <div className="serif" style={{ fontSize: 44, lineHeight: 1, marginTop: 8 }}>{money(lo)}–{money(hi)}</div>
              <div style={{ fontSize: 14, color: "#5B4A8A", marginTop: 6, lineHeight: 1.4 }}>
                Estimated resale value of {valued.length} pieces.{top && top.resale_high ? ` Your ${top.brand || top.store} ${top.name} could sell for up to ${money(top.resale_high)}.` : ""}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }}>See what sells →</div>
            </Link>
          ) : (
            <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 8 }}>See what your pieces would sell for.</div>
          )}
          {items !== null && items.length === 0 && (
            <div style={{ fontSize: 14, color: "#5B4A8A", marginTop: 8 }}>Fill your closet first. <Link href="/closet" style={{ fontWeight: 700 }}>Go to Closet</Link></div>
          )}
          {items !== null && unpriced > 0 && (
            <div style={{ marginTop: 14 }}>
              <Job run={valueItems} label={priced.length ? `Price ${unpriced} new pieces` : "Price my closet"} working="Pricing" noun={["piece priced", "pieces priced"]} onDone={load} />
              <div style={{ fontSize: 12, color: "#5B4A8A", marginTop: 8 }}>Takes about a minute. Clothes, shoes, bags and accessories only.</div>
            </div>
          )}
        </div>

        <div className="section"><div>Cash back</div></div>
        <div style={{ margin: "12px 16px 0", border: "1.5px dashed #D9D3CC", borderRadius: 24, padding: "18px" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Coming soon</div>
          <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6, lineHeight: 1.45 }}>Shop your favorite brands through Actually and get cash back on every order. We&apos;ll let you know when it&apos;s on.</div>
        </div>
      </div>
      <TabBar />
    </main>
  );
}
