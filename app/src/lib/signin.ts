import { supabase } from "./supabase";

// The only Google sign-in in the app. With Gmail, it also asks to read shopping emails.
export async function signIn(next: string, withGmail = false) {
  await supabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${location.origin}/auth?next=${encodeURIComponent(next)}`,
      ...(withGmail ? { scopes: "https://www.googleapis.com/auth/gmail.readonly", queryParams: { access_type: "offline", prompt: "consent" } } : {}),
    },
  });
}
