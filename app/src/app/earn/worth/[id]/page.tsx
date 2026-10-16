"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CONDITIONS, type Condition, SITES, askPrice, buildListing, money } from "@/lib/earn";
import { type Item, loadItems, setPick } from "@/lib/items";
import { ItemImage, TabBar, tint } from "@/lib/tabs";
import { delay } from "@/lib/motion";

// One piece: what it's worth, and a ready-made post for the resale site she picks.
export default function WorthItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [site, setSite] = useState(0);
  const [cond, setCond] = useState<Condition>("Good");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { loadItems().then(all => setItem(all.find(i => i.id === id) ?? null)); }, [id]);

  const s = SITES[site];
  // Rebuild the post when the site or condition changes. Her own edits stay until then.
  useEffect(() => {
    if (!item) return;
    const l = buildListing(item, s, cond);
    setTitle(l.title);
    setBody(l.body);
    const p = askPrice(item, s);
    setPrice(p != null ? String(p) : "");
  }, [item, s, cond]);

  if (item === undefined) return <main className="tabscreen"><TabBar /></main>;
  if (item === null) {
    return (
      <main className="tabscreen">
        <div className="scroll" style={{ padding: "22px 20px 110px" }}><Link href="/earn/worth" className="back">← Worth</Link><p className="lead">We couldn&apos;t find that piece.</p></div>
        <TabBar />
      </main>
    );
  }

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1800); } catch {}
  };
  // Copies the whole post, marks the piece for sale, and opens the site's sell page.
  const post = async () => {
    const all = [title, price && `$${price}`, body].filter(Boolean).join("\n\n");
    await copy(all, "post");
    if (item.pick !== "sell") { setItem({ ...item, pick: "sell" }); await setPick(item, "sell"); }
    window.open(s.url, "_blank", "noopener");
  };
  const field = { width: "100%", boxSizing: "border-box" as const, border: "1.5px solid var(--line)", borderRadius: 14, padding: "10px 12px", font: "15px var(--font-sans), sans-serif", background: "#fff", color: "var(--ink)" };
  const chip = (on: boolean) => ({ flex: "none", height: 36, padding: "0 14px", borderRadius: 999, border: `1.5px solid ${on ? "var(--ink)" : "var(--line)"}`, background: on ? "var(--ink)" : "#fff", color: on ? "#fff" : "var(--ink)", font: "700 13px var(--font-sans), sans-serif", cursor: "pointer" });

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div style={{ background: tint(item.store), padding: "20px 20px 24px", borderRadius: "0 0 36px 36px" }}>
          <Link href="/earn/worth" style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 14px", borderRadius: 999, background: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>← Worth</Link>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: 18 }}>
            <div className="float" style={{ boxShadow: "0 10px 24px rgba(20,18,16,.12)", borderRadius: 22 }}>
              <ItemImage cutId={item.id} src={item.image_url} store={item.store} name={item.name} w={104} h={128} radius={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div className="kicker">{item.brand || item.store}{item.size ? ` · size ${item.size}` : ""}</div>
              <h1 className="serif" style={{ fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: "6px 0 0", overflowWrap: "normal", wordBreak: "normal" }}>{item.name}</h1>
              <div style={{ fontSize: 14, color: "var(--soft)", marginTop: 6 }}>
                {item.price != null ? `You paid ${money(item.price)} ` : "Bought "}in {new Date(item.ordered_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
              </div>
            </div>
          </div>
        </div>

        {item.resale_high != null && (
          <div className="up" style={{ margin: "16px 16px 0", background: "#FFF6F3", borderRadius: 24, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, color: "#8A3A2F", fontWeight: 700 }}>Worth about</div>
            <div style={{ fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{money(item.resale_low ?? item.resale_high)}–{money(item.resale_high)}</div>
            {item.resale_note && <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 6, lineHeight: 1.45 }}>{item.resale_note}</div>}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>An estimate for good used condition.</div>
          </div>
        )}

        <div className="section"><div>Where to sell it</div></div>
        <div style={{ margin: "8px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {SITES.map((x, n) => {
            const p = askPrice(item, x);
            const on = n === site;
            return (
              <button key={x.name} type="button" onClick={() => setSite(n)} className="up press" style={{ ...delay(n, 50), display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "#fff" : "#FAF8F6", border: `1.5px solid ${on ? "var(--ink)" : "transparent"}`, borderRadius: 20, padding: "12px 16px", font: "inherit", color: "var(--ink)", cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{x.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.35 }}>{x.note}</div>
                </div>
                {!x.bag && p != null && <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>List at ${p}</div>}
              </button>
            );
          })}
        </div>

        {s.bag ? (
          <div style={{ margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            <a href={s.url} target="_blank" rel="noreferrer" className="btn press" style={{ height: 52, fontSize: 15 }}>Order a free bag from ThredUp</a>
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Fill the bag, send it back, and ThredUp lists everything for you.</div>
          </div>
        ) : (
          <>
            <div className="section"><div>Your post for {s.name}</div></div>
            <div style={{ margin: "8px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {CONDITIONS.map(c => <button key={c} type="button" onClick={() => setCond(c)} style={chip(c === cond)}>{c}</button>)}
              </div>
              {s.titleMax > 0 && (
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Title <span style={{ fontWeight: 500 }}>({title.length}/{s.titleMax})</span>
                  <input value={title} maxLength={s.titleMax} onChange={e => setTitle(e.target.value)} style={{ ...field, marginTop: 4 }} />
                </label>
              )}
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Price
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>$</span>
                  <input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} style={{ ...field, width: 120 }} />
                </div>
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Description
                <textarea value={body} rows={6} onChange={e => setBody(e.target.value)} style={{ ...field, marginTop: 4, resize: "vertical", lineHeight: 1.45 }} />
              </label>
              <button type="button" onClick={post} className="btn press" style={{ height: 52, fontSize: 15 }}>{copied === "post" ? "Copied. Paste it on " + s.name : `Copy and open ${s.name}`}</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => copy(title || body.split("\n")[0], "title")} className="btn btn-ghost" style={{ height: 44, fontSize: 14, border: "1.5px solid var(--line)" }}>{copied === "title" ? "Copied" : "Copy title"}</button>
                <button type="button" onClick={() => copy(body, "body")} className="btn btn-ghost" style={{ height: 44, fontSize: 14, border: "1.5px solid var(--line)" }}>{copied === "body" ? "Copied" : "Copy description"}</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, textAlign: "center" }}>
                Add 3 or 4 photos you take yourself, in good light. Buyers trust real photos more than store pictures.
              </div>
            </div>
          </>
        )}

        <div style={{ margin: "14px 16px 0" }}>
          <button type="button" onClick={async () => { const next = item.pick === "sell" ? null : "sell"; setItem({ ...item, pick: next }); await setPick(item, next); }} className="btn btn-ghost" style={{ height: 44, fontSize: 14 }}>
            {item.pick === "sell" ? "✓ On your sell list" : "Add to my sell list"}
          </button>
        </div>
      </div>
      <TabBar />
    </main>
  );
}
