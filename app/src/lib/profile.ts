"use client";

// What she picked during sign-up. Kept on this device until accounts are live.
export type Goal = "org" | "earn" | "share";
export type Profile = { handle: string; goals: Record<Goal, boolean> };

const KEY = "actually.profile";
const START: Profile = { handle: "", goals: { org: true, earn: false, share: false } };

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...START, ...JSON.parse(raw) } : START;
  } catch {
    return START;
  }
}

export function saveProfile(patch: Partial<Profile>) {
  const next = { ...loadProfile(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

// The first goal she picked decides which "what we found" screen she sees.
export function mainGoal(p: Profile): Goal {
  return p.goals.earn ? "earn" : p.goals.share ? "share" : "org";
}

// Test address domain until the real one is bought.
export const DOMAIN = process.env.NEXT_PUBLIC_SHOPPING_DOMAIN || "shop.myocto.co";

// Lowercase letters, numbers and dots. 3 to 30 long.
export function cleanHandle(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 30);
}
export const handleOk = (s: string) => /^[a-z0-9](?:[a-z0-9.]{1,28})[a-z0-9]$/.test(s) && !s.includes("..");

// Copy what's on this device to her account. "taken" means someone else has that name.
export async function syncProfile(): Promise<"ok" | "taken" | "signed-out" | "error"> {
  const { supabase } = await import("./supabase");
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return "signed-out";
  const p = loadProfile();
  const row = { id: data.user.id, goals: p.goals, updated_at: new Date().toISOString(), ...(p.handle ? { handle: p.handle } : {}) };
  const { error } = await sb.from("profiles").upsert(row);
  return !error ? "ok" : error.code === "23505" ? "taken" : "error";
}

// New accounts get a name from Google (her first name), so sign-up has no extra step.
// She can change it on the import screen or in Settings.
export async function autoHandle(): Promise<string | null> {
  const { supabase } = await import("./supabase");
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const first = (m.given_name || m.full_name || m.name || "").split(" ")[0];
  let base = cleanHandle(first) || cleanHandle((u.email ?? "").split("@")[0].replace(/[._+-]\d*$/, ""));
  if (base.length < 3) base = `${base}shops`.slice(0, 30);
  const tries = [base, ...Array.from({ length: 6 }, () => `${base.slice(0, 26)}${Math.floor(10 + Math.random() * 990)}`)];
  for (const h of tries) {
    if (!handleOk(h)) continue;
    const { data: free } = await sb.rpc("handle_available", { name: h });
    if (free === false) continue;
    saveProfile({ handle: h });
    const r = await syncProfile();
    if (r === "ok") return h;
    if (r !== "taken") break;
  }
  // No name yet: still make her account row, and the import screen asks her to pick one.
  saveProfile({ handle: "" });
  await syncProfile();
  return null;
}

// Change her name (and shopping email). "taken" if someone has it.
export async function changeHandle(h: string): Promise<"ok" | "taken" | "bad"> {
  if (!handleOk(h)) return "bad";
  const old = loadProfile().handle;
  saveProfile({ handle: h });
  const r = await syncProfile();
  if (r === "ok") return "ok";
  saveProfile({ handle: old });
  return r === "taken" ? "taken" : "bad";
}
