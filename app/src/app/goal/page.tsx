"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Art, Back } from "@/lib/ui";
import { type Goal, loadProfile, saveProfile, syncProfile } from "@/lib/profile";

const OPTS: { k: Goal; t: string; s: string; img: string; tint: string }[] = [
  { k: "org", t: "Keep my orders organized", s: "Returns, deliveries and sizes, all in one place.", img: "acc-tote-tan", tint: "#FFF6F3" },
  { k: "earn", t: "Earn on what I buy", s: "Cash back at your brands, and points used before they expire.", img: "beauty-lip-oil-rose", tint: "#FFFBEA" },
  { k: "share", t: "Share and discover", s: "Show friends what you love. Find people who shop like you.", img: "tops-cashmere-lilac", tint: "#F7F3FF" },
];

export default function GoalPage() {
  const [on, setOn] = useState<Record<Goal, boolean>>({ org: true, earn: false, share: false });
  useEffect(() => setOn(loadProfile().goals), []);

  const pick = (k: Goal) => {
    const next = { ...on, [k]: !on[k] };
    setOn(next);
    saveProfile({ goals: next });
    syncProfile();
  };

  return (
    <main className="screen" style={{ paddingTop: 20 }}>
      <Back href="/claim" />
      <h1 className="h1" style={{ fontSize: 40, lineHeight: 1.02, marginTop: 26 }}>What do you want <em>most?</em></h1>
      <p className="lead" style={{ marginTop: 10 }}>Pick any. You get all of it either way. This just decides what you see first.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        {OPTS.map(o => {
          const sel = on[o.k];
          return (
            <button
              key={o.k} type="button" className="opt" onClick={() => pick(o.k)} aria-pressed={sel}
              style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--ink)",
                border: `2px solid ${sel ? "var(--ink)" : "var(--line)"}`, background: sel ? o.tint : "#fff", borderRadius: 24, padding: "12px 16px 12px 12px",
                boxShadow: sel ? "0 10px 24px rgba(20,18,16,.10)" : "none",
              }}
            >
              <Art src={o.img} w={64} h={78} radius={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 21, lineHeight: 1.1 }}>{o.t}</div>
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 4, lineHeight: 1.35 }}>{o.s}</div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", border: `2px solid ${sel ? "var(--ink)" : "var(--line)"}`, background: sel ? "var(--ink)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {sel && <svg className="tickIn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="spacer" />
      <Link href="/live" className="btn">Continue</Link>
    </main>
  );
}
