"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeScreenTip } from "@/lib/home-tip";
import { type BrandFollow, brandsAsked, loadFollows } from "@/lib/brands";
import { useRouter } from "next/navigation";
import { type OrderGroup, SOON, cleanupOnce, clearOrdersCache, dayLabel, etaText, isArriving, loadOrders, orderTitle, refreshArriving, returnBy, returnDaysLeft, shortTitle, fmtDate, trackStep, justArrived } from "@/lib/orders";
import { gmailToken, supabase } from "@/lib/supabase";
import { Avatar } from "@/lib/feed-ui";
import { DOMAIN, loadProfile, saveProfile } from "@/lib/profile";
import { type Reward, daysUntil, fmtDay, loadRewards, money, programName } from "@/lib/earn";
import { type Item, brandOf, loadItems, monthPieces, whoFor } from "@/lib/items";
import { ItemImage, StoreTile, TabBar, tint } from "@/lib/tabs";
import { TrackBar, delay } from "@/lib/motion";

type Slide = { key: string; href: string; bg: string; kc: string; kicker: string; title: string; sub: string; img: React.ReactNode; badge: React.ReactNode };
const MONTH = () => new Date().toLocaleDateString("en-US", { month: "long" });

// The shopping email used to be a sign-up step. Now it's a small card she can copy or close.
function ShopEmailCard({ handle }: { handle: string }) {
  const [hide, setHide] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setHide(!!localStorage.getItem("shop-email-card")); } catch { setHide(false); } }, []);
  if (!handle || hide) return null;
  const email = `${handle}@${DOMAIN}`;
  const close = () => { try { localStorage.setItem("shop-email-card", "1"); } catch {} setHide(true); };
  const copy = async () => { try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  return (
    <div className="drop" style={{ margin: "14px 16px 0", border: "1.5px dashed #E2DDD7", borderRadius: 22, padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Your shopping email</div>
        <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Use it at checkout and new orders show up here.</div>
      </div>
      <button type="button" onClick={copy} className="press" style={{ height: 36, padding: "0 14px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer", flex: "none" }}>{copied ? "Copied" : "Copy"}</button>
      <button type="button" onClick={close} aria-label="Close" style={{ width: 30, height: 30, border: 0, background: "none", cursor: "pointer", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

export default function Today() {
  const [orders, setOrders] = useState<OrderGroup[] | null | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [first, setFirst] = useState("");
  const [gmailOn, setGmailOn] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const router = useRouter();
  const [follows, setFollows] = useState<BrandFollow[]>([]);
  useEffect(() => {
    setName(loadProfile().handle);
    // Greet her by her real first name (from Google). Also fill in her name if this device lost it.
    (async () => {
      const sb = supabase();
      const { data } = await sb.auth.getUser();
      const m = (data.user?.user_metadata ?? {}) as Record<string, string | undefined>;
      const f = (m.given_name || m.full_name || m.name || "").split(" ")[0];
      if (f) setFirst(f);
      if (data.user && !loadProfile().handle) {
        const { data: p } = await sb.from("profiles").select("handle").eq("id", data.user.id).maybeSingle();
        if (p?.handle) { saveProfile({ handle: p.handle }); setName(p.handle); }
      }
    })();
    loadOrders().then(async list => {
      setOrders(list);
      if (!list) return;
      // Already connected but nothing found yet: don't send her back to connect again.
      if (!list.length) gmailToken().then(t => setGmailOn(!!t)).catch(() => null);
      loadRewards().then(setRewards);
      loadItems().then(async all => {
        setItems(all);
        const [asked, f] = await Promise.all([brandsAsked(), loadFollows()]);
        setFollows(f);
        // Once her closet has pieces, ask her which brands she loves (one time only).
        if (!asked && all.some(i => whoFor(i, all) === "me")) router.replace("/follow");
      });
      // Look up delivery dates for orders on the way that don't have one yet.
      if (list.some(g => isArriving(g) && !g.eta)) {
        const token = await gmailToken().catch(() => null);
        if (token && await refreshArriving(list, token)) loadOrders().then(setOrders);
      }
    });
    // First visit after sign-in: tidy up anything that isn't a real shopping order.
    cleanupOnce().then(changed => { if (changed) loadOrders().then(setOrders); });
  }, [router]);

  // A new Gmail check finished: show what came in.
  useEffect(() => {
    const fresh = () => { clearOrdersCache(); loadOrders().then(setOrders); loadItems().then(setItems); };
    addEventListener("orders-updated", fresh);
    return () => removeEventListener("orders-updated", fresh);
  }, []);
  const all = orders ?? [];
  const arriving = all.filter(isArriving);
  const canReturn = all.filter(g => returnDaysLeft(g) != null).sort((a, b) => returnDaysLeft(a)! - returnDaysLeft(b)!);
  const closing = canReturn.filter(g => returnDaysLeft(g)! <= SOON);
  const returns = all.filter(g => g.stage === "returning");
  const greet = first || (name ? name.split(".")[0].replace(/\d+$/, "").replace(/^./, c => c.toUpperCase()) : "");
  const hello = hour == null ? "Hi" : hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const mine = items.filter(i => whoFor(i, items) === "me");
  // Only pieces that arrived in the last 45 days.
  const landed = mine.filter(i => i.image_url && !i.arriving && Date.now() - Date.parse(i.ordered_at) < 45 * 86400000).slice(0, 8);
  const month = monthPieces(items);
  const reward = [...rewards].sort((a, b) => (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999") || (b.value ?? 0) - (a.value ?? 0))[0];

  // The big card: the most timely things, one at a time.
  const slides: Slide[] = [];
  const nextIn = arriving.find(g => g.photo) ?? arriving[0];
  if (nextIn) slides.push({
    key: "in", href: `/order/${encodeURIComponent(nextIn.key)}`, bg: "#DCEBFF", kc: "#3E5C8E",
    kicker: trackStep(nextIn) === 2 ? "Out for delivery" : nextIn.stage === "shipped" ? "On the way" : "Ordered",
    title: `${shortTitle(nextIn)}${trackStep(nextIn) === 2 ? ", arriving today" : nextIn.pieces.length > 1 ? ", on the way" : " is on its way"}`,
    sub: etaText(nextIn) ?? `${nextIn.stage === "shipped" ? "Shipped" : "Ordered"} ${fmtDate(nextIn.last_at)} from ${nextIn.store}`,
    img: <ItemImage src={nextIn.photo} store={nextIn.store} name={nextIn.items[0] ?? nextIn.what ?? undefined} w={104} h={136} radius={20} size={44} />,
    badge: <div className="serif" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1 }}>{["Placed", "Shipped", "Today", "Here"][trackStep(nextIn)]}</div>,
  });
  const hero = canReturn[0];
  if (hero) {
    const left = returnDaysLeft(hero)!;
    slides.push({
      key: "ret", href: `/order/${encodeURIComponent(hero.key)}`, bg: "#FFE1DC", kc: "#C9402F",
      kicker: "Still returnable", title: `Keep it or send it back?`,
      sub: `${shortTitle(hero)} from ${hero.store}. Return by ${dayLabel(returnBy(hero))}.`,
      img: <ItemImage src={hero.photo} store={hero.store} name={hero.items[0] ?? hero.what ?? undefined} w={104} h={136} radius={20} size={44} />,
      badge: <><div className="serif" style={{ fontWeight: 600, fontSize: 22, lineHeight: 1 }}>{left}</div><div style={{ fontSize: 10, fontWeight: 700 }}>{left === 1 ? "day" : "days"}</div></>,
    });
  }
  if (reward) slides.push({
    key: "pts", href: "/earn/points", bg: "#FFF0BF", kc: "#8A6D1E", kicker: "Found in your email",
    title: reward.value != null ? `${money(reward.value)} at ${programName(reward.store)}` : `${(reward.points ?? 0).toLocaleString("en-US")} ${programName(reward.store)} points`,
    sub: reward.expires_on ? `Use by ${fmtDay(reward.expires_on)}${daysUntil(reward.expires_on) <= 30 ? ". Don't lose it." : ""}` : "Ready when you are.",
    img: <StoreTile store={reward.store} domain={reward.store_domain} w={104} h={136} radius={20} size={44} />,
    badge: <div className="serif" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1 }}>{reward.value != null ? money(reward.value) : "Pts"}</div>,
  });
  if (month.length >= 3) slides.push({
    key: "story", href: "/story", bg: "#EBE3FF", kc: "#5B44B0", kicker: `Your ${MONTH()}`,
    title: `${month.length} new pieces. See your month in style.`, sub: "Your brands, your colors, what's still returnable.",
    img: <ItemImage src={month.find(i => i.image_url)?.image_url ?? null} store={month[0].store} name={month[0].name} w={104} h={136} radius={20} size={44} />,
    badge: <div className="serif" style={{ fontWeight: 600, fontSize: 22, lineHeight: 1 }}>{month.length}</div>,
  });
  else if (landed[0]) slides.push({
    key: "new", href: `/closet?piece=${landed[0]?.id}`, bg: "#DCEFDF", kc: "#3F7A55", kicker: "New in your closet",
    title: landed[0].name, sub: `${landed[0].brand || landed[0].store} · ${fmtDate(landed[0].ordered_at)}`,
    img: <ItemImage cutId={landed[0].id} src={landed[0].image_url} store={landed[0].store} name={landed[0].name} w={104} h={136} radius={20} size={44} />,
    badge: <div className="serif" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1 }}>New</div>,
  });

  const n = slides.length;
  // Moves on every 5 seconds, but holds still while a finger or mouse is on it, and for a while after.
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = () => { setPaused(true); if (resume.current) clearTimeout(resume.current); };
  const release = () => { if (resume.current) clearTimeout(resume.current); resume.current = setTimeout(() => setPaused(false), 6000); };
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setAt(a => (a + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);
  const slide = slides[at % Math.max(1, n)];
  const go = (d: number) => setAt(a => (a + d + n) % n);

  const line = [
    canReturn.length && `${canReturn.length} ${canReturn.length === 1 ? "order" : "orders"} still returnable`,
    arriving.length && `${arriving.length} ${arriving.length === 1 ? "order" : "orders"} on the way`,
  ].filter(Boolean).join(". ");
  const recent = all.filter(g => !isArriving(g) && g.stage !== "cancelled").slice(0, 4);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <div className="logo">Actually</div>
          <div style={{ display: "flex", gap: 8 }}>
          <Link href="/orders?find=1" aria-label="Find an order" className="press" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #EAE6E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </Link>
          <Link href="/settings" aria-label="Settings" className="press" style={{ width: 40, height: 40, borderRadius: "50%", border: name ? 0 : "1.5px solid #EAE6E1", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {name ? <Avatar handle={name} size={40} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>}
          </Link>
          </div>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          <div className="serif" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.02em" }}>{hello}{greet ? `, ${greet}` : ""}.</div>
          <div style={{ fontSize: 15, lineHeight: 1.4, color: "var(--soft)", marginTop: 8 }}>
            {orders === undefined ? "Checking your orders…" : orders === null ? "Sign in to see your orders." : orders.length === 0 ? (gmailOn ? "We didn't find store orders in your inbox yet. New ones will show up here." : "No orders yet.") : line ? <>{line}. {canReturn.length > 0 && <Link href="/orders?tab=canreturn" style={{ fontWeight: 700, color: "var(--ink)" }}>See returns</Link>}</> : "All quiet. Nothing due."}
          </div>
        </div>

        <HomeScreenTip />
        {orders && <ShopEmailCard handle={name} />}

        {(orders === null || (orders?.length === 0 && !gmailOn)) && (
          <div style={{ margin: "18px 16px 0", background: "var(--chip)", borderRadius: 28, padding: "22px 18px" }}>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.05 }}>Bring in your past <em>orders.</em></div>
            <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>Connect Gmail and we&apos;ll find your orders, deliveries and returns.</div>
            <Link href={orders === null ? "/login" : "/permission"} className="btn" style={{ marginTop: 16, height: 48, fontSize: 15 }}>{orders === null ? "Sign in" : "Connect Gmail"}</Link>
          </div>
        )}

        {closing.length > 0 && (
          <Link href="/orders?tab=canreturn" className="drop press" style={{ margin: "14px 16px 0", background: "#FF6159", borderRadius: 22, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <svg className="bell" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{closing.length === 1 ? `Last call: ${orderTitle(closing[0])}` : `${closing.length} returns close soon`}</div>
              <div style={{ fontSize: 13 }}>Last day {dayLabel(returnBy(closing[0]))}. Decide now so you don&apos;t miss it.</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        )}

        {slide && (
          <>
            <div style={{ position: "relative", margin: "22px 16px 0" }}
              onPointerEnter={hold} onPointerLeave={release}
              onPointerDown={e => { startX.current = e.clientX; hold(); }}
              onPointerUp={e => { const s = startX.current; startX.current = null; release(); if (s != null && Math.abs(e.clientX - s) > 40) { e.preventDefault(); go(e.clientX < s ? 1 : -1); } }}
              onPointerCancel={() => { startX.current = null; release(); }}>
              <Link key={slide.key} href={slide.href} className="heroIn press" draggable={false} style={{ background: slide.bg, borderRadius: 28, padding: "20px 18px", display: "flex", gap: 14, position: "relative", textDecoration: "none", minHeight: 196, boxSizing: "border-box" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  <div className="kicker" style={{ color: slide.kc }}>{slide.kicker}</div>
                  <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.02em", overflowWrap: "break-word" }}>{slide.title}</div>
                  <div style={{ fontSize: 13, color: "#5E5852", lineHeight: 1.35, overflowWrap: "break-word" }}>{slide.sub}</div>
                </div>
                <div className="float" style={{ flex: "none", alignSelf: "center", transform: "rotate(4deg)", borderRadius: 20, boxShadow: "0 12px 26px rgba(20,18,16,.14)" }}>{slide.img}</div>
                <div style={{ position: "absolute", top: -10, right: 14, minWidth: 58, height: 58, padding: "0 6px", boxSizing: "border-box", borderRadius: 999, background: "var(--ink)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(8deg)", boxShadow: "0 6px 14px rgba(0,0,0,.14)" }}>{slide.badge}</div>
              </Link>
            </div>
            {n > 1 && (
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 6 }}>
                {slides.map((s, i) => (
                  <button key={s.key} onClick={() => { setAt(i); hold(); release(); }} aria-label={`Card ${i + 1} of ${n}`} style={{ border: 0, background: "none", padding: "10px 3px", cursor: "pointer" }}>
                    <span style={{ display: "block", height: 6, width: i === at % n ? 22 : 6, borderRadius: 3, background: i === at % n ? "var(--ink)" : "#D9D3CC", transition: "width .3s, background .3s" }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {arriving.length > 0 && (
          <>
            <div className="section"><div>On the way</div><Link href="/orders?tab=arriving">All orders</Link></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px 0" }}>
              {arriving.slice(0, 3).map((g, i) => (
                <Link key={g.key} href={`/order/${encodeURIComponent(g.key)}`} className="press up" style={{ ...delay(i, 90), display: "flex", gap: 14, alignItems: "center", background: "#FAF8F6", borderRadius: 24, padding: "12px 16px 12px 12px", textDecoration: "none" }}>
                  <ItemImage src={g.photo} store={g.store} name={g.items[0] ?? g.what ?? undefined} w={72} h={88} radius={16} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="kicker" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.store}{g.pieces.length > 1 ? ` · ${g.pieces.length} pieces` : ""}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{etaText(g) ?? orderTitle(g)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{etaText(g) ? orderTitle(g) : `${g.stage === "shipped" ? "Shipped" : "Ordered"} ${fmtDate(g.last_at)}`}</div>
                    <TrackBar step={trackStep(g)} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {landed.length > 0 && (
          <>
            <div className="section"><div>Just landed</div><Link href="/closet">Closet</Link></div>
            <div className="rail">
              {landed.map((i, k) => (
                <Link key={i.id} href={`/closet?piece=${i.id}`} className="lift up" style={{ ...delay(k, 70), width: 140, flex: "none", textDecoration: "none" }}>
                  <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} label="" w={140} h={172} radius={22} size={56} />
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{i.brand || i.store} · {fmtDate(i.ordered_at)}</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {follows.length > 0 && (
          <>
            <div className="section"><div>Brands you follow</div><Link href="/settings#brands">Edit</Link></div>
            <div className="rail">
              {follows.map((f, k) => {
                const mine = (items ?? []).filter(i => brandOf(i) === f.brand);
                const pic = mine.find(i => i.image_url) ?? mine[0];
                return (
                  <Link key={f.brand} href={`/brand/${encodeURIComponent(f.brand)}`} className="lift up" style={{ ...delay(k, 60), width: 132, flex: "none", textDecoration: "none", background: tint(f.brand), borderRadius: 20, padding: 8 }}>
                    {pic ? <ItemImage cutId={pic.id} src={pic.image_url} store={pic.store} name={pic.name} w={116} h={120} radius={14} /> : <div style={{ height: 120 }} />}
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.brand}</div>
                    <div style={{ fontSize: 12, color: "var(--soft)", padding: "0 4px" }}>{mine.length} {mine.length === 1 ? "piece" : "pieces"}</div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {recent.length > 0 && (
          <>
            <div className="section"><div>Recent</div><Link href="/orders">See all</Link></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 0" }}>
              {recent.map((g, i) => (
                <Link key={g.key} href={`/order/${encodeURIComponent(g.key)}`} className="orow up" style={{ ...delay(i), display: "flex", gap: 12, alignItems: "center", background: "#FAF8F6", borderRadius: 22, padding: "10px 14px 10px 10px", textDecoration: "none" }}>
                  <ItemImage src={g.photo} store={g.store} name={g.items[0] ?? g.what ?? undefined} w={52} h={64} radius={14} size={22} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="kicker">{g.store}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orderTitle(g)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--soft)", whiteSpace: "nowrap" }}>{justArrived(g) ? "Just arrived" : fmtDate(g.last_at)}</div>
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
