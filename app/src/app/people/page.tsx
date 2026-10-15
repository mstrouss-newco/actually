"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type SharedItem, loadProfilePage, myHandle, myPeople, searchPeople, similarPeople } from "@/lib/social";
import { Avatar, FollowButton, ShareLink } from "@/lib/feed-ui";
import { ItemImage, TabBar } from "@/lib/tabs";

type Row = { handle: string; note: string; i_follow: boolean };
type Match = { handle: string; why: string; picks: SharedItem[] };

function PersonRow({ p }: { p: Row }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F1EDE8" }}>
      <Link href={`/u/${p.handle}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
        <Avatar handle={p.handle} size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.handle}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.note}</div>
        </div>
      </Link>
      <FollowButton key={`${p.handle}${p.i_follow}`} handle={p.handle} initial={p.i_follow} small />
    </div>
  );
}

const shared = (n: number) => `${n} shared`;

export default function People() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Row[] | null>(null);
  const [friends, setFriends] = useState<Row[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    myHandle().then(setMe);
    myPeople().then(list => setFriends(list.map(p => ({
      handle: p.handle, i_follow: p.i_follow,
      note: `${p.follows_me ? (p.i_follow ? "You follow each other" : "Follows you") : "You follow them"} · ${shared(p.shared)}`,
    }))));
    similarPeople().then(async list => {
      const top = list.slice(0, 8);
      const pages = await Promise.all(top.map(p => loadProfilePage(p.handle)));
      setMatches(top.map((p, n) => ({ handle: p.handle, why: `${p.brands.length} ${p.brands.length === 1 ? "brand" : "brands"} in common: ${p.brands.join(", ")}.`, picks: pages[n]?.items.slice(0, 3) ?? [] })));
    });
  }, []);

  useEffect(() => {
    const term = q.trim().replace(/@.*$/, "");
    if (term.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      searchPeople(term).then(list => setResults(list.map(p => ({ handle: p.handle, note: shared(p.shared), i_follow: p.i_follow }))));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 20 }}>
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column" }}>
          <Link href="/feed?tab=mine" className="back" style={{ padding: "0 14px 0 8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>My feed
          </Link>
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 38, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "22px 0 0" }}>Find your <em>people.</em></h1>
          <div style={{ fontSize: 15, color: "var(--soft)", marginTop: 8 }}>Follow friends to see what they actually bought.</div>
        </div>
        <label style={{ margin: "18px 16px 0", height: 50, borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name" autoCapitalize="none" style={{ border: 0, outline: 0, background: "transparent", font: "500 15px var(--font-sans), sans-serif", flex: 1, color: "var(--ink)", minWidth: 0 }} />
        </label>

        {results && (
          <div style={{ display: "flex", flexDirection: "column", padding: "8px 20px 0" }}>
            {results.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: "8px 0" }}>No one by that name yet. Invite them below.</div>}
            {results.map(p => <PersonRow key={p.handle} p={p} />)}
          </div>
        )}

        {!results && friends.length > 0 && (
          <>
            <div className="serif" style={{ padding: "24px 20px 0", fontSize: 22 }}>Friends already here</div>
            <div style={{ display: "flex", flexDirection: "column", padding: "6px 20px 0" }}>
              {friends.map(p => <PersonRow key={p.handle} p={p} />)}
            </div>
          </>
        )}

        {!results && matches.length > 0 && (
          <>
            <div className="serif" style={{ padding: "26px 20px 0", fontSize: 22 }}>Shop like you</div>
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "4px 20px 0" }}>They share pieces from brands you buy.</div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 20px 4px" }}>
              {matches.map(m => (
                <div key={m.handle} style={{ flex: "none", width: 200, border: "1.5px solid var(--line)", borderRadius: 24, padding: 12 }}>
                  <Link href={`/u/${m.handle}`} style={{ display: "block", textDecoration: "none" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0, 1, 2].map(n => m.picks[n]
                        ? <div key={n} style={{ flex: 1, minWidth: 0 }}><ItemImage src={m.picks[n].image_url} store={m.picks[n].store} w="100%" h={76} radius={12} size={20} /></div>
                        : <div key={n} style={{ flex: 1, height: 76, borderRadius: 12, background: "var(--tile)" }} />)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>{m.handle}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.35, minHeight: 32 }}>{m.why}</div>
                  </Link>
                  <div style={{ marginTop: 10 }}><FollowButton handle={m.handle} initial={false} small full /></div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ margin: "22px 16px 0", background: "#EBE3FF", borderRadius: 26, padding: "20px 18px" }}>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Bring your <em>friends.</em></div>
          <div style={{ fontSize: 14, color: "#5B4A8A", margin: "8px 0 14px", lineHeight: 1.45 }}>Send your feed link. They can see it without the app, then join to follow you back.</div>
          {me ? <ShareLink handle={me} label="Invite friends" /> : <Link href="/login" className="btn" style={{ height: 48, fontSize: 15 }}>Sign in first</Link>}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
