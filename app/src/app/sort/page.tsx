"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/lib/nav";
import { type Item, brandOf, loadItems, setPick, setPicks, toSort } from "@/lib/items";
import { loadOrders, returnsByEmail } from "@/lib/orders";
import { ItemImage } from "@/lib/tabs";

type Pick = NonNullable<Item["pick"]>;
const DIR: Record<Pick, [number, number]> = { share: [520, 40], private: [-520, 40], sell: [0, -760] };
const THRESHOLD = 110;

export default function Sort() {
  const [deck, setDeck] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [hist, setHist] = useState<Pick[]>([]);
  const [d, setD] = useState({ x: 0, y: 0, drag: false, fly: false });
  const start = useRef<{ x: number; y: number } | null>(null);

  // Pieces she sent back don't go in the deck.
  useEffect(() => {
    Promise.all([loadItems(), loadOrders()]).then(([all, groups]) => {
      const rets = returnsByEmail(groups ?? []);
      setDeck(toSort(all).filter(x => !rets.get(x.gmail_id ?? "")?.returned));
    });
  }, []);

  const card = deck?.[i];
  const total = deck?.length ?? 0;
  const count = (p: Pick) => hist.filter(h => h === p).length;

  const decide = (p: Pick) => {
    if (!card || d.fly) return;
    const [x, y] = DIR[p];
    setD({ x, y, drag: false, fly: true });
    setPick(card, p);
    setTimeout(() => { setHist(h => [...h, p]); setI(n => n + 1); setD({ x: 0, y: 0, drag: false, fly: false }); }, 260);
  };
  // Where "Keep all left private" started, so Undo puts the whole batch back.
  const batch = useRef<number | null>(null);
  const undo = () => {
    if (!i || d.fly || !deck) return;
    if (batch.current !== null && i >= total) {
      const from = batch.current;
      batch.current = null;
      setPicks(deck.slice(from).flatMap(x => x.ids ?? [x.id]), null);
      setHist(h => h.slice(0, from));
      setI(from);
      return;
    }
    setPick(deck[i - 1], null);
    setHist(h => h.slice(0, -1));
    setI(n => n - 1);
  };

  // Uses the pointer's own position on release, so a quick flick counts even before the screen redraws.
  const down = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (start.current) setD({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, drag: true, fly: false }); };
  const up = (e: React.PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
    start.current = null;
    if (x > THRESHOLD) decide("share");
    else if (x < -THRESHOLD) decide("private");
    else if (y < -THRESHOLD) decide("sell");
    else setD({ x: 0, y: 0, drag: false, fly: false });
  };

  const op = (v: number) => Math.max(0, Math.min(1, v / THRESHOLD));
  const finished = deck !== null && i >= total;
  const restPrivate = () => {
    if (!deck || d.fly) return;
    const rest = deck.slice(i);
    batch.current = i;
    setPicks(rest.flatMap(x => x.ids ?? [x.id]), "private");
    setHist(h => [...h, ...rest.map(() => "private" as Pick)]);
    setI(total);
  };
  const shared = (deck ?? []).filter((_, n) => hist[n] === "share");
  const fan = (shared.length >= 3 ? shared : deck ?? []).slice(0, 3);
  const last = hist.at(-1);
  const idle = d.x === 0 && d.y === 0;
  const hint: React.CSSProperties = { border: 0, background: "none", padding: 0, font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
  const stamp = (color: string, rot: number): React.CSSProperties => ({ position: "absolute", top: 22, zIndex: 2, border: `3px solid ${color}`, color, borderRadius: 12, padding: "6px 12px", font: "700 20px var(--font-sans), sans-serif", letterSpacing: ".06em", transform: `rotate(${rot}deg)`, background: "rgba(255,255,255,.8)" });

  return (
    <main className="screen" style={{ padding: "20px 20px 26px", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BackLink fallback="/closet" label={finished ? "Done" : "Later"} style={{ padding: "0 14px 0 8px" }} />
        {!finished && (
          <button onClick={undo} disabled={!i} style={{ height: 36, padding: "0 14px", borderRadius: 999, border: 0, background: "transparent", font: "700 13px var(--font-sans), sans-serif", color: i ? "var(--ink)" : "#C9C3BC", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>Undo
          </button>
        )}
      </div>

      {deck === null && <p className="lead">Loading your pieces…</p>}

      {deck !== null && total === 0 && (
        <>
          <h1 className="h1" style={{ fontSize: 38 }}>Nothing to <em>sort.</em></h1>
          <p className="lead">Every piece already has a spot. New orders show up here as they arrive.</p>
          <div className="spacer" />
          <Link href="/closet" className="btn">Back to closet</Link>
        </>
      )}

      {card && (
        <>
          <div className="serif" style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.02em", marginTop: 14 }}>Pick what to <em>share</em></div>
          <div style={{ fontSize: 13, color: "#2F5C3E", fontWeight: 700, marginTop: 6 }}>You could earn when a friend buys something you shared.</div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((i / total) * 100)}%`, background: "var(--ink)", borderRadius: 3, transition: "width .3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>{i + 1} of {total}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span key={`s${count("share")}`} className={last === "share" ? "bump" : ""} style={{ background: "#DCEFDF", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{count("share")} shared</span>
              {count("sell") > 0 && <span key={`l${count("sell")}`} className={last === "sell" ? "bump" : ""} style={{ background: "#FFF0BF", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{count("sell")} to sell</span>}
              <span key={`p${count("private")}`} className={last === "private" ? "bump" : ""} style={{ background: "var(--chip)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{count("private")} private</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Your feed is the page friends follow. It shows the photo, brand and name only.</div>

          <div style={{ position: "relative", flex: 1, minHeight: 280, marginTop: 16 }}>
            {deck[i + 2] && <div style={{ position: "absolute", inset: "26px 26px 0", borderRadius: 32, background: "#E4DED6", transform: "scale(.9) translateY(24px)" }} />}
            {deck[i + 1] && <div style={{ position: "absolute", inset: "14px 14px 0", borderRadius: 32, background: "#ECE7E0", transform: "scale(.95) translateY(12px)", boxShadow: "0 8px 20px rgba(20,18,16,.06)" }} />}
            <div
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setD({ x: 0, y: 0, drag: false, fly: false }); }}
              style={{
                position: "absolute", inset: 0, borderRadius: 32, background: "var(--tile)", boxShadow: "0 20px 44px rgba(20,18,16,.18)",
                touchAction: "none", cursor: "grab", userSelect: "none", overflow: "hidden",
                transform: `translate(${d.x}px, ${d.y}px) rotate(${d.x / 18}deg)`, transition: d.drag ? "none" : "transform .28s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div style={{ ...stamp("#2F7A4F", -12), left: 20, opacity: op(d.x) }}>SHARE</div>
              <div style={{ ...stamp("#141210", 12), right: 20, opacity: op(-d.x) }}>PRIVATE</div>
              <div style={{ ...stamp("#8A6D1E", 0), left: "50%", translate: "-50% 0", opacity: op(-d.y - Math.abs(d.x)) }}>SELL</div>
              <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,.85)", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", opacity: idle ? 1 : 0, transition: "opacity .15s" }}>From your {card.store} orders</div>
              <div style={{ position: "absolute", left: "14%", right: "14%", top: 56, bottom: 128, pointerEvents: "none" }}>
                <ItemImage cutId={card.id} src={card.image_url} store={card.store} name={card.name} w="100%" h="100%" radius={0} size={96} />
              </div>
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "#fff", borderRadius: 24, padding: "16px 18px", pointerEvents: "none" }}>
                <div className="kicker">{brandOf(card)}</div>
                <div className="serif" style={{ fontSize: card.name.length > 22 ? 22 : 26, lineHeight: 1.1, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.name}</div>
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 4 }}>
                  {[card.size && `Size ${card.size}`, `bought ${new Date(card.ordered_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 6px" }}>
            <button onClick={() => decide("private")} className="nl" style={hint}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Keep private</button>
            <button onClick={() => decide("sell")} style={{ ...hint, fontSize: 12, fontWeight: 500 }}>Swipe up to sell</button>
            <button onClick={() => decide("share")} className="nr" style={{ ...hint, color: "#2F7A4F" }}>Share<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </div>
          {/* Stop any time: the rest stay unsorted and wait here for next time. */}
          <Link href="/feed?tab=mine" className="btn btn-line press" style={{ marginTop: 12, height: 46, fontSize: 15 }}>Show my feed</Link>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>The other {total - i} {total - i === 1 ? "piece waits" : "pieces wait"} here for later.</div>
          {total - i > 1 && <button onClick={restPrivate} style={{ marginTop: 4, height: 32, border: 0, background: "transparent", font: "500 12px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}>Keep all {total - i} left private</button>}
        </>
      )}

      {finished && total > 0 && (
        <div className="rise" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", marginBottom: 26 }}>
            {fan.map((x, n) => (
              <div key={x.id} style={{ transform: ["rotate(-10deg) translateX(14px)", "translateY(-8px)", "rotate(10deg) translateX(-14px)"][n], zIndex: n === 1 ? 1 : 0, boxShadow: n === 1 ? "0 10px 20px rgba(0,0,0,.1)" : "none", borderRadius: 18 }}>
                <ItemImage cutId={x.id} src={x.image_url} store={x.store} name={x.name} w={70} h={88} radius={18} size={26} />
              </div>
            ))}
          </div>
          {count("share") > 0
            ? <div className="serif" style={{ fontSize: 40, lineHeight: 1 }}>Your feed is <em>ready.</em></div>
            : <div className="serif" style={{ fontSize: 40, lineHeight: 1 }}>All <em>sorted.</em></div>}
          <div style={{ fontSize: 15, color: "var(--muted)", marginTop: 12 }}>{[`${count("share")} shared`, count("sell") && `${count("sell")} to sell`, `${count("private")} kept private`].filter(Boolean).join(" · ")}</div>
          {count("share") === 0 && <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, maxWidth: 280, lineHeight: 1.4 }}>Nothing is shared. You can share any piece later from your closet.</div>}
          <button onClick={undo} style={{ marginTop: 14, border: 0, background: "none", font: "700 14px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}>Undo</button>
          <Link href={count("share") ? "/feed?tab=mine" : "/closet"} className="btn" style={{ marginTop: 18, width: "auto", padding: "0 32px" }}>{count("share") ? "See my feed" : "Back to closet"}</Link>
          <Link href="/people" style={{ marginTop: 8, height: 44, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, color: "#5B44B0", textDecoration: "none" }}>Find friends to follow</Link>
        </div>
      )}
    </main>
  );
}
