"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// Getting around. Three small pieces:
// 1. NavTracker (in the layout) counts how deep she is inside the app, per history entry,
//    and remembers the last view of each tab (e.g. Closet > Brands).
// 2. BackLink goes back to wherever she came from when that was inside the app,
//    else to a sensible page (shared links, fresh loads, Home Screen launches).
// 3. useSheetHistory lets the iPhone back swipe close a sheet instead of leaving the screen.

const DEPTH = "nav-depth", LEN = "nav-len";
const TAB_ROOTS = ["/closet", "/orders", "/feed"];
let first = true;

function read(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } }
function write(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } }

export function NavTracker() {
  const path = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const st = (history.state ?? {}) as { actDepth?: number };
    let depth: number;
    if (typeof st.actDepth === "number") depth = st.actDepth; // back or forward to a known page
    else if (first) depth = 0; // fresh load: nothing of ours behind her
    else {
      const last = Number(read(DEPTH) ?? 0), lastLen = Number(read(LEN) ?? 0);
      depth = history.length > lastLen ? last + 1 : last; // a push adds an entry, a replace doesn't
    }
    first = false;
    try { history.replaceState({ ...history.state, actDepth: depth }, ""); } catch { /* ignore */ }
    write(DEPTH, String(depth));
    write(LEN, String(history.length));
    if (TAB_ROOTS.includes(path)) {
      const q = search.toString();
      write(`tab:${path}`, q ? `${path}?${q}` : path);
    }
  }, [path, search]);
  return null;
}

/** True when the page before this one is inside the app. */
export function canGoBack() {
  if (typeof window === "undefined") return false;
  const st = (history.state ?? {}) as { actDepth?: number };
  return (st.actDepth ?? 0) > 0;
}

/** Where a tab should open: the view she last used, else its plain page. */
export function tabHref(root: string) {
  if (typeof window === "undefined") return root;
  return read(`tab:${root}`) ?? root;
}

/** Back where she came from inside the app, else to `fallback`. */
export function useGoBack(fallback: string) {
  const router = useRouter();
  return () => { if (canGoBack()) router.back(); else router.replace(fallback); };
}

export function BackLink({ fallback, label = "Back", style, className = "back", confirm }: { fallback: string; label?: string; style?: React.CSSProperties; className?: string; confirm?: () => boolean }) {
  const go = useGoBack(fallback);
  return (
    <Link href={fallback} className={className} style={style} onClick={e => {
      e.preventDefault();
      if (confirm && !confirm()) return;
      go();
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
      {label}
    </Link>
  );
}

// One shared list of open sheets, newest last. The back swipe closes the newest one.
const open: { close: () => void }[] = [];
let skip = 0, listening = false;
function listen() {
  if (listening) return;
  listening = true;
  addEventListener("popstate", () => {
    if (skip > 0) { skip--; return; } // our own history.back() after a sheet closed from a button
    open.pop()?.close();
  });
}

/** While `isOpen`, the iPhone back swipe closes the sheet instead of leaving the screen. */
export function useSheetHistory(isOpen: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!isOpen) return;
    listen();
    const entry = { close: () => closeRef.current() };
    open.push(entry);
    history.pushState({ ...history.state, sheet: true }, "");
    const at = location.href;
    return () => {
      const i = open.indexOf(entry);
      if (i < 0) return; // already closed by the back swipe
      open.splice(i, 1);
      // Closed from a button: drop the extra history step. If she tapped a link out of the sheet, leave history alone.
      setTimeout(() => {
        if (location.href === at && (history.state as { sheet?: boolean } | null)?.sheet) { skip++; history.back(); }
      }, 0);
    };
  }, [isOpen]);
}
