"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/lib/nav";
import { CATS, type Item, brandOf, loadItems, shortSize, sizesByBrand, whoFor } from "@/lib/items";
import { type OrderGroup, boughtInStore, dayLabel, fmtDate, isArriving, isReturn, loadOrders, orderTitle, returnBy, returnDaysLeft, ruleText, windowDays } from "@/lib/orders";
import { ItemImage, StoreTile, TabBar, tint } from "@/lib/tabs";
import { delay } from "@/lib/motion";
import { type BrandFollow, brandSuggestions, followBrands, loadFollows, setFollowPrefs, unfollowBrand } from "@/lib/brands";

const PREFS: [keyof Omit<BrandFollow, "brand">, string, string][] = [
  ["sales", "Sales", "When they mark things down"],
  ["arrivals", "New arrivals", "New pieces in your size"],
  ["drops", "Price drops on my pieces", "So you can ask for the difference"],
];

// Follow / Following, what she wants to hear about, and brands their fans also follow.
function FollowBlock({ name }: { name: string }) {
  const [f, setF] = useState<BrandFollow | null | undefined>(undefined);
  const [also, setAlso] = useState<{ brand: string; share: number }[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  useEffect(() => {
    loadFollows().then(list => setF(list.find(x => x.brand === name) ?? null));
    brandSuggestions(name).then(setAlso);
  }, [name]);
  if (f === undefined) return null;
  const toggleFollow = async () => {
    if (f) { setF(null); await unfollowBrand(name); }
    else { setF({ brand: name, sales: true, arrivals: true, drops: true }); await followBrands([name]); }
  };
  const flip = async (k: keyof Omit<BrandFollow, "brand">) => {
    if (!f) return;
    const next = { ...f, [k]: !f[k] };
    setF(next);
    await setFollowPrefs(name, { [k]: next[k] });
  };
  return (
    <>
      <div style={{ padding: "16px 20px 0" }}>
        <button type="button" onClick={toggleFollow} className="press" style={{ height: 42, padding: "0 20px", borderRadius: 999, border: "1.5px solid var(--ink)", background: f ? "#fff" : "var(--ink)", color: f ? "var(--ink)" : "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>
          {f ? "✓ Following" : "Follow"}
        </button>
      </div>
      {f && (
        <div className="up" style={{ padding: "16px 20px 0" }}>
          <div className="serif" style={{ fontSize: 20 }}>Tell me about</div>
          <div style={{ marginTop: 6 }}>
            {PREFS.map(([k, label, sub]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div></div>
                <button type="button" role="switch" aria-checked={f[k]} aria-label={label} onClick={() => flip(k)} style={{ width: 46, height: 28, borderRadius: 999, border: 0, background: f[k] ? "var(--ink)" : "#E2DDD7", position: "relative", cursor: "pointer", flex: "none" }}>
                  <span style={{ position: "absolute", top: 3, left: f[k] ? 21 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {also.length > 0 && (
        <div style={{ padding: "18px 20px 0" }}>
          <div className="serif" style={{ fontSize: 20 }}>You might also like</div>
          {also.map(a => (
            <div key={a.brand} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.brand}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Followed by {Math.round(a.share * 100)}% of {name} fans</div>
              </div>
              <button type="button" disabled={added.has(a.brand)} onClick={async () => { setAdded(s => new Set(s).add(a.brand)); await followBrands([a.brand]); }} style={{ height: 34, padding: "0 14px", borderRadius: 999, border: "1.5px solid var(--ink)", background: added.has(a.brand) ? "var(--ink)" : "#fff", color: added.has(a.brand) ? "#fff" : "var(--ink)", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" }}>
                {added.has(a.brand) ? "✓ Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const month = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

function OrderRow({ g }: { g: OrderGroup }) {
  const left = returnDaysLeft(g);
  const [sub, pill, bg] = isArriving(g) ? ["On its way", "Arriving", "#FFF0BF"]
    : left ? [`Return by ${dayLabel(returnBy(g))}`, `${left} ${left === 1 ? "day" : "days"} left`, "#FFE1DC"]
    : isReturn(g) ? [`${g.stage === "refunded" ? "Refunded" : "Return started"} ${fmtDate(g.last_at)}`, g.stage === "refunded" ? "Refunded" : "Returning", "#F4F1EE"]
    : [`Ordered ${fmtDate(g.ordered_at)}`, null, ""];
  return (
    <Link href={`/order/${encodeURIComponent(g.key)}`} className="orow" style={{ display: "flex", alignItems: "center", gap: 14, background: "#FAF8F6", borderRadius: 22, padding: "12px 16px 12px 12px", textDecoration: "none" }}>
      <ItemImage src={g.photo} store={g.store} name={g.items[0] ?? g.what ?? undefined} domain={g.store_domain} w={56} h={68} radius={14} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orderTitle(g)}</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{sub}</div>
      </div>
      {pill && <div style={{ background: bg, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{pill}</div>}
    </Link>
  );
}

// "Levi's" + "'s" reads badly; names ending in s just get an apostrophe.
const owns = (n: string) => /s$/i.test(n) ? `${n}'` : `${n}'s`;

export default function Brand({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent(use(params).name);
  const [items, setItems] = useState<Item[] | null>(null);
  // Emails for this brand's pieces bought for kids or someone else, so their orders stay off her page.
  const [others, setOthers] = useState<Set<string | undefined>>(new Set());
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  useEffect(() => {
    loadItems().then(all => {
      const here = all.filter(i => brandOf(i) === name);
      setItems(here.filter(i => whoFor(i, all) === "me"));
      setOthers(new Set(here.filter(i => whoFor(i, all) !== "me").map(i => i.gmail_id)));
    });
    loadOrders().then(g => setOrders(g ?? []));
  }, [name]);

  const mine = items ?? [];
  const emails = new Set(mine.map(i => i.gmail_id));
  const key = name.toLowerCase();
  const theirs = orders.filter(g => g.events.some(e => emails.has(e.gmail_id))
    || (g.store.toLowerCase() === key && !g.events.some(e => others.has(e.gmail_id))));
  const open = theirs.filter(g => isArriving(g) || returnDaysLeft(g) || isReturn(g)).slice(0, 6);
  // Past orders only when they add something beyond the pieces already shown.
  const shown = new Set(mine.map(i => i.gmail_id));
  const past = theirs.filter(g => !open.includes(g) && !g.events.some(e => shown.has(e.gmail_id))).slice(0, 8);
  const sizes = sizesByBrand(mine)[0]?.sizes.slice(0, 4) ?? [];
  const first = [...theirs.map(g => g.ordered_at), ...mine.map(i => i.ordered_at)].sort()[0];
  // Bought through another shop (Relwen at Huckberry): returns go to that shop.
  const shops = [...new Set(mine.map(i => i.store))];
  const returnTo = shops.length === 1 ? shops[0] : name;
  const count = theirs.length || new Set(mine.map(i => i.gmail_id)).size;
  // What she's spent on this brand, from the piece prices.
  const spentHere = Math.round(mine.reduce((s, i) => s + (i.price != null ? Number(i.price) : 0), 0));
  // The shop's own rule, from any of its emails.
  const ruled = theirs.find(g => ruleText(g));
  const rule = ruled ? ruleText(ruled) : null;

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div style={{ background: tint(name), padding: `20px 20px ${sizes.length ? 64 : 28}px`, borderRadius: "0 0 36px 36px" }}>
          <BackLink fallback="/closet?view=brands" style={{ height: 40, padding: "0 14px 0 8px", background: "#fff", fontSize: 14 }} />
          <div style={{ marginTop: 24 }}><StoreTile store={name} w={64} h={64} radius={18} size={28} /></div>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: name.length > 20 ? 30 : name.length > 12 ? 36 : 48, lineHeight: 1.15, letterSpacing: "-0.03em", margin: "14px 0 0", overflowWrap: "break-word", hyphens: "auto" }}>{name}</h1>
          {items && <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>{count} {count === 1 ? "order" : "orders"}{first && new Date(first).getFullYear() < new Date().getFullYear() ? ` since ${new Date(first).getFullYear()}` : ""}{spentHere > 0 ? ` · $${spentHere.toLocaleString("en-US")} spent` : ""}{mine[0] ? ` · last one ${fmtDate(mine[0].ordered_at)}` : ""}</div>}
        </div>

        {sizes.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "0 20px", marginTop: -40, position: "relative" }}>
              {sizes.map(s => (
                <div key={s.cat} className="tilt" style={{ flex: "0 1 auto", minWidth: 64, background: "#fff", borderRadius: 16, padding: "8px 12px 9px", boxShadow: "0 8px 20px rgba(20,18,16,.10)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.15, whiteSpace: "nowrap" }}>{shortSize(s.size, s.cat)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 2 }}>{CATS.find(c => c[0] === s.cat)?.[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Your usual size here, from what you bought</div>
          </>
        )}

        <FollowBlock name={name} />

        {open.length > 0 && (
          <>
            <div className="serif" style={{ padding: "24px 20px 0", fontSize: 24 }}>Open orders</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>{open.map(g => <OrderRow key={g.key} g={g} />)}</div>
          </>
        )}

        {(mine.length > 0 || theirs.length > 0) && <div style={{ margin: "22px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="serif" style={{ fontSize: 24 }}>Returning to {returnTo}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12 }}><span style={{ color: "#B9B3AC" }}>Window</span><span style={{ fontWeight: 700, textAlign: "right" }}>{ruled?.returnDays ? `${windowDays(ruled)} days from ${boughtInStore(ruled) ? "purchase" : "delivery"}` : "Not stated, usually 30 days"}</span></div>
          {ruled?.returnNote && !/^final sale$/i.test(ruled.returnNote) && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12 }}><span style={{ color: "#B9B3AC" }}>Policy</span><span style={{ fontWeight: 700, textAlign: "right" }}>{ruled.returnNote}</span></div>}
          <div style={{ height: 1, background: "#2E2B28" }} />
          <div style={{ fontSize: 13, color: "#B9B3AC", lineHeight: 1.4 }}>{rule ? `From ${owns(ruled!.store)} email: ${rule}.` : `${owns(returnTo)} emails don't say. Most stores allow 30 days, so check their site before you send something back.`}</div>
        </div>}

        {mine.length > 0 && (
          <>
            <div className="section"><div>Your {name} pieces</div><Link href="/closet">In closet</Link></div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 20px 4px" }}>
              {mine.slice(0, 20).map((i, n) => (
                <div key={i.id} className="up" style={{ ...delay(n, 60), flex: "none", width: 132, display: "flex", flexDirection: "column", gap: 6 }}>
                  <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} label="" w={132} h={164} radius={22} size={44} />
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{[mine.some(o => o !== i && o.name === i.name) && i.color, i.size && `Size ${i.size}`, month(i.ordered_at)].filter(Boolean).join(" · ")}</div>
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
