"use client";

import { useRef, useState } from "react";
import { BOARD_H, type PieceLite, type Placed } from "./outfits";
import { findIt } from "./social";
import { ItemImage } from "./tabs";

const BG = "#F7F3EE";
const PIECE_H = 1.15; // each piece's box is a little taller than wide

function PieceArt({ p }: { p: PieceLite }) {
  const [bad, setBad] = useState(false);
  if (!p.image_url || bad) return <ItemImage src={null} store={p.store} name={p.name} w="100%" h="100%" radius={16} size={36} />;
  let src = p.image_url;
  if (/media-amazon\.com/.test(src)) src = src.replace(/\._[^/]*_\.(jpg|jpeg|png)$/i, "._SL600_.$1");
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={p.name} referrerPolicy="no-referrer" draggable={false} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply", pointerEvents: "none", userSelect: "none" }} />;
}

const box = (l: Placed) => ({
  position: "absolute" as const, left: `${l.x * 100}%`, top: `${(l.y / BOARD_H) * 100}%`,
  width: `${l.w * 100}%`, height: `${((l.w * PIECE_H) / BOARD_H) * 100}%`, transform: `rotate(${l.r ?? 0}deg)`,
});

// A finished look. Tap any piece to see what it is and shop it.
export function Collage({ layout, pieces, radius = 28, tags = true }: { layout: Placed[]; pieces: PieceLite[]; radius?: number; tags?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(pieces.map(p => [p.id, p]));
  const shown = layout.filter(l => byId.has(l.id));
  const tag = shown.find(l => l.id === open);
  const tp = tag ? byId.get(tag.id)! : null;
  return (
    <div onClick={() => setOpen(null)} style={{ position: "relative", width: "100%", aspectRatio: `1 / ${BOARD_H}`, background: BG, borderRadius: radius, overflow: "hidden" }}>
      {shown.map((l, z) => (
        <button key={l.id} type="button" aria-label={byId.get(l.id)!.name} disabled={!tags}
          onClick={e => { e.stopPropagation(); setOpen(o => (o === l.id ? null : l.id)); }}
          style={{ ...box(l), zIndex: z + 1, border: 0, padding: 0, background: "none", cursor: tags ? "pointer" : "default" }}>
          <PieceArt p={byId.get(l.id)!} />
        </button>
      ))}
      {tag && tp && (
        <a href={findIt(tp)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          style={{ position: "absolute", zIndex: 99, left: `${Math.min(70, Math.max(2, (tag.x + tag.w / 2) * 100 - 20))}%`, top: `${Math.min(88, ((tag.y + tag.w * PIECE_H * 0.55) / BOARD_H) * 100)}%`, maxWidth: "70%", height: 32, padding: "0 12px", borderRadius: 999, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(20,18,16,.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {(tp.brand || tp.store)} {tp.name} ↗
        </a>
      )}
      {tags && !open && shown.length > 0 && <span style={{ position: "absolute", left: 10, bottom: 10, zIndex: 98, height: 24, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,.94)", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>Tap a piece to shop it</span>}
    </div>
  );
}

// The board she builds on. Drag to move, pinch (or the buttons) to size.
export function CollageEditor({ layout, pieces, onChange, selected, onSelect }: { layout: Placed[]; pieces: PieceLite[]; onChange: (l: Placed[]) => void; selected: string | null; onSelect: (id: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ id: string; l: Placed; px: number; py: number; dist: number } | null>(null);
  const byId = new Map(pieces.map(p => [p.id, p]));
  const width = () => ref.current?.getBoundingClientRect().width || 1;
  const clamp = (l: Placed): Placed => ({ ...l, w: Math.min(0.9, Math.max(0.12, l.w)), x: Math.min(1 - l.w * 0.6, Math.max(-l.w * 0.4, l.x)), y: Math.min(BOARD_H - l.w * 0.6, Math.max(-l.w * 0.4, l.y)) });
  const dist = () => { const [a, b] = [...pts.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };

  const down = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    ref.current?.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    onSelect(id);
    const l = layout.find(p => p.id === id)!;
    start.current = { id, l: { ...l }, px: e.clientX, py: e.clientY, dist: dist() };
    // Bring it to the front as she grabs it.
    onChange([...layout.filter(p => p.id !== id), l]);
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId) || !start.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = start.current, W = width();
    let next: Placed;
    if (pts.current.size >= 2) {
      if (!s.dist) s.dist = dist();
      const k = dist() / (s.dist || 1);
      const w = s.l.w * k;
      next = { ...s.l, w, x: s.l.x - (w - s.l.w) / 2, y: s.l.y - ((w - s.l.w) * PIECE_H) / 2 };
    } else {
      next = { ...s.l, x: s.l.x + (e.clientX - s.px) / W, y: s.l.y + (e.clientY - s.py) / W };
    }
    onChange(layout.map(p => (p.id === s.id ? clamp(next) : p)));
  };
  const up = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (!pts.current.size) start.current = null;
    else if (start.current) { const cur = layout.find(p => p.id === start.current!.id); if (cur) { const [only] = [...pts.current.values()]; start.current = { ...start.current, l: { ...cur }, px: only.x, py: only.y, dist: 0 }; } }
  };

  return (
    <div ref={ref} onPointerDown={e => {
      // A second finger anywhere on the board pinches the piece she's holding.
      if (start.current) { ref.current?.setPointerCapture(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); start.current.dist = 0; const cur = layout.find(p => p.id === start.current!.id); if (cur) start.current.l = { ...cur }; return; }
      onSelect(null);
    }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ position: "relative", width: "100%", aspectRatio: `1 / ${BOARD_H}`, background: BG, borderRadius: 28, overflow: "hidden", touchAction: "none" }}>
      {layout.filter(l => byId.has(l.id)).map((l, z) => (
        <div key={l.id} onPointerDown={e => down(e, l.id)}
          style={{ ...box(l), zIndex: z + 1, cursor: "grab", outline: selected === l.id ? "2px dashed var(--ink)" : "none", outlineOffset: 3, borderRadius: 14 }}>
          <PieceArt p={byId.get(l.id)!} />
        </div>
      ))}
      {!layout.length && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 14, lineHeight: 1.45 }}>
          Tap pieces below to add them.<br />Drag to move, pinch to size.
        </div>
      )}
    </div>
  );
}
