"use client";

import { useState } from "react";
import Link from "next/link";
import { type FeedItem, type SharedItem, ago, findIt, profileUrl, setFollow } from "./social";
import { ItemImage, tint } from "./tabs";

export function Avatar({ handle, size = 36 }: { handle: string; size?: number }) {
  return (
    <div className="serif" style={{ width: size, height: size, borderRadius: "50%", background: tint(handle), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: size * 0.45, flex: "none" }}>
      {handle.charAt(0).toUpperCase()}
    </div>
  );
}

// One shared piece in the Following feed.
export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div style={{ background: "#FAF8F6", borderRadius: 26, padding: 12 }}>
      <Link href={`/u/${item.handle}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "2px 4px 10px" }}>
        <Avatar handle={item.handle} size={32} />
        <div style={{ flex: 1, fontSize: 14 }}><b>{item.handle}</b> <span style={{ color: "var(--muted)" }}>shared · {ago(item.shared_at)}</span></div>
      </Link>
      <ItemImage src={item.image_url} store={item.store} w="100%" h={300} radius={20} size={80} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px 2px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kicker">{item.brand || item.store}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{item.name}</div>
        </div>
        <a href={findIt(item)} target="_blank" rel="noreferrer" style={{ height: 40, padding: "0 16px", borderRadius: 999, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Find it</a>
      </div>
    </div>
  );
}

// Two-column grid of someone's shared pieces.
export function ItemGrid({ items }: { items: SharedItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {items.map(i => (
        <a key={i.id} href={findIt(i)} target="_blank" rel="noreferrer" className="lift" style={{ textDecoration: "none" }}>
          <ItemImage src={i.image_url} store={i.store} w="100%" h={190} radius={22} size={56} />
          <div className="kicker" style={{ marginTop: 8 }}>{i.brand || i.store}</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, lineHeight: 1.25 }}>{i.name}</div>
        </a>
      ))}
    </div>
  );
}

export function FollowButton({ handle, initial, small = false }: { handle: string; initial: boolean; small?: boolean }) {
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
      background: on ? "#fff" : "var(--ink)", color: on ? "var(--ink)" : "#fff", border: "1.5px solid var(--ink)", whiteSpace: "nowrap",
    }}>
      {on ? "Following" : "Follow"}
    </button>
  );
}

// Shares her public feed link with the phone's share sheet, or copies it.
export function ShareLink({ handle, label = "Share my feed" }: { handle: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const go = async () => {
    const url = profileUrl(handle);
    try {
      if (navigator.share) await navigator.share({ title: `${handle} on Actually`, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch {}
  };
  return <button onClick={go} className="btn btn-line" style={{ height: 48, fontSize: 15 }}>{copied ? "Link copied" : label}</button>;
}
