"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CATS, type Item, type Who, hideItem, loadItems, needsAsk, setPick, setWho, sizesByBrand, whoFor } from "@/lib/items";
import { fmtDate } from "@/lib/orders";
import { ReadItems } from "@/lib/read-items";
import { ItemImage, TabBar } from "@/lib/tabs";

const PICKS: [NonNullable<Item["pick"]>, string][] = [["share", "Show on my feed"], ["sell", "Want to sell"], ["private", "Keep private"]];
const WHO: [Who, string][] = [["me", "Me"], ["kids", "Kids"], ["partner", "Partner"], ["other", "Someone else"]];
const chip = (on: boolean): React.CSSProperties => ({ border: "1.5px solid var(--ink)", background: on ? "var(--ink)" : "#fff", color: on ? "#fff" : "var(--ink)", borderRadius: 999, padding: "7px 12px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" });

export default function Closet() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [view, setView] = useState<"pieces" | "sizes">("pieces");
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

  const remove = async (i: Item) => {
    setSel(null);
    setItems(list => list?.filter(x => x.id !== i.id) ?? null);
    setUndo(i);
    setTimeout(() => setUndo(u => (u?.id === i.id ? null : u)), 5000);
    await hideItem(i.id);
  };
  const restore = async () => {
    if (!undo) return;
    const i = undo;
    setUndo(null);
    setItems(list => (list ? [i, ...list].sort((a, b) => b.ordered_at.localeCompare(a.ordered_at)) : list));
    await hideItem(i.id, false);
  };
  const answer = async (i: Item, w: Who) => {
    const ids = new Set(await setWho(i, w, items ?? []));
    const patch = (x: Item): Item => (ids.has(x.id) ? { ...x, for_whom: w, pick: w === "me" ? x.pick : "private" } : x);
    setItems(list => list?.map(patch) ?? null);
    setSel(cur => (cur ? patch(cur) : cur));
  };

  const load = useCallback(() => { loadItems().then(setItems); }, []);
  useEffect(load, [load]);

  const choose = async (pick: Item["pick"]) => {
    if (!sel) return;
    const next = sel.pick === pick ? null : pick;
    setSel({ ...sel, pick: next });
    setItems(list => list?.map(i => (i.id === sel.id ? { ...i, pick: next } : i)) ?? null);
    await setPick(sel.id, next);
  };

  const everything = items ?? [];
  const people = WHO.filter(([k]) => k === "me" || everything.some(i => whoFor(i, everything) === k));
  const list = everything.filter(i => whoFor(i, everything) === who);
  const toAsk = who === "me" ? list.filter(i => needsAsk(i, everything)) : [];
  const shelves = CATS.map(([k, label]) => ({ k, label, items: list.filter(i => i.category === k) })).filter(s => s.items.length);
  const cur = shelves.find(s => s.k === cat);
  const unsorted = list.filter(i => !i.pick).length;

  return (
    <main className="tabscreen">
      <div className="scroll">
        {!cur && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "0 20px" }}>
              {(["pieces", "sizes"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className="serif" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: v === view ? 36 : 22, color: v === view ? "var(--ink)" : "var(--muted)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {v === "pieces" ? "Closet" : "Sizes"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", padding: "8px 20px 0" }}>
              {items === null ? "Loading…" : list.length ? `${list.length} ${who === "me" ? "pieces you've bought" : "pieces"}` : "Everything you've bought, in one place."}
            </div>
            {people.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "12px 20px 0" }}>
                {people.map(([k, label]) => <button key={k} onClick={() => setWhoView(k)} style={chip(who === k)}>{k === "me" ? "Mine" : label}</button>)}
              </div>
            )}
            {toAsk[0] && view === "pieces" && (
              <div style={{ margin: "16px 16px 0", background: "#FAF8F6", borderRadius: 22, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <ItemImage src={toAsk[0].image_url} store={toAsk[0].store} w={56} h={70} radius={14} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Is this yours?</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toAsk[0].brand || toAsk[0].store} {toAsk[0].name} · Size {toAsk[0].size}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {WHO.map(([k, label]) => <button key={k} onClick={() => answer(toAsk[0], k)} style={{ ...chip(false), padding: "5px 10px", fontSize: 12 }}>{k === "me" ? "Yes, mine" : label}</button>)}
                  </div>
                </div>
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
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Sort your pieces</div>
                  <div style={{ fontSize: 12, color: "#C9C3BC", marginTop: 2 }}>{unsorted} to go. Share, sell or keep private.</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 0" }}>
              {shelves.map(s => (
                <button key={s.k} onClick={() => setCat(s.k)} className="orow" style={{ display: "flex", alignItems: "center", gap: 14, border: "1.5px solid var(--line)", background: "#fff", borderRadius: 24, padding: "12px 14px 12px 18px", cursor: "pointer", font: "inherit", color: "var(--ink)", textAlign: "left" }}>
                  <div style={{ flex: 1 }}>
                    <div className="serif" style={{ fontSize: 24 }}>{s.label}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{s.items.length} {s.items.length === 1 ? "piece" : "pieces"}</div>
                  </div>
                  <div style={{ display: "flex" }}>
                    {s.items.slice(0, 3).map((i, n) => (
                      <div key={i.id} style={{ marginLeft: n ? -18 : 0, transform: `rotate(${(n - 1) * 8}deg)`, zIndex: n === 1 ? 1 : 0 }}>
                        <ItemImage src={i.image_url} store={i.store} w={54} h={68} radius={14} size={22} />
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {!cur && view === "sizes" && list.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 0" }}>
            {sizesByBrand(list).map(b => (
              <div key={b.brand} style={{ background: "#FAF8F6", borderRadius: 22, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{b.brand}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {b.sizes.map(s => (
                    <span key={s.cat} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 10px", fontSize: 13 }}>
                      {CATS.find(c => c[0] === s.cat)?.[1]} <b>{s.size}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {sizesByBrand(list).length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>No sizes found in your orders yet.</div>}
          </div>
        )}

        {cur && (
          <>
            <div style={{ padding: "0 20px", position: "sticky", top: -22, zIndex: 5, background: "#fff", paddingTop: 22, marginTop: -22, paddingBottom: 6 }}>
              <button onClick={() => setCat(null)} className="back" style={{ border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>Closet
              </button>
              <h1 className="serif" style={{ fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>{cur.label}</h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "18px 16px 0" }}>
              {cur.items.map(i => (
                <button key={i.id} onClick={() => setSel(i)} className="lift" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "var(--ink)" }}>
                  <ItemImage src={i.image_url} store={i.store} w="100%" h={190} radius={22} size={56} />
                  <div className="kicker" style={{ marginTop: 8 }}>{i.brand || i.store}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, lineHeight: 1.25 }}>{i.name}</div>
                  {i.size && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Size {i.size}</div>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(20,18,16,.35)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} className="popIn" style={{ width: "100%", background: "#fff", borderRadius: "30px 30px 0 0", padding: "14px 20px 28px" }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E5E0DA", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ItemImage src={sel.image_url} store={sel.store} w={96} h={120} radius={20} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kicker">{sel.brand || sel.store}</div>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.08, marginTop: 4 }}>{sel.name}</div>
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 6 }}>
                  {[sel.size && `Size ${sel.size}`, sel.color, sel.price != null && `$${sel.price.toFixed(2)}`].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Bought {fmtDate(sel.ordered_at)} from {sel.store}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Who is this for?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {WHO.map(([k, label]) => <button key={k} onClick={() => answer(sel, k)} style={chip(whoFor(sel, everything) === k)}>{label}</button>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              {PICKS.map(([k, label]) => (
                <button key={k} onClick={() => choose(k)} className="btn" style={{ height: 48, fontSize: 15, background: sel.pick === k ? "var(--ink)" : "#fff", color: sel.pick === k ? "#fff" : "var(--ink)", border: "1.5px solid var(--ink)" }}>
                  {sel.pick === k ? "✓ " : ""}{label}
                </button>
              ))}
              <button onClick={() => remove(sel)} className="btn btn-ghost" style={{ marginTop: 0, fontSize: 14, color: "#C9402F" }}>Remove from closet</button>
            </div>
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
