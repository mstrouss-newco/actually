"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type FeedItem, type Profile, loadFeed, loadProfilePage, myHandle, similarPeople } from "@/lib/social";
import { Avatar, FeedCard, FollowButton, MyGrid, ShareLink, displayName } from "@/lib/feed-ui";
import { loadItems, toSort } from "@/lib/items";
import { ItemImage, TabBar } from "@/lib/tabs";

type Tab = "friends" | "match" | "mine";
const LABEL: Record<Tab, string> = { friends: "Friends", match: "Taste match", mine: "My feed" };
type Match = { handle: string; brands: string[]; picks: Profile["items"] };

const both = (b: string[]) => (b.length > 1 ? `${b.slice(0, -1).join(", ")} and ${b.at(-1)}` : b[0]);

export default function Feed() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [toGo, setToGo] = useState(0);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "mine" || t === "match" || t === "friends") setTab(t);
    myHandle().then(h => {
      setHandle(h);
      if (!h) { setTab(x => x ?? "friends"); return; }
      // My feed comes first until friends have posted something.
      loadFeed().then(f => { setFeed(f); setTab(x => x ?? (f.length ? "friends" : "mine")); });
      loadProfilePage(h).then(setMine);
      loadItems().then(all => setToGo(toSort(all).length));
      // Each match shows three pieces from their feed.
      similarPeople().then(async list => {
        const pages = await Promise.all(list.slice(0, 6).map(p => loadProfilePage(p.handle)));
        setMatches(list.slice(0, 6).map((p, n) => ({ handle: p.handle, brands: p.brands, picks: pages[n]?.items.slice(0, 3) ?? [] })));
      });
    });
  }, []);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "0 20px", whiteSpace: "nowrap" }}>
          {(feed?.length ? ["friends", "match", "mine"] as Tab[] : ["mine", "friends", "match"] as Tab[]).map(k => [k, LABEL[k]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); history.replaceState(history.state, "", `?tab=${k}`); }} className="serif" style={{ border: 0, borderBottom: `2px solid ${tab === k ? "var(--ink)" : "transparent"}`, background: "none", padding: 0, cursor: "pointer", fontSize: 22, whiteSpace: "nowrap", color: tab === k ? "var(--ink)" : "#948C84", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              {label}
            </button>
          ))}
        </div>

        {handle === null && (
          <div style={{ padding: "18px 20px 0" }}>
            <p className="lead">Sign in to follow friends and share what you love.</p>
            <Link href="/login" className="btn" style={{ marginTop: 16 }}>Sign in</Link>
          </div>
        )}

        {handle && tab === "friends" && (
          <>
            <div style={{ padding: "10px 20px 0", fontSize: 14, color: "var(--muted)" }}>What people you follow just bought</div>
            {!!matches?.length && (
              <button onClick={() => setTab("match")} style={{ margin: "14px 16px 0", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 12, border: 0, borderRadius: 20, background: "#DCEFDF", padding: "14px 16px", textAlign: "left", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>See your taste matches</span>
                  <span style={{ display: "block", fontSize: 13, color: "#3F5F4A", marginTop: 2 }}>{matches.length} {matches.length === 1 ? "person shops" : "people shop"} the brands you do</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 26, padding: "20px 16px 0" }}>
              {feed?.map(i => <FeedCard key={i.id} item={i} />)}
            </div>
            {feed && feed.length === 0 && (
              <div style={{ margin: "0 16px", background: "var(--chip)", borderRadius: 26, padding: "20px 18px" }}>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Follow people to fill your <em>feed.</em></div>
                <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>See what friends actually buy and keep, not ads.</div>
                <Link href="/people" className="btn" style={{ marginTop: 14, height: 48, fontSize: 15 }}>Find people</Link>
              </div>
            )}
          </>
        )}

        {handle && tab === "match" && (
          <>
            <div style={{ padding: "10px 20px 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.4 }}>People who shop the same brands as you. See what&apos;s on their feed.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 16px 0" }}>
              {matches?.map(m => (
                <div key={m.handle} style={{ background: "#FAF8F6", borderRadius: 26, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link href={`/u/${m.handle}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
                      <Avatar handle={m.handle} size={48} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.handle}</div>
                        <div style={{ fontSize: 13, color: "var(--soft)" }}>You both shop {both(m.brands)}</div>
                      </div>
                    </Link>
                    <FollowButton handle={m.handle} initial={false} small />
                  </div>
                  {m.picks.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginTop: 14 }}>On their feed</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                        {m.picks.map(k => (
                          <div key={k.id} style={{ minWidth: 0 }}>
                            <ItemImage src={k.image_url} store={k.store} name={k.name} w="100%" h={124} radius={16} size={30} />
                            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.name}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {matches && matches.length === 0 && (
                <div style={{ background: "var(--chip)", borderRadius: 26, padding: "20px 18px" }}>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Find people who shop like <em>you.</em></div>
                  <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>Matches show up when people share pieces from brands you buy. Share a few of yours to get started.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <Link href="/sort" className="btn" style={{ marginTop: 0, height: 46, fontSize: 14, flex: "1 1 0", minWidth: 0, width: "auto" }}>Share pieces</Link>
                    <Link href="/people" className="btn btn-line" style={{ marginTop: 0, height: 46, fontSize: 14, flex: "1 1 0", minWidth: 0, width: "auto" }}>Find people</Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {handle && tab === "mine" && (
          <>
            <div style={{ padding: "22px 20px 0", display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar handle={handle} size={76} />
              <div style={{ minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 28, lineHeight: 1, overflowWrap: "anywhere" }}>{displayName(handle)}</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>{mine ? `${mine.followers} ${mine.followers === 1 ? "follower" : "followers"} · ${mine.following} following` : "Loading…"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "16px 20px 0" }}>
              <div style={{ flex: 1, minWidth: 0 }}><ShareLink handle={handle} dark /></div>
              <Link href="/sort" style={{ flex: 1, minWidth: 0, height: 46, borderRadius: 999, border: "1.5px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
                {toGo ? `Sort ${toGo} ${toGo === 1 ? "piece" : "pieces"}` : "Add pieces"}
              </Link>
            </div>
            <Link href="/people" style={{ margin: "16px 16px 0", display: "flex", alignItems: "center", gap: 12, background: "#EBE3FF", borderRadius: 20, padding: "14px 16px", textDecoration: "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Find your people</div>
                <div style={{ fontSize: 13, color: "#5B4A8A" }}>{matches?.length ? `${matches.length} ${matches.length === 1 ? "person shops" : "people shop"} like you.` : "Follow friends to see what they buy."}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
            <div className="serif" style={{ padding: "24px 20px 0", fontSize: 24 }}>On your feed</div>
            <div style={{ padding: "16px 16px 0" }}>
              {mine && mine.items.length === 0 && <p className="lead" style={{ padding: "0 4px", margin: 0 }}>Nothing shared yet. Swipe right in Sort to share a piece.</p>}
              {mine && <MyGrid items={mine.items} />}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.45, padding: "0 4px" }}>Your feed shows the photo, brand and name only. Never prices, sizes or order details.</div>
            </div>
          </>
        )}
      </div>
      <TabBar />
    </main>
  );
}
