import Link from "next/link";

// Placeholder until Phase 2 (Today, Closet, Orders) is built.
export default function Today() {
  return (
    <main className="screen">
      <div className="logo">Actually</div>
      <h1 className="h1">You&apos;re <em>in.</em></h1>
      <p className="lead">Your closet, orders and returns show up here next.</p>
      <div className="spacer" />
      <Link href="/" className="btn btn-line">Start over</Link>
    </main>
  );
}
