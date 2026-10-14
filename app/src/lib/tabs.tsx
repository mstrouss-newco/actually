"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { type ImportState, importState, onImport } from "./importer";

const TABS = [
  { href: "/today", label: "Today", icon: <path d="M3 10.5 12 3l9 7.5V21H3z" /> },
  { href: "/orders", label: "Orders", icon: <><path d="M3 7h18v13H3z" /><path d="M3 7 6 3h12l3 4" /></> },
  { href: "/closet", label: "Closet", icon: <><path d="M12 7a2 2 0 1 1 2 2c-1.2.4-2 1-2 2v1" /><path d="M2.5 19 12 12l9.5 7z" /></> },
  { href: "/feed", label: "Feed", icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6" /><path d="M18 14.5a5.5 5.5 0 0 1 3 5.5" /></> },
  { href: "/earn", label: "Earn", icon: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12.5h18" /><path d="M12 8C10 4 6 4 6 6.5S12 8 12 8s6-1 6-1.5S14 4 12 8z" /></> },
];

// Small progress strip above the tab bar while Gmail is being read.
function ImportStrip() {
  const [s, setS] = useState<ImportState>(importState());
  useEffect(() => onImport(setS), []);
  if (s.stage !== "scan" && s.stage !== "items") return null;
  const text = s.stage === "scan" ? (s.total ? `Finding orders · ${s.read} of ${s.total}` : "Finding your orders") : `Reading items · ${s.itemsDone} of ${s.itemsTotal}`;
  return (
    <Link href="/import" style={{ position: "absolute", zIndex: 11, left: 24, right: 24, bottom: 90, height: 34, borderRadius: 999, background: "#FFF0BF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "0 6px 16px rgba(20,18,16,.12)" }}>
      <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A6D1E" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>
      {text}
    </Link>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <>
    <ImportStrip />
    <nav className="tabbar">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) || (t.href === "/orders" && path.startsWith("/order/")) || (t.href === "/feed" && /^\/(people|u\/)/.test(path)) ? "on" : ""}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
          {t.label}
        </Link>
      ))}
    </nav>
    </>
  );
}

const TINTS = ["#DCEBFF", "#DCEFDF", "#FFE3CC", "#FFE1DC", "#EBE3FF", "#FFF0BF"];
export const tint = (s: string) => TINTS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];

// The store's logo, looked up by its web address. Falls back to its first letter.
// Two logo sources, tried in order. Google answers a tiny globe when it has nothing.
const LOGOS = [
  (d: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`,
  (d: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`,
];
export const logoUrl = LOGOS[0];

// Stores whose web address isn't just their name plus .com.
const KNOWN: Record<string, string> = {
  levis: "levi.com", amazon: "amazon.com", target: "target.com", jcrew: "jcrew.com", gap: "gap.com", oldnavy: "oldnavy.com",
  nordstrom: "nordstrom.com", nordstromrack: "nordstromrack.com", hm: "hm.com", zara: "zara.com", uniqlo: "uniqlo.com",
  bouqs: "bouqs.com", thebouqs: "bouqs.com", lego: "lego.com", rei: "rei.com", costco: "costco.com", walmart: "walmart.com",
  homedepot: "homedepot.com", lowes: "lowes.com", bestbuy: "bestbuy.com", macys: "macys.com", kohls: "kohls.com",
  dickssportinggoods: "dickssportinggoods.com", underarmour: "underarmour.com", nike: "nike.com", adidas: "adidas.com",
  lululemon: "lululemon.com", patagonia: "patagonia.com", sunglassresort: "sunglassresort.com",
};
// The store's web address: the one from the email, else a good guess from its name.
export function storeDomain(store: string, domain?: string | null) {
  if (domain) return domain;
  const key = store.toLowerCase().replace(/[’']s\b/g, "s").replace(/\.(com|co|net|shop)$/, "").replace(/[^a-z0-9]/g, "");
  if (!key) return null;
  return KNOWN[key] ?? `${key}.com`;
}

export function StoreTile({ store, domain, w, h, radius = 18, size = 28 }: { store: string; domain?: string | null; w: number | string; h: number | string; radius?: number; size?: number }) {
  const [src, setSrc] = useState(0);
  const d = storeDomain(store, domain);
  if (d && src < LOGOS.length) {
    const logo = typeof w === "number" && typeof h === "number" ? Math.round(Math.min(w, h) * 0.5) : Math.round(size * 1.8);
    return (
      <div style={{ width: w, height: h, borderRadius: radius, background: "#fff", border: "1.5px solid var(--line)", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={src} src={LOGOS[src](d)} alt={store} width={logo} height={logo} referrerPolicy="no-referrer" onError={() => setSrc(n => n + 1)}
          onLoad={e => { if ((e.target as HTMLImageElement).naturalWidth <= 16) setSrc(n => n + 1); }} style={{ borderRadius: 8 }} />
      </div>
    );
  }
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

// Product photo from the order email, or the store logo if there isn't one or it won't load.
export function ItemImage({ src, store, w, h, radius = 18, size = 28 }: { src: string | null; store: string; w: number | string; h: number | string; radius?: number; size?: number }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <StoreTile store={store} w={w} h={h} radius={radius} size={size} />;
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "var(--tile)", flex: "none", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", padding: "8%", mixBlendMode: "multiply" }} />
    </div>
  );
}
