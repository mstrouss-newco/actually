"use client";

import { gmailToken, supabase } from "./supabase";

const LOCAL = ["actually.profile", "actually-gmail"];
const forget = () => { try { LOCAL.forEach(k => localStorage.removeItem(k)); } catch {} };

// Tells Google to drop Actually's access to her Gmail. Her saved orders stay.
export async function disconnectGmail() {
  const token = await gmailToken();
  if (token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).catch(() => null);
  }
  await supabase().functions.invoke("gmail-token", { body: { forget: true } }).catch(() => null);
  try { localStorage.removeItem("actually-gmail"); } catch {}
}

// Deletes orders, closet, points and hidden stores. The account and name stay, so she can import again.
export async function clearData() {
  const { data, error } = await supabase().functions.invoke("delete-account", { body: { mode: "data" } });
  return !error && !!data?.cleared;
}

// Deletes the account and everything in it, then signs out on this device.
export async function deleteAccount() {
  await disconnectGmail();
  const { data, error } = await supabase().functions.invoke("delete-account", { body: { mode: "account" } });
  if (error || !data?.deleted) return false;
  await supabase().auth.signOut().catch(() => null);
  forget();
  return true;
}

export async function signOut() {
  await supabase().auth.signOut().catch(() => null);
  forget();
}
