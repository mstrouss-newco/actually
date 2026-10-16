import { supabase } from "./supabase";

// One piece on an outfit board. x, y and w are shares of the board's width, so a look
// lays out the same on any screen. r is a small tilt in degrees.
export type Placed = { id: string; x: number; y: number; w: number; r?: number; cut?: boolean };
export type PieceLite = { id: string; brand: string | null; store: string; name: string; image_url: string | null; category: string; product_url?: string | null; store_site?: string | null };
export type Outfit = { id: string; name: string; occasion: string | null; note: string | null; layout: Placed[]; shared: boolean; link_shared?: boolean; shared_at: string | null; worn: number; last_worn: string | null; updated_at: string };
// A look someone shared: only their own pieces, photo, brand, name and store link.
export type SharedOutfit = { id: string; name: string; occasion: string | null; note: string | null; layout: Placed[]; shared_at: string | null; pieces: PieceLite[]; handle?: string };

export const OCCASIONS = ["Weekend", "Work", "Dinner", "Travel", "Event"];
export const BOARD_H = 1.1; // board height as a share of its width

const COLS = "id, name, occasion, note, layout, shared, shared_at, link_shared, worn, last_worn, updated_at";

export async function loadOutfits(): Promise<Outfit[]> {
  const { data } = await supabase().from("outfits").select(COLS).order("updated_at", { ascending: false }).limit(200);
  return (data ?? []) as Outfit[];
}

export async function loadOutfit(id: string): Promise<Outfit | null> {
  const { data } = await supabase().from("outfits").select(COLS).eq("id", id).maybeSingle();
  return (data as Outfit | null) ?? null;
}

export async function saveOutfit(o: { id?: string; name: string; occasion: string | null; note?: string | null; layout: Placed[]; shared: boolean; wasShared?: boolean }) {
  const row = {
    name: o.name.trim().slice(0, 60) || "New outfit", occasion: o.occasion, note: o.note?.trim().slice(0, 140) || null,
    layout: o.layout.slice(0, 12).map(p => ({ id: p.id, x: +p.x.toFixed(4), y: +p.y.toFixed(4), w: +p.w.toFixed(4), r: Math.round(p.r ?? 0), ...(p.cut === true ? { cut: true } : p.cut === false ? { cut: false } : {}) })),
    shared: o.shared, updated_at: new Date().toISOString(),
    ...(o.shared && !o.wasShared ? { shared_at: new Date().toISOString() } : {}),
  };
  const sb = supabase();
  // Pieces she puts in a look are hers; saying so keeps them in shared looks.
  const ids = row.layout.map(p => p.id);
  if (ids.length) await sb.from("items").update({ for_whom: "me" }).in("id", ids).is("for_whom", null);
  const { data, error } = o.id
    ? await sb.from("outfits").update(row).eq("id", o.id).select("id").maybeSingle()
    : await sb.from("outfits").insert(row).select("id").maybeSingle();
  return error ? null : ((data as { id: string } | null)?.id ?? null);
}

export async function setShared(o: Outfit, shared: boolean) {
  await supabase().from("outfits").update({ shared, ...(shared && !o.shared_at ? { shared_at: new Date().toISOString() } : {}) }).eq("id", o.id);
}

export async function woreToday(o: Outfit) {
  const today = new Date().toLocaleDateString("en-CA");
  if (o.last_worn === today) return o;
  const next = { worn: o.worn + 1, last_worn: today };
  await supabase().from("outfits").update(next).eq("id", o.id);
  return { ...o, ...next };
}

export async function deleteOutfit(id: string) {
  await supabase().from("outfits").delete().eq("id", id);
}

export async function friendsOutfits(): Promise<SharedOutfit[]> {
  const { data } = await supabase().rpc("friends_outfits");
  return (data ?? []) as SharedOutfit[];
}
