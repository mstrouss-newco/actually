"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Back, Check } from "@/lib/ui";
import { DOMAIN, cleanHandle, handleOk, loadProfile, saveProfile } from "@/lib/profile";

const STEPS = [
  "Every order lands here, sorted by store.",
  "A heads up before any return window closes.",
  "Every email still reaches your inbox.",
];

export default function Claim() {
  const router = useRouter();
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(loadProfile().handle);
    input.current?.focus();
  }, []);

  const ok = handleOk(name);
  const go = () => {
    if (!ok) return;
    saveProfile({ handle: name });
    router.push("/goal");
  };

  return (
    <main className="screen">
      <Back href="/" />
      <h1 className="h1">Choose your shopping <em>email.</em></h1>
      <p className="lead">Type it instead of your regular email when you check out online.</p>

      <label htmlFor="nm" style={{ marginTop: 28, background: "var(--chip)", borderRadius: 24, padding: "18px 18px 16px", display: "block", cursor: "text" }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Your shopping email</span>
        <span style={{ display: "flex", alignItems: "center", marginTop: 8, fontSize: 20, fontWeight: 700 }}>
          <input
            id="nm" ref={input} value={name} placeholder="yourname" autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={e => setName(cleanHandle(e.target.value))}
            onKeyDown={e => e.key === "Enter" && go()}
            style={{ border: 0, outline: 0, font: "inherit", width: `${Math.max(name.length, 8) + 0.5}ch`, maxWidth: 190, background: "transparent", color: "var(--ink)", padding: 0 }}
          />
          <span style={{ color: "#9A938B" }}>@{DOMAIN}</span>
        </span>
      </label>

      <div style={{ minHeight: 22, marginTop: 12 }}>
        {ok && (
          <div key={name} className="ok" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#2F7A4F" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#DCEFDF", display: "flex", alignItems: "center", justifyContent: "center" }}><Check /></span>
            {name}@ looks good
          </div>
        )}
        {!ok && name.length > 0 && (
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Use 3 or more letters or numbers.</div>
        )}
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15, lineHeight: 1.35 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#FFE1DC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flex: "none" }}>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn" disabled={!ok} onClick={go}>
        {ok ? `Get ${name}@${DOMAIN}` : "Pick a name first"}
      </button>
      <div className="note">Sign in with Google next. No password.</div>
    </main>
  );
}
