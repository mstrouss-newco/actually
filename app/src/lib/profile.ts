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

export const DOMAIN = "actually.shop";

// Lowercase letters, numbers and dots. 3 to 30 long.
export function cleanHandle(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 30);
}
export const handleOk = (s: string) => /^[a-z0-9](?:[a-z0-9.]{1,28})[a-z0-9]$/.test(s) && !s.includes("..");

// Copy what's on this device to her account. "taken" means someone else has that name.
export async function syncProfile(): Promise<"ok" | "taken" | "signed-out"> {
  const { supabase } = await import("./supabase");
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return "signed-out";
  const p = loadProfile();
  const row = { id: data.user.id, goals: p.goals, updated_at: new Date().toISOString(), ...(p.handle ? { handle: p.handle } : {}) };
  const { error } = await sb.from("profiles").upsert(row);
  return error?.code === "23505" ? "taken" : "ok";
}
