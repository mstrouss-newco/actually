import { Back } from "@/lib/ui";
import { ConnectGmail, SkipGmail } from "./connect";

export default function Permission() {
  return (
    <main className="screen">
      <Back href="/live" />
      <h1 className="h1">We only read shopping <em>emails.</em></h1>

      <div style={{ marginTop: 26, background: "#DCEFDF", borderRadius: 26, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#2F7A4F" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12.5l4.5 4L19 7" /></svg>We read
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>Order confirmations, shipping updates, return labels and store receipts.</div>
      </div>
      <div style={{ marginTop: 10, background: "#FFE1DC", borderRadius: 26, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#C9402F" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>We never
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>Read personal mail, send email as you, or sell what&apos;s in your inbox.</div>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 14, lineHeight: 1.45 }}>Disconnect anytime. Your past orders stay, the connection goes.</div>

      <div className="spacer" />
      <ConnectGmail />
      <SkipGmail />
    </main>
  );
}
