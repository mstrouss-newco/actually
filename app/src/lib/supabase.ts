import { createBrowserClient } from "@supabase/ssr";

// Both values are public by design. Data is protected by row level security.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfqdcwdlrnipzhseoiai.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_RI_lB2QUHHB3KOUyLTlG8w_IyO-ddK_";

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabase() {
  return (client ??= createBrowserClient(URL, KEY));
}
