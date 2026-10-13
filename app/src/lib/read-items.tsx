"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "./supabase";
import { readItems } from "./items";

type State = "idle" | "reading" | "done" | "expired" | "not-ready";

// Reads item names, sizes and photos from her order emails. Starts on its own when `auto` is set.
export function ReadItems({ auto = false, onDone }: { auto?: boolean; onDone?: () => void }) {
  const [state, setState] = useState<State>("idle");
  const [p, setP] = useState({ done: 0, total: 0, found: 0 });
  const started = useRef(false);

  const run = async () => {
    if (started.current) return;
    started.current = true;
    const { data } = await supabase().auth.getSession();
    const token = data.session?.provider_token;
    if (!token) { setState("expired"); return; }
    setState("reading");
    const res = await readItems(token, (done, total, found) => setP({ done, total, found }));
    setState(res);
    onDone?.();
  };

  useEffect(() => { if (auto) run(); });

  if (state === "expired") {
    return <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Gmail needs a quick reconnect to read your items. <Link href="/permission" style={{ fontWeight: 700 }}>Reconnect</Link></div>;
  }
  if (state === "not-ready") return <div style={{ fontSize: 14, color: "var(--muted)" }}>Item reading isn&apos;t switched on yet. Check back soon.</div>;
  if (state === "reading" || state === "done") {
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
          {state === "reading" && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6159" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 1-9 9" /></svg>}
          {state === "reading" ? (p.total ? `Reading order ${p.done} of ${p.total}` : "Finding your orders") : "Done"} · {p.found} {p.found === 1 ? "item" : "items"} found
        </div>
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "#F1EDE8", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${state === "done" ? 100 : pct}%`, background: "var(--ink)", borderRadius: 3, transition: "width .2s" }} />
        </div>
      </div>
    );
  }
  return <button className="btn" onClick={run} style={{ height: 48, fontSize: 15 }}>Read my items</button>;
}
