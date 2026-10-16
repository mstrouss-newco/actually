"use client";

import { useState } from "react";
import Link from "next/link";
import { Art } from "@/lib/ui";
import { signIn } from "@/lib/signin";
import { SkipIfSignedIn } from "@/lib/signed-in";

export default function Login() {
  const [busy, setBusy] = useState(false);
  return (
    <main className="screen">
      <SkipIfSignedIn />
      <Link href="/" className="logo" style={{ textDecoration: "none" }}>Actually</Link>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
        <Art src="shoes-runner-sky" w={92} h={116} radius={20} style={{ transform: "rotate(-9deg) translateX(16px)" }} />
        <Art src="tops-overshirt-rose" w={92} h={116} radius={20} style={{ transform: "translateY(-10px)", zIndex: 1, boxShadow: "0 10px 22px rgba(20,18,16,.10)" }} />
        <Art src="beauty-lip-oil-rose" w={92} h={116} radius={20} style={{ transform: "rotate(9deg) translateX(-16px)" }} />
      </div>
      <h1 className="h1" style={{ marginTop: 40, textAlign: "center" }}>Welcome <em>back.</em></h1>
      <p className="lead" style={{ textAlign: "center" }}>Your orders, returns and closet, right where you left them.</p>
      <div className="spacer" />
      <button className="btn" disabled={busy} onClick={async () => { setBusy(true); await signIn("/today"); }}>
        <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10 }}><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {busy ? "Opening Google" : "Continue with Google"}
      </button>
      <div className="note">New here? <Link href="/" style={{ fontWeight: 700 }}>Start with Gmail</Link></div>
    </main>
  );
}
