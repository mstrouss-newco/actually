"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FeedItem, type Profile, loadFeed, loadProfilePage, loadSaved, myHandle, similarPeople } from "@/lib/social";
import { Avatar, FeedCard, FollowButton, FriendFaces, FriendGrid, Loves, MyGrid, OutfitPost, PhotoPicker, type Order, OrderButton, sortBy, ShareLink, TypeTabs, displayName, useLovesStore } from "@/lib/feed-ui";
import { loadItems, toSort } from "@/lib/items";
import { type SharedOutfit, friendsOutfits } from "@/lib/outfits";
import { ItemImage, TabBar } from "@/lib/tabs";

type Tab = "friends" | "match" | "mine" | "saved";
const LABEL: Record<Tab, string> = { friends: "Friends", match: "Taste Match", mine: "My feed", saved: "Saved" };
type Match = { handle: string; brands: string[]; picks: Profile["items"] };

const both = (b: string[]) => (b.length > 1 ? `${b.slice(0, -1).join(", ")} and ${b.at(-1)}` : b[0]);

export default function Feed() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [toGo, setToGo] = useState(0);
  const [hasPieces, setHasPieces] = useState(true);
  const [type, setType] = useState("all");
  const [mineType, setMineType] = useState("all");
  const [order, setOrder] = useState<Order>("new");
  const [friendOrder, setFriendOrder] = useState<Order>("new");
  const [who, setWho] = useState<string | null>(null);
  const [saved, setSaved] = useState<FeedItem[] | null>(null);
  const [savedType, setSavedType] = useState("all");
  const [looks, setLooks] = useState<SharedOutfit[]>([]);
  // Unloving a piece on Saved takes it off the list.
  const loves = useLovesStore(true, (id, on) => { if (!on) setSaved(s => s?.filter(i => i.id !== id) ?? s); else loadSaved().then(setSaved); });
  const { load } = loves;
  const router = useRouter();
  const pick = (k: Tab) => { setTab(k); router.replace(`/feed?tab=${k}`, { scroll: false }); };
  // Filters stay put when she opens a piece or a person and comes back.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const f = JSON.parse(sessionStorage.getItem("feed-filters") ?? "{}");
      if (f.type) setType(f.type); if (f.mineType) setMineType(f.mineType); if (f.savedType) setSavedType(f.savedType);
      if (f.order) setOrder(f.order); if (f.friendOrder) setFriendOrder(f.friendOrder); if (f.who !== undefined) setWho(f.who);
    } catch {}
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem("feed-filters", JSON.stringify({ type, mineType, savedType, order, friendOrder, who })); } catch {}
  }, [restored, type, mineType, savedType, order, friendOrder, who]);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "mine" || t === "match" || t === "friends" || t === "saved") setTab(t);
    myHandle().then(h => {
      setHandle(h);
      if (!h) { setTab(x => x ?? "friends"); return; }
      // My feed comes first until friends have posted something.
      loadFeed().then(f => { setFeed(f); setTab(x => x ?? (f.length ? "friends" : "mine")); load(f.map(i => i.id)); });
      loadProfilePage(h).then(p => { setMine(p); if (p) load(p.items.map(i => i.id)); });
      loadSaved().then(s => { setSaved(s); load(s.map(i => i.id)); });
      friendsOutfits().then(l => { setLooks(l); if (l.length) setTab(x => (x === "mine" && !new URLSearchParams(location.search).get("tab") ? "friends" : x)); });
      loadItems().then(all => { setToGo(toSort(all).length); setHasPieces(all.length > 0); });
      // Each match shows three pieces from their feed.
      similarPeople().then(async list => {
        const pages = await Promise.all(list.slice(0, 6).map(p => loadProfilePage(p.handle)));
        setMatches(list.slice(0, 6).map((p, n) => ({ handle: p.handle, brands: p.brands, picks: pages[n]?.items.slice(0, 3) ?? [] })));
      });
    });
  }, [load]);

  // People she follows, most recent posters first.
  const friends = [...new Set([...(feed ?? []).map(i => i.handle), ...looks.map(o => o.handle!).filter(Boolean)])];
  // A remembered friend filter for someone she no longer follows shows nothing: drop it.
  useEffect(() => {
    if (feed && who && !feed.some(i => i.handle === who) && !looks.some(o => o.handle === who)) setWho(null);
  }, [feed, looks, who]);
  const shown = (feed ?? []).filter(i => !who || i.handle === who);
  const shownLooks = looks.filter(o => !who || o.handle === who);
  // Pieces and looks together, newest first.
  const stream = [...shown.map(i => ({ at: i.shared_at ?? "", item: i, look: null })), ...shownLooks.map(o => ({ at: o.shared_at ?? "", item: null, look: o }))].sort((a, b) => b.at.localeCompare(a.at));
  const myLooks = mine?.outfits ?? [];
  const myLoves = (mine?.items ?? []).reduce((n, i) => n + (loves.get(i.id)?.n ?? 0), 0);

  return (
    <Loves store={loves}>
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 12, padding: "0 12px 0 20px", whiteSpace: "nowrap", overflowX: "auto", WebkitMaskImage: "linear-gradient(to right, #000 88%, transparent)", maskImage: "linear-gradient(to right, #000 88%, transparent)" }}>
          {(feed?.length ? ["friends", "match", "mine", "saved"] as Tab[] : ["mine", "friends", "match", "saved"] as Tab[]).map(k => [k, LABEL[k]] as const).map(([k, label]) => (
            <button key={k} onClick={() => pick(k)} className="serif" style={{ border: 0, borderBottom: `2px solid ${tab === k ? "var(--ink)" : "transparent"}`, background: "none", padding: 0, cursor: "pointer", fontSize: 19, whiteSpace: "nowrap", color: tab === k ? "var(--ink)" : "#948C84", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              {label}
            </button>
          ))}
        </div>
        {handle && (
          <Link href="/people" aria-label="Find people" style={{ flex: "none", width: 38, height: 38, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6M16 11h6" /></svg>
          </Link>
        )}
        </div>

        {handle === null && (
          <div style={{ padding: "18px 20px 0" }}>
            <p className="lead">Sign in to follow friends and share what you love.</p>
            <Link href="/login" className="btn" style={{ marginTop: 16 }}>Sign in</Link>
          </div>
        )}

        {handle && tab === "friends" && (
          <>
            {friends.length > 1 && <FriendFaces handles={friends} value={who} onChange={h => { setWho(h); setType("all"); }} />}
            {who && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
                <div>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{displayName(who)}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{shown.length} {shown.length === 1 ? "piece" : "pieces"}</div>
                </div>
                <Link href={`/u/${who}`} style={{ fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Their page →</Link>
              </div>
            )}
            {!who && !!matches?.length && (
              <button onClick={() => pick("match")} style={{ margin: "14px 16px 0", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 12, border: 0, borderRadius: 20, background: "#DCEFDF", padding: "14px 16px", textAlign: "left", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>See your Taste Matches</span>
                  <span style={{ display: "block", fontSize: 13, color: "#3F5F4A", marginTop: 2 }}>{matches.length} {matches.length === 1 ? "person shops" : "people shop"} the brands you do</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
            {feed && <TypeTabs items={shown} value={type} onChange={setType} lead={shownLooks.length ? [["looks", "Outfits"]] : []} end={who && type !== "looks" ? <OrderButton value={friendOrder} onChange={setFriendOrder} /> : undefined} />}
            {type === "looks"
              ? <div style={{ display: "flex", flexDirection: "column", gap: 30, padding: "20px 16px 0" }}>{shownLooks.map(o => <OutfitPost key={o.id} o={o} handle={who ? undefined : o.handle} />)}</div>
              : type === "all" && !who
              ? <div style={{ display: "flex", flexDirection: "column", gap: 26, padding: "20px 16px 0" }}>{stream.map(s => s.item ? <FeedCard key={s.item.id} item={s.item} /> : <OutfitPost key={s.look!.id} o={s.look!} handle={s.look!.handle} />)}</div>
              : <div style={{ padding: "16px 16px 0" }}><FriendGrid items={sortBy(shown.filter(i => type === "all" || i.category === type), who ? friendOrder : "new")} who={!who} /></div>}
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
                            <ItemImage cutId={k.id} src={k.image_url} store={k.store} name={k.name} w="100%" h={124} radius={16} size={30} />
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
            <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", gap: 14 }}>
              <PhotoPicker handle={handle} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1, overflowWrap: "anywhere" }}>{displayName(handle)}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{mine ? `${mine.followers} ${mine.followers === 1 ? "follower" : "followers"} · ${mine.following} following${myLoves ? ` · ${myLoves} ${myLoves === 1 ? "love" : "loves"}` : ""}` : "Loading…"}</div>
              </div>
              <ShareLink handle={handle} label="Share" small />
            </div>
            {mine && mine.following === 0 && (
              <Link href="/people" className="press up" style={{ margin: "14px 16px 0", display: "flex", alignItems: "center", gap: 12, background: "#DCEFDF", borderRadius: 20, padding: "14px 16px", textDecoration: "none", color: "var(--ink)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Bring your friends</div>
                  <div style={{ fontSize: 13, color: "#3F5F4A", marginTop: 2 }}>See what they actually buy and keep. Find them or send an invite.</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            )}
            {toGo > 0 && mine && mine.following > 0 && (
              <Link href="/sort" className="press" style={{ margin: "14px 16px 0", display: "flex", alignItems: "center", gap: 10, background: "#FAF8F6", borderRadius: 16, padding: "10px 14px", textDecoration: "none" }}>
                <div style={{ flex: 1, fontSize: 13 }}><b>{toGo} new {toGo === 1 ? "piece" : "pieces"}</b> <span style={{ color: "var(--muted)" }}>to add to your feed</span></div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Sort →</span>
              </Link>
            )}
            {mine && (mine.items.length > 0 || myLooks.length > 0) && (
              <TypeTabs items={mine.items} value={mineType} onChange={setMineType} lead={[["looks", "Outfits"]]} end={mineType === "looks" ? undefined : <OrderButton value={order} onChange={setOrder} />} />
            )}
            <div style={{ padding: "14px 16px 0" }}>
              {mineType === "looks" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  <Link href="/outfit/edit/new" className="btn press" style={{ marginTop: 0, height: 48, fontSize: 15 }}>+ Make an outfit</Link>
                  {myLooks.map(o => <div key={o.id}><OutfitPost o={o} /><Link href={`/outfit/${o.id}`} style={{ display: "inline-block", padding: "10px 4px 0", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open this outfit →</Link></div>)}
                  {!myLooks.length && <p className="lead" style={{ padding: "0 4px", margin: 0 }}>Build a look from your closet and share it here. Friends can tap each piece to shop it.</p>}
                </div>
              )}
              {mineType !== "looks" && mine && mine.items.length === 0 && <p className="lead" style={{ padding: "0 4px", margin: 0 }}>{!hasPieces ? "Nothing shared yet. Once your orders bring pieces into your closet, you can show your favorites here." : toGo > 0 ? <>Nothing shared yet. <Link href="/sort" style={{ fontWeight: 700 }}>Pick a few favorites</Link> to show them here.</> : "Nothing shared yet. Open a piece in your closet and choose Show on my feed."}</p>}
              {mineType !== "looks" && mine && <MyGrid items={sortBy(mine.items, order)
                .filter(i => mineType === "all" || i.category === mineType)} />}
            </div>
          </>
        )}

        {handle && tab === "saved" && (
          <>
            <div style={{ padding: "10px 20px 0", fontSize: 14, color: "var(--muted)" }}>Pieces you loved from friends.</div>
            {saved && <TypeTabs items={saved} value={savedType} onChange={setSavedType} />}
            <div style={{ padding: "16px 16px 0" }}>
              {saved && saved.length > 0 && <FriendGrid items={saved.filter(i => savedType === "all" || i.category === savedType)} saved />}
              {saved && saved.length === 0 && (
                <div style={{ background: "var(--chip)", borderRadius: 26, padding: "20px 18px" }}>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Nothing saved <em>yet.</em></div>
                  <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>Tap the heart on a friend&apos;s piece and it lands here, ready when you are.</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </main>
    </Loves>
  );
}
