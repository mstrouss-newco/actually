"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errors";

// Shown if a screen crashes. The owner hears about it; she gets a way back.
export default function Crash({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error.message || "Screen crashed", error.stack); }, [error]);
  return (
    <main className="screen">
      <h1 className="h1">Something went <em>wrong.</em></h1>
      <p className="lead">We&apos;ve been told about it. Try again, or head back to Today.</p>
      <div className="spacer" />
      <button className="btn" onClick={reset}>Try again</button>
      <a href="/today" className="btn btn-ghost">Back to Today</a>
    </main>
  );
}
