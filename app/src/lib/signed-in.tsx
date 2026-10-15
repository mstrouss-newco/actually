"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

// Already signed in: skip the welcome and sign-in screens and go straight to Today.
export function SkipIfSignedIn() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { data } = await supabase().auth.getSession();
      if (data.session) router.replace("/today");
    })();
  }, [router]);
  return null;
}
