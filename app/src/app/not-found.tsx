import Link from "next/link";

// A link that goes nowhere: say so kindly and give her a way back in.
export default function NotFound() {
  return (
    <main className="screen">
      <h1 className="h1">That page <em>isn&apos;t here.</em></h1>
      <p className="lead">The link may be old or mistyped. Everything of yours is still where you left it.</p>
      <div className="spacer" />
      <Link href="/today" className="btn">Go to Today</Link>
      <Link href="/closet" className="btn btn-ghost">Go to my closet</Link>
    </main>
  );
}
