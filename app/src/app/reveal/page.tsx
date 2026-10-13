"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Art } from "@/lib/ui";
import { type Goal, loadProfile, mainGoal } from "@/lib/profile";

type Card = { n: string; nBg: string; bg: string; t: string; s: string; sColor: string };
type View = { big: string; line: React.ReactNode; size: number; cards: Card[]; next: [string, string]; alt: [string, string] };

// Sample results until Gmail is connected. One version per goal.
const VIEWS: Record<Goal, View> = {
  org: {
    big: "214", size: 32, line: <>past orders from 38 stores, since <em>2023.</em></>,
    cards: [
      { n: "2", nBg: "#FF6159", bg: "#FFE1DC", t: "Returns still open", s: "Zara closes Friday. Reformation next week.", sColor: "#6B4A44" },
      { n: "12", nBg: "#fff", bg: "#DCEBFF", t: "Brands with your size", s: "Nike 10, Adidas 9.5, Levi's 28 and more.", sColor: "#3E5C8E" },
      { n: "$20", nBg: "#fff", bg: "#FFF0BF", t: "Sephora points about to expire", s: "2,000 points, gone after Oct 31.", sColor: "#7A6A3A" },
    ],
    next: ["/today", "Continue"], alt: ["/permission", "Add another email you shop with"],
  },
  earn: {
    big: "$188", size: 30, line: <>you can still get back, found in 214 past orders.</>,
    cards: [
      { n: "$20", nBg: "#fff", bg: "#FFF0BF", t: "Sephora points expire Oct 31", s: "2,000 points. Use them on your next order.", sColor: "#7A6A3A" },
      { n: "$168", nBg: "#FF6159", bg: "#FFE1DC", t: "Back if you return 2 orders", s: "Zara closes Friday. Reformation next week.", sColor: "#6B4A44" },
      { n: "6%", nBg: "#fff", bg: "#DCEBFF", t: "Cash back at Nike, your top brand", s: "Aritzia 4%, Everlane 5% and 3 more.", sColor: "#3E5C8E" },
    ],
    next: ["/today", "Continue"], alt: ["/permission", "Add another email you shop with"],
  },
  share: {
    big: "47", size: 30, line: <>things you bought that are worth <em>showing off.</em></>,
    cards: [
      { n: "12", nBg: "#fff", bg: "#EBE3FF", t: "People who shop like you", s: "Same brands, same sizes. See what they own.", sColor: "#5B4A8A" },
      { n: "3", nBg: "#fff", bg: "#DCEFDF", t: "Friends already here", s: "Alex, Jess and Priya. Follow their feeds.", sColor: "#3F6B4C" },
      { n: "$", nBg: "#fff", bg: "#FFF0BF", t: "Earn from your feed", s: "When friends buy something you shared, you get cash back.", sColor: "#7A746D" },
    ],
    next: ["/today", "Pick what to share"], alt: ["/today", "Later, take me to my orders"],
  },
};

export default function Reveal() {
  const [goal, setGoal] = useState<Goal>("org");
  useEffect(() => setGoal(mainGoal(loadProfile())), []);
  const v = VIEWS[goal];

  return (
    <main className="screen">
      <div style={{ display: "flex", marginTop: 6 }}>
        <Art src="shoes-runner-sky" w={58} h={74} radius={14} style={{ transform: "rotate(-10deg) translateX(10px)" }} />
        <Art src="dresses-slip-apricot" w={58} h={74} radius={14} style={{ transform: "translateY(-6px)", zIndex: 1, boxShadow: "0 8px 16px rgba(0,0,0,.08)" }} />
        <Art src="tops-cashmere-lilac" w={58} h={74} radius={14} style={{ transform: "rotate(10deg) translateX(-10px)" }} />
      </div>
      <div className="serif" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 22 }}>{v.big}</div>
      <h1 className="h1" style={{ fontSize: v.size, lineHeight: 1.06, marginTop: 10 }}>{v.line}</h1>

      <div key={goal} style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {v.cards.map(c => (
          <div key={c.t} className="card" style={{ background: c.bg, borderRadius: 24, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ minWidth: 42, height: 42, padding: "0 6px", borderRadius: 999, background: c.nBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: c.n.length > 2 ? 15 : 18, flex: "none" }}>{c.n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.t}</div>
              <div style={{ fontSize: 13, color: c.sColor }}>{c.s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <Link href={v.next[0]} className="btn">{v.next[1]}</Link>
      <Link href={v.alt[0]} className="btn btn-ghost">{v.alt[1]}</Link>
    </main>
  );
}
