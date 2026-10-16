"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveGmailRefresh, supabase } from "@/lib/supabase";
import { autoHandle, saveProfile } from "@/lib/profile";

// Google sends her back here after sign-in.
export default function Auth() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next") || "/import";
    const code = params.get("code");
    (async () => {
      const sb = supabase();
      if (code) await sb.auth.exchangeCodeForSession(code).catch(() => null);
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        setMsg("Sign-in didn't finish. Try again.");
        setTimeout(() => router.replace("/"), 1600);
        return;
      }
      await saveGmailRefresh();
      // Already has an account: use its shopping email and go straight in.
      // Never let a name left on this device from an earlier sign-up replace it.
      const uid = data.session.user.id;
      let look = await sb.from("profiles").select("handle").eq("id", uid).maybeSingle();
      if (look.error) look = await sb.from("profiles").select("handle").eq("id", uid).maybeSingle();
      // Couldn't check: never treat her as new (that would rename her). Carry on as she is.
      if (look.error) { router.replace(next); return; }
      const had = look.data;
      if (had?.handle) {
        saveProfile({ handle: had.handle });
        router.replace(next);
        return;
      }
      // New here: name her from Google. No extra sign-up step.
      await autoHandle();
      try { localStorage.setItem("new-account", uid); } catch {}
      router.replace(next);
    })();
  }, [router]);

  return (
    <main className="screen" style={{ justifyContent: "center", alignItems: "center", gap: 14 }}>
      <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>
      <div style={{ fontSize: 15, color: "var(--muted)" }}>{msg}</div>
    </main>
  );
}
