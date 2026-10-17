"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// Getting around.
// - Every history entry carries how deep she is inside the app (actDepth). We stamp it ourselves by
//   wrapping pushState/replaceState, so Next's own history writes keep it too. A push is one deeper,
//   a replace keeps the depth, a fresh load or Home Screen launch starts at 0.
// - BackLink goes back when the page behind is inside the app, else to a sensible page.
// - Sheets add a history entry while open, so the iPhone back swipe closes them.
// - NavTracker remembers each tab's last view (e.g. Closet > Brands) for the tab bar.

type St = { actDepth?: number; sheet?: boolean } & Record<string, unknown>;
const cur = (): St => ((typeof history !== "undefined" && history.state) || {}) as St;

// Open sheets, newest last.
const open: { close: () => void }[] = [];
let skip = 0;

if (typeof window !== "undefined" && !(window as unknown as { __actNav?: boolean }).__actNav) {
  (window as unknown as { __actNav?: boolean }).__actNav = true;
  const push = history.pushState.bind(history), replace = history.replaceState.bind(history);
  history.pushState = (data: St | null, unused: string, url?: string | URL | null) => {
    const d = { ...(data ?? {}) } as St;
    const now = cur().actDepth ?? 0;
    d.actDepth = d.sheet ? now : now + 1; // a sheet is the same page, one step to close
    push(d, unused, url);
  };
  history.replaceState = (data: St | null, unused: string, url?: string | URL | null) => {
    const d = { ...(data ?? {}) } as St, c = cur();
    if (typeof d.actDepth !== "number" && typeof c.actDepth === "number") d.actDepth = c.actDepth;
    const samePage = !url || new URL(String(url), location.href).href === location.href;
    if (samePage && d.sheet === undefined && c.sheet) d.sheet = true; // Next rewriting state mustn't drop the sheet mark
    replace(d, unused, url);
  };
  // Back swipes: close the newest open sheet; skip over sheet entries left behind when she left through a link.
  addEventListener("popstate", () => {
    if (skip > 0) { skip--; return; }
    const top = open.pop();
    if (top) { top.close(); return; }
    if (cur().sheet) { skip++; history.back(); }
  });
}

function read(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } }
function write(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } }
const TAB_ROOTS = ["/closet", "/orders", "/feed"];

/** Remembers each tab's last view. One-off things (an open piece, a shelf, a search) aren't remembered. */
export function NavTracker() {
  const path = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!TAB_ROOTS.includes(path)) return;
    const q = new URLSearchParams(search.toString());
    q.delete("piece"); q.delete("shelf"); q.delete("find"); q.delete("style");
    write(`tab:${path}`, q.size ? `${path}?${q}` : path);
  }, [path, search]);
  return null;
}

/** True when the page before this one is inside the app. */
export function canGoBack() {
  return typeof window !== "undefined" && (cur().actDepth ?? 0) > 0;
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

/** While `isOpen`, the iPhone back swipe closes the sheet instead of leaving the screen. */
export function useSheetHistory(isOpen: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!isOpen) return;
    const entry = { close: () => closeRef.current() };
    open.push(entry);
    history.pushState({ ...history.state, sheet: true }, "");
    const at = location.href;
    return () => {
      const i = open.indexOf(entry);
      if (i < 0) return; // already closed by the back swipe, or dropped by leaveSheets()
      open.splice(i, 1);
      // Closed from a button: drop the extra step. If she left through a link, the back swipe skips it later.
      setTimeout(() => {
        if (location.href === at && cur().sheet) { skip++; history.back(); }
      }, 0);
    };
  }, [isOpen]);
}

/** Before replacing the page from inside a sheet: step off the sheet's entry first, so the page itself gets replaced. */
export function leaveSheets(): Promise<void> {
  open.length = 0;
  if (!cur().sheet) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { removeEventListener("popstate", done); resolve(); };
    addEventListener("popstate", done);
    skip++;
    history.back();
  });
}
