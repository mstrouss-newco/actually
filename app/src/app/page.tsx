import { Track } from "@/lib/track";
import { GmailStart } from "./permission/connect";
import { Art } from "@/lib/ui";
import { SkipIfSignedIn } from "@/lib/signed-in";

const MAILS = [
  ["Zara", "Your order has shipped #48213"],
  ["Nike", "Thanks for your order!"],
  ["Aritzia", "Return label inside"],
  ["Levi’s", "Your receipt"],
];
const ITEMS = [
  ["tops-overshirt-rose", "Zara · S"],
  ["shoes-runner-sky", "Nike · 10"],
  ["tops-turtleneck-butter", "Aritzia · M"],
  ["bottoms-jeans-midwash", "Levi’s · 28"],
];
const ALERTS = [
  ["tops-overshirt-rose", "Return the Zara overshirt by Friday", "2 days left", "#C9402F"],
  ["tops-turtleneck-butter", "Alex loved your Aritzia sweater", "Just now", "#C9402F"],
  ["tops-overshirt-rose", "Your Zara overshirt resells for $40", "Sell it", "#2F7A4F"],
];

export default function Welcome() {
  return (
    <main className="screen">
      <SkipIfSignedIn />
      <Track name="welcome" />
      <div className="logo">Actually</div>
      <h1 className="h1" style={{ marginTop: 20, fontSize: 42 }}>Your order emails, <em>sorted out.</em></h1>
      <p className="lead" style={{ marginTop: 14, color: "var(--soft)" }}>
        Connect Gmail and every order becomes your closet. Plus returns, points, resale and friends&apos; finds, handled.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {MAILS.map(([b, t]) => (
            <div key={b} className="mail"><b style={{ color: "var(--ink)" }}>{b}</b><br />{t}</div>
          ))}
        </div>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#141210" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ITEMS.map(([img, label]) => (
            <div key={img} className="pop" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Art src={img} w={58} h={70} />
              <div style={{ fontSize: 10, fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {ALERTS.map(([img, text, when, color], i) => (
          <div key={text} className={`drop${i ? ` d${i + 1}` : ""}`} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: "8px 12px 8px 8px", boxShadow: "0 8px 20px rgba(20,18,16,.08)" }}>
            <Art src={img} w={40} h={48} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "var(--ink)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 9 }}>a</span>Actually
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25, marginTop: 2 }}>{text}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>{when === "Just now" && <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF6159" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>}{when}</div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <GmailStart />
    </main>
  );
}
