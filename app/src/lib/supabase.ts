import { createBrowserClient } from "@supabase/ssr";

// Both values are public by design. Data is protected by row level security.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfqdcwdlrnipzhseoiai.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_RI_lB2QUHHB3KOUyLTlG8w_IyO-ddK_";

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabase() {
  return (client ??= createBrowserClient(URL, KEY));
}

// Google's Gmail pass lasts about an hour, but Supabase drops it when it refreshes the
// session. Keep a copy on this device until it runs out, so points and items still work.
const GMAIL_KEY = "actually-gmail";
export async function gmailToken(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  const fresh = data.session?.provider_token;
  try {
    if (fresh) {
      localStorage.setItem(GMAIL_KEY, JSON.stringify({ t: fresh, exp: Date.now() + 55 * 60000 }));
      return fresh;
    }
    const saved = JSON.parse(localStorage.getItem(GMAIL_KEY) ?? "null") as { t: string; exp: number } | null;
    return data.session && saved && saved.exp > Date.now() ? saved.t : null;
  } catch {
    return fresh ?? null;
  }
}
