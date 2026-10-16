// Removes the plain background from one of her product photos, for outfit boards.
// Only works when the photo sits on a mostly even background (a studio shot); a photo of
// someone wearing it, or a street scene, is left alone and we say so.
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const safeHost = (h: string) => h.includes(".") && !/^[\d.]+$/.test(h) && !h.includes(":") && !/(^|\.)(localhost|local|internal|lan|home|corp|arpa)$/i.test(h);

async function getImage(url: string): Promise<Uint8Array | null> {
  let u = url;
  if (/media-amazon\.com/.test(u)) u = u.replace(/\._[^/]*_\.(jpg|jpeg|png)$/i, "._SL800_.$1");
  for (let hop = 0; hop < 4; hop++) {
    const x = new URL(u);
    if (x.protocol !== "https:" || !safeHost(x.hostname)) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(u, { redirect: "manual", signal: ctrl.signal, headers: { accept: "image/png,image/jpeg;q=0.9,*/*;q=0.5", "user-agent": "Mozilla/5.0" } }).finally(() => clearTimeout(t));
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (next) { res.body?.cancel(); u = new URL(next, u).toString(); continue; }
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.length > 8_000_000 ? null : buf;
  }
  return null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  const { item_id } = await req.json().catch(() => ({}));
  if (typeof item_id !== "string") return json({ error: "bad request" }, 400);

  const { data: item } = await admin.from("items").select("id, image_url").eq("id", item_id).eq("user_id", auth.user.id).maybeSingle();
  if (!item?.image_url) return json({ error: "no photo" }, 404);
  const path = `${item.id}.png`;
  const url = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/cutouts/${path}`;
  // Already done once: reuse it.
  const { data: have } = await admin.storage.from("cutouts").list("", { search: path, limit: 1 });
  if (have?.some(f => f.name === path)) return json({ url });

  let img: Image;
  try {
    const bytes = await getImage(item.image_url);
    if (!bytes) return json({ error: "can't load" }, 422);
    const d = await decode(bytes);
    if (!(d instanceof Image)) return json({ error: "can't load" }, 422);
    img = d;
  } catch { return json({ error: "can't load" }, 422); }
  if (img.width > 700) img.resize(700, Image.RESIZE_AUTO);

  const W = img.width, H = img.height, px = img.bitmap;
  const at = (x: number, y: number) => (y * W + x) * 4;
  // What color is the edge of the photo, and is it even enough to call a background?
  const edge: number[] = [];
  for (let x = 0; x < W; x += 2) edge.push(at(x, 0), at(x, H - 1));
  for (let y = 0; y < H; y += 2) edge.push(at(0, y), at(W - 1, y));
  const med = [0, 1, 2].map(c => edge.map(i => px[i + c]).sort((a, b) => a - b)[edge.length >> 1]);
  const dist = (i: number) => Math.hypot(px[i] - med[0], px[i + 1] - med[1], px[i + 2] - med[2]);
  const even = edge.filter(i => dist(i) < 30).length / edge.length;
  if (even < 0.75) return json({ error: "busy background" }, 422);

  // Flood in from the edges through anything close to that color.
  const TOL = 38, SOFT = 62;
  const bg = new Uint8Array(W * H);
  const stack: number[] = [];
  const seed = (x: number, y: number) => { const k = y * W + x; if (!bg[k] && dist(k * 4) < TOL) { bg[k] = 1; stack.push(k); } };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const k = stack.pop()!, x = k % W, y = (k / W) | 0;
    if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1);
  }
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, i = k * 4;
    if (bg[k]) { px[i + 3] = 0; continue; }
    // Soften the edge next to the background.
    const nearBg = (x > 0 && bg[k - 1]) || (x < W - 1 && bg[k + 1]) || (y > 0 && bg[k - W]) || (y < H - 1 && bg[k + W]);
    if (nearBg) { const d = dist(i); if (d < SOFT) px[i + 3] = Math.round(255 * Math.max(0, (d - TOL) / (SOFT - TOL))); }
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const keep = (maxX - minX) * (maxY - minY);
  if (maxX <= minX || keep < W * H * 0.04) return json({ error: "busy background" }, 422);
  const pad = 4;
  img.crop(Math.max(0, minX - pad), Math.max(0, minY - pad), Math.min(W, maxX + pad + 1) - Math.max(0, minX - pad), Math.min(H, maxY + pad + 1) - Math.max(0, minY - pad));
  const png = await img.encode(1);
  const { error } = await admin.storage.from("cutouts").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
  return error ? json({ error: "can't save" }, 500) : json({ url });
});
