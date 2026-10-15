"use client";

import { useEffect, useState } from "react";
import { ConnectGmail, SkipGmail } from "../permission/connect";
import { Check } from "@/lib/ui";
import { DOMAIN, loadProfile } from "@/lib/profile";

const ROWS: [string, boolean][] = [
  ["New orders", true],
  ["Returns you can still make", false],
  ["Everything you've already bought", false],
  ["Your size at every brand, today", false],
];

function Tick({ delay }: { delay: number }) {
  return (
    <span className="rowTick" style={{ animationDelay: `${delay}s`, width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Check size={13} color="#fff" width={3} />
    </span>
  );
}

export default function Live() {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setEmail(`${loadProfile().handle || "you"}@${DOMAIN}`), []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  return (
    <main className="screen">
      <div className="popIn" style={{ background: "#DCEFDF", borderRadius: 22, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Check size={14} color="#2F7A4F" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2F7A4F" }}>Your shopping email is ready</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
        </div>
        <button type="button" onClick={copy} style={{ height: 36, padding: "0 14px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <h1 className="h1" style={{ fontSize: 42 }}>Now bring everything <em>in.</em></h1>
      <p className="lead">Your shopping email catches new orders. Connect Gmail to add what you&apos;ve already bought.</p>

      <div style={{ marginTop: 20, border: "1.5px solid var(--line)", borderRadius: 24, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "12px 16px", background: "#FAF8F6", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
          <span style={{ flex: 1 }} /><span style={{ width: 74, textAlign: "center" }}>Shopping email</span><span style={{ width: 74, textAlign: "center", color: "var(--ink)" }}>With inbox</span>
        </div>
        {ROWS.map(([label, both], i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: 14 }}>
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ width: 74, display: "flex", justifyContent: "center", color: "#C4BDB5" }}>{both ? <Check size={18} color="#9A938B" width={2.4} /> : "–"}</span>
            <span style={{ width: 74, display: "flex", justifyContent: "center" }}><Tick delay={0.5 + i * 0.2} /></span>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <ConnectGmail />
      <SkipGmail label="Just use my shopping email for now" />
    </main>
  );
}
