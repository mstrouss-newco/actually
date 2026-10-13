"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const TABS = [
  { href: "/today", label: "Today", icon: <path d="M3 10.5 12 3l9 7.5V21H3z" /> },
  { href: "/orders", label: "Orders", icon: <><path d="M3 7h18v13H3z" /><path d="M3 7 6 3h12l3 4" /></> },
  { href: "/closet", label: "Closet", icon: <><path d="M12 7a2 2 0 1 1 2 2c-1.2.4-2 1-2 2v1" /><path d="M2.5 19 12 12l9.5 7z" /></> },
  { href: "/feed", label: "Feed", icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6" /><path d="M18 14.5a5.5 5.5 0 0 1 3 5.5" /></> },
  { href: "/earn", label: "Earn", icon: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12.5h18" /><path d="M12 8C10 4 6 4 6 6.5S12 8 12 8s6-1 6-1.5S14 4 12 8z" /></> },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) || (t.href === "/orders" && path.startsWith("/order/")) || (t.href === "/feed" && /^\/(people|u\/)/.test(path)) ? "on" : ""}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

const TINTS = ["#DCEBFF", "#DCEFDF", "#FFE3CC", "#FFE1DC", "#EBE3FF", "#FFF0BF"];
export const tint = (s: string) => TINTS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];

// Stand-in picture for an order until we have product photos: the store's first letter.
export function StoreTile({ store, w, h, radius = 18, size = 28 }: { store: string; w: number; h: number; radius?: number; size?: number }) {
  return (
    <div className="serif" style={{ width: w, height: h, borderRadius: radius, background: tint(store), flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, fontStyle: "italic" }}>
      {store.charAt(0).toUpperCase()}
    </div>
  );
}

// Four-step progress bar: placed, shipped, out, delivered.
export function Progress({ step, h = 4 }: { step: number; h?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2, 3].map(i => <span key={i} style={{ flex: 1, height: h, borderRadius: h, background: i <= step ? "var(--ink)" : "#EAE6E1" }} />)}
    </div>
  );
}

// Product photo from the order email, or the store letter if there isn't one or it won't load.
export function ItemImage({ src, store, w, h, radius = 18, size = 28 }: { src: string | null; store: string; w: number | string; h: number | string; radius?: number; size?: number }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return (
      <div className="serif" style={{ width: w, height: h, borderRadius: radius, background: tint(store), flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, fontStyle: "italic" }}>
        {store.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "var(--tile)", flex: "none", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", padding: "8%", mixBlendMode: "multiply" }} />
    </div>
  );
}
