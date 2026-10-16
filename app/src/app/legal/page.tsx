import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

export const metadata = { title: "Legal · Actually" };

export default function Legal() {
  return (
    <main className="tabscreen" style={{ paddingBottom: 0 }}>
      <div className="scroll" style={{ padding: "0 20px 60px" }}>
        <Link href="/" className="back">← Back</Link>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 34, margin: "16px 0 0", letterSpacing: "-0.02em" }}>Legal</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {LEGAL_LINKS.map(([h, t]) => (
            <Link key={h} href={h} className="press" style={{ display: "flex", alignItems: "center", background: "#FAF8F6", borderRadius: 16, padding: "14px 16px", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
              <span style={{ flex: 1 }}>{t}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
