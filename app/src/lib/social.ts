import { supabase } from "./supabase";

export type SharedItem = { id: string; brand: string | null; store: string; name: string; image_url: string | null; category: string; shared_at: string | null; note?: string | null; product_url?: string | null; store_site?: string | null };

// Her short note on a piece she shares ("Size down one"). Empty clears it.
export async function saveNote(id: string, note: string) {
  const clean = note.trim().slice(0, 140) || null;
  await supabase().from("items").update({ note: clean }).eq("id", id);
  return clean;
}
export type FeedItem = SharedItem & { handle: string };
export type Profile = { handle: string; is_me: boolean; i_follow: boolean; followers: number; following: number; items: SharedItem[]; outfits?: import("./outfits").SharedOutfit[] };

export async function loadProfilePage(handle: string): Promise<Profile | null> {
  const { data } = await supabase().rpc("profile_page", { name: handle });
  return (data as Profile | null) ?? null;
}

export async function loadFeed(): Promise<FeedItem[]> {
  const { data } = await supabase().rpc("friends_feed");
  return withSites((data ?? []) as FeedItem[]);
}

// Hearts: counts for shared pieces and whether she loved each. Owners see counts, never who.
export type Love = { n: number; mine: boolean };
export async function loveState(ids: string[]) {
  const m = new Map<string, Love>();
  if (!ids.length) return m;
  const { data } = await supabase().rpc("love_state", { ids });
  for (const r of (data ?? []) as { item_id: string; loves: number; mine: boolean }[]) m.set(r.item_id, { n: r.loves, mine: r.mine });
  return m;
}
export async function setLove(id: string, loved: boolean) {
  const { data, error } = await supabase().rpc("set_love", { item: id, loved });
  return error ? null : (data as number);
}
// Pieces she loved, newest first.
export async function loadSaved(): Promise<FeedItem[]> {
  const { data } = await supabase().rpc("saved_pieces");
  return withSites((data ?? []) as FeedItem[]);
}

export async function searchPeople(q: string) {
  const { data } = await supabase().rpc("search_people", { q });
  return (data ?? []) as { handle: string; shared: number; i_follow: boolean }[];
}

// People who follow her or she follows ("Friends already here").
export async function myPeople() {
  const { data } = await supabase().rpc("my_people");
  return (data ?? []) as { handle: string; shared: number; i_follow: boolean; follows_me: boolean }[];
}

export async function similarPeople() {
  const { data } = await supabase().rpc("similar_people");
  return (data ?? []) as { handle: string; brands: string[]; shared: number }[];
}

// Follow or unfollow someone by their shopping-email name.
export async function setFollow(handle: string, on: boolean) {
  const sb = supabase();
  const { data: s } = await sb.auth.getSession();
  const me = s.session?.user.id;
  if (!me) return false;
  const { data: p } = await sb.rpc("profile_id", { name: handle });
  if (!p) return false;
  if (on) await sb.from("follows").insert({ follower_id: me, followee_id: p });
  else await sb.from("follows").delete().eq("follower_id", me).eq("followee_id", p);
  return true;
}

export async function myHandle(): Promise<string | null> {
  const sb = supabase();
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return null;
  const { data } = await sb.from("profiles").select("handle").eq("id", s.session.user.id).maybeSingle();
  return data?.handle ?? null;
}

export const profileUrl = (handle: string) => `${location.origin}/u/${handle}`;

// "Find it" link for a piece, until shopping links come with cash back.
// The piece's own page on the store's site when we found it, else a shopping search.
// A saved link is used only when it's https and on a site named like the store or brand.
const squash = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
export function storeLink(i: { brand: string | null; store: string; product_url?: string | null }) {
  const u = i.product_url;
  if (!u?.startsWith("https://")) return null;
  try {
    const host = squash(new URL(u).hostname.replace(/^www\./, "").replace(/\.[a-z]+$/, ""));
    const names = [squash(i.store), squash(i.brand), squash(i.store).replace(/and/g, ""), squash(i.brand).replace(/and/g, "")].filter(n => n.length >= 3);
    return names.some(n => host.includes(n) || n.includes(host)) ? u : null;
  } catch { return null; }
}
// Short site name for a link: "nordstrom.com".
export const siteOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// No exact page: search the store's own site for the piece, when the site is clearly that store's.
const SITE_ALIAS: Record<string, string> = { "sheinnotice.com": "shein.com", "e.target.com": "target.com" };
const SEARCH: Record<string, string> = {
  "amazon.com": "/s?k=", "target.com": "/s?searchTerm=", "nordstrom.com": "/sr?keyword=", "bloomingdales.com": "/shop/search?keyword=",
  "oldnavy.com": "/browse/search.do?searchText=", "gap.com": "/browse/search.do?searchText=", "bananarepublic.com": "/browse/search.do?searchText=", "athleta.com": "/browse/search.do?searchText=",
  "sephora.com": "/search?keyword=", "abercrombie.com": "/shop/us/search?searchTerm=", "lululemon.com": "/search?Ntt=", "poshmark.com": "/search?query=",
  "depop.com": "/search/?q=", "ae.com": "/us/en/s/", "macys.com": "/shop/featured/", "walmart.com": "/search?q=", "zara.com": "/us/en/search?searchTerm=",
  "jcrew.com": "/r/search/?N=0&Nloc=en&Ntrm=", "madewell.com": "/search?q=", "everlane.com": "/search?q=", "aritzia.com": "/us/en/search?q=", "anthropologie.com": "/search?q=",
  "freepeople.com": "/search?q=", "urbanoutfitters.com": "/search?q=", "hm.com": "/en_us/search-results.html?q=", "uniqlo.com": "/us/en/search?q=", "shopbop.com": "/s/products?query=",
  "revolve.com": "/r/Search.jsp?search=", "net-a-porter.com": "/en-us/shop/search/", "saksfifthavenue.com": "/search?q=", "neimanmarcus.com": "/search.jsp?q=", "jcpenney.com": "/s?searchTerm=",
  "kohls.com": "/search.jsp?search=", "dsw.com": "/search?q=", "zappos.com": "/search?term=", "nike.com": "/w?q=", "adidas.com": "/us/search?q=", "newbalance.com": "/search?q=",
  "vuori.com": "/search?q=", "aloyoga.com": "/search?q=", "quince.com": "/search?query=", "huckberry.com": "/search?q=", "etsy.com": "/search?q=", "shein.com": "/pdsearch/",
  "reformation.com": "/search?q=", "hollisterco.com": "/shop/us/search?searchTerm=", "loft.com": "/search/searchresults?Ntt=", "anntaylor.com": "/search/searchresults?Ntt=",
  "llbean.com": "/llb/search/?freeText=", "patagonia.com": "/search/?q=", "rei.com": "/search?q=", "kizik.com": "/search?q=", "allbirds.com": "/search?q=",
  "ulta.com": "/search?search=", "skims.com": "/search?q=", "spanx.com": "/search?q=", "talbots.com": "/search?q=", "express.com": "/search?q=", "garnethill.com": "/search?q=",
};
export function siteSearch(i: { brand: string | null; store: string; name: string; store_site?: string | null }) {
  const raw = i.store_site?.toLowerCase().trim();
  if (!raw || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(raw)) return null;
  const site = SITE_ALIAS[raw] ?? raw;
  const host = squash(site.replace(/\.[a-z]+$/, ""));
  const names = [squash(i.store), squash(i.brand), squash(i.store).replace(/and/g, "")].filter(n => n.length >= 2);
  // Only big, known stores, and only when the name matches exactly: no way to point a friend's tap elsewhere.
  if (!SEARCH[site] || !names.some(n => n === host || n.replace(/^the/, "") === host)) return null;
  const path = SEARCH[site];
  const q = encodeURIComponent(i.name);
  return `https://www.${site}${path}${q}`;
}
export const findIt = (i: { brand: string | null; store: string; name: string; product_url?: string | null; store_site?: string | null }) =>
  storeLink(i) || siteSearch(i) || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${i.brand || i.store} ${i.name}`)}`;

// Store sites for feed pieces, filled in after the feed loads.
export async function withSites<T extends { id: string; store_site?: string | null }>(list: T[]): Promise<T[]> {
  const ids = list.filter(i => !i.store_site).map(i => i.id);
  if (!ids.length) return list;
  const { data } = await supabase().rpc("item_sites", { ids });
  const m = new Map(((data ?? []) as { item_id: string; store_site: string }[]).map(r => [r.item_id, r.store_site]));
  return list.map(i => (m.has(i.id) ? { ...i, store_site: m.get(i.id) } : i));
}

export function ago(iso: string | null) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
