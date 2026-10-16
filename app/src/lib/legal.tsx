import Link from "next/link";

// DRAFT legal pages. Placeholders in [brackets] must be filled in, and every page reviewed by counsel,
// before launch. Written to match what the app actually does today; keep them in sync when that changes.
export const UPDATED = "October 16, 2026";
export const CO = "[Company legal name]";
export const CONTACT = "[privacy@actually.shop]";

type Doc = { title: string; intro: string; sections: [string, string[]][] };

export const DOCS: Record<string, Doc> = {
  privacy: {
    title: "Privacy Policy",
    intro: `This policy explains what Actually ("we", "us"), a service of ${CO}, collects, why, who we share it with, and the choices you have. Actually organizes your online orders, returns, deliveries, points and the pieces you own.`,
    sections: [
      ["What we collect", [
        "Account details: your Google account email and the name you sign in with, and the name you pick for your shopping email.",
        "Gmail, only with your permission: we look at the sender, subject and preview of emails to find ones about orders. We read the full text only of emails we have judged to be shopping emails (orders, shipping, deliveries, returns, refunds, cancellations) and loyalty or card-reward emails about points.",
        "What we keep from those emails: store, order number, dates, order total, shipping and delivery status, return windows, and for each item its name, brand, size, color, price, product photo link and store page link. For card rewards, only the points or cash back balance, never balances owed, statements or spending.",
        "What we never keep: health, pharmacy, telehealth, testing, adult, insurance, legal or banking emails; eyewear; carrier notices; phone and cable bills; restaurants; kids' teams, camps and school sign-ups. When we are unsure, we skip the email.",
        "Your shopping email: mail sent to your Actually shopping address is forwarded to your inbox. We screen it the same way and keep only the order details above.",
        "Things you add: your profile photo, notes on pieces, outfits, hearts, who you follow, brands you follow, points you type in, and your choices about who each piece is for.",
        "Usage: which sign-up steps you completed and when you open the app, and basic page visit counts from our hosting provider's analytics, which does not use cookies.",
        "Errors: if something breaks, the error message, the screen it happened on and your device type, so we can fix it. Never the contents of your emails.",
      ]],
      ["How we use it", [
        "To run Actually for you: build your closet and order list, track deliveries and return windows, find points, estimate resale value and show your feed.",
        "To show friends what you choose to share. Shared pieces and outfits show the photo, brand, name, store link and your note. Never prices, sizes or order details.",
        "To keep the service safe, fix problems and understand, in aggregate, how people use it.",
        "We do not sell your personal information, and we do not use your Gmail data for advertising.",
      ]],
      ["Google user data", [
        "Actually's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements. See our Google Data Use page for details.",
      ]],
      ["Who we share it with", [
        "Service providers that run Actually for us, under contracts that limit how they use your data: database and storage hosting [Supabase], app hosting and visit counts [Vercel], AI that reads order emails [Anthropic], and email forwarding for your shopping address [Resend]. [Counsel: confirm each provider's data processing terms, including that the AI provider does not train on our data.]",
        "Friends and anyone with your profile link see only what you choose to share.",
        "Stores you tap through to may receive that visit. When cash back is live, a shopping partner may learn that a purchase came from Actually.",
        "If the law requires it, or to protect people's safety, or as part of a sale or merger of our business, with notice where required.",
      ]],
      ["Your choices", [
        "Disconnect Gmail anytime in Settings. We stop reading and delete our access to your Gmail.",
        "Delete your data (orders, closet, points, hearts and outfits) or your whole account anytime in Settings. Deleting your account also deletes your profile photo and cut-out photos.",
        "Everything you share is private until you choose to share it, and pieces for kids or others are always private.",
        `You can also email ${CONTACT} to ask what we hold about you, to correct it, or to delete it.`,
      ]],
      ["How long we keep it", [
        "We keep your data while your account is open. When you delete data or your account, we delete it from our live systems right away and from backups within [30] days.",
      ]],
      ["Security", [
        "Data is encrypted in transit, access is limited by account, and our Gmail access token is stored only on our servers. No system is perfectly secure; tell us at [security@actually.shop] if you find a problem.",
      ]],
      ["Children", [
        "Actually is not for children under [13]. We do not knowingly collect information from them. Pieces you mark as bought for your kids are kept private and are never shared.",
      ]],
      ["Your state privacy rights", [
        "[Counsel: add California (CCPA/CPRA) and other state disclosures: categories collected, sources, purposes, the right to know, delete, correct and opt out, no sale or sharing for cross-context ads, and how to submit requests.]",
      ]],
      ["Changes", [
        "We'll post changes here and tell you in the app before important changes take effect.",
      ]],
      ["Contact", [`${CO}, [mailing address]. ${CONTACT}`]],
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: `These terms are an agreement between you and ${CO} about using Actually. By using Actually you agree to them.`,
    sections: [
      ["Who can use Actually", ["You must be at least [18] years old, or the age of majority where you live, and able to agree to these terms. One account per person."]],
      ["Your account", ["Keep your Google sign-in secure. You're responsible for activity on your account. Tell us right away if you think it's been misused."]],
      ["Your shopping email", [
        "We give you a shopping email address to use at checkout. Mail to it is forwarded to your inbox. Use it only for your own shopping and store accounts, not for spam, sign-up fraud or anything illegal.",
        "We may change the address's domain, and may suspend an address that is misused.",
      ]],
      ["Gmail access", [
        "If you connect Gmail, you let us read your shopping-related emails as described in our Privacy Policy, only to provide Actually to you. You can disconnect anytime.",
      ]],
      ["What you share", [
        "You own what you post (photos, notes, outfits). You give us a license to host, show and share it as needed to run Actually, including to the people you share it with. You can stop sharing anytime.",
        "Share only things you have the right to share, and follow our Community Guidelines.",
      ]],
      ["Estimates, links and offers", [
        "Resale values, return windows, delivery dates and points are estimates from your emails and can be wrong. Check with the store before you rely on them.",
        "Links to stores and resale sites go to services we don't control. Their terms and prices apply.",
        "Cash back and rewards, when offered, follow the program rules shown at the time. See our Affiliate Disclosure.",
      ]],
      ["Things you can't do", ["Break the law, harm others, copy or scrape the service, try to get into accounts or systems that aren't yours, or interfere with how Actually works."]],
      ["Ending things", ["You can delete your account anytime in Settings. We may suspend or end access if you break these terms or to protect others."]],
      ["Disclaimers", ["[Counsel: warranty disclaimer. Actually is provided as is, without warranties of any kind, to the extent the law allows.]"]],
      ["Limits on liability", ["[Counsel: limitation of liability and cap.]"]],
      ["Disputes", ["[Counsel: governing law (e.g. California), venue, and whether to include arbitration and a class action waiver.]"]],
      ["Changes", ["We may update these terms. We'll tell you in the app before important changes take effect. If you keep using Actually after that, the new terms apply."]],
      ["Contact", [`${CO}, [mailing address]. [support@actually.shop]`]],
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "Actually uses as little browser storage as it can, and nothing for advertising.",
    sections: [
      ["What we use", [
        "Sign-in: a cookie that keeps you signed in. Actually can't work without it.",
        "Your settings on this device: small saved values such as your sort choices, which tips you've seen, a random device id used to count sign-up steps, and which pieces we've already checked for links and photos.",
        "Visit counts: our hosting provider's analytics counts page visits without cookies and without identifying you.",
      ]],
      ["What we don't use", ["No advertising cookies, no cross-site tracking, and no selling of browsing data."]],
      ["Your choices", [
        "You can clear cookies and site data in your browser settings. You'll be signed out, and your saved choices on that device will reset.",
        "We honor Global Privacy Control signals. Because we don't use cookies for ads or tracking, there is nothing extra to turn off. [Counsel: confirm no consent banner is needed for target regions; add one if launching in the EU or UK.]",
      ]],
      ["Contact", [CONTACT]],
    ],
  },
  google: {
    title: "Google Data Use",
    intro: "How Actually uses the access you give it to Gmail.",
    sections: [
      ["What we ask for", ["Read-only access to Gmail (gmail.readonly). Actually can't send, delete or change your email."]],
      ["Why", ["To find your past and new orders, deliveries, returns, refunds and points, and turn them into your order list and closet."]],
      ["How", [
        "We check each email's sender, subject and preview to decide if it's about shopping. Only those are read in full, and only to pull out order details. Sensitive categories are skipped (see our Privacy Policy).",
        "Email text is processed by our AI provider to pull out order details, then discarded. We store the order details, not your emails.",
      ]],
      ["Limited Use", [
        "Actually's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
        "We do not use Gmail data for advertising, do not sell it, and do not let people read it except with your permission, for security, to comply with the law, or as part of our internal operations under strict controls.",
        "Offers and alerts come from brands you choose to follow, not from what's in your email.",
      ]],
      ["Turning it off", ["Disconnect Gmail in Settings anytime. You can also remove Actually's access at myaccount.google.com/permissions."]],
    ],
  },
  delete: {
    title: "Delete Your Data",
    intro: "You're in control of what Actually keeps.",
    sections: [
      ["In the app", [
        "Settings > Disconnect Gmail: we stop reading your email and delete our access.",
        "Settings > Delete my orders and closet: deletes your orders, closet, points, hearts and outfits. Your account and shopping email stay.",
        "Settings > Delete my account: deletes everything, including your profile photo and cut-out photos, and your shopping email stops working.",
      ]],
      ["By email", [`Can't sign in? Email ${CONTACT} from the email on your account and we'll delete it within [30] days.`]],
      ["What happens", ["Deletion from our live systems is immediate. Backups are cleared within [30] days. Anything a friend saved is removed too, because it points to your piece."]],
    ],
  },
  community: {
    title: "Community Guidelines",
    intro: "Actually is for sharing what you actually own and love. Keep it kind.",
    sections: [
      ["Do", ["Share pieces and outfits that are yours.", "Write honest notes about fit and quality.", "Respect what others choose to share."]],
      ["Don't", ["Post other people's photos without permission.", "Harass, impersonate or spam anyone.", "Share anything hateful, sexual, violent or illegal.", "Use Actually to sell counterfeits or run scams."]],
      ["Problems", [`Tell us at [support@actually.shop]. We may remove content or accounts that break these guidelines.`]],
    ],
  },
  affiliate: {
    title: "Affiliate Disclosure",
    intro: "How Actually may earn money from links.",
    sections: [
      ["How it works", [
        "Some links to stores may be affiliate links. When you buy through them, Actually, and sometimes the friend who shared the piece, may earn a commission or cash back.",
        "It never changes the price you pay.",
        "Our cash back partner is [Wildfire]. Their program terms apply. [Counsel: confirm FTC disclosure wording and placement near shared links.]",
      ]],
    ],
  },
};

const ORDER = ["privacy", "terms", "cookies", "google", "delete", "community", "affiliate"];
export const LEGAL_LINKS: [string, string][] = ORDER.map(k => [`/legal/${k}`, DOCS[k].title]);

export function LegalPage({ doc }: { doc: string }) {
  const d = DOCS[doc];
  return (
    <main className="tabscreen" style={{ paddingBottom: 0 }}>
      <div className="scroll" style={{ padding: "0 20px 60px" }}>
        <Link href="/legal" className="back">← Legal</Link>
        <div style={{ marginTop: 14, background: "#FFF0BF", borderRadius: 14, padding: "10px 14px", fontSize: 13, fontWeight: 700 }}>Draft. Pending legal review and not yet in effect.</div>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 32, lineHeight: 1.05, margin: "16px 0 0", letterSpacing: "-0.02em" }}>{d.title}</h1>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Last updated {UPDATED}</div>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--soft)", marginTop: 14 }}>{d.intro}</p>
        {d.sections.map(([h, ps]) => (
          <section key={h} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{h}</h2>
            {ps.map((p, n) => <p key={n} style={{ fontSize: 15, lineHeight: 1.55, margin: "8px 0 0" }}>{p}</p>)}
          </section>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 32, fontSize: 13 }}>
          {LEGAL_LINKS.filter(([h]) => h !== `/legal/${doc}`).map(([h, t]) => <Link key={h} href={h} style={{ color: "var(--muted)" }}>{t}</Link>)}
        </div>
      </div>
    </main>
  );
}
