"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Share a look she made or a piece she owns: a link friends can open without the app,
// and a story picture for Instagram. Making the link is what makes it shareable.
type Kind = "look" | "piece";
const TPLS = [["clean", "Clean", "#FFFFFF"], ["blush", "Blush", "#FFE1DC"], ["night", "Night", "#141210"]] as const;
type Tpl = (typeof TPLS)[number][0];

export const shareUrl = (kind: Kind, id: string) => `${location.origin}/${kind === "look" ? "l" : "p"}/${id}`;
export async function setLinkShared(kind: Kind, id: string, on: boolean) {
  const { error } = await supabase().from(kind === "look" ? "outfits" : "items").update({ link_shared: on }).eq("id", id);
  return !error;
}

const IG = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>;

export function ShareSheet({ kind, id, title, onClose }: { kind: Kind; id: string; title: string; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tpl, setTpl] = useState<Tpl>("blush");
  const [note, setNote] = useState("");
  const blob = useRef<Blob | null>(null);
  const url = typeof window === "undefined" ? "" : shareUrl(kind, id);
  const img = `/api/story/${kind}/${id}?t=${tpl}`;

  useEffect(() => { setLinkShared(kind, id, true).then(ok => (ok ? setReady(true) : setFailed(true))); }, [kind, id]);
  // Have the picture ready before she taps, so the share sheet opens straight away.
  useEffect(() => {
    if (!ready) return;
    blob.current = null;
    let live = true;
    fetch(img).then(r => (r.ok ? r.blob() : null)).then(b => { if (live) blob.current = b; }).catch(() => null);
    return () => { live = false; };
  }, [ready, img]);

  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(""), 3500); };
  const copy = () => navigator.clipboard?.writeText(url).catch(() => null);
  const save = () => { const a = document.createElement("a"); a.href = img; a.download = `${title || "actually"}.png`; a.click(); };
  const toStory = async () => {
    copy();
    const b = blob.current;
    const file = b ? new File([b], "actually-story.png", { type: "image/png" }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); flash("Link copied. Add it as a link sticker so friends can shop it."); return; } catch { return; }
    }
    save();
    flash("Picture saved and link copied. Post it to your story and add the link as a sticker.");
  };
  const sendLink = async () => {
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { return; } }
    copy(); flash("Link copied.");
  };
  const stop = async () => { await setLinkShared(kind, id, false); onClose(); };

  const btn = { height: 50, borderRadius: 999, border: 0, font: "700 15px var(--font-sans), sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as const;
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(20,18,16,.35)", display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="popIn" style={{ width: "100%", maxHeight: "94%", overflowY: "auto", background: "#FAF8F6", borderRadius: "30px 30px 0 0", padding: "14px 20px calc(24px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E2DDD7", marginBottom: 12 }} />
        <div style={{ alignSelf: "flex-start", fontWeight: 700, fontSize: 16 }}>Share {kind === "look" ? "this look" : "this piece"}</div>
        {failed && <div style={{ marginTop: 20, fontSize: 14, color: "var(--muted)" }}>Couldn&apos;t make a link just now. Try again in a moment.</div>}
        {!failed && (
          <>
            <div style={{ marginTop: 14, width: 190, aspectRatio: "9 / 16", borderRadius: 16, overflow: "hidden", background: "#F3F0EB", boxShadow: "0 16px 32px rgba(20,18,16,.14)" }} className={ready ? "" : "shimmer"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ready && <img key={img} src={img} alt="Your story picture" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
              {TPLS.map(([k, label, c]) => (
                <button key={k} type="button" onClick={() => setTpl(k)} aria-pressed={tpl === k} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, font: "700 11px var(--font-sans), sans-serif", color: "var(--ink)" }}>
                  <span style={{ width: 36, height: 60, borderRadius: 8, background: c, border: tpl === k ? "2.5px solid var(--ink)" : "1.5px solid #E2DDD7" }} />{label}
                </button>
              ))}
            </div>
            <button type="button" disabled={!ready} onClick={toStory} className="press" style={{ ...btn, width: "100%", marginTop: 16, background: "var(--ink)", color: "#fff" }}>{IG}Share to Instagram</button>
            <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
              <button type="button" disabled={!ready} onClick={sendLink} style={{ ...btn, flex: 1, height: 44, fontSize: 14, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}>Send link</button>
              <button type="button" disabled={!ready} onClick={save} style={{ ...btn, flex: 1, height: 44, fontSize: 14, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}>Save picture</button>
            </div>
            <div role="status" style={{ minHeight: 18, fontSize: 12.5, color: "var(--soft)", marginTop: 10, textAlign: "center" }}>{note || "Anyone with the link can see it. Never prices or sizes."}</div>
            {ready && <button type="button" onClick={stop} style={{ marginTop: 6, border: 0, background: "none", font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>Turn off this link</button>}
          </>
        )}
      </div>
    </div>
  );
}
