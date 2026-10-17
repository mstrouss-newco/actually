"use client";

// The Gmail import, as one shared job. It keeps running while she moves around the app,
// and any screen can show its progress.
import { gmailToken, supabase } from "./supabase";
import { type Order, listIds, readOne } from "./gmail";
import { fillLinks, fillPhotos, readItems, readReturnRules, readReturns } from "./items";
import { scanRewards } from "./earn";

export type ImportState = {
  stage: "idle" | "scan" | "items" | "points" | "done" | "reconnect" | "no-access" | "error";
  read: number; total: number; orders: number; skipped: number; latest: Order[];
  itemsDone: number; itemsTotal: number; itemsFound: number;
  quiet?: boolean; // the automatic check: runs without showing progress
};

let state: ImportState = { stage: "idle", read: 0, total: 0, orders: 0, skipped: 0, latest: [], itemsDone: 0, itemsTotal: 0, itemsFound: 0 };
const listeners = new Set<(s: ImportState) => void>();
const set = (patch: Partial<ImportState>) => { state = { ...state, ...patch }; listeners.forEach(l => l(state)); };

// Bump to run the catch-up pass once more for everyone.
const BACKFILL = 1;

export const importState = () => state;
export function onImport(fn: (s: ImportState) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const importing = () => state.stage === "scan" || state.stage === "items" || state.stage === "points";

/** `quiet`: the automatic check when she opens the app. It never starts a first import and never shows a reconnect prompt. */
export async function startImport(opts: { quiet?: boolean } = {}) {
  if (importing()) return;
  const sb = supabase();
  if (opts.quiet) {
    const { data } = await sb.auth.getSession();
    if (!data.session) return;
    const { data: me } = await sb.from("profiles").select("last_import_at").eq("id", data.session.user.id).maybeSingle();
    if (!me?.last_import_at) return;
    const token = await gmailToken().catch(() => null);
    if (!token || importing()) return;
  }
  set({ quiet: !!opts.quiet, stage: "scan", read: 0, total: 0, orders: 0, skipped: 0, latest: [], itemsDone: 0, itemsTotal: 0, itemsFound: 0 });
  const { data } = await sb.auth.getSession();
  const token = await gmailToken().catch(() => null);
  if (!token || !data.session) return set({ stage: opts.quiet ? "idle" : "reconnect" });
  const uid = data.session.user.id;
  const { data: me } = await sb.from("profiles").select("last_import_at, backfill_v").eq("id", uid).maybeSingle();
  const started = new Date().toISOString();
  // One catch-up pass over all past mail: finds cancellations and order emails the old rules missed.
  const catchUp = !!me?.last_import_at && (me?.backfill_v ?? 0) < BACKFILL;

  try {
    let ids = await listIds(token, catchUp ? null : me?.last_import_at);
    if (catchUp) {
      const { data: have } = await sb.from("orders").select("gmail_id").limit(10000);
      const known = new Set(((have ?? []) as { gmail_id: string }[]).map(r => r.gmail_id));
      ids = ids.filter(id => !known.has(id));
    }
    set({ total: ids.length });
    const pending: Order[] = [];
    const keys = new Set<string>();
    // Only real shopping orders are saved. Each batch is screened first.
    const flush = async () => {
      if (!pending.length) return;
      const batch = pending.splice(0);
      const { data: res, error } = await sb.functions.invoke("screen-emails", {
        body: { emails: batch.map(o => ({ id: o.gmail_id, from: o.from ?? o.store, subject: o.subject, snippet: o.snippet })) },
      });
      if (error) { set({ skipped: state.skipped + batch.length }); return; }
      const keep = new Set<string>(res?.keep ?? []);
      const rows = batch.filter(o => keep.has(o.gmail_id)).map(o => {
        const row = { ...o };
        delete row.from;
        delete row.snippet;
        return row;
      });
      if (rows.length) await sb.from("orders").upsert(rows, { onConflict: "user_id,gmail_id", ignoreDuplicates: true });
      let latest = state.latest;
      for (const o of rows) {
        const key = o.order_no ? `${o.store}|${o.order_no}` : o.gmail_id;
        if ((o.kind === "order" || o.kind === "receipt" || o.order_no) && !keys.has(key)) {
          keys.add(key);
          latest = [o, ...latest.filter(x => x.store !== o.store)].slice(0, 4);
        }
      }
      set({ orders: keys.size, latest });
    };
    let next = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const o = await readOne(id, token).catch(e => { if (e.message === "expired" || e.message === "no-access") throw e; return null; });
        set({ read: state.read + 1 });
        if (!o) continue;
        pending.push(o);
        if (pending.length >= 40) await flush();
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    await flush();
    if (!state.skipped) await sb.from("profiles").update({ last_import_at: started }).eq("id", uid);

    // Then read what was in each new order.
    set({ stage: "items" });
    await readItems(token, (done, total, found) => set({ itemsDone: done, itemsTotal: total, itemsFound: found }));
    // Photos for pieces that came in without one, and each store's return rules.
    await fillPhotos(token).catch(() => null);
    await fillLinks(token).catch(() => null);
    await readReturnRules(token).catch(() => null);
    // Which pieces went back, from each return and refund email.
    await readReturns(token).catch(() => null);
    if ((catchUp || !me?.last_import_at) && !state.skipped) await sb.from("profiles").update({ backfill_v: BACKFILL }).eq("id", uid);
    // Points and credit too, while Google's pass is still fresh.
    set({ stage: "points" });
    await scanRewards(() => {}).catch(() => null);
    set({ stage: "done" });
    // Screens that are open reload their orders and pieces.
    try { dispatchEvent(new Event("orders-updated")); } catch {}
  } catch (e) {
    const m = (e as Error).message;
    set({ stage: opts.quiet ? "idle" : m === "expired" ? "reconnect" : m === "no-access" ? "no-access" : "error" });
  }
}
