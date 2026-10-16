// Server-side reads for share links. Only what the public_look / public_piece functions return:
// photo, brand, name, her note and the store link. Never price, size or order details.
import type { PieceLite, Placed } from "./outfits";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfqdcwdlrnipzhseoiai.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_RI_lB2QUHHB3KOUyLTlG8w_IyO-ddK_";

export type PublicLook = { id: string; name: string; occasion: string | null; note: string | null; handle: string; layout: Placed[]; pieces: PieceLite[] };
export type PublicPiece = PieceLite & { note: string | null; handle: string };

const uuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
async function rpc<T>(fn: string, body: Record<string, string>): Promise<T | null> {
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T | null;
  } catch { return null; }
}
export const getLook = (id: string) => (uuid(id) ? rpc<PublicLook>("public_look", { look: id }) : Promise.resolve(null));
export const getPiece = (id: string) => (uuid(id) ? rpc<PublicPiece>("public_piece", { piece: id }) : Promise.resolve(null));
export const cutoutOf = (id: string) => `${URL_}/storage/v1/object/public/cutouts/${id}.png`;
// The public functions return only her first name (in "handle"), never her full shopping email name.
export const nameOf = (handle: string) => handle || "A friend";
