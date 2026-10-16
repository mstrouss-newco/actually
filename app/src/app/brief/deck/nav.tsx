"use client";
import { useEffect, useState } from "react";

// Arrow keys, space and the little buttons move one slide at a time. Scrolling works too.
export function DeckNav() {
  const [at, setAt] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const deck = document.getElementById("deck");
    if (!deck) return;
    const slides = () => Array.from(deck.querySelectorAll<HTMLElement>(".dk-s"));
    setN(slides().length);
    const onScroll = () => {
      const mid = deck.scrollTop + deck.clientHeight / 2;
      const i = slides().findIndex(s => s.offsetTop <= mid && s.offsetTop + s.offsetHeight > mid);
      if (i >= 0) setAt(i);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const fwd = ["ArrowDown", "ArrowRight", "PageDown", " "].includes(k);
      const back = ["ArrowUp", "ArrowLeft", "PageUp"].includes(k);
      if (!fwd && !back) return;
      e.preventDefault();
      go(fwd ? 1 : -1);
    };
    deck.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    deck.focus();
    return () => { deck.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <div className="dk-nav">
      <button aria-label="Previous slide" onClick={() => go(-1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg></button>
      <span>{at + 1} / {n || "…"}</span>
      <button aria-label="Next slide" onClick={() => go(1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></button>
    </div>
  );
}

function go(dir: number) {
  const deck = document.getElementById("deck");
  if (!deck) return;
  const slides = Array.from(deck.querySelectorAll<HTMLElement>(".dk-s"));
  const mid = deck.scrollTop + deck.clientHeight / 2;
  let i = slides.findIndex(s => s.offsetTop <= mid && s.offsetTop + s.offsetHeight > mid);
  if (i < 0) i = 0;
  const next = slides[Math.min(slides.length - 1, Math.max(0, i + dir))];
  deck.scrollTo({ top: next.offsetTop, behavior: "smooth" });
}
