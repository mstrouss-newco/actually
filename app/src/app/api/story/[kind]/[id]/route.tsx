import { ImageResponse } from "next/og";
import { cutoutOf, getLook, getPiece, nameOf } from "@/lib/public";

// The story picture (1080 x 1920) for a shared look or piece, or a link preview (1200 x 630 with ?og=1).
// Only for things she has shared by link. Never prices or sizes.
export const runtime = "nodejs";
const BOARD_H = 1.1, PIECE_H = 1.15;
const THEMES = {
  clean: { bg: "#FFFFFF", ink: "#141210", soft: "#7A746D", board: "#F7F3EE" },
  blush: { bg: "#FFE1DC", ink: "#141210", soft: "#7A5A55", board: "#FFF6F3" },
  night: { bg: "#141210", ink: "#FFFFFF", soft: "#C9C3BC", board: "#F7F3EE" },
};

// Photos as data, only PNG or JPEG (what the picture maker can draw). Cut-outs first.
async function pic(url: string | null | undefined): Promise<string | null> {
  if (!url?.startsWith("https://")) return null;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "image/png,image/jpeg" }, cache: "force-cache" });
    const t = r.headers.get("content-type") ?? "";
    if (!r.ok || !/image\/(png|jpe?g)/.test(t)) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 6_000_000 ? null : `data:${t.split(";")[0]};base64,${b.toString("base64")}`;
  } catch { return null; }
}
const amazon = (u: string | null) => (u && /media-amazon\.com/.test(u) ? u.replace(/\._[^/]*_\.(jpg|jpeg|png)$/i, "._SL800_.$1") : u);
const best = async (id: string, url: string | null) => (await pic(cutoutOf(id))) ?? (await pic(amazon(url)));

let fonts: { name: string; data: ArrayBuffer; style: "normal" | "italic"; weight: 400 | 600 }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = async (q: string) => {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${q}`, { headers: { "user-agent": "" } })).text();
    const src = css.match(/src: url\((.+?)\)/)?.[1];
    return src ? await (await fetch(src)).arrayBuffer() : null;
  };
  try {
    const [reg, ital, sans] = await Promise.all([get("Fraunces:wght@400"), get("Fraunces:ital,wght@1,600"), get("DM+Sans:wght@700")]);
    fonts = [
      ...(reg ? [{ name: "Fraunces", data: reg, style: "normal" as const, weight: 400 as const }] : []),
      ...(ital ? [{ name: "Fraunces", data: ital, style: "italic" as const, weight: 600 as const }] : []),
      ...(sans ? [{ name: "DM Sans", data: sans, style: "normal" as const, weight: 600 as const }] : []),
    ];
  } catch { fonts = []; }
  return fonts;
}

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const q = new URL(req.url).searchParams;
  const og = q.get("og") === "1";
  const theme = THEMES[(q.get("t") as keyof typeof THEMES) ?? "clean"] ?? THEMES.clean;
  const W = og ? 1200 : 1080, H = og ? 630 : 1920;

  let title = "", sub = "", art: React.ReactNode = null;
  if (kind === "look") {
    const look = await getLook(id);
    if (!look) return new Response("Not shared", { status: 404 });
    title = look.name; sub = `${nameOf(look.handle)}'s look on Actually`;
    const bw = og ? 480 : 920;
    const imgs = await Promise.all(look.layout.map(l => best(l.id, look.pieces.find(p => p.id === l.id)?.image_url ?? null)));
    art = (
      <div style={{ display: "flex", position: "relative", width: bw, height: bw * BOARD_H, background: theme.board, borderRadius: og ? 28 : 48, overflow: "hidden" }}>
        {look.layout.map((l, n) => imgs[n] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={l.id} src={imgs[n]!} alt="" style={{ position: "absolute", left: l.x * bw, top: l.y * bw, width: l.w * bw, height: l.w * PIECE_H * bw, objectFit: "contain", transform: `rotate(${l.r ?? 0}deg)` }} />
        ) : null)}
      </div>
    );
  } else if (kind === "piece") {
    const p = await getPiece(id);
    if (!p) return new Response("Not shared", { status: 404 });
    title = p.name; sub = [p.brand || p.store, p.note].filter(Boolean).join("  ·  ");
    const src = await best(p.id, p.image_url);
    const s = og ? 500 : 900;
    art = (
      <div style={{ display: "flex", width: s, height: s * 1.1, background: theme.board, borderRadius: og ? 28 : 48, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="" style={{ width: s * 0.84, height: s * 0.94, objectFit: "contain" }} />}
      </div>
    );
  } else return new Response("Not found", { status: 404 });

  const f = await loadFonts();
  const serif = f.some(x => x.name === "Fraunces") ? "Fraunces" : "serif";
  const sans = f.some(x => x.name === "DM Sans") ? "DM Sans" : "sans-serif";
  const logo = <div style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 600, fontSize: og ? 40 : 64, color: theme.ink }}>Actually</div>;
  const words = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: og ? "flex-start" : "center", maxWidth: og ? 560 : 940 }}>
      <div style={{ fontFamily: serif, fontSize: og ? 64 : 84, lineHeight: 1.05, color: theme.ink, textAlign: og ? "left" : "center" }}>{title.slice(0, 60)}</div>
      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: og ? 26 : 36, color: theme.soft, marginTop: og ? 14 : 22, textAlign: og ? "left" : "center" }}>{sub.slice(0, 90)}</div>
    </div>
  );
  return new ImageResponse(
    og ? (
      <div style={{ width: W, height: H, display: "flex", alignItems: "center", gap: 56, padding: "0 70px", background: theme.bg }}>
        {art}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>{logo}{words}</div>
      </div>
    ) : (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", padding: "130px 80px 0", background: theme.bg }}>
        {logo}
        <div style={{ display: "flex", marginTop: 80 }}>{art}</div>
        <div style={{ display: "flex", marginTop: 70 }}>{words}</div>
      </div>
    ),
    { width: W, height: H, fonts: f.length ? f : undefined, headers: { "cache-control": "public, max-age=300" } },
  );
}
