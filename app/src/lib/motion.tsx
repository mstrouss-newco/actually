"use client";

import { useEffect, useState } from "react";

// Stagger: each item in a list starts a little after the one before it.
export const delay = (i: number, step = 60) => ({ animationDelay: `${Math.min(i, 10) * step + 80}ms` });

// A number that counts up from 0 when it first shows.
export function useCountUp(target: number, ms = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) { setN(0); return; }
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

// A small burst of confetti.
const BITS: [number, number, string, number][] = [[-120, -90, "#FF6159", 0], [110, -100, "#FFD34D", .05], [-90, 60, "#7AC7A0", .1], [130, 40, "#8AB4F8", 0], [-30, -130, "#B79CF2", .08], [40, 110, "#FF6159", .12], [-140, -10, "#FFD34D", .06], [150, -40, "#7AC7A0", .02]];
export function Confetti() {
  return (
    <div className="boom" aria-hidden="true">
      {BITS.map(([x, y, c, d], i) => <span key={i} style={{ ["--x" as string]: `${x}px`, ["--y" as string]: `${y}px`, background: c, animationDelay: `${d}s` }} />)}
    </div>
  );
}

// Four-step tracking bar with a dot that slides forward and pulses.
export function TrackBar({ step, light = false }: { step: number; light?: boolean }) {
  const pct = [6, 36, 68, 100][Math.max(0, Math.min(3, step))];
  return (
    <div>
      <div style={{ position: "relative", height: 7, borderRadius: 4, background: light ? "rgba(20,18,16,.12)" : "#EAE6E1" }}>
        <div className="barfill" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 4, background: "var(--ink)" }} />
        <div className={`dotslide${step < 3 ? " ping" : ""}`} style={{ position: "absolute", left: `${pct}%`, top: "50%", width: 18, height: 18, margin: "-9px 0 0 -9px", borderRadius: "50%", background: "var(--ink)", border: "3px solid #fff", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 8 }}>
        {["Ordered", "Shipped", "Out for delivery", "Delivered"].map((s, i) => <span key={s} style={{ color: i === step ? "var(--ink)" : undefined, whiteSpace: "nowrap" }}>{s}</span>)}
      </div>
    </div>
  );
}
