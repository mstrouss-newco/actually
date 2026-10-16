"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ImportState, importState, onImport, startImport } from "@/lib/importer";
import { StoreTile } from "@/lib/tabs";
import { DOMAIN, changeHandle, cleanHandle, loadProfile } from "@/lib/profile";

// While the closet fills in: her name for friends, picked from Google. One tap to keep it.
function NameCard() {
  const [h, setH] = useState("");
  const [orig, setOrig] = useState("");
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const n = loadProfile().handle;
    setH(n); setOrig(n);
    try { if (localStorage.getItem("name-ok")) setDone(true); } catch {}
  }, []);
  if (!orig || done) return null;
  const keep = async () => {
    setMsg("");
    if (h !== orig) {
      setBusy(true);
      const r = await changeHandle(h);
      setBusy(false);
      if (r !== "ok") { setMsg(r === "taken" ? `${h} is taken. Try another.` : "Use 3 or more letters or numbers."); return; }
    }
    try { localStorage.setItem("name-ok", "1"); } catch {}
    setDone(true);
  };
  return (
    <div className="drop" style={{ background: "#FAF8F6", borderRadius: 24, padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>While we look, your name for friends</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={h} onChange={e => setH(cleanHandle(e.target.value))} onKeyDown={e => e.key === "Enter" && keep()} aria-label="Your name" autoCapitalize="none" autoComplete="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 14, background: "#fff", border: "1.5px solid var(--line)", padding: "0 14px", font: "700 17px var(--font-sans), sans-serif", color: "var(--ink)" }} />
        <button type="button" onClick={keep} disabled={busy} style={{ height: 48, padding: "0 18px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 15px var(--font-sans), sans-serif", cursor: "pointer" }}>{busy ? "Saving" : h === orig ? "Looks good" : "Save"}</button>
      </div>
      <div style={{ fontSize: 12, color: msg ? "#C9402F" : "var(--muted)", marginTop: 8 }}>{msg || `Also your shopping email: ${h || orig}@${DOMAIN}`}</div>
    </div>
  );
}

const TAGS: Record<string, [string, string]> = {
  order: ["Order", "#DCEBFF"], receipt: ["Receipt", "#DCEFDF"], shipping: ["Shipping", "#FFF0BF"],
  delivered: ["Delivered", "#DCEFDF"], return: ["Return", "#FF6159"], refund: ["Refund", "#EBE3FF"],
};

export default function Import() {
  const [s, setS] = useState<ImportState>(importState());
  useEffect(() => {
    const off = onImport(setS);
    // Start a scan unless one is already running.
    if (importState().stage !== "scan" && importState().stage !== "items") startImport();
    return off;
  }, []);

  if (s.stage === "reconnect" || s.stage === "error" || s.stage === "no-access") {
    return (
      <main className="screen">
        <h1 className="h1">{s.stage === "error" ? <>Something went <em>wrong.</em></> : s.stage === "no-access" ? <>One box to <em>tick.</em></> : <>Let&apos;s connect <em>Gmail.</em></>}</h1>
        <p className="lead">{s.stage === "error" ? "We couldn't finish reading your inbox. Try again in a minute."
          : s.stage === "no-access" ? "You're signed in, but Google didn't give us permission to read your email. Try again and tick the box that says Actually can read your email."
          : "We need a quick okay from Google to find your orders."}</p>
        <div className="spacer" />
        <Link href="/permission" className="btn">Connect Gmail</Link>
        <Link href="/today" className="btn btn-ghost">Not now</Link>
      </main>
    );
  }

  const scanning = s.stage === "scan" || s.stage === "idle";
  const pct = scanning ? (s.total ? Math.round((s.read / s.total) * 100) : 0) : s.stage === "items" ? (s.itemsTotal ? Math.round((s.itemsDone / s.itemsTotal) * 100) : 0) : 100;

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
        {s.stage !== "done" && <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>}
        {scanning ? (s.total ? `Checking ${s.read} of ${s.total} emails` : "Finding your shopping emails")
          : s.stage === "items" ? (s.itemsTotal ? `Reading what you bought, ${s.itemsDone} of ${s.itemsTotal}` : "Reading what you bought")
          : "All done"}
      </div>
      <h1 className="h1" style={{ marginTop: 14 }}>{s.stage === "done" ? <>Your closet is <em>ready.</em></> : <>Building your <em>closet&hellip;</em></>}</h1>
      <div className="serif" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 14 }}>{s.orders}</div>
      <div style={{ fontSize: 17, marginTop: 6 }}>{s.orders === 1 ? "order found" : "orders found"}{s.itemsFound ? ` · ${s.itemsFound} items` : ""}</div>
      <div style={{ marginTop: 18, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
      </div>

      {s.latest.length > 0 && <div className="serif" style={{ marginTop: 24, fontSize: 22 }}>Just found</div>}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {s.latest.map(o => {
          const [tag, bg] = TAGS[o.kind] ?? TAGS.order;
          return (
            <div key={o.gmail_id} className="found" style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 14px 10px 10px" }}>
              <StoreTile store={o.store} domain={o.store_domain} w={42} h={52} radius={12} size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.store}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.subject}</div>
              </div>
              <div style={{ background: bg, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{tag}</div>
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <NameCard />
      {s.skipped > 0 && s.stage === "done" && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{s.skipped} emails couldn&apos;t be checked. Run this again later to pick them up.</p>}
      {s.stage !== "done" && <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Takes about a minute. Keep the app open while it runs.</p>}
      <Link href="/today" className="btn">{s.stage === "done" ? "See my orders" : "Look around while this runs"}</Link>
    </main>
  );
}
