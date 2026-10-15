"use client";

import { useState } from "react";
import Link from "next/link";
import { type FeedItem, type SharedItem, ago, findIt, profileUrl, setFollow } from "./social";
import { ItemImage, tint } from "./tabs";

// "mike" reads as a name: "Mike".
export const displayName = (h: string) => h.charAt(0).toUpperCase() + h.slice(1);

export function Avatar({ handle, size = 36 }: { handle: string; size?: number }) {
  return (
    <div className="serif" style={{ width: size, height: size, borderRadius: "50%", background: tint(handle), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: size * 0.45, flex: "none" }}>
      {handle.charAt(0).toUpperCase()}
    </div>
  );
}

// One shared piece in the Friends feed: who, a big photo, brand and name. Nothing else.
export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div>
      <Link href={`/u/${item.handle}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "0 4px 10px" }}>
        <Avatar handle={item.handle} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{item.handle}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Added {ago(item.shared_at)}</div>
        </div>
      </Link>
      <ItemImage src={item.image_url} store={item.store} name={item.name} w="100%" h={300} radius={28} size={80} />
      <div style={{ padding: "12px 4px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>{item.brand || item.store}</div>
        <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{item.name}</div>
      </div>
    </div>
  );
}

// Two-column grid of her own shared pieces (no links out).
export function MyGrid({ items }: { items: SharedItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 12px" }}>
      {items.map(i => (
        <div key={i.id} className="lift" style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <ItemImage src={i.image_url} store={i.store} name={i.name} w="100%" h={200} radius={22} size={56} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>{i.brand || i.store}</div>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{i.name}</div>
        </div>
      ))}
    </div>
  );
}

// Two-column grid of someone's shared pieces.
export function ItemGrid({ items }: { items: SharedItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {items.map(i => (
        <a key={i.id} href={findIt(i)} target="_blank" rel="noreferrer" className="lift" style={{ textDecoration: "none" }}>
          <ItemImage src={i.image_url} store={i.store} name={i.name} w="100%" h={190} radius={22} size={56} />
          <div className="kicker" style={{ marginTop: 8 }}>{i.brand || i.store}</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, lineHeight: 1.25 }}>{i.name}</div>
        </a>
      ))}
    </div>
  );
}

export function FollowButton({ handle, initial, small = false, full = false }: { handle: string; initial: boolean; small?: boolean; full?: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const ok = await setFollow(handle, !on);
    if (ok) setOn(!on);
    setBusy(false);
  };
  return (
    <button onClick={toggle} disabled={busy} style={{
      height: small ? 36 : 46, padding: small ? "0 14px" : "0 22px", borderRadius: 999, cursor: "pointer", font: `700 ${small ? 13 : 15}px var(--font-sans), sans-serif`,
      background: on ? "#fff" : "var(--ink)", color: on ? "var(--ink)" : "#fff", border: "1.5px solid var(--ink)", whiteSpace: "nowrap", width: full ? "100%" : undefined,
    }}>
      {on ? "Following" : "Follow"}
    </button>
  );
}

// Shares her public feed link with the phone's share sheet, or copies it.
export function ShareLink({ handle, label = "Share my feed", dark = false }: { handle: string; label?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const go = async () => {
    const url = profileUrl(handle);
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    try { if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: `${handle} on Actually`, url }); } catch {}
  };
  return <button onClick={go} className={dark ? "btn" : "btn btn-line"} style={{ height: dark ? 46 : 48, fontSize: dark ? 14 : 15, marginTop: 0 }}>{copied ? "Link copied" : label}</button>;
}
