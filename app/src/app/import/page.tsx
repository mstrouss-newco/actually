"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Art } from "@/lib/ui";

// Sample results until Gmail is connected.
const TOTAL = 214;
const FOUND = [
  { img: "shoes-runner-sky", at: 12, t: "Size 10 at Nike", tag: "Size", bg: "#DCEBFF" },
  { img: "tops-overshirt-rose", at: 45, t: "Zara overshirt, return still open", tag: "Return", bg: "#FF6159" },
  { img: "shoes-sneaker-black-gum", at: 90, t: "Size 9.5 at Adidas", tag: "Size", bg: "#DCEBFF" },
  { img: "tops-turtleneck-butter", at: 140, t: "Aritzia sweater on the way", tag: "Shipping", bg: "#FFF0BF" },
  { img: "beauty-lip-oil-rose", at: 190, t: "Sephora points expiring", tag: "Points", bg: "#EBE3FF" },
];

export default function Import() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN(v => (v >= TOTAL ? (clearInterval(t), v) : Math.min(TOTAL, v + 3))), 70);
    return () => clearInterval(t);
  }, []);

  const working = n < TOTAL;
  const shown = FOUND.filter(f => n >= f.at).reverse().slice(0, 4);

  return (
    <main className="screen" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
        {working && <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>}
        {working ? "Finding your past orders" : "All done"}
      </div>
      <div className="serif" style={{ fontSize: 120, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 18 }}>{n}</div>
      <div style={{ fontSize: 17, marginTop: 6 }}>past orders found</div>
      <div style={{ marginTop: 18, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round((n / TOTAL) * 100)}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
      </div>

      <div className="serif" style={{ marginTop: 24, fontSize: 22 }}>Just found</div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(f => (
          <div key={f.img} className="found" style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 14px 10px 10px" }}>
            <Art src={f.img} w={42} h={52} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{f.t}</div>
            <div style={{ background: f.bg, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{f.tag}</div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      {working && <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>This keeps going if you leave. We&apos;ll tell you when it&apos;s done.</p>}
      <Link href="/reveal" className="btn">See my orders</Link>
    </main>
  );
}
