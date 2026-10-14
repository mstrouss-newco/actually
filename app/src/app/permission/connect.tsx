"use client";

import { useState } from "react";
import { signIn } from "@/lib/signin";

// Signs her in and asks for read-only Gmail access, all in one Google step.
export function ConnectGmail() {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await signIn("/import", true); };
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, marginBottom: 14 }}>
        On the Google screen, tick the box to let Actually read your email. Use a personal Gmail; work accounts usually block this.
      </div>
      <button className="btn" onClick={go} disabled={busy}>{busy ? "Opening Google" : "Continue with Gmail"}</button>
    </>
  );
}

export function SkipGmail() {
  return <button onClick={() => signIn("/today")} className="btn btn-ghost" style={{ fontSize: 14, height: 44 }}>Not now</button>;
}
