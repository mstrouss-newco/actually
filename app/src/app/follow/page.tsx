"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canGoBack } from "@/lib/nav";
import { type Item, brandOf, loadItems, whoFor } from "@/lib/items";
import { followBrands, loadFollows, markBrandsAsked } from "@/lib/brands";
import { ItemImage } from "@/lib/tabs";
import { delay } from "@/lib/motion";

type Row = { brand: string; pieces: number; photo: Item };

// "Your brands": shown once after her closet fills in. Every brand starts checked.
export default function FollowBrands() {
  const router = useRouter();
  // From Settings she is adding brands, not finishing sign-up: different heading, and back to Settings after.
  const [fromSettings, setFromSettings] = useState(false);
  useEffect(() => { setFromSettings(new URLSearchParams(location.search).get("from") === "settings"); }, []);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([loadItems(), loadFollows()]).then(([items, follows]) => {
      const have = new Set(follows.map(f => f.brand));
      const by = new Map<string, Item[]>();
      for (const i of items.filter(x => whoFor(x, items) === "me")) {
        const b = brandOf(i);
        if (!have.has(b)) by.set(b, [...(by.get(b) ?? []), i]);
      }
      setRows([...by.entries()]
        .map(([brand, its]) => ({ brand, pieces: its.length, photo: its.find(i => i.image_url) ?? its[0] }))
        .sort((a, b) => b.pieces - a.pieces || a.brand.localeCompare(b.brand)));
    });
  }, []);

  const list = rows ?? [];
  const picked = list.filter(r => !off.has(r.brand));
  const shown = all ? list : list.slice(0, 6);
  const flip = (b: string) => setOff(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  const done = async (follow: boolean) => {
    setBusy(true);
    if (follow) await followBrands(picked.map(r => r.brand));
    await markBrandsAsked();
    if (fromSettings && canGoBack()) router.back(); else router.replace(fromSettings ? "/settings" : "/today");
  };

  return (
    <main className="screen">
      <div className="kicker">{fromSettings ? "Brands you love" : "Your closet is ready"}</div>
      <h1 className="h1" style={{ fontSize: 34, marginTop: 8 }}>Your <em>brands.</em></h1>
      <p className="lead" style={{ marginTop: 8 }}>Love a brand? Keep it checked and we&apos;ll show you its sales and price drops.</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, background: "#DCEFDF", color: "#2F5C3E", borderRadius: 14, padding: "9px 12px", fontSize: 13, fontWeight: 700 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4L19 7" /></svg>
        Just the good stuff. Never spam.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
        {rows === null && <div style={{ color: "var(--muted)", fontSize: 14 }}>Finding your brands…</div>}
        {shown.map((r, n) => {
          const on = !off.has(r.brand);
          return (
            <button key={r.brand} type="button" onClick={() => flip(r.brand)} aria-pressed={on} className="up press" style={{ ...delay(n, 50), display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, background: "#FAF8F6", borderRadius: 18, padding: "8px 14px 8px 8px", font: "inherit", color: "var(--ink)", textAlign: "left", cursor: "pointer" }}>
              <ItemImage cutId={r.photo.id} src={r.photo.image_url} store={r.photo.store} name={r.photo.name} w={46} h={54} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.brand}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.pieces} {r.pieces === 1 ? "piece" : "pieces"} in your closet</div>
              </div>
              <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--ink)" : "#fff", border: on ? "0" : "1.5px solid #D8D2CB", transition: "all .15s" }}>
                {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4L19 7" /></svg>}
              </span>
            </button>
          );
        })}
        {!all && list.length > 6 && (
          <button type="button" onClick={() => setAll(true)} style={{ border: 0, background: "none", textAlign: "left", padding: "4px 4px 0", font: "500 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>
            + {list.length - 6} more {list.length - 6 === 1 ? "brand" : "brands"}, {list.slice(6).every(r => !off.has(r.brand)) ? "all checked" : "some checked"}. Show them
          </button>
        )}
        {rows !== null && list.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>You already follow every brand in your closet.</div>}
      </div>

      <div className="spacer" />
      <button type="button" className="btn press" disabled={busy || !picked.length} onClick={() => done(true)}>
        {busy ? "Saving" : picked.length ? `Follow ${picked.length} ${picked.length === 1 ? "brand" : "brands"}` : "Pick a brand to follow"}
      </button>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => done(false)} style={{ fontSize: 14, height: 44 }}>Not now</button>
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>Change or unfollow anytime from a brand&apos;s page or Settings.</div>
    </main>
  );
}
