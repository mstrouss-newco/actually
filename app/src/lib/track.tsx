"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";

// Sign-up steps for the owner dashboard's funnel. Only the step name, never anything she bought or wrote.
// Each step counts once per device; "app_open" once per day.
type Step = "welcome" | "claimed" | "goal" | "app_open";
const visitor = () => {
  try {
    let v = localStorage.getItem("visitor");
    if (!v) { v = crypto.randomUUID(); localStorage.setItem("visitor", v); }
    return v;
  } catch { return null; }
};

export async function track(name: Step) {
  try {
    const key = name === "app_open" ? `t-${name}-${new Date().toLocaleDateString("en-CA")}` : `t-${name}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    if (name === "app_open" && !data.session) return;
    await sb.from("events").insert({ name, visitor: visitor(), ...(data.session ? {} : { user_id: null }) });
  } catch { /* never block the app */ }
}

export function Track({ name }: { name: Step }) {
  useEffect(() => { track(name); }, [name]);
  return null;
}
