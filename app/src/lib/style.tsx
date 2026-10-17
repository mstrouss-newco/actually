"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "./items";
import { OCCASIONS, type Placed, saveOutfit } from "./outfits";
import { Collage } from "./collage";
import { supabase } from "./supabase";
import { ensureCutouts } from "./cutouts";

// AI styling: looks put together from her own closet.
export type Look = { name: string; why: string; ids: string[] };

export async function styleLooks(o: { ids: string[]; occasion?: string; anchor?: string; avoid?: string[] }): Promise<Look[] | null | "limit"> {
  const { data, error } = await supabase().functions.invoke("style-outfits", { body: o });
  if (error) return (error as { context?: Response })?.context?.status === 429 ? "limit" : null;
  return ((data as { looks?: Look[] })?.looks ?? []);
}

// Lay pieces out on a board the way she would: layer and top up top, bottoms below, shoes at the foot.
const SLOTS: Record<string, { x: number; y: number; w: number }[]> = {
  outerwear: [{ x: 0.04, y: 0.03, w: 0.44 }],
  tops: [{ x: 0.5, y: 0.04, w: 0.42 }, { x: 0.06, y: 0.04, w: 0.42 }],
  dresses: [{ x: 0.08, y: 0.03, w: 0.46 }],
  bottoms: [{ x: 0.08, y: 0.5, w: 0.38 }],
  shoes: [{ x: 0.52, y: 0.7, w: 0.32 }],
  bags: [{ x: 0.56, y: 0.47, w: 0.32 }],
  accessories: [{ x: 0.6, y: 0.3, w: 0.24 }, { x: 0.1, y: 0.8, w: 0.22 }],
};
const SPARE = [{ x: 0.58, y: 0.16, w: 0.3 }, { x: 0.06, y: 0.76, w: 0.28 }, { x: 0.36, y: 0.4, w: 0.28 }];
export function autoLayout(ids: string[], items: { id: string; category: string }[]): Placed[] {
  const used = new Map<string, number>();
  let spare = 0;
  const tilt = [-3, 2, 0, -4, 3, 1];
  return ids.map((id, n) => {
    const cat = items.find(i => i.id === id)?.category ?? "";
    const k = used.get(cat) ?? 0;
    used.set(cat, k + 1);
    const slot = SLOTS[cat]?.[k] ?? SPARE[spare++ % SPARE.length];
    return { id, ...slot, r: tilt[n % tilt.length] };
  });
}

const chip = (on: boolean, dark: boolean) => ({
  flex: "none" as const, height: 34, padding: "0 14px", borderRadius: 999, border: 0, cursor: "pointer",
  font: "700 13px var(--font-sans), sans-serif",
  background: on ? (dark ? "#fff" : "var(--ink)") : dark ? "#2A2622" : "#F3F0EB",
  color: on ? (dark ? "var(--ink)" : "#fff") : dark ? "#fff" : "var(--ink)",
});

// "Style me" (pick an occasion) or, with an anchor, "3 ways to wear it".
export function StyleMe({ mine, anchor, start }: { mine: Item[]; anchor?: Item; start?: string | null }) {
  const router = useRouter();
  const [occ, setOcc] = useState<string | null>(null);
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [limit, setLimit] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const seen = useRef<string[]>([]);
  // Her newest pieces with photos, always including the piece she's styling.
  const pool = [...(anchor ? [anchor] : []), ...mine.filter(i => i.image_url && i.id !== anchor?.id)].slice(0, 160);
  const pieces = pool.map(i => ({ id: i.id, brand: i.brand, store: i.store, name: i.name, image_url: i.image_url, category: i.category }));
  const enough = pool.length >= 3;

  const run = async (o: string | null, more = false) => {
    setBusy(true); setFailed(false);
    if (!more) { seen.current = []; setLooks(null); }
    const r = await styleLooks({ ids: pool.map(i => i.id), occasion: o ?? undefined, anchor: anchor?.id, avoid: seen.current });
    setBusy(false);
    if (r === "limit") { setLimit(true); return; }
    if (!r) { setFailed(true); return; }
    seen.current.push(...r.map(l => l.name));
    setLooks(r);
    ensureCutouts(r.flatMap(l => l.ids), true);
  };
  useEffect(() => { if (anchor && enough) run(null); }, [anchor?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Opened from Today's "Style me for the weekend": start that run right away.
  useEffect(() => { if (!anchor && start && enough && !occ) { setOcc(start); run(start); } }, [start, enough]); // eslint-disable-line react-hooks/exhaustive-deps

  const keep = async (l: Look, n: number, tweak: boolean) => {
    setSaving(n);
    const id = await saveOutfit({ name: l.name, occasion: occ, note: null, layout: autoLayout(l.ids, pool), shared: false });
    setSaving(null);
    if (id) router.push(tweak ? `/outfit/edit/${id}` : `/outfit/${id}`);
  };

  const dark = !anchor;
  return (
    <div>
      {!anchor && (
        <div style={{ margin: "16px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 24, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7a2 2 0 1 1 2 2c-1.2.4-2 1-2 2v1" /><path d="M2.5 19 12 12l9.5 7z" /></svg>
            Style me from my closet
          </div>
          <div style={{ fontSize: 12.5, color: "#C9C3BC", marginTop: 4 }}>{enough ? "Pick where you're going." : "Add a few more pieces first."}</div>
          {enough && (
            <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto" }}>
              {OCCASIONS.map(o => <button key={o} type="button" onClick={() => { setOcc(o); run(o); }} style={chip(occ === o, dark)}>{o}</button>)}
            </div>
          )}
        </div>
      )}
      {busy && (
        <div style={{ display: "flex", gap: 14, padding: "16px 16px 0", overflow: "hidden" }}>
          {[0, 1].map(k => <div key={k} className="shimmer" style={{ flex: "none", width: 280, aspectRatio: "1 / 1.1", borderRadius: 24, background: "#F3F0EB" }} />)}
        </div>
      )}
      {busy && <div style={{ padding: "10px 20px 0", fontSize: 13, color: "var(--muted)" }}>Putting looks together…</div>}
      {limit && <div style={{ padding: anchor ? "12px 0 0" : "12px 20px 0", fontSize: 14, color: "var(--muted)" }}>That&apos;s a lot of styling for one day. More looks tomorrow.</div>}
      {failed && <div style={{ padding: anchor ? "12px 0 0" : "12px 20px 0", fontSize: 14, color: "var(--muted)" }}>Couldn&apos;t put looks together just now. <button type="button" onClick={() => run(occ)} style={{ border: 0, background: "none", padding: 0, font: "700 14px var(--font-sans), sans-serif", color: "var(--ink)", cursor: "pointer" }}>Try again</button></div>}
      {anchor && !enough && <div style={{ padding: "12px 0 0", fontSize: 14, color: "var(--muted)" }}>Add a few more pieces to your closet first.</div>}
      {!busy && looks && looks.length === 0 && <div style={{ padding: "12px 20px 0", fontSize: 14, color: "var(--muted)" }}>Not enough pieces for this one yet.</div>}
      {!busy && looks && looks.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 14, padding: anchor ? "12px 0 4px" : "16px 16px 4px", overflowX: "auto", scrollSnapType: "x mandatory", scrollPaddingLeft: anchor ? 0 : 16 }}>
            {looks.map((l, n) => (
              <div key={l.name + n} className="up" style={{ flex: "none", width: anchor ? 250 : 290, scrollSnapAlign: "start", animationDelay: `${n * 80}ms` }}>
                <Collage layout={autoLayout(l.ids, pool)} pieces={pieces} radius={22} tags={false} />
                <div className="serif" style={{ fontSize: 20, marginTop: 10 }}>{l.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, minHeight: 34 }}>{l.why}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" disabled={saving !== null} onClick={() => keep(l, n, false)} className="press" style={{ flex: 1, height: 42, borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>{saving === n ? "Saving" : "Save look"}</button>
                  <button type="button" disabled={saving !== null} onClick={() => keep(l, n, true)} style={{ height: 42, padding: "0 16px", borderRadius: 999, border: "1.5px solid var(--line)", background: "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>Tweak</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => run(occ, true)} style={{ display: "block", margin: "10px auto 0", border: 0, background: "none", font: "700 14px var(--font-sans), sans-serif", color: "var(--ink)", cursor: "pointer" }}>Show me 3 more</button>
        </>
      )}
    </div>
  );
}
