import { supabase } from "./supabase";
import { readFullText } from "./gmail";
import { orderInfo } from "./orders";

export type Item = {
  id: string; store: string; name: string; brand: string | null; size: string | null; color: string | null;
  price: number | null; image_url: string | null; product_url?: string | null; category: string; ordered_at: string; pick: "share" | "sell" | "private" | null;
  resale_low?: number | null; resale_high?: number | null; resale_note?: string | null;
  for_whom?: Who | null; gmail_id?: string;
  // Its order hasn't arrived yet.
  arriving?: boolean;
  // Some pieces from its order went back, so this one is known to be kept.
  kept?: boolean;
};
export type Who = "me" | "kids" | "partner" | "other";

import { NOT_WEAR, WEAR } from "./wear";
export { WEAR };

// The same piece read from two emails about one order ("Lima" and "Men's Lima"). Other colors stay separate.
const pieceKey = (i: Item) => `${(i.brand || i.store).toLowerCase()}|${i.size ?? ""}|${i.name.toLowerCase().replace(/\b(men|women|boy|girl|kid)s?['’]?s?\b/g, "").replace(/[^a-z0-9]/g, "")}|${i.ordered_at.slice(0, 7)}`;

const core = (n: string) => n.toLowerCase().replace(/\b(men|women|boy|girl|kid)s?['’]?s?\b/g, "").replace(/\b(shoes?|sneakers?|boots?|sandals?|shirt|tee|t-shirt|pants?|jacket|coat)\b/g, "").replace(/[^a-z0-9]/g, "");
// Two reads of one piece from different emails about the same order.
function sameRead(a: Item, b: Item) {
  if ((a.brand || a.store).toLowerCase() !== (b.brand || b.store).toLowerCase()) return false;
  // "8" and "8 / Standard" are the same size.
  const size = (x: string | null) => (x ?? "").split(/\s*\/\s*/)[0].trim().toLowerCase();
  if (size(a.size) !== size(b.size) || a.ordered_at.slice(0, 7) !== b.ordered_at.slice(0, 7)) return false;
  if (a.color && b.color && a.color.toLowerCase() !== b.color.toLowerCase()) return false;
  const x = core(a.name), y = core(b.name);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}

export async function loadItems(): Promise<Item[]> {
  // Pieces from cancelled orders never arrived, so they stay out of the closet.
  // Every piece uses its order's date, so one purchase shows one date everywhere.
  const { cancelled, arriving, ordered, returned } = await orderInfo();
  const { data } = await supabase().from("items").select("id, store, name, brand, size, color, price, image_url, category, ordered_at, pick, resale_low, resale_high, resale_note, for_whom, gmail_id, returned_at, product_url").in("category", WEAR).eq("hidden", false).order("ordered_at", { ascending: false }).limit(3000);
  // Keep the more specific name ("Women's Lima" over "Lima"): it tells us who it's for.
  // Two colors of one piece (a tee in Black and White) stay separate; a missing color matches any.
  const best = new Map<string, Item[]>();
  const sameColor = (a: Item, b: Item) => !a.color || !b.color || a.color.toLowerCase() === b.color.toLowerCase();
  // Pieces she sent back leave the closet. Orders where some went back: the rest were kept.
  const rows = (data ?? []) as (Item & { returned_at: string | null })[];
  const partial = new Set(rows.filter(i => i.returned_at).map(i => i.gmail_id ?? ""));
  for (const i of rows) {
    if (NOT_WEAR.test(i.name) || cancelled.has(i.gmail_id ?? "") || i.returned_at) continue;
    // A whole order sent back (and no email saying which pieces): leave it out too.
    if (returned.has(i.gmail_id ?? "") && !partial.has(i.gmail_id ?? "")) continue;
    i.kept = partial.has(i.gmail_id ?? "");
    const when = ordered.get(i.gmail_id ?? "");
    if (when) i.ordered_at = when;
    i.arriving = arriving.has(i.gmail_id ?? "");
    const list = best.get(pieceKey(i)) ?? [];
    const n = list.findIndex(c => sameColor(c, i));
    if (n < 0) list.push(i);
    else if (i.name.length > list[n].name.length || (i.for_whom && !list[n].for_whom)) list[n] = i;
    best.set(pieceKey(i), list);
  }
  // Same brand, size, color and month, and one name holds the other ("Lima" and "Lima shoe"): one piece.
  const out: Item[] = [];
  for (const i of [...best.values()].flat().sort((a, b) => b.name.length - a.name.length)) {
    const twin = out.find(o => sameRead(o, i));
    if (!twin) out.push(i);
    else if ((i.for_whom && !twin.for_whom) || (!twin.image_url && i.image_url)) out[out.indexOf(twin)] = { ...i, name: twin.name.length >= i.name.length ? twin.name : i.name, image_url: twin.image_url || i.image_url };
  }
  out.sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
  // Sub-lines file under the main brand ("TCK Krazisox" is TCK).
  const names = [...new Set(out.map(i => i.brand).filter((b): b is string => !!b))].sort((a, b) => a.length - b.length);
  const main = (b: string) => names.find(n => n.length < b.length && b.toLowerCase().startsWith(`${n.toLowerCase()} `)) ?? b;
  return out.map(i => (i.brand ? { ...i, brand: main(i.brand) } : i));
}

export async function setPick(id: string, pick: Item["pick"]) {
  await supabase().from("items").update({ pick }).eq("id", id);
}

// Same choice for many pieces at once ("Keep the other 12 private").
export async function setPicks(ids: string[], pick: Item["pick"]) {
  for (let n = 0; n < ids.length; n += 200) await supabase().from("items").update({ pick }).in("id", ids.slice(n, n + 200));
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
  // Bought the same week as kids' pieces in the same size (baseball socks with kids' baseball pants).
  if (i.size && all.some(o => o !== i && o.for_whom === "kids" && o.size === i.size && Math.abs(Date.parse(o.ordered_at) - Date.parse(i.ordered_at)) < 7 * 86400000 && (o.brand || o.store) !== (i.brand || i.store) && o.store === i.store)) return "kids";
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

// Our best guess at who a piece that doesn't look like hers is for: men's vs women's means a partner,
// a small kids-style size means kids.
export function likelyWho(i: Item, all: Item[]): Who {
  const mine = all.filter(o => whoFor(o, all) === "me");
  const men = mine.filter(o => MEN.test(o.name)).length, women = mine.filter(o => WOMEN.test(o.name)).length;
  if ((WOMEN.test(i.name) && men > women) || (MEN.test(i.name) && women > men)) return "partner";
  if (/\b(kids?|girls?|boys?|toddler|youth|baby)\b/i.test(i.name) || /^(\d{1,2}[tTyY]|\d{1,2}m|[2-9]|1[0-6]|xs\s*\(\d|youth)/i.test(i.size ?? "")) return "kids";
  return "partner";
}

// "All of these are mine": marks the pieces she checked and left alone.
export async function confirmMine(ids: string[]) {
  if (ids.length) await supabase().from("items").update({ for_whom: "me" }).in("id", ids);
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
  // Order emails first. Shipping emails too, for orders that never sent one (Chewy Autoship,
  // Huckberry, Amazon), so they get real names and photos.
  const { data } = await supabase().from("orders").select("gmail_id, store, store_domain, order_no, kind, sent_at").eq("items_read", false)
    .in("kind", ["order", "receipt", "shipping"]).order("sent_at", { ascending: false }).limit(1500);
  // Stores like J.Crew Factory sometimes only send "on its way" emails with no order number.
  // Read those too when the store sent no order email in the 21 days before.
  const { data: placed } = await supabase().from("orders").select("store, store_domain, sent_at").in("kind", ["order", "receipt"]).limit(5000);
  const hadOrder = (r: { store: string; store_domain: string | null; sent_at: string }) => ((placed ?? []) as { store: string; store_domain: string | null; sent_at: string }[])
    .some(o => (o.store_domain ?? o.store) === (r.store_domain ?? r.store) && Date.parse(o.sent_at) <= Date.parse(r.sent_at) && Date.parse(r.sent_at) - Date.parse(o.sent_at) < 21 * 86400000);
  const rows = ((data ?? []) as { gmail_id: string; store: string; store_domain: string | null; order_no: string | null; kind: string; sent_at: string }[])
    .filter(r => r.kind !== "shipping" || r.order_no || (!/amazon/i.test(r.store_domain ?? r.store) && !hadOrder(r)))
    .sort((a, b) => (a.kind === "shipping" ? 1 : 0) - (b.kind === "shipping" ? 1 : 0));
  // Orders already read through another email don't need their shipping email read too.
  const { data: read } = await supabase().from("orders").select("store, store_domain, order_no").eq("items_read", true).in("kind", ["order", "receipt", "shipping"]).not("order_no", "is", null).limit(5000);
  const seen = new Set<string>(((read ?? []) as { store: string; store_domain: string | null; order_no: string }[]).map(r => `${r.store_domain ?? r.store}|${r.order_no}`));
  return rows.filter(r => {
    const key = r.order_no ? `${r.store_domain ?? r.store}|${r.order_no}` : r.gmail_id;
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

// ---------- catch-up passes ----------

const tried = (key: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set<string>(); }
};
const remember = (key: string, set: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...set].slice(-3000))); } catch {} };

// Finds product photos for pieces that came in without one, from that order's other emails too.
export async function fillPhotos(token: string) {
  const sb = supabase();
  const { data } = await sb.from("items").select("id, gmail_id").in("category", WEAR).eq("hidden", false).or("image_url.is.null,image_url.eq.").limit(200);
  const done = tried("photos-tried");
  const need = ((data ?? []) as { id: string; gmail_id: string }[]).filter(i => !done.has(i.id));
  if (!need.length) return;
  const byEmail = new Map<string, string[]>();
  for (const i of need) byEmail.set(i.gmail_id, [...(byEmail.get(i.gmail_id) ?? []), i.id]);
  const { data: rows } = await sb.from("orders").select("gmail_id, store_domain, order_no").in("gmail_id", [...byEmail.keys()]);
  let reads = 0;
  for (const [gmail_id, ids] of byEmail) {
    const row = ((rows ?? []) as { gmail_id: string; store_domain: string | null; order_no: string | null }[]).find(r => r.gmail_id === gmail_id);
    // The order's own confirmation email first, then this one.
    let emails = [gmail_id];
    if (row?.order_no && row.store_domain) {
      const { data: sib } = await sb.from("orders").select("gmail_id, kind").eq("store_domain", row.store_domain).eq("order_no", row.order_no).limit(10);
      const list = ((sib ?? []) as { gmail_id: string; kind: string }[]).sort((a, b) => Number(b.kind === "order") - Number(a.kind === "order")).map(r => r.gmail_id);
      emails = [...new Set([...list, gmail_id])];
    }
    let left = ids;
    for (const e of emails) {
      if (!left.length || reads >= 30) break;
      reads++;
      try {
        const text = await readFullText(e, token);
        await sb.functions.invoke("read-order", { body: { gmail_id: e, text, mode: "photos", item_ids: left } });
        const { data: still } = await sb.from("items").select("id").in("id", left).or("image_url.is.null,image_url.eq.");
        left = ((still ?? []) as { id: string }[]).map(r => r.id);
      } catch (err) { if ((err as Error).message === "expired") throw err; }
    }
    ids.forEach(id => done.add(id));
  }
  remember("photos-tried", done);
}

// Finds each piece's page on the store's site, from the links in its order email. Once per piece.
export async function fillLinks(token: string) {
  const sb = supabase();
  const { data } = await sb.from("items").select("id, gmail_id").in("category", WEAR).eq("hidden", false).is("product_url", null).order("ordered_at", { ascending: false }).limit(300);
  const done = tried("links-tried");
  const byEmail = new Map<string, string[]>();
  for (const i of (data ?? []) as { id: string; gmail_id: string }[]) if (!done.has(i.id)) byEmail.set(i.gmail_id, [...(byEmail.get(i.gmail_id) ?? []), i.id]);
  let reads = 0;
  for (const [gmail_id, ids] of byEmail) {
    if (reads++ >= 30) break;
    try {
      const text = await readFullText(gmail_id, token);
      if (text.includes("link: https://")) await sb.functions.invoke("read-order", { body: { gmail_id, text, mode: "links", item_ids: ids } });
    } catch (err) { if ((err as Error).message === "expired") throw err; }
    ids.forEach(id => done.add(id));
  }
  remember("links-tried", done);
}

// Reads each recent order's return rules from its email, once.
export async function readReturnRules(token: string) {
  const sb = supabase();
  const since = new Date(Date.now() - 75 * 86400000).toISOString();
  const { data } = await sb.from("orders").select("gmail_id, store, store_domain, order_no, kind").eq("rules_read", false)
    .in("kind", ["order", "receipt", "shipping", "delivered"]).gte("sent_at", since).order("sent_at", { ascending: false }).limit(300);
  const rows = ((data ?? []) as { gmail_id: string; store: string; store_domain: string | null; order_no: string | null; kind: string }[])
    .sort((a, b) => Number(b.kind === "order" || b.kind === "receipt") - Number(a.kind === "order" || a.kind === "receipt"));
  const seen = new Set<string>();
  const pick = rows.filter(r => {
    const key = r.order_no ? `${r.store_domain ?? r.store}|${r.order_no}` : r.gmail_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
  for (let n = 0; n < pick.length; n += 4) {
    await Promise.all(pick.slice(n, n + 4).map(async r => {
      try {
        const text = await readFullText(r.gmail_id, token);
        await sb.functions.invoke("read-order", { body: { gmail_id: r.gmail_id, text, mode: "rules" } });
      } catch (err) { if ((err as Error).message === "expired") throw err; }
    }));
  }
}

// Reads each return and refund email once to learn which pieces went back (handles partial
// returns and return emails with no order number). Newest first, a batch per import.
export async function readReturns(token: string) {
  const sb = supabase();
  const { data } = await sb.from("orders").select("gmail_id, store, store_domain, order_no, subject").eq("items_read", false)
    .in("kind", ["return", "refund"]).order("sent_at", { ascending: false }).limit(400);
  const seen = new Set<string>();
  const pick = ((data ?? []) as { gmail_id: string; store: string; store_domain: string | null; order_no: string | null; subject: string | null }[]).filter(r => {
    // Three emails about one return (#782611580) only need one read.
    const ref = r.order_no ?? r.subject?.match(/#\s?(\d{6,})/)?.[1];
    const key = ref ? `${r.store_domain ?? r.store}|${ref}` : r.gmail_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 120);
  for (let n = 0; n < pick.length; n += 4) {
    await Promise.all(pick.slice(n, n + 4).map(async r => {
      try {
        const text = await readFullText(r.gmail_id, token);
        await sb.functions.invoke("read-order", { body: { gmail_id: r.gmail_id, text: `${r.subject ?? ""}\n\n${text}`, mode: "returns" } });
      } catch (err) { if ((err as Error).message === "expired") throw err; }
    }));
  }
}

export const CATS: [string, string][] = [
  ["tops", "Tops"], ["bottoms", "Bottoms"], ["dresses", "Dresses"], ["outerwear", "Outerwear"], ["shoes", "Shoes"],
  ["bags", "Bags"], ["accessories", "Accessories"],
];

// Her usual size at each brand: the size she bought most often there, per category.
// What Sort shows: her own pieces with a photo and no choice yet. Closet counts the same way.
// Pieces still in the mail wait until they arrive.
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

// The brand a piece is filed under.
export const brandOf = (i: Item) => i.brand || i.store;

// Rainbow order for "By color". Unknown colors go last.
const HUES = [/white|ivory|cream|ecru|natural/, /pink|blush|rose/, /red|burgundy|wine/, /orange|rust|coral|peach/, /yellow|butter|mustard/,
  /tan|beige|camel|khaki|brown|chocolate/, /green|olive|sage/, /blue|navy|denim|indigo|sky/, /purple|lilac|lavender/, /gr[ae]y|silver|charcoal/, /black/];
export function hueRank(color: string | null) {
  const c = (color ?? "").toLowerCase();
  const n = HUES.findIndex(r => r.test(c));
  return n < 0 ? HUES.length : n;
}

// Pieces of hers bought this calendar month.
export const monthPieces = (items: Item[]) => {
  const now = new Date();
  return items.filter(i => { const d = new Date(i.ordered_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && whoFor(i, items) === "me"; });
};

// Each color family's swatch, in the same order as HUES.
export const HUE_SWATCH: [string, string][] = [["cream", "#EFE6D6"], ["pink", "#F2B8C6"], ["red", "#B83A35"], ["orange", "#E0874A"], ["yellow", "#EBC855"],
  ["tan", "#B8916A"], ["green", "#6F8A5B"], ["navy", "#2B3A5C"], ["purple", "#7B5EA7"], ["gray", "#8E8B86"], ["black", "#1E1C1A"]];

// "Large / 9.5-10.5 D(M) US" reads as "9.5-10.5" for shoes and "Large" for the rest.
export function shortSize(size: string, cat?: string) {
  const parts = size.split(/\s*\/\s*/).filter(Boolean);
  const pick = (cat === "shoes" ? parts.find(p => /\d/.test(p)) : null) ?? parts[0] ?? size;
  return pick.replace(/\s*[A-Z]?\(?[A-Z]\)?\s*US$/i, "").replace(/\s+US$/i, "").trim() || pick;
}
