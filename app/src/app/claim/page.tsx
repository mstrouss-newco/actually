"use client";

import { track } from "@/lib/track";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Back, Check } from "@/lib/ui";
import { DOMAIN, cleanHandle, handleOk, loadProfile, saveProfile, syncProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

const STEPS = [
  "Every order lands here, sorted by store.",
  "A heads up before any return window closes.",
  "Every email still reaches your inbox.",
];

export default function Claim() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [free, setFree] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const [wasTaken, setWasTaken] = useState(false);
  useEffect(() => {
    setName(loadProfile().handle);
    setWasTaken(location.search.includes("taken"));
    input.current?.focus();
  }, []);

  // Check the name a moment after she stops typing.
  useEffect(() => {
    if (!handleOk(name) || name in free) return;
    const t = setTimeout(async () => {
      const { data } = await supabase().rpc("handle_available", { name });
      setFree(f => ({ ...f, [name]: data !== false }));
    }, 300);
    return () => clearTimeout(t);
  }, [name, free]);

  const ok = handleOk(name) && free[name] === true;
  const taken = handleOk(name) && free[name] === false;
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    saveProfile({ handle: name });
    const { data } = await supabase().auth.getSession();
    if (data.session) {
      const res = await syncProfile();
      setBusy(false);
      if (res === "taken") return setFree(f => ({ ...f, [name]: false }));
    }
    track("claimed");
    router.push("/goal");
  };

  return (
    <main className="screen">
      <Back href="/" />
      <h1 className="h1">Choose your shopping <em>email.</em></h1>
      <p className="lead">Type it instead of your regular email when you check out online.</p>

      <label htmlFor="nm" style={{ marginTop: 28, background: "var(--chip)", borderRadius: 24, padding: "18px 18px 16px", display: "block", cursor: "text" }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Your shopping email</span>
        <span style={{ display: "flex", alignItems: "center", marginTop: 8, fontSize: 20, fontWeight: 700 }}>
          <input
            id="nm" ref={input} value={name} placeholder="yourname" autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={e => setName(cleanHandle(e.target.value))}
            onKeyDown={e => e.key === "Enter" && go()}
            style={{ border: 0, outline: 0, font: "inherit", width: `${Math.max(name.length, 8) + 0.5}ch`, maxWidth: 190, background: "transparent", color: "var(--ink)", padding: 0 }}
          />
          <span style={{ color: "#9A938B" }}>@{DOMAIN}</span>
        </span>
      </label>

      {wasTaken && !name && <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "#C9402F" }}>Someone grabbed that name first. Pick another.</div>}
      <div style={{ minHeight: 22, marginTop: 12 }}>
        {ok && (
          <div key={name} className="ok" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#2F7A4F" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#DCEFDF", display: "flex", alignItems: "center", justifyContent: "center" }}><Check /></span>
            {name}@ is available
          </div>
        )}
        {taken && <div style={{ fontSize: 14, fontWeight: 700, color: "#C9402F" }}>{name}@ is taken. Try another.</div>}
        {!handleOk(name) && name.length > 0 && (
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Use 3 or more letters or numbers.</div>
        )}
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15, lineHeight: 1.35 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#FFE1DC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flex: "none" }}>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn" disabled={!ok} onClick={go}>
        {busy ? "One sec" : ok ? `Get ${name}@${DOMAIN}` : "Pick a name first"}
      </button>
      <div className="note">You&apos;ll sign in with Google once, a couple of steps from now.</div>
    </main>
  );
}
