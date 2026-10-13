"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today", icon: <path d="M3 10.5 12 3l9 7.5V21H3z" /> },
  { href: "/orders", label: "Orders", icon: <><path d="M3 7h18v13H3z" /><path d="M3 7 6 3h12l3 4" /></> },
  { href: "/closet", label: "Closet", icon: <><path d="M12 7a2 2 0 1 1 2 2c-1.2.4-2 1-2 2v1" /><path d="M2.5 19 12 12l9.5 7z" /></> },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) || (t.href === "/orders" && path.startsWith("/order/")) ? "on" : ""}>
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
