"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { importing, startImport } from "./importer";
import { clearOrdersCache } from "./orders";

// Checks Gmail for new orders, shipping and delivery emails when she opens the app or comes back to it,
// at most once an hour. Only reads mail since the last check. Signed-out pages and onboarding are skipped.
const EVERY = 60 * 60 * 1000;
const SKIP = /^\/($|login|auth|import|welcome|claim|goal|live|permission|brief|model|admin|legal|privacy|terms|l\/|p\/)/;

export function AutoSync() {
  const path = usePathname();
  useEffect(() => {
    if (SKIP.test(path)) return;
    const check = () => {
      if (document.visibilityState !== "visible" || importing()) return;
      let last = 0;
      try { last = Number(localStorage.getItem("last-sync") ?? 0); } catch {}
      if (Date.now() - last < EVERY) return;
      try { localStorage.setItem("last-sync", String(Date.now())); } catch {}
      void startImport({ quiet: true });
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [path]);
  useEffect(() => {
    const fresh = () => clearOrdersCache();
    addEventListener("orders-updated", fresh);
    return () => removeEventListener("orders-updated", fresh);
  }, []);
  return null;
}
