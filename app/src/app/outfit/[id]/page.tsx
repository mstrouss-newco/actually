"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Item, loadItems } from "@/lib/items";
import { type Outfit, deleteOutfit, loadOutfit, setShared } from "@/lib/outfits";
import { Collage } from "@/lib/collage";
import { findIt } from "@/lib/social";
import { ItemImage, TabBar } from "@/lib/tabs";

// One saved outfit: the look, its pieces, and sharing.
export default function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [o, setO] = useState<Outfit | null | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [sure, setSure] = useState(false);
  useEffect(() => { loadOutfit(id).then(setO); loadItems().then(setItems); }, [id]);

  if (o === undefined) return <main className="tabscreen"><TabBar /></main>;
  if (o === null) return <main className="tabscreen"><div className="scroll" style={{ padding: "0 20px" }}><Link href="/closet?view=outfits" className="back">← Outfits</Link><p className="lead">We couldn&apos;t find that outfit.</p></div><TabBar /></main>;

  const byId = new Map(items.map(i => [i.id, i]));
  const pieces = o.layout.map(l => byId.get(l.id)).filter((i): i is Item => !!i);
  const lite = pieces.map(i => ({ id: i.id, brand: i.brand, store: i.store, name: i.name, image_url: i.image_url, category: i.category, product_url: i.product_url }));

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/closet?view=outfits" className="back">← Outfits</Link>
          <Link href={`/outfit/edit/${o.id}`} style={{ fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Edit</Link>
        </div>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 30, margin: "10px 20px 0", letterSpacing: "-0.02em" }}>{o.name}</h1>
        {o.occasion && <div style={{ padding: "8px 20px 0" }}><span style={{ display: "inline-flex", height: 28, alignItems: "center", padding: "0 11px", borderRadius: 999, background: "#DCEFDF", fontSize: 12, fontWeight: 700 }}>{o.occasion}</span></div>}

        <div style={{ margin: "14px 16px 0" }}><Collage layout={o.layout} pieces={lite} /></div>


        <button type="button" onClick={async () => { const next = !o.shared; setO({ ...o, shared: next, shared_at: o.shared_at ?? (next ? new Date().toISOString() : null) }); await setShared(o, next); }} aria-pressed={o.shared}
          style={{ margin: "10px 16px 0", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", border: 0, borderRadius: 20, padding: "12px 14px", textAlign: "left", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{o.shared ? "On your feed" : "Share to my feed"}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>Friends can tap each piece to shop it. Never prices or sizes.</span>
          </span>
          <span style={{ width: 46, height: 28, borderRadius: 999, background: o.shared ? "var(--ink)" : "#D8D2CB", position: "relative", flex: "none" }}>
            <span style={{ position: "absolute", top: 3, left: o.shared ? 21 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </span>
        </button>

        <div className="section"><div>In this look</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 12px", padding: "10px 16px 0" }}>
          {pieces.map(i => (
            <a key={i.id} href={findIt(i)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", minWidth: 0 }}>
              <ItemImage src={i.image_url} store={i.store} name={i.name} w="100%" h={150} radius={20} />
              <div className="kicker" style={{ marginTop: 6 }}>{i.brand || i.store}</div>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25 }}>{i.name}</div>
            </a>
          ))}
        </div>

        <div style={{ padding: "20px 16px 0" }}>
          <button type="button" onClick={async () => { if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; } await deleteOutfit(o.id); router.replace("/closet?view=outfits"); }}
            className="btn btn-ghost" style={{ height: 44, fontSize: 14, color: "#C9402F" }}>{sure ? "Tap again to delete" : "Delete outfit"}</button>
        </div>
      </div>
      <TabBar />
    </main>
  );
}
