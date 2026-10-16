"use client";

import { useEffect } from "react";

// When a newer version of the app is live, quietly reload into it: when she comes back to the app,
// or on a timer while it's open (never while she's typing).
const MINE = process.env.NEXT_PUBLIC_BUILD_ID ?? "";

export function AutoUpdate() {
  useEffect(() => {
    if (!MINE) return;
    let busy = false;
    const typing = () => { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT"); };
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { v } = (await r.json()) as { v?: string };
        // Reload once per new version, so a stale copy can never loop.
        let tried = "";
        try { tried = sessionStorage.getItem("reloaded-for") ?? ""; } catch {}
        if (v && v !== MINE && v !== tried && !typing() && !/^\/(outfit\/edit|sort)/.test(location.pathname)) {
          try { sessionStorage.setItem("reloaded-for", v); } catch {}
          location.reload();
        }
      } catch {}
      busy = false;
    };
    const onShow = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onShow);
    addEventListener("pageshow", onShow);
    const t = setInterval(check, 5 * 60 * 1000);
    check();
    return () => { document.removeEventListener("visibilitychange", onShow); removeEventListener("pageshow", onShow); clearInterval(t); };
  }, []);
  return null;
}
