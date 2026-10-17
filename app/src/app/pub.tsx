import Link from "next/link";
import { PubCta, PubGet } from "./pub-cta";
import "./lander.css";
import "./pub.css";

// Shared frame for public look and piece pages: header, her name, and a way into Actually.
export function PubFrame({ who, kicker, children }: { who: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="pub">
      <div className="pub-in">
        <div className="pub-top"><Link href="/" className="logo">Actually</Link><PubGet /></div>
        <div className="pub-who"><span className="pub-av">{who[0]}</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>{who}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{kicker}</div></div></div>
        {children}
        <PubCta />
        <div className="pub-foot"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </div>
    </div>
  );
}

export function NotShared({ what }: { what: string }) {
  return (
    <div className="pub"><div className="pub-in">
      <div className="pub-top"><Link href="/" className="logo">Actually</Link><PubGet /></div>
      <h1 className="pub-h" style={{ marginTop: 60 }}>This {what} isn&apos;t shared anymore.</h1>
      <p className="lead">The person who shared it turned off the link.</p>
    </div></div>
  );
}
