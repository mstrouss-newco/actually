"use client";

import { use, useEffect, useRef, useState } from "react";
import { BackLink, useSheetHistory } from "@/lib/nav";
import { useRouter } from "next/navigation";
import { type Item, loadItems, whoFor } from "@/lib/items";
import { OCCASIONS, type Outfit, type Placed, loadOutfit, saveOutfit } from "@/lib/outfits";
import { CollageEditor } from "@/lib/collage";
import { cutOut, ensureCutouts, markCut, useCutout } from "@/lib/cutouts";
import { TypeTabs } from "@/lib/feed-ui";
import { ItemImage } from "@/lib/tabs";

// Build or change an outfit: a board on top, her closet below.
export default function OutfitBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";
  const [items, setItems] = useState<Item[] | null>(null);
  const [orig, setOrig] = useState<Outfit | null>(null);
  const [layout, setLayout] = useState<Placed[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [type, setType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [cutNote, setCutNote] = useState("");
  // What the board looked like when it opened, so leaving can ask before throwing changes away.
  const startLayout = useRef("[]");
  const changed = () => JSON.stringify(layout) !== startLayout.current;
  useSheetHistory(sheet, () => setSheet(false));

  useEffect(() => {
    // Only her own pieces can go in a look; anything else is dropped from the board.
    Promise.all([loadItems(), isNew ? Promise.resolve(null) : loadOutfit(id)]).then(([all, o]) => {
      const mine = all.filter(i => whoFor(i, all) === "me");
      const ok = new Set(mine.map(i => i.id));
      setItems(mine);
      if (o) { setOrig(o); const l0 = o.layout.filter(l => ok.has(l.id)); startLayout.current = JSON.stringify(l0); setLayout(l0); ensureCutouts(o.layout.map(l => l.id), true); setName(o.name); setOccasion(o.occasion); setShared(o.shared); }
      // "Make an outfit with this" from a closet piece starts the board with it.
      const start = new URLSearchParams(location.search).get("with");
      if (isNew && start && ok.has(start)) { const l0 = [{ id: start, x: 0.3, y: 0.25, w: 0.42, r: 0 }]; startLayout.current = JSON.stringify(l0); setLayout(l0); }
    });
  }, [id, isNew]);

  const pieces = (items ?? []).map(i => ({ id: i.id, brand: i.brand, store: i.store, name: i.name, image_url: i.image_url, category: i.category }));
  const on = new Set(layout.map(l => l.id));
  const tray = (items ?? []).filter(i => type === "all" || i.category === type).sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url));
  // New pieces land in a loose cascade so they don't stack exactly.
  const add = (i: Item) => {
    if (on.has(i.id)) { setLayout(l => l.filter(p => p.id !== i.id)); if (sel === i.id) setSel(null); return; }
    if (layout.length >= 12) return;
    const n = layout.length;
    setLayout(l => [...l, { id: i.id, x: 0.08 + ((n * 0.17) % 0.5), y: 0.06 + ((n * 0.21) % 0.6), w: i.category === "shoes" || i.category === "accessories" ? 0.3 : 0.42, r: [-4, 3, 0, -2, 5][n % 5] }]);
    setSel(i.id);
    ensureCutouts([i.id], true);
  };
  const nudge = (f: (p: Placed) => Placed) => sel && setLayout(l => l.map(p => (p.id === sel ? f(p) : p)));
  const toFront = () => sel && setLayout(l => [...l.filter(p => p.id !== sel), l.find(p => p.id === sel)!]);
  const toBack = () => sel && setLayout(l => [l.find(p => p.id === sel)!, ...l.filter(p => p.id !== sel)]);
  const size = (k: number) => nudge(p => { const w = Math.min(0.9, Math.max(0.12, p.w * k)); return { ...p, w, x: p.x - (w - p.w) / 2, y: p.y - ((w - p.w) * 1.15) / 2 }; });

  // Pieces show without their photo background whenever we could cut it out. She can switch one back.
  const cur = layout.find(p => p.id === sel);
  const [cutState] = useCutout(cur?.id);
  const showingCut = !!cur && cur.cut !== false && cutState === "yes";
  const toggleCut = async () => {
    if (!cur) return;
    setCutNote("");
    if (showingCut) { nudge(p => ({ ...p, cut: false })); return; }
    if (cutState === "yes") { nudge(p => ({ ...p, cut: true })); return; }
    setCutting(true);
    const r = await cutOut(cur.id);
    setCutting(false);
    if (r === "ok") { markCut(cur.id, true); setLayout(l => l.map(p => (p.id === cur.id ? { ...p, cut: true } : p))); }
    else { if (r === "busy") markCut(cur.id, false); setCutNote(r === "busy" ? "This photo has too much going on behind it, so we kept it as is." : "Couldn't cut this one out. Try again in a bit."); setTimeout(() => setCutNote(""), 4000); }
  };

  const save = async () => {
    setSaving(true); setFailed(false);
    const ok = new Set(pieces.map(p => p.id));
    const saved = await saveOutfit({ id: orig?.id, name: name || "New outfit", occasion, layout: layout.filter(l => ok.has(l.id)), shared, wasShared: !!orig?.shared_at });
    setSaving(false);
    if (saved) router.replace(`/outfit/${saved}`); else setFailed(true);
  };

  const tool = { height: 34, padding: "0 12px", borderRadius: 999, border: 0, background: "#fff", boxShadow: "0 2px 8px rgba(20,18,16,.1)", font: "700 12px var(--font-sans), sans-serif", color: "var(--ink)", cursor: "pointer" } as const;
  const chip = (v: boolean) => ({ height: 34, padding: "0 13px", borderRadius: 999, border: 0, background: v ? "var(--ink)" : "#F3F0EB", color: v ? "#fff" : "var(--ink)", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" });

  return (
    <main className="tabscreen" style={{ paddingBottom: 0 }}>
      <div className="scroll" style={{ paddingBottom: 40 }}>
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <BackLink fallback={orig ? `/outfit/${orig.id}` : "/closet?view=outfits"} confirm={() => !changed() || window.confirm(orig ? "Leave without saving your changes?" : "Discard this outfit?")} />
          <button type="button" disabled={!layout.length} onClick={() => setSheet(true)} style={{ border: 0, background: "none", font: "700 15px var(--font-sans), sans-serif", color: layout.length ? "var(--ink)" : "var(--muted)", cursor: "pointer" }}>Done</button>
        </div>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 30, margin: "10px 20px 0", letterSpacing: "-0.02em" }}>{orig ? "Edit outfit" : "New outfit"}</h1>

        <div style={{ position: "relative", margin: "12px 16px 0" }}>
          <CollageEditor layout={layout} pieces={pieces} onChange={setLayout} selected={sel} onSelect={setSel} onRemove={pid => { setLayout(l => l.filter(p => p.id !== pid)); setSel(null); }} />
          {sel && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "center", gap: 6, zIndex: 50, flexWrap: "wrap" }}>
              <button type="button" style={tool} onClick={() => size(1.15)} aria-label="Bigger">＋</button>
              <button type="button" style={tool} onClick={() => size(1 / 1.15)} aria-label="Smaller">－</button>
              <button type="button" style={tool} disabled={cutting} onClick={toggleCut}>{cutting ? "Cutting out…" : showingCut ? "Show photo" : "Cut out"}</button>
              <button type="button" style={tool} onClick={toFront}>Front</button>
              <button type="button" style={tool} onClick={toBack}>Behind</button>
            </div>
          )}
        </div>

        {cutNote && <div role="status" style={{ margin: "8px 20px 0", fontSize: 13, color: "var(--soft)" }}>{cutNote}</div>}
        {items && <TypeTabs items={items} value={type} onChange={setType} />}
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 0", overflowX: "auto" }}>
          {items === null && <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading your closet…</div>}
          {tray.map(i => (
            <button key={i.id} type="button" onClick={() => add(i)} aria-pressed={on.has(i.id)} aria-label={i.name} style={{ position: "relative", flex: "none", width: 72, border: 0, padding: 0, background: "none", cursor: "pointer" }}>
              <ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} w={72} h={86} radius={14} size={26} />
              {on.has(i.id) && <span style={{ position: "absolute", right: 5, top: 5, width: 20, height: 20, borderRadius: "50%", background: "var(--ink)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
            </button>
          ))}
          {items && !tray.length && <div style={{ fontSize: 14, color: "var(--muted)" }}>Nothing of this type yet.</div>}
        </div>
        <div style={{ padding: "8px 20px 0", fontSize: 12, color: "var(--muted)" }}>Tap a piece to add it. To take one off, tap it again here or tap ✕ on the board. Up to 12.</div>
      </div>

      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,18,16,.35)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} className="sheetUp" style={{ width: "100%", background: "#fff", borderRadius: "30px 30px 0 0", padding: "14px 20px calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E2DDD7", margin: "0 auto 14px" }} />
            <div className="serif" style={{ fontSize: 26 }}>Name this look</div>
            <input value={name} maxLength={60} placeholder="Name it, like Easy Saturday" onChange={e => setName(e.target.value)} style={{ marginTop: 12, width: "100%", boxSizing: "border-box", height: 50, borderRadius: 14, border: "1.5px solid var(--line)", padding: "0 14px", font: "16px var(--font-sans), sans-serif" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {OCCASIONS.map(o => <button key={o} type="button" onClick={() => setOccasion(occasion === o ? null : o)} style={chip(occasion === o)}>{o}</button>)}
            </div>
            <button type="button" onClick={() => setShared(s => !s)} aria-pressed={shared} style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", border: 0, borderRadius: 16, padding: "12px 14px", textAlign: "left", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>Share to my feed</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>Friends can tap each piece to shop it. Never prices or sizes.</span>
              </span>
              <span style={{ width: 46, height: 28, borderRadius: 999, background: shared ? "var(--ink)" : "#D8D2CB", position: "relative", flex: "none", transition: "background .15s" }}>
                <span style={{ position: "absolute", top: 3, left: shared ? 21 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </span>
            </button>
            <button type="button" className="btn press" disabled={saving} onClick={save} style={{ marginTop: 14 }}>{saving ? "Saving" : "Save outfit"}</button>
            {failed && <div style={{ fontSize: 13, color: "#C9402F", textAlign: "center", marginTop: 8 }}>Couldn&apos;t save. Try again.</div>}
          </div>
        </div>
      )}
    </main>
  );
}
