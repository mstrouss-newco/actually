import Link from "next/link";
import { LanderGmail } from "./lander-cta";
import "./lander.css";
import "./pub.css";

// Shared frame for public look and piece pages: header, her name, and a way into Actually.
export function PubFrame({ who, kicker, children }: { who: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="pub">
      <div className="pub-in">
        <div className="pub-top"><Link href="/" className="logo">Actually</Link><Link href="/" className="pub-get">Get Actually</Link></div>
        <div className="pub-who"><span className="pub-av">{who[0]}</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>{who}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{kicker}</div></div></div>
        {children}
        <div className="pub-cta">
          <h2>Your closet is already <em>in your inbox.</em></h2>
          <p>Connect Gmail and every order becomes your closet. Make looks like this and share what you love.</p>
          <LanderGmail />
        </div>
        <div className="pub-foot"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </div>
    </div>
  );
}

export function NotShared({ what }: { what: string }) {
  return (
    <div className="pub"><div className="pub-in">
      <div className="pub-top"><Link href="/" className="logo">Actually</Link><Link href="/" className="pub-get">Get Actually</Link></div>
      <h1 className="pub-h" style={{ marginTop: 60 }}>This {what} isn&apos;t shared anymore.</h1>
      <p className="lead">The person who shared it turned off the link.</p>
    </div></div>
  );
}
