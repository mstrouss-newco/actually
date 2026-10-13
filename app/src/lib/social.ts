import { supabase } from "./supabase";

export type SharedItem = { id: string; brand: string | null; store: string; name: string; image_url: string | null; category: string; shared_at: string | null };
export type FeedItem = SharedItem & { handle: string };
export type Profile = { handle: string; is_me: boolean; i_follow: boolean; followers: number; following: number; items: SharedItem[] };

export async function loadProfilePage(handle: string): Promise<Profile | null> {
  const { data } = await supabase().rpc("profile_page", { name: handle });
  return (data as Profile | null) ?? null;
}

export async function loadFeed(): Promise<FeedItem[]> {
  const { data } = await supabase().rpc("following_feed");
  return (data ?? []) as FeedItem[];
}

export async function searchPeople(q: string) {
  const { data } = await supabase().rpc("search_people", { q });
  return (data ?? []) as { handle: string; shared: number; i_follow: boolean }[];
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
export const findIt = (i: SharedItem) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${i.brand || i.store} ${i.name}`)}`;

export function ago(iso: string | null) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
