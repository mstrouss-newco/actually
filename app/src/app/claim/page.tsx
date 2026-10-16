"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old sign-up step. Sign-up now starts with Gmail on the welcome screen.
export default function Old() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return <main className="screen" />;
}
