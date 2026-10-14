"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type Item, loadItems, setPick, whoFor } from "@/lib/items";
import { ItemImage, tint } from "@/lib/tabs";

type Pick = NonNullable<Item["pick"]>;
const DIR: Record<Pick, [number, number]> = { share: [520, 40], private: [-520, 40], sell: [0, -760] };
const THRESHOLD = 110;

export default function Sort() {
  const [deck, setDeck] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [hist, setHist] = useState<Pick[]>([]);
  const [d, setD] = useState({ x: 0, y: 0, drag: false, fly: false });
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { loadItems().then(all => setDeck(all.filter(x => !x.pick && x.image_url && whoFor(x, all) === "me"))); }, []);

  const card = deck?.[i];
  const total = deck?.length ?? 0;
  const count = (p: Pick) => hist.filter(h => h === p).length;

  const decide = (p: Pick) => {
    if (!card || d.fly) return;
    const [x, y] = DIR[p];
    setD({ x, y, drag: false, fly: true });
    setPick(card.id, p);
    setTimeout(() => { setHist(h => [...h, p]); setI(n => n + 1); setD({ x: 0, y: 0, drag: false, fly: false }); }, 260);
  };
  const undo = () => {
    if (!i || d.fly || !deck) return;
    setPick(deck[i - 1].id, null);
    setHist(h => h.slice(0, -1));
    setI(n => n - 1);
  };

  const down = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (start.current) setD({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, drag: true, fly: false }); };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    if (d.x > THRESHOLD) decide("share");
    else if (d.x < -THRESHOLD) decide("private");
    else if (d.y < -THRESHOLD) decide("sell");
    else setD({ x: 0, y: 0, drag: false, fly: false });
  };

  const op = (v: number) => Math.max(0, Math.min(1, v / THRESHOLD));
  const finished = deck !== null && i >= total;

  return (
    <main className="screen" style={{ paddingTop: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/closet" className="back" style={{ padding: "0 14px" }}>Finish later</Link>
        {!finished && <button onClick={undo} disabled={!i} className="back" style={{ border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, padding: "0 14px", opacity: i ? 1 : 0.4 }}>Undo</button>}
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
          <h1 className="h1" style={{ fontSize: 36, marginTop: 20 }}>Sort your <em>pieces</em></h1>
          <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((i / total) * 100)}%`, background: "var(--ink)", transition: "width .3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>
            <span>{i + 1} of {total}</span>
            <span>{count("share")} shared · {count("sell")} to sell · {count("private")} private</span>
          </div>

          <div style={{ position: "relative", flex: 1, minHeight: 300, marginTop: 18 }}>
            {[2, 1].map(k => deck[i + k] && (
              <div key={k} style={{ position: "absolute", inset: 0, borderRadius: 30, background: tint(deck[i + k].store), transform: `translateY(${k * 10}px) scale(${1 - k * 0.04})`, opacity: 0.7 }} />
            ))}
            <div
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{
                position: "absolute", inset: 0, borderRadius: 30, background: "#fff", border: "1.5px solid var(--line)", boxShadow: "0 14px 34px rgba(20,18,16,.12)",
                touchAction: "none", cursor: "grab", userSelect: "none", display: "flex", flexDirection: "column", overflow: "hidden",
                transform: `translate(${d.x}px, ${d.y}px) rotate(${d.x / 18}deg)`, transition: d.drag ? "none" : "transform .28s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div style={{ position: "absolute", top: 18, left: 18, zIndex: 2, border: "3px solid #2F7A4F", color: "#2F7A4F", borderRadius: 10, padding: "4px 10px", fontWeight: 700, transform: "rotate(-10deg)", opacity: op(d.x) }}>SHARE</div>
              <div style={{ position: "absolute", top: 18, right: 18, zIndex: 2, border: "3px solid #7A746D", color: "#7A746D", borderRadius: 10, padding: "4px 10px", fontWeight: 700, transform: "rotate(10deg)", opacity: op(-d.x) }}>PRIVATE</div>
              <div style={{ position: "absolute", top: 18, left: "50%", zIndex: 2, border: "3px solid #8A6D1E", color: "#8A6D1E", borderRadius: 10, padding: "4px 10px", fontWeight: 700, transform: "translateX(-50%)", opacity: op(-d.y - Math.abs(d.x)) }}>SELL</div>
              <div style={{ flex: 1, minHeight: 0, pointerEvents: "none" }}>
                <ItemImage src={card.image_url} store={card.store} w="100%" h="100%" radius={0} size={96} />
              </div>
              <div style={{ padding: "14px 18px 18px", pointerEvents: "none" }}>
                <div className="kicker">{card.brand || card.store}</div>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 4 }}>{card.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {[card.size && `Size ${card.size}`, `bought ${new Date(card.ordered_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => decide("private")} className="btn" style={{ marginTop: 0, height: 52, fontSize: 15 }}>Keep private</button>
            <button onClick={() => decide("sell")} className="btn btn-line" style={{ marginTop: 0, height: 52, fontSize: 15 }}>Sell</button>
            <button onClick={() => decide("share")} className="btn btn-line" style={{ marginTop: 0, height: 52, fontSize: 15 }}>Share</button>
          </div>
          <div className="note">Everything stays private unless you share it. Swipe right to share, left to keep private, up to sell.</div>
        </>
      )}

      {finished && total > 0 && (
        <>
          <h1 className="h1" style={{ fontSize: 40, marginTop: 40 }}>All <em>sorted.</em></h1>
          <p className="lead">{count("share")} to share · {count("sell")} to sell · {count("private")} kept private</p>
          <div className="spacer" />
          <Link href="/closet" className="btn">Back to closet</Link>
        </>
      )}
    </main>
  );
}
