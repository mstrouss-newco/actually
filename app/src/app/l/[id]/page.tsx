import type { Metadata } from "next";
import { Collage } from "@/lib/collage";
import { ItemImage } from "@/lib/tabs";
import { findIt } from "@/lib/social";
import { getLook, nameOf } from "@/lib/public";
import { NotShared, PubFrame } from "../../pub";

// A look someone shared by link. Open to anyone; each piece goes to its store.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const look = await getLook(id);
  if (!look) return { title: "Actually" };
  const title = `${look.name}, ${nameOf(look.handle)}'s look`;
  const image = `/api/story/look/${id}?og=1&t=clean`;
  return { metadataBase: new URL("https://actually-app.vercel.app"), title, description: "Shop each piece on Actually.", openGraph: { title, description: "Shop each piece on Actually.", images: [{ url: image, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", images: [image] } };
}

export default async function SharedLook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const look = await getLook(id);
  if (!look) return <NotShared what="look" />;
  return (
    <PubFrame who={`${nameOf(look.handle)}'s look`} kicker={[look.name, look.occasion].filter(Boolean).join(" · ")}>
      <h1 className="pub-h">{look.name}</h1>
      {look.note && <p style={{ fontSize: 15, color: "var(--soft)", fontStyle: "italic", margin: "6px 0 0" }}>&ldquo;{look.note}&rdquo;</p>}
      <div style={{ marginTop: 14 }}><Collage layout={look.layout} pieces={look.pieces} /></div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 20 }}>Shop the look</div>
      <div className="pub-strip">
        {look.pieces.map(p => (
          <a key={p.id} href={findIt(p)} target="_blank" rel="noreferrer" style={{ flex: "none", width: 112 }}>
            <ItemImage cutId={p.id} src={p.image_url} store={p.store} name={p.name} w={112} h={124} radius={18} size={36} />
            <div className="kicker" style={{ marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.brand || p.store}</div>
            <div style={{ fontSize: 13, lineHeight: 1.25, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</div>
          </a>
        ))}
      </div>
    </PubFrame>
  );
}
