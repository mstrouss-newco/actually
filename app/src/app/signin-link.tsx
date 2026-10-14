"use client";

import { signIn } from "@/lib/signin";

export function SignInLink() {
  return <button onClick={() => signIn("/today")} style={{ border: 0, background: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--ink)", textDecoration: "underline", cursor: "pointer" }}>Already joined? Sign in</button>;
}
