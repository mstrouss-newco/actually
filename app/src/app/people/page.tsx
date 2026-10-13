"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { myHandle, searchPeople, similarPeople } from "@/lib/social";
import { Avatar, FollowButton, ShareLink } from "@/lib/feed-ui";
import { TabBar } from "@/lib/tabs";

type Row = { handle: string; note: string; i_follow: boolean };

function PersonRow({ p }: { p: Row }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 12px" }}>
      <Link href={`/u/${p.handle}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
        <Avatar handle={p.handle} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.handle}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.note}</div>
        </div>
      </Link>
      <FollowButton key={`${p.handle}${p.i_follow}`} handle={p.handle} initial={p.i_follow} small />
    </div>
  );
}

export default function People() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Row[] | null>(null);
  const [similar, setSimilar] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    myHandle().then(setMe);
    similarPeople().then(list => setSimilar(list.map(p => ({ handle: p.handle, note: `Also buys ${p.brands.join(", ")}`, i_follow: false }))));
  }, []);

  useEffect(() => {
    const term = q.trim().replace(/@.*$/, "");
    if (term.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      searchPeople(term).then(list => setResults(list.map(p => ({ handle: p.handle, note: `${p.shared} shared`, i_follow: p.i_follow }))));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <Link href="/feed" className="back">← Feed</Link>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>Find people</h1>
        </div>
        <label style={{ margin: "16px 16px 0", height: 50, borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by shopping email name" autoCapitalize="none" style={{ border: 0, outline: 0, background: "transparent", font: "500 15px var(--font-sans), sans-serif", flex: 1, color: "var(--ink)", minWidth: 0 }} />
        </label>

        {results && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 0" }}>
            {results.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>No one by that name yet. Invite them below.</div>}
            {results.map(p => <PersonRow key={p.handle} p={p} />)}
          </div>
        )}

        {!results && similar.length > 0 && (
          <>
            <div className="section"><div>Shop like you</div></div>
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "4px 20px 0" }}>They share pieces from brands you buy.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>
              {similar.map(p => <PersonRow key={p.handle} p={p} />)}
            </div>
          </>
        )}

        <div style={{ margin: "22px 16px 0", background: "#EBE3FF", borderRadius: 26, padding: "20px 18px" }}>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Bring your <em>friends.</em></div>
          <div style={{ fontSize: 14, color: "#5B4A8A", margin: "8px 0 14px", lineHeight: 1.45 }}>Send your feed link. They can see it without the app, then join to follow you back.</div>
          {me ? <ShareLink handle={me} label="Invite friends" /> : <Link href="/claim" className="btn" style={{ height: 48, fontSize: 15 }}>Sign in first</Link>}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
