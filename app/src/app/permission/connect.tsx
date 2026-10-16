"use client";

import { useState } from "react";
import { signIn } from "@/lib/signin";

// Signs her in and asks for read-only Gmail access, all in one Google step.
export function ConnectGmail() {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await signIn("/import", true); };
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        Only shopping emails. Disconnect anytime.
      </div>
      <button className="btn" onClick={go} disabled={busy}>{busy ? "Opening Google" : "Continue with Gmail"}</button>
      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>By continuing you agree to our <a href="/terms" style={{ color: "inherit" }}>Terms</a> and <a href="/privacy" style={{ color: "inherit" }}>Privacy Policy</a>.</div>
      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>On Google&apos;s screen, tick the box so we can find your orders.</div>
    </>
  );
}

export function SkipGmail({ label = "Not now" }: { label?: string }) {
  return <button onClick={() => signIn("/today")} className="btn btn-ghost" style={{ fontSize: 14, height: 44 }}>{label}</button>;
}
