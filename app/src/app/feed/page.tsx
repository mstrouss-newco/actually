"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type FeedItem, type Profile, loadFeed, loadProfilePage, myHandle, similarPeople } from "@/lib/social";
import { Avatar, FeedCard, FollowButton, ItemGrid, ShareLink } from "@/lib/feed-ui";
import { TabBar } from "@/lib/tabs";

export default function Feed() {
  const [tab, setTab] = useState<"following" | "mine">("following");
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Profile | null>(null);
  const [similar, setSimilar] = useState<{ handle: string; brands: string[] }[]>([]);

  useEffect(() => {
    myHandle().then(h => {
      setHandle(h);
      if (!h) return;
      loadFeed().then(setFeed);
      loadProfilePage(h).then(setMine);
      similarPeople().then(setSimilar);
    });
  }, []);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "0 20px" }}>
          {(["following", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="serif" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: t === tab ? 36 : 22, color: t === tab ? "var(--ink)" : "var(--muted)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {t === "following" ? "Feed" : "Mine"}
            </button>
          ))}
          <Link href="/people" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Find people</Link>
        </div>

        {handle === null && (
          <div style={{ padding: "18px 20px 0" }}>
            <p className="lead">Sign in to follow friends and share what you love.</p>
            <Link href="/claim" className="btn" style={{ marginTop: 16 }}>Sign in</Link>
          </div>
        )}

        {handle && tab === "following" && (
          <>
            <div style={{ fontSize: 14, color: "var(--muted)", padding: "8px 20px 0" }}>What people you follow bought and loved.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 16px 0" }}>
              {feed?.map(i => <FeedCard key={i.id} item={i} />)}
            </div>
            {feed && feed.length === 0 && (
              <div style={{ margin: "4px 16px 0", background: "var(--chip)", borderRadius: 26, padding: "20px 18px" }}>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Follow people to fill your <em>feed.</em></div>
                <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>See what friends actually buy and keep, not ads.</div>
                <Link href="/people" className="btn" style={{ marginTop: 14, height: 48, fontSize: 15 }}>Find people</Link>
              </div>
            )}
            {similar.length > 0 && (
              <>
                <div className="section"><div>Shop like you</div><Link href="/people">More</Link></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 0" }}>
                  {similar.slice(0, 3).map(p => (
                    <div key={p.handle} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 12px" }}>
                      <Link href={`/u/${p.handle}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
                        <Avatar handle={p.handle} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.handle}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Also buys {p.brands.join(", ")}</div>
                        </div>
                      </Link>
                      <FollowButton handle={p.handle} initial={false} small />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {handle && tab === "mine" && (
          <div style={{ padding: "8px 16px 0" }}>
            <div style={{ fontSize: 14, color: "var(--muted)", padding: "0 4px" }}>
              {mine ? `${mine.items.length} shared · ${mine.followers} ${mine.followers === 1 ? "follower" : "followers"} · ${mine.following} following` : "Loading…"}
            </div>
            <div style={{ display: "flex", gap: 8, margin: "14px 0 18px" }}>
              <div style={{ flex: 1 }}><ShareLink handle={handle} /></div>
              <Link href="/sort" className="btn" style={{ flex: 1, height: 48, fontSize: 15 }}>Add pieces</Link>
            </div>
            {mine && mine.items.length === 0 && <p className="lead" style={{ padding: "0 4px" }}>Nothing shared yet. Swipe right in Sort to share a piece.</p>}
            {mine && <ItemGrid items={mine.items} />}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.45, padding: "0 4px" }}>Your feed shows the photo, brand and name only. Never prices, sizes or order details.</div>
          </div>
        )}
      </div>
      <TabBar />
    </main>
  );
}
