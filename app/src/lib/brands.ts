import { supabase } from "./supabase";

// Brands she follows, and what she wants to hear about from each.
export type BrandFollow = { brand: string; sales: boolean; arrivals: boolean; drops: boolean };

export async function loadFollows(): Promise<BrandFollow[]> {
  const { data } = await supabase().from("brand_follows").select("brand, sales, arrivals, drops").order("created_at");
  return (data ?? []) as BrandFollow[];
}

async function me() {
  const { data } = await supabase().auth.getUser();
  return data.user?.id ?? null;
}

export async function followBrands(brands: string[]) {
  const id = await me();
  if (!id || !brands.length) return;
  await supabase().from("brand_follows").upsert(brands.map(brand => ({ user_id: id, brand: brand.slice(0, 80) })), { onConflict: "user_id,brand", ignoreDuplicates: true });
}

export async function unfollowBrand(brand: string) {
  await supabase().from("brand_follows").delete().eq("brand", brand);
}

export async function setFollowPrefs(brand: string, prefs: Partial<Omit<BrandFollow, "brand">>) {
  await supabase().from("brand_follows").update(prefs).eq("brand", brand);
}

// Has she seen the "Your brands" screen yet? Asked once, on any device.
export async function brandsAsked(): Promise<boolean> {
  const id = await me();
  if (!id) return true;
  const { data } = await supabase().from("profiles").select("brands_asked_at").eq("id", id).maybeSingle();
  return !!(data as { brands_asked_at: string | null } | null)?.brands_asked_at;
}

export async function markBrandsAsked() {
  const id = await me();
  if (id) await supabase().from("profiles").update({ brands_asked_at: new Date().toISOString() }).eq("id", id);
}

// Brands that people who follow this one also follow (only once enough people do).
export async function brandSuggestions(brand: string): Promise<{ brand: string; share: number }[]> {
  const { data } = await supabase().rpc("brand_suggestions", { name: brand });
  return ((data ?? []) as { brand: string; share: number | string }[]).map(r => ({ brand: r.brand, share: Number(r.share) }));
}
