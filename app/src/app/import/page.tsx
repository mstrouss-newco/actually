"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGoBack } from "@/lib/nav";
import { type ImportState, importState, onImport, startImport } from "@/lib/importer";
import { StoreTile } from "@/lib/tabs";
import { supabase } from "@/lib/supabase";
import { changeHandle, cleanHandle, loadProfile } from "@/lib/profile";
import { type Item, brandOf, loadItems, whoFor } from "@/lib/items";
import { ItemImage } from "@/lib/tabs";

// While the closet fills in: her name for friends, picked from Google. One tap to keep it.
function NameCard({ finished }: { finished: boolean }) {
  const [h, setH] = useState("");
  const [orig, setOrig] = useState("");
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    const n = loadProfile().handle;
    setH(n); setOrig(n);
    // Only right after a brand-new account is made, for that account.
    (async () => {
      const { data } = await supabase().auth.getUser();
      try { setIsNew(!!data.user && localStorage.getItem("new-account") === data.user.id); } catch {}
    })();
  }, []);
  if (!isNew || done) return null;
  const keep = async () => {
    setMsg("");
    if (h !== orig || !orig) {
      setBusy(true);
      const r = await changeHandle(h);
      setBusy(false);
      if (r !== "ok") { setMsg(r === "taken" ? `${h} is taken. Try another.` : "Use 3 or more letters or numbers."); return; }
    }
    try { localStorage.removeItem("new-account"); } catch {}
    setDone(true);
  };
  return (
    <div className="drop" style={{ background: "#FAF8F6", borderRadius: 24, padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{finished ? (orig ? "Your name for friends" : "Pick your name for friends") : orig ? "While we look, your name for friends" : "While we look, pick your name for friends"}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={h} onChange={e => setH(cleanHandle(e.target.value))} onKeyDown={e => e.key === "Enter" && keep()} aria-label="Your name" autoCapitalize="none" autoComplete="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 14, background: "#fff", border: "1.5px solid var(--line)", padding: "0 14px", font: "700 17px var(--font-sans), sans-serif", color: "var(--ink)" }} />
        <button type="button" onClick={keep} disabled={busy} style={{ height: 48, padding: "0 18px", borderRadius: 999, border: h === orig && orig ? "1.5px solid var(--ink)" : 0, background: h === orig && orig ? "#fff" : "var(--ink)", color: h === orig && orig ? "var(--ink)" : "#fff", font: "700 15px var(--font-sans), sans-serif", cursor: "pointer" }}>{busy ? "Saving" : h === orig && orig ? "Looks good" : "Save"}</button>
      </div>
      <div style={{ fontSize: 12, color: msg ? "#C9402F" : "var(--muted)", marginTop: 8 }}>{msg || (h ? "This is how friends find you." : "3 or more letters or numbers.")}</div>
    </div>
  );
}

const TAGS: Record<string, [string, string]> = {
  order: ["Order", "#DCEBFF"], receipt: ["Receipt", "#DCEFDF"], shipping: ["Shipping", "#FFF0BF"],
  delivered: ["Delivered", "#DCEFDF"], return: ["Return", "#FF6159"], refund: ["Refund", "#EBE3FF"],
};

export default function Import() {
  const [s, setS] = useState<ImportState>(importState());
  // Opened from Settings: every way out goes back to Settings.
  const [from, setFrom] = useState<"settings" | "signup" | null>(null);
  useEffect(() => { setFrom(new URLSearchParams(location.search).get("from") === "settings" ? "settings" : "signup"); }, []);
  const toSettings = useGoBack("/settings");
  // When it's done, show her actual pieces, not her inbox.
  const [pieces, setPieces] = useState<Item[] | null>(null);
  useEffect(() => {
    if (s.stage !== "done") return;
    loadItems().then(all => setPieces(all.filter(i => whoFor(i, all) === "me" && i.image_url))).catch(() => setPieces([]));
  }, [s.stage]);
  // Hold the final button and list until we know whether there are pieces to show.
  const ready = s.stage !== "done" || pieces !== null;
  const brands = new Set((pieces ?? []).map(brandOf)).size;
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
        {from === "settings" ? <button type="button" className="btn btn-ghost" onClick={toSettings}>Not now</button> : <Link href="/today" className="btn btn-ghost">Not now</Link>}
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
          : s.stage === "points" ? "Looking for points and credit" : "All done"}
      </div>
      <h1 className="h1" style={{ marginTop: 14 }}>{s.stage !== "done" ? <>Building your <em>closet&hellip;</em></> : s.orders ? <>Your closet is <em>ready.</em></> : <>Nothing to bring in <em>yet.</em></>}</h1>
      <div className="serif" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em", marginTop: 14 }}>{s.orders}</div>
      <div style={{ fontSize: 17, marginTop: 6 }}>{s.orders === 1 ? "order found" : "orders found"}{s.itemsFound ? ` · ${s.itemsFound} items` : ""}</div>
      <div style={{ marginTop: 18, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
      </div>

      {s.stage === "done" && !s.orders && <p className="lead" style={{ marginTop: 14 }}>We didn&apos;t find store orders in your inbox. Use your shopping email at checkout and new orders will show up here.</p>}
      {!ready ? null : s.stage === "done" && pieces?.length ? (
        <>
          <div className="serif" style={{ marginTop: 24, fontSize: 22 }}>{pieces.length} {pieces.length === 1 ? "piece" : "pieces"}{brands > 1 ? `, ${brands} brands` : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            {pieces.slice(0, 6).map((i, k) => (
              <div key={i.id} className="found" style={{ animationDelay: `${k * 60}ms` }}><ItemImage cutId={i.id} src={i.image_url} store={i.store} name={i.name} w="100%" h={112} radius={16} size={30} /></div>
            ))}
          </div>
        </>
      ) : s.latest.length > 0 && (
        <>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
            {s.latest.map(o => {
              const [tag, bg] = TAGS[o.kind] ?? TAGS.order;
              return (
                <div key={o.gmail_id} className="found" style={{ display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 20, padding: "10px 14px 10px 10px" }}>
                  <StoreTile store={o.store} domain={o.store_domain} w={42} h={52} radius={12} size={22} />
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15 }}>{o.store}</div>
                  <div style={{ background: bg, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>{tag}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="spacer" />
      <NameCard finished={s.stage === "done"} />
      {s.skipped > 0 && s.stage === "done" && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{s.skipped} emails couldn&apos;t be checked. Run this again later to pick them up.</p>}
      {s.stage !== "done" && <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Takes about a minute. Keep this page open while it runs.</p>}
      {from && ready && <Finish done={s.stage === "done"} hasPieces={!!pieces?.length} fromSettings={from === "settings"} />}
    </main>
  );
}

// From Settings, she goes back to Settings; at sign-up, on to Today.
function Finish({ done, hasPieces, fromSettings }: { done: boolean; hasPieces: boolean; fromSettings: boolean }) {
  const back = useGoBack("/settings");
  if (fromSettings) return <button type="button" className="btn" onClick={back}>{done ? "Back to Settings" : "Back to Settings while this runs"}</button>;
  if (done && hasPieces) return <Link href="/closet" className="btn">Open my closet</Link>;
  return <Link href="/today" className="btn">{done ? "Go to Today" : "Look around while this runs"}</Link>;
}
