"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Asks Google for read-only Gmail access, then comes back to the import screen.
export function ConnectGmail() {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await supabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${location.origin}/auth?next=/import`,
      },
    });
  };
  return <button className="btn" onClick={go} disabled={busy}>{busy ? "Opening Google" : "Continue with Gmail"}</button>;
}
