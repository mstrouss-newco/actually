import { BackLink } from "@/lib/nav";
import { ConnectGmail, SkipGmail } from "./connect";

export default function Permission() {
  return (
    <main className="screen">
      <BackLink fallback="/today" />
      <h1 className="h1">Bring in your past <em>orders.</em></h1>

      <p className="lead">We find your past orders, deliveries and returns, and skip everything else.</p>

      <div className="spacer" />
      <ConnectGmail />
      <SkipGmail />
    </main>
  );
}
