"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { type FeedItem, type Love, type SharedItem, ago, findIt, loveState, profileUrl, saveNote, setFollow, setLove } from "./social";
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

// Hearts. A screen that shows hearts wraps itself in <Loves>; pieces read their state with useLove().
type LoveCtx = { get: (id: string) => Love | undefined; toggle: (id: string) => void; load: (ids: string[]) => Promise<void>; canLove: boolean };
const Ctx = createContext<LoveCtx | null>(null);
export function useLovesStore(canLove = true, onChange?: (id: string, loved: boolean) => void): LoveCtx {
  const [map, setMap] = useState<Map<string, Love>>(new Map());
  const load = useCallback(async (ids: string[]) => {
    const m = await loveState([...new Set(ids)]);
    setMap(old => new Map([...old, ...m]));
  }, []);
  const toggle = (id: string) => {
    const cur = map.get(id) ?? { n: 0, mine: false };
    const next = { n: Math.max(0, cur.n + (cur.mine ? -1 : 1)), mine: !cur.mine };
    setMap(old => new Map(old).set(id, next));
    onChange?.(id, next.mine);
    setLove(id, next.mine).then(n => { if (n != null) setMap(old => new Map(old).set(id, { n, mine: next.mine })); else setMap(old => new Map(old).set(id, cur)); });
  };
  return { get: id => map.get(id), toggle, load, canLove };
}
export const Loves = ({ store, children }: { store: LoveCtx; children: React.ReactNode }) => <Ctx.Provider value={store}>{children}</Ctx.Provider>;
const useLove = (id: string) => { const c = useContext(Ctx); return c ? { love: c.get(id), toggle: () => c.toggle(id), canLove: c.canLove } : null; };

const HEART = "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";
export const HeartIcon = ({ on, size = 22 }: { on: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "#FF6159" : "none"} stroke={on ? "#FF6159" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d={HEART} /></svg>
);
// Small round heart on a photo's corner. Tapping it doesn't open the link underneath.
function HeartBubble({ id }: { id: string }) {
  const l = useLove(id);
  if (!l?.canLove) return null;
  const on = !!l.love?.mine;
  return (
    <button type="button" aria-label={on ? "Unlove" : "Love"} aria-pressed={on} onClick={e => { e.preventDefault(); e.stopPropagation(); l.toggle(); }}
      style={{ position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.94)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(20,18,16,.08)", color: "var(--ink)", cursor: "pointer" }}>
      <HeartIcon on={on} size={17} />
    </button>
  );
}
// How many people loved her own piece. Never who.
function LoveCount({ id }: { id: string }) {
  const n = useLove(id)?.love?.n ?? 0;
  if (!n) return null;
  return <span style={{ position: "absolute", top: 8, right: 8, height: 28, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,.94)", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}><HeartIcon on size={13} />{n}</span>;
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
      <ActionRow item={item} />
      <div style={{ padding: "8px 4px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>{item.brand || item.store}</div>
        <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{item.name}</div>
      </div>
    </div>
  );
}

// Heart and Shop under a friend's photo, like a social post.
function ActionRow({ item }: { item: SharedItem }) {
  const l = useLove(item.id);
  const on = !!l?.love?.mine, n = l?.love?.n ?? 0;
  const btn = { display: "flex", alignItems: "center", gap: 6, border: 0, background: "none", padding: "4px 0", font: "700 14px var(--font-sans), sans-serif", color: "var(--ink)", cursor: "pointer", textDecoration: "none" } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 4px 0" }}>
      {l?.canLove && <button type="button" onClick={l.toggle} aria-pressed={on} aria-label={on ? "Unlove" : "Love"} style={btn}><HeartIcon on={on} size={24} />{n > 0 ? n : ""}</button>}
      <a href={findIt(item)} target="_blank" rel="noreferrer" style={btn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>Shop
      </a>
    </div>
  );
}

// Two-column grid of her own shared pieces (no links out), each with an optional note.
export function MyGrid({ items }: { items: SharedItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px 12px" }}>
      {items.map((i, n) => <MyTile key={i.id} item={i} n={n} />)}
    </div>
  );
}

function MyTile({ item, n }: { item: SharedItem; n: number }) {
  const [note, setNote] = useState(item.note ?? "");
  const [editing, setEditing] = useState(false);
  const save = async () => { setEditing(false); setNote((await saveNote(item.id, note)) ?? ""); };
  return (
    <div className="lift up" style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, animationDelay: `${n * 50}ms` }}>
      <div style={{ aspectRatio: "4 / 5", borderRadius: 22, overflow: "hidden", position: "relative" }}>
        <ItemImage src={item.image_url} store={item.store} name={item.name} w="100%" h="100%" radius={22} />
        <LoveCount id={item.id} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>{item.brand || item.store}</div>
      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{item.name}</div>
      {editing ? (
        <input autoFocus value={note} maxLength={140} placeholder="Size down one, wore it all summer…" onChange={e => setNote(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); }}
          style={{ border: "1.5px solid var(--line)", borderRadius: 12, padding: "8px 10px", font: "13px var(--font-sans), sans-serif", width: "100%", boxSizing: "border-box" }} />
      ) : note ? (
        <button type="button" onClick={() => setEditing(true)} style={{ border: 0, background: "none", padding: 0, textAlign: "left", fontSize: 13, color: "var(--soft)", fontStyle: "italic", lineHeight: 1.3, cursor: "pointer", font: "italic 13px var(--font-sans), sans-serif" }}>&ldquo;{note}&rdquo;</button>
      ) : (
        <button type="button" onClick={() => setEditing(true)} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>+ Add a note</button>
      )}
    </div>
  );
}

// Two-column grid of someone's shared pieces.
export function ItemGrid({ items, mine = false }: { items: SharedItem[]; mine?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {items.map(i => (
        <a key={i.id} href={findIt(i)} target="_blank" rel="noreferrer" className="lift" style={{ textDecoration: "none" }}>
          <div style={{ position: "relative" }}>
            <ItemImage src={i.image_url} store={i.store} name={i.name} w="100%" h={190} radius={22} size={56} />
            {mine ? <LoveCount id={i.id} /> : <HeartBubble id={i.id} />}
          </div>
          <div className="kicker" style={{ marginTop: 8 }}>{i.brand || i.store}</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, lineHeight: 1.25 }}>{i.name}</div>
          {i.note && <div style={{ fontSize: 13, color: "var(--soft)", fontStyle: "italic", marginTop: 4, lineHeight: 1.3 }}>&ldquo;{i.note}&rdquo;</div>}
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
export function ShareLink({ handle, label = "Share my feed", dark = false, small = false }: { handle: string; label?: string; dark?: boolean; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const go = async () => {
    const url = profileUrl(handle);
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    try { if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: `${handle} on Actually`, url }); } catch {}
  };
  if (small) return <button onClick={go} className="press" style={{ height: 38, padding: "0 16px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer", flex: "none", whiteSpace: "nowrap" }}>{copied ? "Copied" : label}</button>;
  return <button onClick={go} className={dark ? "btn" : "btn btn-line"} style={{ height: dark ? 46 : 48, fontSize: dark ? 14 : 15, marginTop: 0 }}>{copied ? "Link copied" : label}</button>;
}

// Piece types, in the order the tabs show them. Only types someone has shared appear.
const TYPES: [string, string][] = [["tops", "Tops"], ["bottoms", "Bottoms"], ["dresses", "Dresses"], ["outerwear", "Outerwear"], ["shoes", "Shoes"], ["bags", "Bags"], ["accessories", "Accessories"], ["beauty", "Skincare"]];

// Plain text tabs: All, then each type present. The chosen one sits in a dark pill.
export function TypeTabs({ items, value, onChange, end }: { items: SharedItem[]; value: string; onChange: (v: string) => void; end?: React.ReactNode }) {
  const have = new Set(items.map(i => i.category));
  const tabs: [string, string][] = [["all", "All"], ...TYPES.filter(([k]) => have.has(k))];
  if (tabs.length < 3) return end ? <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 0" }}>{end}</div> : null;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 0 14px", gap: 4 }}>
      <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={k === value} style={{ flex: "none", height: 30, padding: "0 12px", borderRadius: 999, border: 0, background: k === value ? "var(--ink)" : "transparent", color: k === value ? "#fff" : "var(--muted)", font: `${k === value ? 700 : 500} 13px var(--font-sans), sans-serif`, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      {end}
    </div>
  );
}

// Friends' pieces of one type, two across, with who shared each.
export function FriendGrid({ items, who = true, saved = false }: { items: FeedItem[]; who?: boolean; saved?: boolean }) {
  const face = (h: string) => <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: saved ? 5 : 8 }}><Avatar handle={h} size={saved ? 18 : 20} /><span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{saved ? `from ${displayName(h)}` : displayName(h)}</span></div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: saved ? "20px 12px" : "16px 12px" }}>
      {items.map((i, n) => (
        <a key={i.id} href={findIt(i)} target="_blank" rel="noreferrer" className="lift up" style={{ textDecoration: "none", minWidth: 0, animationDelay: `${n * 50}ms` }}>
          <div style={{ position: "relative" }}>
            <ItemImage src={i.image_url} store={i.store} name={i.name} w="100%" h={190} radius={20} />
            <HeartBubble id={i.id} />
          </div>
          {who && !saved && face(i.handle)}
          <div className="kicker" style={{ marginTop: who && !saved ? 4 : 8 }}>{i.brand || i.store}</div>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{i.name}</div>
          {i.note && !saved && <div style={{ fontSize: 12, color: "var(--soft)", fontStyle: "italic", marginTop: 2, lineHeight: 1.3 }}>&ldquo;{i.note}&rdquo;</div>}
          {saved && face(i.handle)}
          {saved && <div style={{ marginTop: 8, height: 34, borderRadius: 999, border: "1.5px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>Shop it ↗</div>}
        </a>
      ))}
    </div>
  );
}

// Faces of the people she follows. Tap one to see just their pieces.
export function FriendFaces({ handles, value, onChange }: { handles: string[]; value: string | null; onChange: (h: string | null) => void }) {
  const face = (h: string | null) => {
    const on = h === value;
    return (
      <button key={h ?? "all"} type="button" onClick={() => onChange(h)} aria-pressed={on} style={{ flex: "none", width: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, border: 0, background: "none", padding: 0, cursor: "pointer", font: "inherit" }}>
        <span style={{ width: 54, height: 54, borderRadius: "50%", padding: 2, border: `2px solid ${on ? "var(--ink)" : "transparent"}`, boxSizing: "border-box", display: "flex" }}>
          {h ? <Avatar handle={h} size={46} /> : (
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.6" /><path d="M3.5 19c.8-3 3-4.6 5.5-4.6S13.7 16 14.5 19M14.8 15.2c2.6-.4 4.8.9 5.7 3.8" /></svg>
            </span>
          )}
        </span>
        <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, color: on ? "var(--ink)" : "var(--muted)", maxWidth: 60, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h ? displayName(h) : "All"}</span>
      </button>
    );
  };
  return <div style={{ display: "flex", gap: 6, padding: "16px 14px 0", overflowX: "auto" }}>{face(null)}{handles.map(face)}</div>;
}
