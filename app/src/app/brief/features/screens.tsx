import { Logo, Pic, Banner, Heart, art } from "../../lander";

// New little looping phone screens for the feature tour. Same parts and art as the lander.
const G = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.9 6.5-9.6 6.5-16.1z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7A22 22 0 0 0 24 46z" /><path fill="#FBBC05" d="M11.7 28.1a13 13 0 0 1 0-8.3v-5.7H4.4a22 22 0 0 0 0 19.7l7.3-5.7z" /><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A22 22 0 0 0 4.4 14.1l7.3 5.7c1.7-5.2 6.6-9 12.3-9z" /></svg>
);

export function GmailScreen() {
  const found: [string, string, string][] = [["zara.com", "Zara", "4 orders"], ["aritzia.com", "Aritzia", "3 orders"], ["nike.com", "Nike", "2 orders"], ["everlane.com", "Everlane", "5 orders"], ["madewell.com", "Madewell", "2 orders"], ["sephora.com", "Sephora", "Points found"]];
  return (
    <div className="ld-pad">
      <div className="ld-mlogo">Actually</div>
      <div className="ld-hi" style={{ fontSize: 28 }}>Your closet is already in your inbox.</div>
      <div className="tr-gbtn"><span className="tr-g"><G /></span>Continue with Gmail</div>
      <div className="ld-kick" style={{ marginTop: 22 }}>Finding your orders</div>
      <div className="ld-track" style={{ background: "#F3F0EB" }}><div className="tr-fill" /></div>
      <div style={{ marginTop: 10 }}>
        {found.map(([d, n, c], i) => (
          <div key={d} className="ld-pi tr-store" style={{ animationDelay: `${(1.2 + i * 0.5).toFixed(1)}s` }}>
            <Logo d={d} s={26} /><b style={{ flex: 1 }}>{n}</b><span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandScreen() {
  const mine = ["tops-turtleneck-butter", "bottoms-midi-skirt-peach", "tops-cashmere-lilac", "dresses-knit-midi-black"];
  return (
    <div className="ld-pad">
      <div className="ld-row"><Logo d="aritzia.com" s={44} /><span className="tr-follow">Following</span></div>
      <div className="ld-title" style={{ marginTop: 12 }}>Aritzia</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}><span className="ld-chip">Your size M</span><span className="ld-chip">Returns 30 days</span></div>
      <div className="ld-h3">Your pieces</div>
      <div className="tr-grid2">
        {mine.map((k, i) => <div key={k} className="ld-pi" style={{ animationDelay: `${(i * 0.25).toFixed(2)}s` }}><Pic k={k} h={150} /></div>)}
      </div>
      <div className="tr-note">Return by Nov 2 for the skirt</div>
    </div>
  );
}

const LOOKS: [string, [string, number, number, number, number][]][] = [
  ["Easy Saturday", [["tops-striped-tee", 10, 8, 92, -3], ["bottoms-jeans-lightwash", 112, 10, 62, 0], ["shoes-canvas-butter", 30, 104, 74, -5], ["acc-tote-tan", 186, 70, 70, 4]]],
  ["Coffee run", [["tops-cardigan-sage", 8, 6, 96, 3], ["bottoms-trouser-black", 116, 8, 56, 0], ["shoes-runner-lavender", 172, 96, 76, -4], ["acc-cap-sage", 30, 112, 62, -6]]],
];
export function StyleScreen() {
  return (
    <div className="ld-pad">
      <div className="ld-title">Style me</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, overflow: "hidden" }}>{["Work", "Weekend", "Date night", "Travel"].map(t => <span key={t} className={`ld-chip${t === "Weekend" ? " on" : ""}`}>{t}</span>)}</div>
      <div className="tr-shim">Putting together 3 looks</div>
      {LOOKS.map(([name, pieces], j) => (
        <div key={name} className="ld-pi" style={{ animationDelay: `${1.6 + j * 0.6}s`, marginTop: 10 }}>
          <div className="tr-look">{pieces.map(([k, x, y, w, r]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={art(k)} alt="" style={{ position: "absolute", left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />
          ))}</div>
          <div className="ld-row" style={{ marginTop: 6 }}><div className="ld-pname">{name}</div><span className="tr-save">Save</span></div>
        </div>
      ))}
    </div>
  );
}

export function CashScreen() {
  const stores: [string, string, string][] = [["madewell.com", "Madewell", "6% back"], ["nordstrom.com", "Nordstrom", "4% back"], ["lululemon.com", "lululemon", "5% back"], ["huckberry.com", "Huckberry", "7% back"], ["anthropologie.com", "Anthropologie", "4% back"], ["levi.com", "Levi's", "6% back"]];
  return (
    <div className="ld-pad">
      <div className="ld-title">Cash back</div>
      <div className="ld-sub">At the stores you already shop.</div>
      <div className="tr-earned"><div className="ld-kick" style={{ color: "#2F7A4F" }}>Earned so far</div><div className="ld-big" style={{ fontSize: 34 }}>$<span className="ld-cnt" style={{ ["--to" as string]: 38 }} /></div></div>
      {stores.map(([d, n, r], i) => (
        <div key={d} className="ld-pi tr-store" style={{ animationDelay: `${(i * 0.3).toFixed(1)}s` }}><Logo d={d} s={26} /><b style={{ flex: 1 }}>{n}</b><span className="tr-pct">{r}</span></div>
      ))}
      <Banner d="madewell.com" store="Madewell" text="You earned $6.40 back" when="Just now" col="#2F7A4F" delay={2} />
    </div>
  );
}

export function ShareEarnScreen() {
  return (
    <div className="ld-pad">
      <div className="ld-row" style={{ justifyContent: "flex-start", gap: 8 }}><span className="ld-av">C</span><div><div style={{ fontWeight: 700, fontSize: 12.5 }}>Claire</div><div style={{ fontSize: 11, color: "#7A746D" }}>Shared a piece</div></div></div>
      <div style={{ marginTop: 10 }}><Pic k="tops-cashmere-lilac" h={330} r={22} /></div>
      <div className="ld-row" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Logo d="naadam.co" s={18} /><div><div className="ld-kick" style={{ fontSize: 10 }}>Naadam</div><div className="ld-pname">Cashmere crew</div></div></div>
        <Heart d={1} />
      </div>
      <Banner d="naadam.co" store="Naadam" text="Jess bought your sweater. You earned $4." when="Just now" col="#2F7A4F" delay={2.5} />
    </div>
  );
}

export function WorthScreen() {
  const rows: [string, string, string][] = [["dresses-slip-apricot", "Reformation slip dress", "$70 to $95"], ["shoes-chelsea-tan", "Madewell boots", "$60 to $85"], ["acc-crossbody-blush", "Polene bag", "$180 to $240"], ["tops-cashmere-lilac", "Naadam crew", "$35 to $50"]];
  return (
    <div className="ld-pad">
      <div className="ld-title">Worth</div>
      <div className="tr-earned" style={{ background: "#DCEFDF" }}><div className="ld-kick" style={{ color: "#2F7A4F" }}>Your closet could sell for</div><div className="ld-big" style={{ fontSize: 34 }}>$<span className="ld-cnt" style={{ ["--to" as string]: 1400 }} /></div></div>
      {rows.map(([k, n, v], i) => (
        <div key={k} className="ld-pi tr-store" style={{ animationDelay: `${(0.6 + i * 0.35).toFixed(2)}s` }}>
          <div style={{ width: 46, flex: "none" }}><Pic k={k} h={52} r={10} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 12.5 }}>{n}</b><div style={{ fontSize: 11.5, color: "#2F7A4F", fontWeight: 700 }}>{v}</div></div>
          <span className="tr-sell">Sell it</span>
        </div>
      ))}
    </div>
  );
}

export function MyPageScreen() {
  const shared: [string, number][] = [["dresses-wrap-floral", 12], ["tops-overshirt-rose", 8], ["shoes-runner-sky", 5], ["acc-crossbody-blush", 15], ["tops-crew-tee-sky", 3], ["bottoms-jeans-midwash", 7], ["dresses-satin-slip-blush", 9], ["shoes-sneaker-black-gum", 4], ["tops-turtleneck-butter", 6]];
  return (
    <div className="ld-pad">
      <div style={{ textAlign: "center" }}>
        <span className="ld-av" style={{ width: 64, height: 64, fontSize: 28, margin: "0 auto" }}>C</span>
        <div className="ld-title" style={{ marginTop: 8 }}>Claire</div>
        <div className="ld-sub">Easy, warm colors, good bags.</div>
      </div>
      <div className="ld-grid3" style={{ marginTop: 16 }}>
        {shared.map(([k, n], i) => (
          <div key={k} className="ld-pi" style={{ animationDelay: `${(i * 0.15).toFixed(2)}s` }}>
            <Pic k={k} h={104} />
            <div className="tr-loves"><svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#FF6159" /></svg>{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchScreen() {
  return (
    <div className="ld-pad">
      <div className="tr-pair"><span className="ld-av" style={{ width: 70, height: 70, fontSize: 30 }}>C</span><span className="ld-av" style={{ width: 70, height: 70, fontSize: 30, background: "#FFF0BF", marginLeft: -16 }}>J</span></div>
      <div className="tr-pct-big"><span className="ld-cnt" style={{ ["--to" as string]: 86 }} />%</div>
      <div style={{ textAlign: "center", fontFamily: "var(--font-serif), serif", fontSize: 20 }}>Taste Match with Jess</div>
      <div className="ld-kick" style={{ justifyContent: "center", marginTop: 18 }}>You both love</div>
      <div className="tr-both">{[["aritzia.com", "Aritzia"], ["thereformation.com", "Reformation"], ["naadam.co", "Naadam"]].map(([d, n], i) => <span key={d} className="ld-pi" style={{ animationDelay: `${1 + i * 0.4}s` }}><Logo d={d} s={22} />{n}</span>)}</div>
      <div className="ld-grid3" style={{ marginTop: 16 }}>{["dresses-slip-apricot", "tops-cashmere-lilac", "bottoms-midi-skirt-peach"].map((k, i) => <div key={k} className="ld-pi" style={{ animationDelay: `${2 + i * 0.3}s` }}><Pic k={k} h={104} /></div>)}</div>
    </div>
  );
}

export function SavedScreen() {
  const saved: [string, string, string][] = [["dresses-satin-slip-blush", "Reformation", "thereformation.com"], ["shoes-runner-lavender", "Nike", "nike.com"], ["acc-sunglasses-black", "Madewell", "madewell.com"], ["tops-boxy-tee-black", "Everlane", "everlane.com"], ["shoes-dad-sneaker-grey", "New Balance", "newbalance.com"], ["bottoms-linen-short-sage", "J.Crew", "jcrew.com"], ["beauty-lip-oil-rose", "Sephora", "sephora.com"], ["acc-tote-tan", "J.Crew", "jcrew.com"]];
  return (
    <>
      <div className="ld-pad" style={{ paddingBottom: 0 }}><div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>{["Friends", "Saved", "Looks"].map(t => <span key={t} className="ld-seg" style={{ fontSize: t === "Saved" ? 20 : 17, color: t === "Saved" ? "#141210" : "#948C84" }}>{t}</span>)}</div></div>
      <div className="ld-window" style={{ height: 580 }}>
        <div className="ld-sv" style={{ ["--sy" as string]: "-260px" }}>
          <div className="tr-grid2">
            {saved.map(([k, b, d], i) => (
              <div key={k}>
                <div style={{ position: "relative" }}><Pic k={k} h={170} /><span className="tr-heart"><Heart d={i * 0.6} /></span></div>
                <div className="ld-lab"><Logo d={d} s={14} /><span>{b}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Share a look: the story picture slides up, then the share buttons.
const STORY_LOOK: [string, number, number, number, number][] = [["tops-overshirt-rose", 12, 16, 100, -3], ["tops-crew-tee-sky", 108, 24, 80, 3], ["bottoms-jeans-midwash", 30, 132, 62, 0], ["acc-crossbody-blush", 112, 140, 70, 4], ["shoes-sneaker-black-gum", 96, 214, 76, -6]];
export function ShareScreen() {
  return (
    <div className="ld-pad" style={{ paddingTop: 22 }}>
      <div style={{ width: 40, height: 5, borderRadius: 3, background: "#E5E0DA", margin: "0 auto 14px" }} />
      <div className="ld-title" style={{ fontSize: 22 }}>Share your look</div>
      <div className="tr-story">
        {STORY_LOOK.map(([k, x, y, w, r]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={art(k)} alt="" style={{ position: "absolute", left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />
        ))}
        <div className="tr-story-cap"><span className="ld-mlogo" style={{ fontSize: 15 }}>Actually</span><span>Claire&apos;s Easy Saturday</span></div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>{["#fff", "#FFE1DC", "#141210"].map((c, i) => <span key={c} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: i === 1 ? "2px solid #141210" : "1.5px solid #E2DDD7" }} />)}</div>
      <div className="tr-ig"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>Share to Instagram</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><span className="tr-ghost">Send link</span><span className="tr-ghost">Save picture</span></div>
      <div className="tr-note" style={{ background: "#F3F0EB", color: "#5E5852", textAlign: "center" }}>Link copied for your story sticker</div>
    </div>
  );
}

// What a friend sees from the link: the look, each piece tappable to the store.
export function PubLookScreen() {
  return (
    <div className="ld-pad">
      <div className="ld-row"><div className="ld-mlogo">Actually</div><span className="tr-follow">Get Actually</span></div>
      <div className="ld-row" style={{ justifyContent: "flex-start", gap: 8, marginTop: 14 }}><span className="ld-av">C</span><div><div style={{ fontWeight: 700, fontSize: 12.5 }}>Claire</div><div style={{ fontSize: 11, color: "#7A746D" }}>Shared a look</div></div></div>
      <div className="tr-look" style={{ height: 230, marginTop: 10 }}>
        {STORY_LOOK.map(([k, x, y, w, r]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={art(k)} alt="" style={{ position: "absolute", left: x * 0.95, top: y * 0.68, width: w * 0.86, transform: `rotate(${r}deg)` }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 14 }}>Shop the look</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, overflow: "hidden" }}>
        {STORY_LOOK.map(([k], i) => (
          <div key={k} className="tr-shop" style={{ animationDelay: `${0.6 + i * 0.25}s` }}><Pic k={k} h={74} r={14} /></div>
        ))}
      </div>
    </div>
  );
}

// Resale: a ready-made post for the site she picks, or donate it.
export function ResaleScreen() {
  const sites: [string, string][] = [["Poshmark", "List at $85"], ["Depop", "List at $75"], ["eBay", "List at $75"], ["ThredUp", "Free bag"]];
  return (
    <div className="ld-pad">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ width: 70, flex: "none" }}><Pic k="dresses-slip-apricot" h={86} r={16} /></div>
        <div><div className="ld-kick" style={{ fontSize: 9.5 }}>Reformation · size 4</div><div className="ld-pname" style={{ fontSize: 18 }}>Juliette slip dress</div></div>
      </div>
      <div className="tr-earned" style={{ background: "#FFF6F3", marginTop: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#8A3A2F" }}>Worth about</div><div className="ld-big" style={{ fontSize: 28 }}>$70–$95</div></div>
      {sites.map(([n, p], i) => (
        <div key={n} className="tr-site" style={{ animationDelay: `${0.3 + i * 0.25}s`, borderColor: i === 0 ? "#141210" : "transparent", background: i === 0 ? "#fff" : "#FAF8F6" }}><b>{n}</b><span>{p}</span></div>
      ))}
      <div className="tr-copy">Copy and open Poshmark</div>
      <div className="tr-donate">
        <b>Or donate it</b>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}><span className="tr-dbtn">Find a drop-off</span><span className="tr-dbtn light">I donated it</span></div>
      </div>
    </div>
  );
}
