import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Phone, TodayScreen, ClosetScreen, MakerScreen, FeedScreen } from "../../lander";
import { GmailScreen, BrandScreen, StyleScreen, CashScreen, ShareEarnScreen, WorthScreen, MyPageScreen, MatchScreen, SavedScreen } from "../features/screens";
import { BRIEF_COOKIE, BRIEF_OK } from "../pass";
import { DeckNav } from "./nav";
import "../features/tour.css";
import "./deck.css";

// The Actually deck for ownership and the tech team, behind the /brief password.
// One page of full-screen slides: what it is, the features (moving phones), money, go to market, roadmap, asks.
export const metadata: Metadata = { title: "Actually", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LIVE = "Live";
type Card = { name: string; line: string; when: string; screen: React.ReactNode };

function Cards({ cards }: { cards: Card[] }) {
  return (
    <div className="dk-cards">
      {cards.map(c => (
        <div key={c.name} className="dk-card">
          <div className="dk-ph"><Phone>{c.screen}</Phone></div>
          <div className="dk-cap">
            <div className="dk-capt"><b>{c.name}</b><span className={`tr-when${c.when === LIVE || c.when.startsWith("Value") ? " live" : ""}`}>{c.when}</span></div>
            <p>{c.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Slide({ kick, title, line, tone = "", children }: { kick: string; title: React.ReactNode; line?: string; tone?: string; children: React.ReactNode }) {
  return (
    <section className={`dk-s ${tone}`}>
      <div className="dk-in">
        <div className="ld-kick">{kick}</div>
        <h2>{title}</h2>
        {line && <p className="dk-line">{line}</p>}
        {children}
      </div>
    </section>
  );
}

const STACK: [string, string, string, string][] = [
  ["nextjs.org", "Next.js", "The app", "One app for phone and computer, installs to the home screen"],
  ["vercel.com", "Vercel", "Hosting", "Every change gets a preview and goes live in minutes"],
  ["supabase.com", "Supabase", "Data and sign-in", "Each person can only ever read her own data"],
  ["anthropic.com", "Claude by Anthropic", "AI", "Reads order emails, prices resale, styles outfits; capped at $25 a month"],
  ["gmail.com", "Gmail", "Her orders", "Read-only: we can never send, delete or change her mail"],
  ["resend.com", "Resend", "Email", "Her shopping email address and our alerts"],
  ["github.com", "GitHub", "Code", "Every change reviewed and recorded"],
  ["wildfire-corp.com", "Wildfire", "Cash back partner", "Pays store fees on purchases (in talks)"],
];

const ADS: [string, string, string, string, boolean][] = [
  ["Taste profile and matchmaker", "Jul", "n/a", "$3.05 to $3.58", false],
  ["Earn (cash back, resale)", "Sep", "165", "$3.49", true],
  ["Organizer (orders, returns)", "Sep", "256", "$6.70", true],
  ["Taste Match", "Sep", "71", "$7.70", false],
  ["Checker", "Sep", "39", "$14.65", false],
  ["Private Sharer", "Sep", "31", "$18.15", false],
];

const MONEY: [string, string, string, string, string, string][] = [
  ["Shopping links", "Store pays a fee when she buys through us; we share some as cash back", "$5 to $15", "30 to 50%", "$2 to $7", "Launch"],
  ["Friends' purchases", "A friend buys what she shared; we split the fee with her", "$1 to $5", "25 to 40%", "$0.25 to $2", "5,000 users"],
  ["Resale", "Referral fee from sites like ThredUp and eBay", "$1 to $3", "about 90%", "$1 to $3", "5,000 users"],
  ["Brand offers", "Brands pay per new buyer", "$10 to $25", "30 to 50%", "$3 to $12", "25,000 users"],
  ["Trend reports", "Anonymous buying trends, never from Gmail data", "$2 to $5", "about 80%", "$2 to $4", "250,000 users"],
];

const ROAD: { when: string; name: string; main?: boolean; cols: [string, string[]][]; gate?: string }[] = [
  { when: "By Thanksgiving", name: "Test, add partners, finish product", main: true, gate: "Needs Google to approve Gmail access",
    cols: [["1. Feedback and prework", ["Oddbytes employees try it (US only, up to 100 people)", "Get their feedback and fix what they find", "Legal review of policies"]],
      ["2. If they'd keep using it", ["Google approval for Gmail", "Security review (2 to 6 weeks)", "Partner approvals (Wildfire and others)", "New domain: actually.shop", "Ready to launch"]]] },
  { when: "December", name: "Launch", gate: "Needs cash back to be earning",
    cols: [["", ["Public launch, with an earning test on 50,000 Chirp users", "Cash back links live", "Syncs with the app closed"]], ["", ["Return deadline alerts", "Outlook inbox", "Pinterest sharing"]]] },
  { when: "Q1 2027", name: "Grow", cols: [["", ["App Store app"]], ["", ["Resale partners"]]] },
  { when: "Rest of 2027", name: "Scale", cols: [["", ["Brand offers (at about 25,000 users)", "Trend reports"]], ["", ["Yahoo inbox (needs Yahoo to approve us)"]]] },
];

export default async function Deck() {
  if ((await cookies()).get(BRIEF_COOKIE)?.value !== BRIEF_OK) redirect("/brief");
  return (
    <div className="ld tr dk" id="deck" tabIndex={-1}>
      <section className="dk-s dk-cover">
        <div className="ld-blob ld-blob1" /><div className="ld-blob ld-blob2" />
        <div className="dk-in dk-split">
          <div className="dk-ct">
            <div className="logo ld-brand">Actually</div>
            <h1>Your order emails, <em>sorted out.</em></h1>
            <p>A free app that turns a shopper&apos;s order emails into one organized place: what she owns, what&apos;s due back, what she can earn, and what her friends love.</p>
            <div className="dk-goal">If testing goes well, public launch in December</div>
            <div className="dk-note">In private testing today at actually-app.vercel.app</div>
          </div>
          <div className="dk-cp"><Phone className="ld-float"><TodayScreen /></Phone></div>
        </div>
      </section>

      <Slide kick="1 · Connect" title="One tap with Gmail" line="Her past orders become her closet in minutes. Read-only: we can never send, delete or change her mail.">
        <Cards cards={[
          { name: "Connect Gmail", line: "AI finds her orders and skips everything else, including health and banking mail.", when: LIVE, screen: <GmailScreen /> },
          { name: "Sorted for her", line: "Returns due, deliveries on the way and points about to expire, on one screen.", when: LIVE, screen: <TodayScreen /> },
        ]} />
      </Slide>

      <Slide kick="2 · Organize" tone="soft" title="Everything she owns, in one place" line="No uploading, no typing.">
        <Cards cards={[
          { name: "Closet", line: "Every piece she bought, with photo and brand.", when: LIVE, screen: <ClosetScreen /> },
          { name: "Brands", line: "Her size, her pieces and the return rule.", when: LIVE, screen: <BrandScreen /> },
          { name: "Make an outfit", line: "Tap pieces onto a board. Save or share.", when: LIVE, screen: <MakerScreen /> },
          { name: "AI outfits", line: "3 looks from her own closet, for any occasion.", when: LIVE, screen: <StyleScreen /> },
        ]} />
      </Slide>

      <Slide kick="3 · Earn" title="Money she'd otherwise miss">
        <Cards cards={[
          { name: "Cash back", line: "Buy through Actually at stores she already shops.", when: "Coming December", screen: <CashScreen /> },
          { name: "Earn from sharing", line: "A friend buys what she shared; she gets a cut.", when: "Coming 2027", screen: <ShareEarnScreen /> },
          { name: "Resale", line: "What her closet could sell for today.", when: "Value live, partners Q1 2027", screen: <WorthScreen /> },
        ]} />
      </Slide>

      <Slide kick="4 · Discover" tone="dark" title="Style from people she knows">
        <Cards cards={[
          { name: "Your feed", line: "Pieces and looks she chooses to share. Never prices or sizes.", when: LIVE, screen: <MyPageScreen /> },
          { name: "Friends' feeds", line: "What friends own and love. Tap to find it.", when: LIVE, screen: <FeedScreen /> },
          { name: "Taste Match", line: "How close her taste is to a friend's.", when: LIVE, screen: <MatchScreen /> },
          { name: "Saved", line: "Looks and pieces she hearted.", when: LIVE, screen: <SavedScreen /> },
        ]} />
      </Slide>

      <Slide kick="Tech stack" title={<>Built on tools <em>tech teams already know.</em></>} line="Standard, hosted and low cost: about $0.50 of AI per new user, then pennies a month.">
        <div className="st-grid">
          {STACK.map(([d, name, what, why]) => (
            <div key={name} className="st-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=128`} alt="" width={44} height={44} referrerPolicy="no-referrer" />
              <div><b>{name}</b><span>{what}</span><p>{why}</p></div>
            </div>
          ))}
        </div>
      </Slide>

      <Slide kick="How it makes money" title={<>$20 to $50 a user a year. <em>$8 to $28 net.</em></>} line="Our estimates, based on similar apps (Rakuten, Ibotta, Fetch, LTK), once everything is running. Running cost is under $1 per user a year.">
        <div className="dk-tw"><table className="dk-t">
          <thead><tr><th>Stream</th><th>How</th><th>Revenue</th><th>Margin</th><th>Net</th><th>Starts at</th></tr></thead>
          <tbody>
            {MONEY.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}
            <tr className="dk-tot"><td><b>Total</b></td><td /><td><b>$20 to $50</b></td><td><b>40 to 55%</b></td><td><b>$8 to $28</b></td><td /></tr>
          </tbody>
        </table></div>
        <p className="dk-small">Per user, per year. Ad tests cost $3 to $7 per sign-up. Watch-outs: Amazon pays low fees, and links only pay if she buys through us, which we still need to prove.</p>
      </Slide>

      <Slide kick="Ad tests and what a user costs" title={<>Earning beat every <em>September test.</em></>} line="Small paid tests from July to September. None were optimized, so these are benchmarks to beat, not a ceiling.">
        <div className="ua-wrap">
          <div className="dk-tw"><table className="dk-t ua-t">
            <thead><tr><th>Test</th><th>When</th><th>Sign-ups</th><th>Cost per sign-up</th></tr></thead>
            <tbody>
              {ADS.map(([t, w, n, c, hi]) => <tr key={t} className={hi ? "ua-hi" : ""}><td>{hi ? <b>{t}</b> : t}</td><td>{w}</td><td>{n}</td><td>{hi ? <b>{c}</b> : c}</td></tr>)}
            </tbody>
          </table></div>
          <div className="ua-math">
            <div className="ld-kick">What an active user costs</div>
            <p className="ua-note">If 1 in 2 sign-ups connects Gmail (our guess until testing tells us):</p>
            <div className="ua-row"><span>Earner</span><b>about $7</b><em>pays back in 3 to 11 months</em></div>
            <div className="ua-row"><span>Organizer</span><b>about $13</b><em>pays back in 6 to 20 months</em></div>
            <div className="ua-row ua-free"><span>Chirp users</span><b>almost $0</b><em>already acquired</em></div>
            <p className="ua-note">Payback uses $8 to $28 net per user a year.</p>
          </div>
        </div>
      </Slide>

      <Slide kick="Go to market" tone="soft" title={<>Two customers. <em>Two messages.</em></>} line="We test both, then put the money behind whichever keeps more people.">
        <div className="gt-icps">
          <div className="gt-icp gt-org">
            <div className="gt-top"><span className="gt-tag">Customer 1 · our priority</span><h3>The Organizer</h3><p className="gt-who">Shops online a lot and loses track of what&apos;s coming, what&apos;s due back and what she owns.</p></div>
            <div className="gt-say">&ldquo;Every order, return and size, in one place.&rdquo;</div>
            <div className="gt-feed">
              <div className="gt-n" style={{ animationDelay: "0s" }}><span className="gt-dot" style={{ background: "#C9402F" }} /><b>Return the Zara overshirt</b><em>by Friday</em></div>
              <div className="gt-n" style={{ animationDelay: ".6s" }}><span className="gt-dot" style={{ background: "#2F6FD6" }} /><b>Nike order</b><em>out for delivery</em></div>
              <div className="gt-n" style={{ animationDelay: "1.2s" }}><span className="gt-dot" style={{ background: "#2F7A4F" }} /><b>Your Aritzia size</b><em>M, every time</em></div>
            </div>
            <div className="gt-meta"><div><span>Why it lands</span>77% of shoppers say they&apos;ve missed a return window</div><div><span>Where we find her</span>Women who already use Shop, Rakuten, ShopMy and LTK</div></div>
          </div>
          <div className="gt-icp gt-earn">
            <div className="gt-top"><span className="gt-tag">Customer 2</span><h3>The Earner</h3><p className="gt-who">Hates leaving money on the table: points that expire, returns she forgot, cash back she never claimed.</p></div>
            <div className="gt-say">&ldquo;Money you&apos;d otherwise miss.&rdquo;</div>
            <div className="gt-money">
              <div className="gt-big">$<span className="ld-cnt" style={{ ["--to" as string]: 124 }} /></div>
              <div className="gt-chips"><span>$20 Sephora points</span><span>$38 cash back</span><span>$66 resale</span></div>
            </div>
            <div className="gt-meta"><div><span>Why it lands</span>Earning ads were our cheapest September test ($3.49 a sign-up)</div><div><span>Where we test it</span>50,000 Chirp users we&apos;ve already acquired, who signed up to make money</div></div>
          </div>
        </div>
        <div className="gt-steps">
          <div><b>1</b><span><strong>Employees first</strong>Up to 100 Oddbytes employees in the US</span></div>
          <i aria-hidden="true" />
          <div><b>2</b><span><strong>Test earning on Chirp</strong>50,000 users, almost no cost</span></div>
          <i aria-hidden="true" />
          <div><b>3</b><span><strong>Launch in December</strong>When holiday returns pile up</span></div>
        </div>
      </Slide>

      <Slide kick="Roadmap" title="If testing goes well, launch in December" line="Nothing is spent until employees say they'd keep using it.">
        <div className="dk-road">
          {ROAD.map(r => (
            <div key={r.when}>
              <div className={`dk-row${r.main ? " main" : ""}`}>
                <div className="dk-rl"><div className="ld-kick">{r.when}</div><b>{r.name}</b></div>
                {r.cols.map(([h, items], i) => (
                  <div key={i} className="dk-rc">{h && <div className="ld-kick">{h}</div>}<ul>{items.map(t => <li key={t}>{t}</li>)}</ul></div>
                ))}
              </div>
              {r.gate && <div className="dk-gate">{r.gate}</div>}
            </div>
          ))}
        </div>
      </Slide>

      <Slide kick="What we need" tone="dark" title="A green light to test">
        <div className="dk-grid dk-two">
          <div className="dk-box"><b>From ownership</b><p>A green light for employee testing, and agreement to test the earning message on our 50,000 Chirp users. If testing goes well: $500 for actually.shop and $1,000 to $5,000 for Google&apos;s security review.</p></div>
          <div className="dk-box"><b>From the tech team</b><p>About an hour a week to look over what ships, an owner for the security review, and a view on when we need an App Store app.</p></div>
        </div>
      </Slide>

      <Slide kick="Appendix" title="Under the hood">
        <div className="dk-grid">
          <div className="dk-box"><b>How it&apos;s built</b><ul><li>AI agents write, design, test and release; one person directs and approves every change.</li><li>A separate AI tester checks each batch as a first-time user.</li><li>Every change is reviewed and logged; the code has a full guide for engineers.</li></ul></div>
          
          <div className="dk-box"><b>Privacy</b><ul><li>Health, banking, insurance, legal and adult mail is dropped before anything is read.</li><li>Each person can only read her own data.</li><li>Shared items never show price, size or order details.</li></ul></div>
        </div>
      </Slide>
      <DeckNav />
    </div>
  );
}
