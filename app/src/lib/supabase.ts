import { createBrowserClient } from "@supabase/ssr";

// Both values are public by design. Data is protected by row level security.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfqdcwdlrnipzhseoiai.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_RI_lB2QUHHB3KOUyLTlG8w_IyO-ddK_";

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabase() {
  return (client ??= createBrowserClient(URL, KEY));
}

// Google's Gmail pass lasts about an hour, and Supabase drops it when it refreshes the
// session. Keep a copy on this device until it runs out, then ask the server for a new one
// (the gmail-token function holds Google's refresh token).
const GMAIL_KEY = "actually-gmail";
export async function gmailToken(): Promise<string | null> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const keep = (t: string, secs: number) => { try { localStorage.setItem(GMAIL_KEY, JSON.stringify({ t, exp: Date.now() + (secs - 300) * 1000 })); } catch {} };
  const fresh = data.session.provider_token;
  if (fresh) { keep(fresh, 3600); return fresh; }
  try {
    const saved = JSON.parse(localStorage.getItem(GMAIL_KEY) ?? "null") as { t: string; exp: number } | null;
    if (saved && saved.exp > Date.now()) return saved.t;
  } catch {}
  const { data: res } = await sb.functions.invoke("gmail-token", { body: {} });
  if (res?.token) { keep(res.token, res.expires_in ?? 3600); return res.token; }
  return null;
}

// Right after Google sign-in: hand Google's refresh token to the server so Gmail keeps working.
export async function saveGmailRefresh() {
  const { data } = await supabase().auth.getSession();
  const rt = data.session?.provider_refresh_token;
  if (rt) await supabase().functions.invoke("gmail-token", { body: { save: rt } }).catch(() => null);
}
