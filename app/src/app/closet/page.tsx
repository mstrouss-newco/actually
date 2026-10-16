"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { findIt, siteOf, siteSearch, storeLink } from "@/lib/social";
import { type Outfit, loadOutfits } from "@/lib/outfits";
import { Collage } from "@/lib/collage";
import { CATS, type Item, type Who, brandOf, confirmMine, hideItem, hueRank, likelyWho, loadItems, needsAsk, setPick, setWho, shortSize, sizesByBrand, toSort, whoFor } from "@/lib/items";
import { type Ret, dayLabel, fmtDate, loadOrders, matches, returnsByEmail } from "@/lib/orders";
import { ReadItems } from "@/lib/read-items";
import { ensureCutouts } from "@/lib/cutouts";
import { ItemImage, BrandLogo, TabBar, tint } from "@/lib/tabs";
import { delay } from "@/lib/motion";

const PICKS: [NonNullable<Item["pick"]>, string][] = [["share", "Show on my feed"], ["sell", "Want to sell"], ["private", "Keep private"]];
const WHO: [Who, string][] = [["me", "Me"], ["kids", "Kids"], ["partner", "Partner"], ["other", "Someone else"]];
type SortKey = "new" | "color" | "brand" | "ret";
const SORTS: [SortKey, string, string][] = [["new", "Newest", "What just came in"], ["color", "By color", "The rail turns into a rainbow"], ["brand", "By brand", "A to Z"], ["ret", "Returnable first", "Decide before the window closes"]];
const BSORT: [string, string][] = [["most", "Most bought"], ["recent", "Recent"], ["az", "A to Z"]];
// Same product in two colors: show the color so they don't look like duplicates.
const twin = (i: Item, list: Item[]) => list.some(o => o !== i && o.name === i.name && brandOf(o) === brandOf(i));
const isNew = (i: Item) => Date.now() - Date.parse(i.ordered_at) < 14 * 86400000;
const chip = (on: boolean): React.CSSProperties => ({ border: "1.5px solid var(--ink)", background: on ? "var(--ink)" : "#fff", color: on ? "#fff" : "var(--ink)", borderRadius: 999, padding: "7px 12px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" });

export default function Closet() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [view, setView] = useState<"pieces" | "brands" | "outfits">("pieces");
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  useEffect(() => { loadOutfits().then(setOutfits); }, []);
  const [rets, setRets] = useState<Map<string, Ret>>(new Map());
  const [sort, setSortState] = useState<SortKey>("new");
  // The sort she picks stays put, on every shelf and after a reload.
  const setSort = (k: SortKey) => { setSortState(k); try { localStorage.setItem("closet-sort", k); } catch {} };
  useEffect(() => { try { const k = localStorage.getItem("closet-sort") as SortKey | null; if (k && SORTS.some(o => o[0] === k)) setSortState(k); } catch {} }, []);
  const [sortOpen, setSortOpen] = useState(false);
  const [q, setQ] = useState("");
  const [bsort, setBsortState] = useState("most");
  // The brand sort she picked stays when she comes back from a brand page.
  const setBsort = (k: string) => { setBsortState(k); try { sessionStorage.setItem("brand-sort", k); } catch {} };
  useEffect(() => { try { const k = sessionStorage.getItem("brand-sort"); if (k) setBsortState(k); } catch {} }, []);
  // Coming back from a brand page opens the Brands tab.
  useEffect(() => { const v = new URLSearchParams(location.search).get("view"); if (v === "brands" || v === "outfits") setView(v); }, []);
  // Remember the tab in the address, so Back from a brand page lands on Brands.
  const pickView = (v: "pieces" | "brands" | "outfits") => { setView(v); history.replaceState(history.state, "", v !== "pieces" ? `?view=${v}` : location.pathname); };
  useEffect(() => { loadOrders().then(g => g && setRets(returnsByEmail(g))); }, []);
  const [cat, setCatState] = useState<string | null>(null);
  // Opening a shelf adds a step to the browser history, so Back returns to the closet.
  const setCat = (k: string | null) => {
    if (k && !cat) history.pushState({ shelf: k }, "");
    else if (!k && cat && history.state?.shelf) return history.back();
    setCatState(k);
    document.querySelector(".tabscreen > .scroll")?.scrollTo(0, 0);
  };
  useEffect(() => {
    const pop = () => setCatState(null);
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  const [sel, setSel] = useState<Item | null>(null);
  const [who, setWhoView] = useState<Who>("me");
  const [undo, setUndo] = useState<Item | null>(null);
  // The pieces shown in "Is all of this yours?", fixed when it opens so answers don't reshuffle it.
  const [review, setReview] = useState<string[] | null>(null);
  // Esc closes whatever sheet is open.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setSel(null); setSortOpen(false); } };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);

  const remove = async (i: Item) => {
    setSel(null);
    setItems(list => list?.filter(x => x.id !== i.id) ?? null);
    setUndo(i);
    setTimeout(() => setUndo(u => (u?.id === i.id ? null : u)), 8000);
    await hideItem(i);
  };
  const restore = async () => {
    if (!undo) return;
    const i = undo;
    setUndo(null);
    setItems(list => (list ? [i, ...list].sort((a, b) => b.ordered_at.localeCompare(a.ordered_at)) : list));
    await hideItem(i, false);
  };
  const answer = async (i: Item, w: Who) => {
    const ids = new Set(await setWho(i, w, items ?? []));
    const patch = (x: Item): Item => (ids.has(x.id) ? { ...x, for_whom: w, pick: w === "me" ? x.pick : "private" } : x);
    setItems(list => list?.map(patch) ?? null);
    setSel(cur => (cur ? patch(cur) : cur));
  };

  // A link like /closet?piece=… opens that piece's sheet.
  const load = useCallback(() => { loadItems().then(list => {
    setItems(list);
    // Remove plain photo backgrounds from her pieces in the background, newest first.
    ensureCutouts(list.filter(i => i.image_url && whoFor(i, list) === "me").map(i => i.id));
    const id = new URLSearchParams(location.search).get("piece");
    const hit = id ? list.find(i => i.id === id) : null;
    if (hit) setSel(hit);
  }); }, []);
  useEffect(load, [load]);

  const choose = async (pick: Item["pick"]) => {
    if (!sel) return;
    const next = sel.pick === pick ? null : pick;
    setSel({ ...sel, pick: next });
    setItems(list => list?.map(i => (i.id === sel.id ? { ...i, pick: next } : i)) ?? null);
    await setPick(sel, next);
  };

  const everything = items ?? [];
  const people = WHO.filter(([k]) => k === "me" || everything.some(i => whoFor(i, everything) === k));
  const list = everything.filter(i => whoFor(i, everything) === who);
  const toAsk = who === "me" ? list.filter(i => needsAsk(i, everything)) : [];
  const guess = toAsk[0] ? likelyWho(toAsk[0], everything) : null;
  // Pieces in "Mine" she hasn't confirmed yet.
  const unchecked = who === "me" ? list.filter(i => !i.for_whom) : [];
  const finishReview = async () => {
    const ids = everything.filter(i => review?.includes(i.id) && !i.for_whom).map(i => i.id);
    setItems(l => l?.map(x => (ids.includes(x.id) ? { ...x, for_whom: "me" as Who } : x)) ?? null);
    setReview(null);
    await confirmMine(ids, everything);
  };
  const shelves = CATS.map(([k, label]) => ({ k, label, items: list.filter(i => i.category === k) })).filter(s => s.items.length);
  const cur = shelves.find(s => s.k === cat);
  const unsorted = toSort(everything).length;
  const retLeft = (i: Item) => rets.get(i.gmail_id ?? "")?.by ?? Infinity;
  const sorted = cur ? [...cur.items].sort(
    sort === "color" ? (a, b) => hueRank(a.color) - hueRank(b.color) || b.ordered_at.localeCompare(a.ordered_at)
    : sort === "brand" ? (a, b) => brandOf(a).localeCompare(brandOf(b))
    : sort === "ret" ? (a, b) => retLeft(a) - retLeft(b) || b.ordered_at.localeCompare(a.ordered_at)
    : (a, b) => b.ordered_at.localeCompare(a.ordered_at)) : [];

  // Brands tab: her own pieces only, one card per brand with her usual sizes.
  const mine = everything.filter(i => whoFor(i, everything) === "me");
  const sizes = new Map(sizesByBrand(mine).map(b => [b.brand, b.sizes]));
  const byBrand = new Map<string, Item[]>();
  for (const i of mine) byBrand.set(brandOf(i), [...(byBrand.get(brandOf(i)) ?? []), i]);
  const brands = [...byBrand.entries()].map(([name, its]) => {
    const open = its.map(i => rets.get(i.gmail_id ?? "")?.by).filter((t): t is number => !!t).sort((a, b) => a - b)[0];
    // The shop's return rule, only when one of its emails states it.
    const ret = its.map(i => rets.get(i.gmail_id ?? "")).find(r => r?.rule);
    return {
      name, orders: new Set(its.map(i => i.gmail_id ?? i.id)).size, pieces: its.length, last: its.map(i => i.ordered_at).sort().at(-1)!,
      sizes: sizes.get(name) ?? [], open: open ? `Return by ${dayLabel(open)}` : null,
      // Newest first, photos first: the strip of her pieces on the card.
      strip: [...its].sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url) || b.ordered_at.localeCompare(a.ordered_at)),
      rule: ret?.rule ? `${ret.store !== name ? `${ret.store}: ` : ""}${ret.rule}` : null,
    };
  }).filter(b => !q.trim() || matches(b.name, q))
    .sort(bsort === "az" ? (a, b) => a.name.localeCompare(b.name) : bsort === "recent" ? (a, b) => b.last.localeCompare(a.last) : (a, b) => b.pieces - a.pieces || b.orders - a.orders || b.last.localeCompare(a.last));

  return (
    <main className="tabscreen">
      <div className="scroll">
        {!cur && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "0 20px", whiteSpace: "nowrap" }}>
              {(["pieces", "brands", "outfits"] as const).map(v => (
                <button key={v} onClick={() => pickView(v)} className="serif" style={{ border: 0, borderBottom: `2px solid ${v === view ? "var(--ink)" : "transparent"}`, background: "none", padding: 0, cursor: "pointer", fontSize: 32, color: v === view ? "var(--ink)" : "#948C84", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {v === "pieces" ? "Pieces" : v === "brands" ? "Brands" : "Outfits"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", padding: "8px 20px 0" }}>
              {items === null ? "Loading…" : view === "outfits" ? "Put looks together from what you own." : view === "brands" ? "Your size and their return rules, ready while you shop." : list.length ? `${list.length} ${list.length === 1 ? "piece" : "pieces"}${who === "me" ? " you've bought" : ""}` : "Everything you've bought, in one place."}
            </div>
            {view === "pieces" && people.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "12px 20px 0" }}>
                {people.map(([k, label]) => <button key={k} onClick={() => setWhoView(k)} style={chip(who === k)}>{k === "me" ? "Mine" : label}</button>)}
              </div>
            )}
            {view === "pieces" && !toAsk[0] && unchecked.length > 0 && (
              <button onClick={() => setReview(unchecked.map(i => i.id))} style={{ margin: "16px 16px 0", width: "calc(100% - 32px)", textAlign: "left", border: 0, background: "#FAF8F6", borderRadius: 22, padding: "14px 16px", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Is all of this yours?</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Take 10 seconds to move anything bought for kids or a partner. {unchecked.length} to check.</div>
              </button>
            )}
            {view === "pieces" && toAsk[0] && (
              <div style={{ margin: "16px 16px 0", background: "#FAF8F6", borderRadius: 22, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <ItemImage cutId={toAsk[0].id} src={toAsk[0].image_url} store={toAsk[0].store} name={toAsk[0].name} w={56} h={70} radius={14} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{guess ? "Looks like it's for your partner" : "Is this one yours?"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{guess ? `${toAsk[0].brand || toAsk[0].store} ${toAsk[0].name}` : `Size ${toAsk[0].size} isn't your usual at ${toAsk[0].brand || toAsk[0].store}`}</div>
                </div>
                <button onClick={() => answer(toAsk[0], guess ?? "me")} className="press" style={{ flex: "none", height: 34, padding: "0 14px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" }}>{guess ? "Right" : "Mine"}</button>
                <label style={{ flex: "none", position: "relative", fontSize: 13, fontWeight: 700, color: "var(--muted)", padding: "0 6px", minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>
                  Change
                  <select aria-label="Who is this for?" value="" onChange={e => e.target.value && answer(toAsk[0], e.target.value as Who)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
                    <option value="" disabled>Who is it for?</option>
                    {WHO.map(([k, label]) => <option key={k} value={k}>{k === "me" ? "It's mine" : label}</option>)}
                  </select>
                </label>
              </div>
            )}
          </>
        )}

        {items !== null && everything.length === 0 && (
          <div style={{ margin: "18px 16px 0", background: "var(--chip)", borderRadius: 28, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.05 }}>Fill your closet from your <em>orders.</em></div>
            <div style={{ fontSize: 14, color: "var(--soft)", lineHeight: 1.45 }}>We read each order email once to find what you bought, the size and a photo. Takes a minute or two.</div>
            <ReadItems onDone={load} />
          </div>
        )}

        {!cur && view === "pieces" && list.length > 0 && (
          <>
            {unsorted > 0 && (
              <Link href="/sort" style={{ margin: "16px 16px 0", display: "flex", alignItems: "center", gap: 12, background: "var(--ink)", color: "#fff", borderRadius: 22, padding: "14px 16px", textDecoration: "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Add pieces to your feed</div>
                  <div style={{ fontSize: 12, color: "#C9C3BC", marginTop: 2 }}>{unsorted} ready. Swipe to share, sell or keep private.</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            )}
            <div style={{ marginTop: 14, borderTop: "1px solid var(--line)" }}>
              {shelves.map((s, si) => {
                const back = s.items.filter(i => rets.get(i.gmail_id ?? "")?.left).length;
                const [a, b, c] = s.items;
                return (
                  <button key={s.k} onClick={() => setCat(s.k)} className="shelf up" style={{ ...delay(si, 70), width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", border: 0, borderBottom: "1px solid var(--line)", background: "#fff", cursor: "pointer", font: "inherit", color: "var(--ink)", textAlign: "left" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.01em" }}>{s.label}</div>
                      {back > 0 && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, fontWeight: 700, color: "#C9402F" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF6159" }} />{back} can still go back</div>}
                    </div>
                    <div style={{ position: "relative", width: 112, height: 92, flex: "none" }}>
                      {b && <div className="fan1" style={{ position: "absolute", left: 4, top: 10, transform: "rotate(-9deg)", boxShadow: "0 4px 10px rgba(20,18,16,.08)", borderRadius: 12 }}><ItemImage cutId={b.id} src={b.image_url} store={b.store} name={b.name} w={56} h={72} radius={12} size={20} /></div>}
                      {c && <div className="fan3" style={{ position: "absolute", right: 4, top: 10, transform: "rotate(9deg)", boxShadow: "0 4px 10px rgba(20,18,16,.08)", borderRadius: 12 }}><ItemImage cutId={c.id} src={c.image_url} store={c.store} name={c.name} w={56} h={72} radius={12} size={20} /></div>}
                      <div style={{ position: "absolute", left: 28, top: 2, boxShadow: "0 8px 16px rgba(20,18,16,.12)", borderRadius: 12 }}><ItemImage cutId={a.id} src={a.image_url} store={a.store} name={a.name} w={56} h={76} radius={12} size={20} /></div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B9B3AC" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!cur && view === "outfits" && (
          <>
            <div style={{ padding: "16px 16px 0" }}>
              <Link href="/outfit/edit/new" className="btn press" style={{ marginTop: 0, height: 50, fontSize: 15 }}>+ New outfit</Link>
            </div>
            {outfits && outfits.length === 0 && (
              <div style={{ margin: "16px 16px 0", background: "var(--chip)", borderRadius: 26, padding: "20px 18px" }}>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>Your first <em>look.</em></div>
                <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>Pick pieces you own, lay them out, and save it. Share it and friends can shop each piece.</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px 12px", padding: "16px 16px 0" }}>
              {(outfits ?? []).map((o, n) => (
                <Link key={o.id} href={`/outfit/${o.id}`} className="up press" style={{ ...delay(n, 50), textDecoration: "none", color: "var(--ink)", minWidth: 0 }}>
                  <div style={{ pointerEvents: "none" }}><Collage layout={o.layout} pieces={(items ?? []).map(i => ({ id: i.id, brand: i.brand, store: i.store, name: i.name, image_url: i.image_url, category: i.category }))} radius={20} tags={false} /></div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{o.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{[o.occasion, o.shared ? "Shared" : "Only you"].filter(Boolean).join(" · ")}</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {!cur && view === "brands" && items !== null && (
          <>
            <label style={{ margin: "16px 16px 0", height: 50, borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A746D" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a brand" aria-label="Find a brand" style={{ border: 0, outline: 0, background: "transparent", font: "500 15px var(--font-sans), sans-serif", flex: 1, color: "var(--ink)", minWidth: 0 }} />
            </label>
            {(brands.length > 1 || q) && <div style={{ display: "flex", gap: 20, margin: "16px 20px 0", borderBottom: "1px solid var(--line)" }}>
              {BSORT.map(([k, label]) => (
                <button key={k} onClick={() => setBsort(k)} style={{ border: 0, background: "none", padding: "12px 0", marginBottom: -1, borderBottom: `2px solid ${bsort === k ? "var(--ink)" : "transparent"}`, color: bsort === k ? "var(--ink)" : "var(--muted)", font: "700 15px var(--font-sans), sans-serif", cursor: "pointer" }}>{label}</button>
              ))}
            </div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 16px 0" }}>
              {brands.map((b, bi) => (
                <Link key={b.name} href={`/brand/${encodeURIComponent(b.name)}`} className="lift up press" style={{ ...delay(bi, 70), display: "block", textDecoration: "none", background: tint(b.name), borderRadius: 26, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <BrandLogo store={b.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingBottom: 2 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "var(--soft)" }}>{b.pieces} {b.pieces === 1 ? "piece" : "pieces"} · last one {fmtDate(b.last)}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.4" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </div>
                  <div style={{ display: "flex", marginTop: 12, paddingLeft: 2 }}>
                    {b.strip.slice(0, 4).map((it, k) => (
                      <div key={it.id} className="fanin" style={{ marginLeft: k ? -10 : 0, transform: `rotate(${[-4, 2, -1, 3][k]}deg)`, position: "relative", zIndex: 4 - k, borderRadius: 14, boxShadow: "0 4px 12px rgba(20,18,16,.08)", animationDelay: `${bi * 70 + k * 60}ms` }}>
                        <ItemImage cutId={it.id} src={it.image_url} store={it.store} name={it.name} w={60} h={74} radius={14} />
                      </div>
                    ))}
                    {b.pieces > 4 && <div style={{ width: 60, height: 74, marginLeft: -10, borderRadius: 14, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, position: "relative" }}>+{b.pieces - 4}</div>}
                  </div>
                  {(b.sizes.length > 0 || b.open || b.rule) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                      {b.sizes.slice(0, 3).map(s => (
                        <span key={s.cat} style={{ background: "#fff", borderRadius: 999, padding: "4px 10px", display: "inline-flex", alignItems: "baseline", gap: 5, fontSize: 12, whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{CATS.find(c => c[0] === s.cat)?.[1]}</span>
                          <b>{shortSize(s.size, s.cat)}</b>
                        </span>
                      ))}
                      <span style={{ flex: 1 }} />
                      {b.open
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#C9402F" }}><span className="ping" style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF6159" }} />{b.open}</span>
                        : b.rule && <span style={{ fontSize: 12, color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{b.rule}</span>}
                    </div>
                  )}
                </Link>
              ))}
              {brands.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: "0 4px" }}>{q ? "No brand by that name in your closet." : "No brands yet. They show up as your orders are read."}</div>}
            </div>
          </>
        )}

        {cur && (
          <div className="slideIn">
            <div style={{ padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setCat(null)} className="back" style={{ border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>Closet
              </button>
              <button onClick={() => setSortOpen(true)} style={{ height: 36, padding: "0 14px", borderRadius: 999, border: "1.5px solid #E2DDD7", background: "#fff", font: "700 13px var(--font-sans), sans-serif", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--ink)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M7 12h10M10 17h4" /></svg>{SORTS.find(o => o[0] === sort)![1]}
              </button>
            </div>
            <h1 className="serif" style={{ fontWeight: 400, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 20px 0" }}>{cur.label}</h1>
            <div style={{ position: "relative", marginTop: 16 }}>
              <div style={{ position: "absolute", left: 12, right: 0, top: 10, height: 5, borderRadius: 3, background: "#D9D3CC" }} />
              <div className="hangrail" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 40px 14px 20px", scrollPaddingLeft: 20, position: "relative" }}>
                {sorted.slice(0, 12).map(i => {
                  const r = rets.get(i.gmail_id ?? "");
                  return (
                    <button key={i.id} onClick={() => setSel(i)} className="hang" style={{ opacity: r?.returned ? 0.4 : 1, flex: "none", width: 140, border: 0, background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", font: "inherit", color: "inherit" }}>
                      <svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#8C857D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4a3 3 0 1 1 3 3c-1.6.5-3 1.2-3 2.8V11" /><path d="M4 24 22 11l18 13z" /></svg>
                      <div style={{ marginTop: -6, position: "relative", borderRadius: 24, boxShadow: "0 10px 20px rgba(20,18,16,.08)" }}>
                        <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} label="" w={140} h={178} radius={24} size={48} />
                        {r?.by && <div style={{ position: "absolute", bottom: -8, right: -6, background: "#FF6159", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, transform: "rotate(-6deg)" }}>Return by {dayLabel(r.by)}</div>}
                        {r?.returned && <div style={{ position: "absolute", bottom: -8, right: -6, background: "var(--ink)", color: "#fff", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700 }}>Returned</div>}
                        {(i.arriving || isNew(i)) && <div style={{ position: "absolute", top: 10, left: 10, background: i.arriving ? "#FFF0BF" : "#fff", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>{i.arriving ? "On the way" : "New"}</div>}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, width: 124, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{brandOf(i)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", width: 124, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{i.name}</div>
                      {twin(i, sorted) && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--soft)", width: 124, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{i.color ?? `Bought ${fmtDate(i.ordered_at)}`}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* The rail already shows every piece on short shelves. */}
            {sorted.length > 8 && <div className="serif" style={{ padding: "22px 20px 0", fontSize: 22 }}>All {cur.label.toLowerCase()}</div>}
            <div style={{ display: sorted.length > 8 ? "grid" : "none", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, padding: "12px 16px 0" }}>
              {sorted.map((i, gi) => (
                <button key={i.id} onClick={() => setSel(i)} className="press up" style={{ ...delay(gi, 40), opacity: rets.get(i.gmail_id ?? "")?.returned ? 0.4 : 1, border: 0, padding: 0, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, font: "inherit", color: "inherit", textAlign: "left", minWidth: 0 }}>
                  <div style={{ position: "relative", width: "100%" }}>
                    <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} label="" w="100%" h={140} radius={16} size={36} />
                    {i.arriving && <div style={{ position: "absolute", top: 8, left: 8, background: "#FFF0BF", borderRadius: 999, padding: "3px 7px", fontSize: 10, fontWeight: 700 }}>On the way</div>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brandOf(i)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: -3 }}>{i.name}</div>
                  {twin(i, sorted) && <div style={{ fontSize: 11, color: "var(--muted)", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: -3 }}>{i.color ?? `Bought ${fmtDate(i.ordered_at)}`}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sortOpen && (
        <div onClick={() => setSortOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(20,18,16,.45)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} className="sheetUp" style={{ width: "100%", background: "#fff", borderRadius: "30px 30px 0 0", padding: "14px 20px 34px" }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E2DDD7", margin: "0 auto" }} />
            <div className="serif" style={{ fontSize: 28, marginTop: 16 }}>Sort</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
              {SORTS.map(([k, label, hint]) => (
                <button key={k} onClick={() => { setSort(k); setSortOpen(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, border: 0, borderBottom: "1px solid var(--line)", background: "#fff", font: "inherit", color: "var(--ink)", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  <span><span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{label}</span><span style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>{hint}</span></span>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${sort === k ? "var(--ink)" : "#D9D3CC"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: sort === k ? "var(--ink)" : "transparent" }} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(20,18,16,.35)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} className="popIn" style={{ width: "100%", background: "#fff", borderRadius: "30px 30px 0 0", padding: "14px 20px 28px" }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E5E0DA", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ItemImage cutId={sel.id} src={sel.image_url} store={sel.store} name={sel.name} w={96} h={120} radius={20} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kicker">{sel.brand || sel.store}</div>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.08, marginTop: 4, overflowWrap: "normal", wordBreak: "normal", hyphens: "none" }}>{sel.name}</div>
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 6 }}>
                  {[sel.size && `Size ${sel.size}`, sel.color, sel.price != null && `$${sel.price.toFixed(2)}`].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sel.arriving ? `Ordered ${fmtDate(sel.ordered_at)} from ${sel.store}. On its way.` : `Bought ${fmtDate(sel.ordered_at)} from ${sel.store}`}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Who is this for?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {WHO.map(([k, label]) => <button key={k} onClick={() => answer(sel, k)} style={chip(sel.for_whom === k)}>{label}{!sel.for_whom && whoFor(sel, everything) === k ? " (our guess)" : ""}</button>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              {rets.get(sel.gmail_id ?? "")?.returned && <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>You sent this back, so it can&apos;t go on your feed.</div>}
              {!rets.get(sel.gmail_id ?? "")?.returned && sel.pick !== "share" && <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>{sel.pick ? "" : "Not on your feed yet. "}Share it and you could earn if a friend buys it.</div>}
              {!rets.get(sel.gmail_id ?? "")?.returned && PICKS.map(([k, label]) => (
                <button key={k} onClick={() => choose(k)} className="btn" style={{ height: 48, fontSize: 15, background: sel.pick === k ? "var(--ink)" : "#fff", color: sel.pick === k ? "#fff" : "var(--ink)", border: "1.5px solid var(--ink)" }}>
                  {sel.pick === k ? "✓ " : ""}{label}
                </button>
              ))}
              {whoFor(sel, everything) === "me" && <Link href={`/outfit/edit/new?with=${sel.id}`} className="btn btn-ghost" style={{ height: 44, fontSize: 14, border: "1.5px solid var(--line)" }}>Make an outfit with this</Link>}
              {sel.pick === "sell" && <Link href={`/earn/worth/${sel.id}`} className="btn press" style={{ height: 48, fontSize: 15, background: "#FF6159", color: "var(--ink)" }}>Make a resale post →</Link>}
              <a href={findIt(sel)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ height: 44, fontSize: 14, border: "1.5px solid var(--line)" }}>{storeLink(sel) ? `See it on ${siteOf(storeLink(sel)!)}` : siteSearch(sel) ? `Find it on ${siteOf(siteSearch(sel)!).replace(/^www\./, "")}` : "Find it online"}</a>
              <button onClick={() => remove(sel)} className="btn btn-ghost" style={{ marginTop: 0, fontSize: 14, color: "#C9402F" }}>Remove from closet</button>
            </div>
          </div>
        </div>
      )}
      {review && (
        <div style={{ position: "absolute", inset: 0, zIndex: 25, background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "22px 20px 8px" }}>
            <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>Is all of this yours?</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Tap who anything else is for. Everything you leave stays yours.</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {everything.filter(i => review.includes(i.id)).map(i => (
              <div key={i.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "#FAF8F6", borderRadius: 18, padding: 10 }}>
                <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} w={48} h={60} radius={12} size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.brand || i.store} {i.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{i.size ? `Size ${i.size}` : "No size"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {WHO.map(([k, label]) => <button key={k} onClick={() => answer(i, k)} style={{ ...chip((i.for_whom ?? "me") === k), padding: "4px 9px", fontSize: 12 }}>{label}</button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 16px 24px" }}>
            <button className="btn" onClick={finishReview} style={{ height: 50 }}>Done</button>
          </div>
        </div>
      )}
      {undo && (
        <div style={{ position: "absolute", zIndex: 30, left: 24, right: 24, bottom: 92, background: "var(--ink)", color: "#fff", borderRadius: 999, padding: "10px 10px 10px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
          <span style={{ flex: 1 }}>Removed from your closet</span>
          <button onClick={restore} style={{ border: 0, background: "#fff", color: "var(--ink)", borderRadius: 999, padding: "6px 14px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Undo</button>
        </div>
      )}
      <TabBar />
    </main>
  );
}
