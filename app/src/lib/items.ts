import { supabase } from "./supabase";
import { readFullText } from "./gmail";

export type Item = {
  id: string; store: string; name: string; brand: string | null; size: string | null; color: string | null;
  price: number | null; image_url: string | null; category: string; ordered_at: string; pick: "share" | "sell" | "private" | null;
  resale_low?: number | null; resale_high?: number | null; resale_note?: string | null;
};

// Closet, Sort and Worth only show things you wear. Same list as the value-items function.
export const WEAR = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];

export async function loadItems(): Promise<Item[]> {
  const { data } = await supabase().from("items").select("id, store, name, brand, size, color, price, image_url, category, ordered_at, pick, resale_low, resale_high, resale_note").in("category", WEAR).order("ordered_at", { ascending: false }).limit(3000);
  return (data ?? []) as Item[];
}

export async function setPick(id: string, pick: Item["pick"]) {
  await supabase().from("items").update({ pick }).eq("id", id);
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
