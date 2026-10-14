import { supabase } from "./supabase";
import { readFullText } from "./gmail";

export type Item = {
  id: string; store: string; name: string; brand: string | null; size: string | null; color: string | null;
  price: number | null; image_url: string | null; category: string; ordered_at: string; pick: "share" | "sell" | "private" | null;
  resale_low?: number | null; resale_high?: number | null; resale_note?: string | null;
  for_whom?: Who | null;
};
export type Who = "me" | "kids" | "partner" | "other";

// Closet, Sort and Worth only show things you wear. Same list as the value-items function.
export const WEAR = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];

// Things the reader sometimes files under accessories or bags that you don't wear.
const NOT_WEAR = /\b(i?pad|iphone|phone|tablet|laptop|kindle)\b.*\b(case|cover|stand|sleeve)\b|\b(case|cover) for\b|adapter|charger|cable|key ?card|compression bags?|packing cubes?|vacuum bags?|luggage tags?/i;
// The same piece read from two emails about one order ("Lima" and "Men's Lima").
const pieceKey = (i: Item) => `${(i.brand || i.store).toLowerCase()}|${i.size ?? ""}|${i.name.toLowerCase().replace(/\b(men|women|boy|girl|kid)s?['’]?s?\b/g, "").replace(/[^a-z0-9]/g, "")}|${i.ordered_at.slice(0, 7)}`;

export async function loadItems(): Promise<Item[]> {
  const { data } = await supabase().from("items").select("id, store, name, brand, size, color, price, image_url, category, ordered_at, pick, resale_low, resale_high, resale_note, for_whom").in("category", WEAR).eq("hidden", false).order("ordered_at", { ascending: false }).limit(3000);
  const seen = new Set<string>();
  return ((data ?? []) as Item[]).filter(i => {
    if (NOT_WEAR.test(i.name)) return false;
    const k = pieceKey(i);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function setPick(id: string, pick: Item["pick"]) {
  await supabase().from("items").update({ pick }).eq("id", id);
}

// Removes a piece from her closet. It stays hidden after later imports; the order stays in Orders.
export async function hideItem(id: string, hidden = true) {
  await supabase().from("items").update(hidden ? { hidden, pick: null } : { hidden }).eq("id", id);
}

// ---------- who it's for ----------

const KID = /\b(boys?|girls?|kids?|youth|toddler|baby|infant|junior|little kids?|big kids?)\b|\b\d{1,2}T\b|^(Y[SML]|YXL|\d{1,2}[-/]\d{1,2}Y|\d{1,2}(\.5)?[CY])$/i;
const sameAs = (a: Item, b: Item) => (a.brand || a.store) === (b.brand || b.store) && a.category === b.category && (a.size ? a.size === b.size : a.name === b.name);
const MEN = /\bmen['’]?s\b/i, WOMEN = /\bwomen['’]?s\b/i;

// Who a piece is for: her answer, else the same brand and size she already answered, else kids' words, else her.
export function whoFor(i: Item, all: Item[]): Who {
  if (i.for_whom) return i.for_whom;
  const learned = all.find(o => o.for_whom && o !== i && sameAs(o, i));
  if (learned?.for_whom) return learned.for_whom;
  if (KID.test(i.name) || (i.size && KID.test(i.size))) return "kids";
  // Same piece as a kids' one ("Uniform Belt" with and without "Youth").
  if (all.some(o => o !== i && o.name === i.name && (KID.test(o.name) || (o.size && KID.test(o.size))))) return "kids";
  return "me";
}

// Only ask when something looks off: a size unlike what she usually gets at that brand.
export function needsAsk(i: Item, all: Item[]) {
  if (i.for_whom || whoFor(i, all) !== "me") return false;
  // A women's piece when most of the closet says men's, or the other way round.
  const mine = all.filter(o => whoFor(o, all) === "me");
  const men = mine.filter(o => MEN.test(o.name)).length, women = mine.filter(o => WOMEN.test(o.name)).length;
  if ((WOMEN.test(i.name) && men > women) || (MEN.test(i.name) && women > men)) return true;
  return sizeOff(i, all);
}

function sizeOff(i: Item, all: Item[]) {
  if (!i.size) return false;
  const brand = i.brand || i.store;
  const mine = all.filter(o => (o.brand || o.store) === brand && o.category === i.category && o.size && (o === i || whoFor(o, all) === "me"));
  const counts = new Map<string, number>();
  for (const o of mine) counts.set(o.size!, (counts.get(o.size!) ?? 0) + 1);
  const usual = Math.max(...counts.values());
  return usual >= 2 && counts.get(i.size)! < usual;
}

// Saves her answer for this piece and others of the same brand and size. Pieces for others stay private.
export async function setWho(i: Item, who: Who, all: Item[]) {
  const ids = all.filter(o => o === i || (!o.for_whom && sameAs(o, i))).map(o => o.id);
  const patch = who === "me" ? { for_whom: who } : { for_whom: who, pick: "private" as const };
  await supabase().from("items").update(patch).in("id", ids);
  return ids;
}

// Order emails the AI hasn't read yet. One email per order is enough.
export async function unreadOrderEmails(): Promise<string[]> {
  const { data } = await supabase().from("orders").select("gmail_id, store, order_no, kind").eq("items_read", false).in("kind", ["order", "receipt"]).order("sent_at", { ascending: false }).limit(1500);
  const seen = new Set<string>();
  return ((data ?? []) as { gmail_id: string; store: string; order_no: string | null }[]).filter(r => {
    const key = r.order_no ? `${r.store}|${r.order_no}` : r.gmail_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(r => r.gmail_id);
}

type Progress = (done: number, total: number, found: number) => void;

// Sends each unread order email through the AI reader. Stops early if Gmail access expired.
export async function readItems(token: string, onProgress: Progress): Promise<"done" | "expired" | "not-ready"> {
  const ids = await unreadOrderEmails();
  const sb = supabase();
  let next = 0, done = 0, found = 0, state: "done" | "expired" | "not-ready" = "done";
  onProgress(0, ids.length, 0);
  const worker = async () => {
    while (next < ids.length && state === "done") {
      const id = ids[next++];
      try {
        const text = await readFullText(id, token);
        const { data, error } = await sb.functions.invoke("read-order", { body: { gmail_id: id, text } });
        if (error && (error as { context?: Response }).context?.status === 503) state = "not-ready";
        found += (data?.items as number) ?? 0;
      } catch (e) {
        if ((e as Error).message === "expired") state = "expired";
      }
      onProgress(++done, ids.length, found);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return state;
}

export const CATS: [string, string][] = [
  ["tops", "Tops"], ["bottoms", "Bottoms"], ["dresses", "Dresses"], ["outerwear", "Outerwear"], ["shoes", "Shoes"],
  ["bags", "Bags"], ["accessories", "Accessories"],
];

// Her usual size at each brand: the size she bought most often there, per category.
// What Sort shows: her own pieces with a photo and no choice yet. Closet counts the same way.
export const toSort = (all: Item[]) => all.filter(x => !x.pick && x.image_url && whoFor(x, all) === "me");

export function sizesByBrand(items: Item[]) {
  const map = new Map<string, Map<string, Map<string, number>>>();
  for (const i of items) {
    if (!i.size || ["beauty", "home", "other", "bags"].includes(i.category)) continue;
    const brand = i.brand || i.store;
    const cats = map.get(brand) ?? new Map();
    const sizes = cats.get(i.category) ?? new Map();
    sizes.set(i.size, (sizes.get(i.size) ?? 0) + 1);
    cats.set(i.category, sizes);
    map.set(brand, cats);
  }
  return [...map.entries()].map(([brand, cats]) => ({
    brand,
    sizes: [...cats.entries()].map(([cat, sizes]) => ({ cat, size: [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0], n: [...sizes.values()].reduce((a, b) => a + b, 0) })),
  })).sort((a, b) => b.sizes.reduce((s, x) => s + x.n, 0) - a.sizes.reduce((s, x) => s + x.n, 0));
}
