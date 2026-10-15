"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type Reward, closetWorth, daysUntil, fmtDay, listNames, listNames as names, loadRewards, money, programName, scanRewards, valueItems, worth } from "@/lib/earn";
import { type OrderGroup, loadOrders } from "@/lib/orders";
import { type Item, loadItems, whoFor } from "@/lib/items";
import { Job } from "@/lib/read-items";
import { ItemImage, StoreTile, TabBar } from "@/lib/tabs";
import { delay, useCountUp } from "@/lib/motion";

export default function Earn() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [groups, setGroups] = useState<OrderGroup[] | null>(null);
  const load = useCallback(() => { loadRewards().then(setRewards); loadOrders().then(setGroups); loadItems().then(all => setItems(all.filter(i => whoFor(i, all) === "me"))); }, []);
  useEffect(load, [load]);

  const cash = (rewards ?? []).reduce((s, r) => s + (r.value ?? 0), 0);
  const soon = (rewards ?? []).find(r => r.expires_on && daysUntil(r.expires_on) <= 30);
  const priced = (items ?? []).filter(i => i.resale_high != null);
  // Counted: arrived, priced and worth listing. Same rule as the Worth page.
  const { counted: valued, unpriced } = closetWorth(items ?? [], groups);
  const [lo, hi] = worth(valued);
  const loN = useCountUp(Math.round(lo)), hiN = useCountUp(Math.round(hi)), cashN = useCountUp(Math.round(cash));
  const unpricedNames = (items ?? []).filter(i => i.resale_high == null).map(i => i.name);
  const ranked = [...valued].sort((a, b) => (b.resale_high ?? 0) - (a.resale_high ?? 0));
  const top = ranked[0];
  // The three priciest pieces with a photo, fanned out like the design.
  const fan = ranked.filter(i => i.image_url).slice(0, 3);
  const logos = [...(rewards ?? [])].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 3);
  const points = (rewards ?? []).filter(r => !r.value && r.points);
  const pts = points.reduce((s, r) => s + (r.points ?? 0), 0);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Earn</h1>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Money you already have, and money in your closet.</div>
        </div>

        <div className="up" style={{ ...delay(0), margin: "18px 16px 0", background: "#FFF0BF", borderRadius: 28, padding: "20px 18px" }}>
          <div className="kicker" style={{ color: "#8A6D1E" }}>Points and credit</div>
          {rewards && rewards.length > 0 ? (
            <Link href="/earn/points" style={{ textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                <div className="serif glow" style={{ fontSize: cash ? 52 : 40, lineHeight: 1 }}>{cash ? money(cashN) : `${pts.toLocaleString("en-US")} points`}</div>
                {logos.length > 0 && (
                  <div style={{ display: "flex", flex: "none", paddingBottom: 4 }}>
                    {logos.map((r, i) => (
                      <div key={r.store} style={{ marginLeft: i ? -10 : 0, borderRadius: 14, border: "2px solid #FFF0BF" }}>
                        <StoreTile store={r.store} domain={r.store_domain} w={40} h={40} radius={12} size={18} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, color: "#7A6A3A", marginTop: 6, lineHeight: 1.4 }}>
                {cash > 0 && <>Ready to use at {rewards.filter(r => r.value).length} {rewards.filter(r => r.value).length === 1 ? "store" : "stores"}.</>}
                {points.length > 0 && <>{cash > 0 ? " Plus points" : "Points"} at {listNames(points.map(r => programName(r.store)))}.</>}
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

        <div className="up" style={{ ...delay(1, 120), margin: "12px 16px 0", background: "#EBE3FF", borderRadius: 28, padding: "20px 18px" }}>
          <div className="kicker" style={{ color: "#5B44B0" }}>What your closet is worth</div>
          {priced.length > 0 ? (
            <Link href="/earn/worth" style={{ textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                <div className="serif glow" style={{ fontSize: 40, lineHeight: 1, minWidth: 0 }}>{money(loN)}–{money(hiN)}</div>
                {fan.length > 0 && (
                  <div style={{ display: "flex", flex: "none" }}>
                    {fan.map((i, n) => (
                      <div key={i.id} className="fanin" style={{ ...delay(n + 3, 110), marginLeft: n ? -14 : 0, transform: `rotate(${[-6, 3, -2][n]}deg)`, borderRadius: 12, boxShadow: "0 4px 10px rgba(20,18,16,.14)" }}>
                        <ItemImage src={i.image_url} store={i.store} name={i.name} w={46} h={58} radius={12} size={18} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(91,68,176,.15)", marginTop: 14 }}><div className="barfill" style={{ height: "100%", width: `${Math.round(100 * valued.length / Math.max(1, (items ?? []).length))}%`, borderRadius: 4, background: "#5B44B0" }} /></div>
              <div style={{ fontSize: 14, color: "#5B4A8A", marginTop: 8, lineHeight: 1.4 }}>
                Estimated resale value of {valued.length} of your {(items ?? []).length} {(items ?? []).length === 1 ? "piece" : "pieces"}.{top && top.resale_high ? ` Your ${top.brand || top.store} ${top.name} could sell for up to ${money(top.resale_high)}.` : ""}
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
              <Job run={valueItems} label={priced.length ? `Price ${unpriced} new ${unpriced === 1 ? "piece" : "pieces"}` : "Price my closet"} working="Pricing" noun={["piece priced", "pieces priced"]} onDone={load} />
              <div style={{ fontSize: 12, color: "#5B4A8A", marginTop: 8 }}>{unpricedNames.length <= 3 ? `New: ${names(unpricedNames)}. ` : ""}Takes about a minute.</div>
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
