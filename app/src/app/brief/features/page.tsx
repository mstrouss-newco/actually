import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Phone, TodayScreen, ClosetScreen, MakerScreen, FeedScreen } from "../../lander";
import { GmailScreen, BrandScreen, StyleScreen, CashScreen, ShareEarnScreen, WorthScreen, MyPageScreen, MatchScreen, SavedScreen } from "./screens";
import { BRIEF_COOKIE, BRIEF_OK } from "../pass";
import "./tour.css";

// Key features tour for ownership and the tech team. Same password as /brief.
export const metadata: Metadata = { title: "Actually: key features", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Card = { name: string; line: string; when: string; screen: React.ReactNode };
const LIVE = "Live";
const soon = (w: string) => `Coming ${w}`;
const SECTIONS: { n: string; title: string; line: string; tone: string; cards: Card[] }[] = [
  {
    n: "1", title: "Connect your Gmail", tone: "", line: "One tap. Her past orders become her closet in minutes.",
    cards: [
      { name: "One tap with Gmail", line: "Read-only. We can never send, delete or change her mail, and private mail like health and banking is skipped.", when: LIVE, screen: <GmailScreen /> },
      { name: "Sorted for her", line: "Returns due, deliveries on the way and points about to expire, on one screen.", when: LIVE, screen: <TodayScreen /> },
    ],
  },
  {
    n: "2", title: "Organize", tone: "soft", line: "Everything she owns, in one place, without typing a thing.",
    cards: [
      { name: "Closet", line: "Every piece she bought, with photo and brand. Backgrounds removed automatically.", when: LIVE, screen: <ClosetScreen /> },
      { name: "Brands", line: "A page per brand with her size, her pieces and its return rule.", when: LIVE, screen: <BrandScreen /> },
      { name: "Make an outfit", line: "Tap pieces onto a board. Save the look or share it.", when: LIVE, screen: <MakerScreen /> },
      { name: "AI outfits", line: "Pick an occasion or a piece and get 3 looks from her own closet.", when: LIVE, screen: <StyleScreen /> },
    ],
  },
  {
    n: "3", title: "Earn", tone: "", line: "Money she'd otherwise leave on the table.",
    cards: [
      { name: "Cash back", line: "Buy through Actually at stores she already shops and get money back.", when: soon("December"), screen: <CashScreen /> },
      { name: "Earn from sharing", line: "When a friend buys something she shared, she gets a cut.", when: soon("2027"), screen: <ShareEarnScreen /> },
      { name: "Resale", line: "What her closet could sell for today. Selling through partners comes next.", when: "Value live, partners Q1 2027", screen: <WorthScreen /> },
    ],
  },
  {
    n: "4", title: "Discover", tone: "dark", line: "Style from people she actually knows.",
    cards: [
      { name: "Your feed", line: "Her page of the pieces and looks she chooses to share. Never prices or sizes.", when: LIVE, screen: <MyPageScreen /> },
      { name: "Friends' feeds", line: "What friends own and love. Tap anything to find it at the store.", when: LIVE, screen: <FeedScreen /> },
      { name: "Taste Match", line: "How close her taste is to a friend's, and the brands they share.", when: LIVE, screen: <MatchScreen /> },
      { name: "Saved", line: "Looks and pieces she hearted, all in one place.", when: LIVE, screen: <SavedScreen /> },
    ],
  },
];

export default async function Features() {
  if ((await cookies()).get(BRIEF_COOKIE)?.value !== BRIEF_OK) redirect("/brief");
  return (
    <div className="ld tr">
      <nav className="ld-nav">
        <div className="logo ld-brand">Actually</div>
        <div className="ld-links"><a href="#connect">Connect</a><a href="#organize">Organize</a><a href="#earn">Earn</a><a href="#discover">Discover</a><a href="/brief" className="ld-signin">One sheet</a></div>
      </nav>
      <header className="tr-hero">
        <div className="ld-kick">Key features</div>
        <h1>What Actually <em>does.</em></h1>
        <p>Four parts: connect Gmail, organize, earn and discover. Each phone below is the real app&apos;s design, moving.</p>
      </header>
      {SECTIONS.map(s => (
        <section key={s.n} id={["connect", "organize", "earn", "discover"][Number(s.n) - 1]} className={`tr-sec ${s.tone}`}>
          <div className="tr-head"><span className="tr-n">{s.n}</span><div><h2>{s.title}</h2><p>{s.line}</p></div></div>
          <div className="tr-row">
            {s.cards.map(c => (
              <div key={c.name} className="tr-card">
                <div className="tr-ph"><Phone>{c.screen}</Phone></div>
                <div className="tr-cap">
                  <div className="ld-row" style={{ gap: 8, alignItems: "baseline" }}><b>{c.name}</b><span className={`tr-when${c.when.startsWith("Live") || c.when.startsWith("Value") ? " live" : ""}`}>{c.when}</span></div>
                  <p>{c.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <footer className="ld-foot"><div className="logo" style={{ fontSize: 20 }}>Actually</div><a href="/brief">Back to the one sheet</a></footer>
    </div>
  );
}
