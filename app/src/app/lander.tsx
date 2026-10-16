import Link from "next/link";
import { LanderGmail } from "./lander-cta";
import "./lander.css";

// The public front door for browser visitors. Everything moves: the phones are little looping videos
// made from the app's own screens.
const logo = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
export const art = (k: string) => `/art/${k}.webp`;

export function Logo({ d, s = 22 }: { d: string; s?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logo(d)} alt="" width={s} height={s} className="ld-logo" referrerPolicy="no-referrer" />;
}
export function Pic({ k, h, r = 16 }: { k: string; h: number; r?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="ld-pic" style={{ height: h, borderRadius: r }}><img src={art(k)} alt="" /></div>;
}
export function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`ld-phone ${className}`}><div className="ld-screen">{children}</div></div>;
}
export const Heart = ({ d }: { d: number }) => (
  <svg className="ld-ht" style={{ animationDelay: `${d}s` }} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);

export function Banner({ d, store, text, when, col, delay }: { d: string; store: string; text: string; when: string; col: string; delay: number }) {
  return (
    <div className="ld-ban" style={{ animationDelay: `${delay}s` }}>
      <Logo d={d} s={30} />
      <div style={{ flex: 1, minWidth: 0 }}><div className="ld-ban-s">{store}</div><div className="ld-ban-t">{text}</div></div>
      <div className="ld-ban-w" style={{ color: col }}>{when}</div>
    </div>
  );
}

export function TodayScreen() {
  return (
    <div className="ld-pad">
      <div className="ld-row"><div className="ld-mlogo">Actually</div><span className="ld-av">C</span></div>
      <div className="ld-hi">Good morning, Claire.</div>
      <div className="ld-sub">1 return due Friday. 2 orders on the way.</div>
      <div className="ld-due">
        <div style={{ flex: 1 }}>
          <div className="ld-kick" style={{ color: "#C9402F" }}>Return due</div>
          <div className="ld-due-t">Return the Zara overshirt by <em>Friday</em></div>
          <div className="ld-track"><div className="ld-tb" /></div>
        </div>
        <Pic k="tops-overshirt-rose" h={96} />
      </div>
      <div className="ld-h3">Your closet</div>
      <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {["dresses-slip-apricot", "shoes-sneaker-black-gum", "tops-turtleneck-butter"].map(k => <div key={k} style={{ flex: "none", width: 92 }}><Pic k={k} h={112} /></div>)}
      </div>
      <div className="ld-pts"><Logo d="sephora.com" s={26} /><div><b>$20 in Sephora points</b><div style={{ color: "#7A6A3A" }}>Gone after Oct 31</div></div></div>
      <Banner d="zara.com" store="Zara" text="Return the overshirt by Friday" when="2 days left" col="#C9402F" delay={0} />
      <Banner d="aritzia.com" store="Aritzia" text="Alex loved your sweater" when="Just now" col="#C9402F" delay={3} />
      <Banner d="everlane.com" store="Everlane" text="Your tee resells for $18" when="Sell it" col="#2F7A4F" delay={6} />
    </div>
  );
}

const CLOSET: [string, string, string, string][] = [
  ["tops-overshirt-rose", "Zara", "zara.com", "S"], ["dresses-slip-apricot", "Reformation", "thereformation.com", "4"], ["shoes-sneaker-black-gum", "Adidas", "adidas.com", "8"],
  ["bottoms-jeans-midwash", "Levi's", "levi.com", "28"], ["tops-turtleneck-butter", "Aritzia", "aritzia.com", "M"], ["acc-crossbody-blush", "Polene", "polene-paris.com", ""],
  ["tops-crew-tee-sky", "Everlane", "everlane.com", "M"], ["bottoms-midi-skirt-peach", "Aritzia", "aritzia.com", "4"], ["shoes-chelsea-tan", "Madewell", "madewell.com", "8"],
  ["acc-tote-tan", "J.Crew", "jcrew.com", ""], ["tops-striped-tee", "J.Crew", "jcrew.com", "M"], ["tops-cardigan-sage", "Everlane", "everlane.com", "S"],
  ["dresses-wrap-floral", "Reformation", "thereformation.com", "4"], ["shoes-runner-sky", "Nike", "nike.com", "8"], ["tops-cashmere-lilac", "Naadam", "naadam.co", "S"],
];
export function ClosetScreen() {
  return (
    <>
      <div className="ld-pad" style={{ paddingBottom: 0 }}>
        <div className="ld-title">Closet</div>
        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>{["Pieces", "Brands", "Outfits"].map(t => <span key={t} className="ld-seg" style={{ color: t === "Pieces" ? "#141210" : "#948C84" }}>{t}</span>)}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, overflow: "hidden" }}>{["All", "Tops", "Bottoms", "Shoes", "Bags"].map(t => <span key={t} className={`ld-chip${t === "All" ? " on" : ""}`}>{t}</span>)}</div>
      </div>
      <div className="ld-window" style={{ height: 520 }}>
        <div className="ld-sv" style={{ ["--sy" as string]: "-330px" }}>
          <div className="ld-grid3">
            {CLOSET.map(([k, b, d, s], i) => (
              <div key={k} className="ld-pi" style={{ animationDelay: `${(i * 0.18).toFixed(2)}s` }}>
                <Pic k={k} h={124} />
                <div className="ld-lab"><Logo d={d} s={14} /><span>{b}{s ? ` · ${s}` : ""}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Pieces fly from the tray onto the board, spaced so nothing overlaps.
const BOARD: [string, number, number, number, number, number, number, number][] = [
  ["tops-overshirt-rose", 12, 14, 128, -3, -10, 420, 0], ["tops-crew-tee-sky", 160, 22, 112, 3, 60, 420, 0.5],
  ["bottoms-jeans-midwash", 34, 176, 96, 0, 40, 300, 1], ["acc-crossbody-blush", 168, 170, 96, 4, 100, 300, 1.5], ["shoes-sneaker-black-gum", 160, 292, 110, -6, 0, 160, 2],
];
export function MakerScreen() {
  return (
    <>
      <div className="ld-pad ld-row" style={{ paddingBottom: 0 }}><div className="ld-title" style={{ fontSize: 24 }}>New outfit</div><span className="ld-save">Save</span></div>
      <div className="ld-board">
        {BOARD.map(([k, x, y, w, r, dx, dy, d]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={art(k)} alt="" className="ld-fly" style={{ left: x, top: y, width: w, ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, ["--r" as string]: `${r}deg`, animationDelay: `${d}s` }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "14px 12px 0", overflow: "hidden" }}>{BOARD.map(([k]) => <div key={k} style={{ flex: "none", width: 58 }}><Pic k={k} h={70} r={12} /></div>)}</div>
      <div className="ld-hint">Tap pieces from your closet. Drag, pinch, done.</div>
    </>
  );
}

type Post = { who: string; av: string; k?: string; d?: string; brand: string; name: string; heart: number; look?: boolean };
const POSTS: Post[] = [
  { who: "Jess", av: "#FFF0BF", k: "dresses-slip-apricot", d: "thereformation.com", brand: "Reformation", name: "Juliette slip dress", heart: 1 },
  { who: "Alex", av: "#DCEFDF", brand: "Weekend", name: "Easy Saturday", heart: 3, look: true },
  { who: "Maya", av: "#EBE3FF", k: "shoes-runner-sky", d: "nike.com", brand: "Nike", name: "Pegasus 41", heart: 5 },
  { who: "Jess", av: "#FFF0BF", k: "tops-cashmere-lilac", d: "naadam.co", brand: "Naadam", name: "Cashmere crew", heart: 2 },
  { who: "Sam", av: "#DCEBFF", k: "acc-tote-tan", d: "jcrew.com", brand: "J.Crew", name: "Leather tote", heart: 4 },
];
const LOOK: [string, number, number, number, number][] = [["tops-overshirt-rose", 8, 10, 104, -3], ["bottoms-jeans-midwash", 120, 30, 62, 0], ["tops-crew-tee-sky", 192, 14, 88, 3], ["shoes-sneaker-black-gum", 12, 170, 86, -6], ["acc-crossbody-blush", 196, 150, 72, 4]];
export function FeedScreen() {
  return (
    <>
      <div className="ld-pad" style={{ paddingBottom: 0 }}><div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>{["Friends", "Saved", "Looks"].map(t => <span key={t} className="ld-seg" style={{ fontSize: t === "Friends" ? 20 : 17, color: t === "Friends" ? "#141210" : "#948C84" }}>{t}</span>)}</div></div>
      <div className="ld-window" style={{ height: 560 }}>
        <div className="ld-sv" style={{ ["--sy" as string]: "-1180px", animationDuration: "22s" }}>
          {POSTS.map((p, i) => (
            <div key={i} style={{ paddingBottom: 22 }}>
              <div className="ld-row" style={{ justifyContent: "flex-start", gap: 8, paddingBottom: 8 }}>
                <span className="ld-av" style={{ background: p.av, width: 28, height: 28, fontSize: 13 }}>{p.who[0]}</span>
                <div><div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.who}</div><div style={{ fontSize: 11, color: "#7A746D" }}>{p.look ? "Shared a look" : "Loves this"}</div></div>
              </div>
              {p.look ? (
                <div className="ld-look">{LOOK.map(([k, x, y, w, r]) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={k} src={art(k)} alt="" style={{ position: "absolute", left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />
                ))}</div>
              ) : <Pic k={p.k!} h={250} r={20} />}
              <div className="ld-row" style={{ marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{p.d && <Logo d={p.d} s={18} />}<div><div className="ld-kick" style={{ fontSize: 10 }}>{p.brand}</div><div className="ld-pname">{p.name}</div></div></div>
                <Heart d={p.heart} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const STORES: [string, string][] = [["zara.com", "Zara"], ["nike.com", "Nike"], ["aritzia.com", "Aritzia"], ["levi.com", "Levi's"], ["sephora.com", "Sephora"], ["madewell.com", "Madewell"], ["everlane.com", "Everlane"], ["huckberry.com", "Huckberry"], ["jcrew.com", "J.Crew"], ["nordstrom.com", "Nordstrom"], ["thereformation.com", "Reformation"], ["amazon.com", "Amazon"], ["lululemon.com", "lululemon"], ["anthropologie.com", "Anthropologie"]];

function Feature({ title, body, phone, tone = "", flip }: { title: string; body: string; phone: React.ReactNode; tone?: string; flip?: boolean }) {
  return (
    <section className={`ld-feat ${tone}${flip ? " flip" : ""}`}>
      <div className="ld-feat-t"><h2>{title}</h2><p>{body}</p></div>
      <div className="ld-feat-p">{phone}</div>
    </section>
  );
}

export function Lander() {
  return (
    <div className="ld">
      <nav className="ld-nav">
        <div className="logo ld-brand">Actually</div>
        <div className="ld-links"><a href="#closet">Closet</a><a href="#outfits">Outfits</a><a href="#friends">Friends</a><Link href="/login" className="ld-signin">Sign in</Link></div>
      </nav>

      <header className="ld-hero">
        <div className="ld-blob ld-blob1" /><div className="ld-blob ld-blob2" />
        <div className="ld-hero-t">
          <h1>Your order emails, <em>sorted out.</em></h1>
          <p>Connect Gmail and every order becomes your closet. Returns, points and resale, handled. Plus what your friends love.</p>
          <div className="ld-hero-cta"><LanderGmail /></div>
          <div className="ld-note">Free. We only save your shopping emails.</div>
        </div>
        <div className="ld-hero-p"><Phone className="ld-float"><TodayScreen /></Phone></div>
      </header>

      <div className="ld-marq">
        <div className="ld-marq-h">Finds orders from the stores you already shop</div>
        <div className="ld-mq">{[...STORES, ...STORES].map(([d, n], i) => <span key={i}><Logo d={d} s={30} />{n}</span>)}</div>
      </div>

      <div id="closet"><Feature tone="soft" title="A closet that builds itself" body="Every piece you've bought shows up with a photo, the brand and your size. No uploading, no typing." phone={<Phone><ClosetScreen /></Phone>} /></div>
      <div id="outfits"><Feature flip title="Make outfits from what you own" body="Tap pieces from your closet onto a board. Save the look, or share it with friends." phone={<Phone><MakerScreen /></Phone>} /></div>
      <div id="friends"><Feature tone="dark" title="See what your friends love" body="Hearts, looks and finds from people you follow. Tap anything to find it at the store." phone={<Phone><FeedScreen /></Phone>} /></div>

      <section className="ld-money">
        <h2>Money you&apos;d otherwise miss</h2>
        <div className="ld-cards">
          <div className="ld-card" style={{ background: "#FFE1DC" }}><div className="ld-kick" style={{ color: "#C9402F" }}><Logo d="madewell.com" s={20} />Return due</div><div className="ld-big">Madewell tote, back by <em>Friday</em></div><div className="ld-track" style={{ height: 5 }}><div className="ld-tb" /></div></div>
          <div className="ld-card" style={{ background: "#FFF0BF" }}><div className="ld-kick" style={{ color: "#8A6D1E" }}><Logo d="sephora.com" s={20} />Expiring soon</div><div className="ld-big">$<span className="ld-cnt" style={{ ["--to" as string]: 20 }} /> in Sephora points</div><div className="ld-small">Gone after Oct 31.</div></div>
          <div className="ld-card" style={{ background: "#DCEFDF" }}><div className="ld-kick" style={{ color: "#2F7A4F" }}>Resale value</div><div className="ld-big">Your closet is worth about $1,400</div><div className="ld-small">What similar pieces sell for.</div></div>
        </div>
      </section>

      <section className="ld-end">
        <h2>Your closet is already <em>in your inbox.</em></h2>
        <LanderGmail />
      </section>
      <footer className="ld-foot">
        <div className="logo" style={{ fontSize: 20 }}>Actually</div>
        <div className="ld-flinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/delete">Delete your data</Link></div>
      </footer>
    </div>
  );
}
