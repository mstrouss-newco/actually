"use client";

import { useEffect, useState } from "react";

/** iPhone Safari, not added yet, not dismissed. */
export function homeTipWanted() {
  try {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    return ios && !standalone && localStorage.getItem("home-tip") !== "1";
  } catch { return false; }
}

// A one-time tip on iPhone Safari: add Actually to the Home Screen so it opens full screen.
export function HomeScreenTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let seen = false;
    try { seen = localStorage.getItem("home-tip") === "1"; } catch {}
    if (ios && !standalone && !seen) setShow(true);
  }, []);
  if (!show) return null;
  const close = () => { setShow(false); try { localStorage.setItem("home-tip", "1"); } catch {} };
  return (
    <div className="up" style={{ margin: "14px 16px 0", display: "flex", gap: 12, alignItems: "center", background: "var(--ink)", color: "#fff", borderRadius: 20, padding: "12px 12px 12px 16px" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Keep Actually on your Home Screen</div>
        Tap Share, then Add to Home Screen. It opens full screen, like an app.
      </div>
      <button type="button" onClick={close} aria-label="Close" style={{ border: 0, background: "rgba(255,255,255,.12)", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", flex: "none", fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}
