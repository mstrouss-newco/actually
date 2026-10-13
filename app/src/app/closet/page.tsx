import { Art } from "@/lib/ui";
import { TabBar } from "@/lib/tabs";

// Placeholder until we read item names, sizes and photos from order emails.
export default function Closet() {
  return (
    <main className="tabscreen">
      <div className="scroll" style={{ padding: "22px 20px 110px" }}>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Closet</h1>
        <div style={{ display: "flex", marginTop: 40, justifyContent: "center" }}>
          <Art src="tops-cardigan-sage" w={84} h={108} radius={18} style={{ transform: "rotate(-8deg) translateX(14px)" }} />
          <Art src="dresses-wrap-floral" w={84} h={108} radius={18} style={{ transform: "translateY(-8px)", zIndex: 1, boxShadow: "0 8px 16px rgba(0,0,0,.08)" }} />
          <Art src="shoes-chelsea-tan" w={84} h={108} radius={18} style={{ transform: "rotate(8deg) translateX(-14px)" }} />
        </div>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 28, textAlign: "center" }}>Your closet is <em>coming.</em></div>
        <p className="lead" style={{ textAlign: "center" }}>Soon every piece you&apos;ve bought shows up here, with your size at each brand.</p>
      </div>
      <TabBar />
    </main>
  );
}
