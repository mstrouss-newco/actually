"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LanderGmail } from "./lander-cta";

// On shared pages: people already using Actually get "Open Actually", everyone else the sign-up pitch.
function useSignedIn() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { (async () => { try { const { data } = await supabase().auth.getSession(); setOn(!!data.session); } catch {} })(); }, []);
  return on;
}

export function PubGet() {
  const on = useSignedIn();
  if (on === null) return <span className="pub-get" style={{ visibility: "hidden" }}>Get Actually</span>;
  return <Link href={on ? "/today" : "/"} className="pub-get">{on ? "Open Actually" : "Get Actually"}</Link>;
}

export function PubCta() {
  const on = useSignedIn();
  if (on === null) return <div className="pub-cta" style={{ visibility: "hidden" }}><h2>&nbsp;</h2><p>&nbsp;</p></div>;
  if (on) return (
    <div className="pub-cta">
      <h2>Make your own <em>looks.</em></h2>
      <p>Pieces from your closet, on a board, ready to share.</p>
      <Link href="/closet?view=outfits" className="ld-gbtn" style={{ padding: "0 28px", textDecoration: "none" }}>Open my closet</Link>
    </div>
  );
  return (
    <div className="pub-cta">
      <h2>Your closet is already <em>in your inbox.</em></h2>
      <p>Connect Gmail and every order becomes your closet. Make looks like this and share what you love.</p>
      <LanderGmail />
    </div>
  );
}
