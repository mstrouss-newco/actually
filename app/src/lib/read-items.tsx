"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "./signin";
import { gmailToken } from "./supabase";
import { readItems } from "./items";

type Outcome = "done" | "expired" | "not-ready";
type Run = (onProgress: (done: number, total: number, found: number) => void) => Promise<Outcome>;

// A button that runs a long AI job and shows its progress. Starts on its own when `auto` is set.
export function Job({ run, label, working, noun, auto = false, onDone }: {
  run: Run; label: string; working: string; noun: [string, string]; auto?: boolean; onDone?: () => void;
}) {
  const [state, setState] = useState<"idle" | "running" | Outcome>("idle");
  const [p, setP] = useState({ done: 0, total: 0, found: 0 });
  const started = useRef(false);

  const go = async () => {
    if (started.current) return;
    started.current = true;
    setState("running");
    const res = await run((done, total, found) => setP({ done, total, found }));
    setState(res);
    onDone?.();
  };

  useEffect(() => { if (auto) go(); });

  if (state === "expired") {
    return <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Google asks us to check in every hour. <button onClick={() => signIn(location.pathname, true)} style={{ border: 0, background: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--ink)", textDecoration: "underline", cursor: "pointer" }}>Reconnect Gmail</button></div>;
  }
  if (state === "not-ready") return <div style={{ fontSize: 14, color: "var(--muted)" }}>This isn&apos;t switched on yet. Check back soon.</div>;
  if (state === "running" || state === "done") {
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
          {state === "running" && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>}
          {state === "running" ? (p.total ? `${working} ${p.done} of ${p.total}` : "Getting started") : "Done"} · {p.found} {p.found === 1 ? noun[0] : noun[1]}
        </div>
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${state === "done" ? 100 : pct}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
        </div>
      </div>
    );
  }
  return <button className="btn" onClick={go} style={{ height: 48, fontSize: 15 }}>{label}</button>;
}

// Reads item names, sizes and photos from her order emails.
export function ReadItems({ auto = false, onDone }: { auto?: boolean; onDone?: () => void }) {
  const run: Run = async onProgress => {
    const token = await gmailToken();
    return token ? readItems(token, onProgress) : "expired";
  };
  return <Job run={run} label="Read my items" working="Reading order" noun={["item found", "items found"]} auto={auto} onDone={onDone} />;
}
