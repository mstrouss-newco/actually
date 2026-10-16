import type { Metadata } from "next";
import { ItemImage } from "@/lib/tabs";
import { findIt, siteOf, siteSearch, storeLink } from "@/lib/social";
import { getPiece, nameOf } from "@/lib/public";
import { NotShared, PubFrame } from "../../pub";

// A piece someone shared by link. Open to anyone; one tap to find it at the store.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPiece(id);
  if (!p) return { title: "Actually" };
  const title = `${nameOf(p.handle)} loves this: ${p.brand || p.store} ${p.name}`;
  const image = `/api/story/piece/${id}?og=1&t=clean`;
  return { metadataBase: new URL("https://actually-app.vercel.app"), title, description: "Find it on Actually.", openGraph: { title, description: "Find it on Actually.", images: [{ url: image, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", images: [image] } };
}

export default async function SharedPiece({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPiece(id);
  if (!p) return <NotShared what="piece" />;
  const where = storeLink(p) ? siteOf(storeLink(p)!) : siteSearch(p) ? siteOf(siteSearch(p)!) : null;
  return (
    <PubFrame who={`${nameOf(p.handle)} loves this`} kicker={p.brand || p.store}>
      <div style={{ marginTop: 16 }}><ItemImage cutId={p.id} src={p.image_url} store={p.store} name={p.name} w="100%" h={400} radius={28} size={96} /></div>
      <div className="kicker" style={{ marginTop: 16 }}>{p.brand || p.store}</div>
      <h1 className="pub-h" style={{ marginTop: 4 }}>{p.name}</h1>
      {p.note && <p style={{ fontSize: 15, color: "var(--soft)", fontStyle: "italic", margin: "6px 0 0" }}>&ldquo;{p.note}&rdquo;</p>}
      <a className="pub-find" href={findIt(p)} target="_blank" rel="noreferrer">{where ? `Find it at ${where.replace(/^www\./, "")}` : "Find it online"}</a>
    </PubFrame>
  );
}
