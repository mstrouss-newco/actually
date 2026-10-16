"use client";

import { useEffect, useState } from "react";
import { SUPABASE_URL, supabase } from "./supabase";

// Pieces shown without their photo background. The cut-out function removes a plain studio
// background once per piece and saves a see-through copy; busy photos (a model, a room) keep theirs.
export const cutoutUrl = (id: string) => `${SUPABASE_URL}/storage/v1/object/public/cutouts/${id}.png`;

export async function cutOut(id: string): Promise<"ok" | "busy" | "failed"> {
  const { data, error } = await supabase().functions.invoke("cut-out", { body: { item_id: id } });
  if (!error && (data as { url?: string })?.url) return "ok";
  try { const body = await (error as { context?: Response })?.context?.json(); if (body?.error === "busy background") return "busy"; } catch {}
  return "failed";
}

// What this device knows: which pieces have a cut-out, and which don't.
const read = (k: string) => { try { return new Set<string>(JSON.parse(localStorage.getItem(k) ?? "[]")); } catch { return new Set<string>(); } };
let ok: Set<string> | null = null, no: Set<string> | null = null, tried: Set<string> | null = null;
const sets = () => { if (!ok) { ok = read("cut-ok"); no = read("cut-no"); tried = read("cut-tried"); } return { ok: ok!, no: no!, tried: tried! }; };
const save = () => { try { const s = sets(); localStorage.setItem("cut-ok", JSON.stringify([...s.ok].slice(-3000))); localStorage.setItem("cut-no", JSON.stringify([...s.no].slice(-3000))); localStorage.setItem("cut-tried", JSON.stringify([...s.tried].slice(-3000))); } catch {} };
export function markCut(id: string, has: boolean) {
  const s = sets();
  if (has) { s.ok.add(id); s.no.delete(id); } else { s.no.add(id); s.ok.delete(id); }
  save();
  dispatchEvent(new CustomEvent("cutout", { detail: id }));
  // No see-through copy yet: ask for one (works for her pieces and pieces friends share).
  if (!has) ensureCutouts([id]);
}

// "yes": show the cut-out. "try": not known yet, try it and fall back. "no": show the photo.
export function useCutout(id?: string | null): ["yes" | "try" | "no", (has: boolean) => void] {
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!id) return;
    const f = (e: Event) => { if ((e as CustomEvent).detail === id) redraw(n => n + 1); };
    addEventListener("cutout", f);
    // Known to have no copy, but never asked for one (or it failed last time): ask now.
    const s = sets();
    if (s.no.has(id) && !s.tried.has(id)) ensureCutouts([id]);
    return () => removeEventListener("cutout", f);
  }, [id]);
  if (!id || typeof window === "undefined") return ["no", () => {}];
  const s = sets();
  return [s.ok.has(id) ? "yes" : s.no.has(id) ? "no" : "try", (has: boolean) => markCut(id, has)];
}

// Make cut-outs for her own pieces in the background, a few at a time, once per piece.
let running = false;
const queue: string[] = [];
const attempted = new Set<string>(); // this visit only, so a hiccup gets retried next time
export function ensureCutouts(ids: string[], first = false) {
  const s = sets();
  const fresh = ids.filter(id => !s.ok.has(id) && !s.tried.has(id) && !attempted.has(id) && !queue.includes(id));
  if (first) queue.unshift(...fresh); else queue.push(...fresh);
  if (running) return;
  running = true;
  (async () => {
    let n = 0;
    const work = async () => {
      while (queue.length && n < 60) {
        const id = queue.shift()!;
        n++;
        attempted.add(id);
        const r = await cutOut(id).catch(() => "failed" as const);
        if (r !== "failed") { sets().tried.add(id); save(); }
        if (r === "ok") markCut(id, true);
        else if (r === "busy") markCut(id, false);
      }
    };
    await Promise.all([work(), work()]);
    running = false;
  })();
}
