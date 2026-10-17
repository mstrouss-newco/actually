"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/signin";
import { track } from "@/lib/track";

const G = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" /><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" /></svg>
);

// Signs her in and asks for read-only Gmail access, all in one Google step.
export function ConnectGmail({ next = "/import", count = false }: { next?: string; count?: boolean }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); if (count) track("claimed"); await signIn(next, true); };
  return (
    <>
      <button className="btn" onClick={go} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{G}</span>
        {busy ? "Opening Google" : "Continue with Gmail"}
      </button>
      <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", marginTop: 8, lineHeight: 1.4 }}>We look only at order emails and keep only those. Never health, banking or personal mail.</div>
      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>On Google&apos;s screen, tick the box so we can find your orders.</div>
    </>
  );
}

export function SkipGmail({ label = "Not now" }: { label?: string }) {
  return <button onClick={() => signIn("/today")} className="btn btn-ghost" style={{ fontSize: 14, height: 44 }}>{label}</button>;
}

// The welcome screen's bottom: Gmail first, everything else small.
export function GmailStart() {
  const small = { color: "var(--muted)", fontSize: 12, background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" } as const;
  return (
    <>
      <ConnectGmail count />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        <span style={{ display: "flex", gap: 14 }}>
          <button type="button" onClick={() => signIn("/today")} style={{ ...small, fontWeight: 700 }}>Not now</button>
          <Link href="/login" style={{ color: "inherit", fontWeight: 700 }}>Sign in</Link>
        </span>
        <span style={{ display: "flex", gap: 10 }}>
          <Link href="/terms" style={{ color: "inherit" }}>Terms</Link>
          <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>By continuing you agree to our Terms and Privacy Policy.</div>
    </>
  );
}
