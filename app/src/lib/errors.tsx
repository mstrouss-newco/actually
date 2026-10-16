"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";

// Sends errors to the owner (dashboard + an email at most once an hour).
// Never sends email contents, order details or anything she typed: just the error and the page.
const sent = new Set<string>();
const NOISE = /ResizeObserver|Script error|Load failed|NetworkError|Failed to fetch|AbortError|chrome-extension|moz-extension|safari-extension/i;

// Strip anything quoted or after a "?" so no email text or link details ride along.
const scrub = (t: string) => t.replace(/(["'`])[^"'`]{12,}\1/g, "$1…$1").replace(/\?[^\s)]+/g, "").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");

export function reportError(raw: string, rawStack?: string) {
  const message = scrub(raw ?? ""); const stack = rawStack ? scrub(rawStack) : undefined;
  const key = message.slice(0, 120);
  if (!message || NOISE.test(message) || NOISE.test(stack ?? "") || sent.has(key) || sent.size >= 5) return;
  sent.add(key);
  supabase().functions.invoke("report-error", { body: { message, stack: stack?.slice(0, 4000), page: location.pathname } }).catch(() => null);
}

export function ErrorReporter() {
  useEffect(() => {
    const onErr = (e: ErrorEvent) => reportError(e.message || String(e.error), e.error?.stack);
    const onRej = (e: PromiseRejectionEvent) => { const r = e.reason; reportError(r?.message ?? String(r), r?.stack); };
    addEventListener("error", onErr);
    addEventListener("unhandledrejection", onRej);
    return () => { removeEventListener("error", onErr); removeEventListener("unhandledrejection", onRej); };
  }, []);
  return null;
}
