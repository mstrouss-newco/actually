"use client";

import { useEffect, useState } from "react";
import { PhotoPicker } from "@/lib/feed-ui";
import Link from "next/link";
import { BackLink } from "@/lib/nav";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DOMAIN } from "@/lib/profile";
import { clearData, deleteAccount, disconnectGmail, signOut } from "@/lib/account";
import { TabBar } from "@/lib/tabs";
import { type BrandFollow, loadFollows, unfollowBrand } from "@/lib/brands";
import { signIn } from "@/lib/signin";

type Ask = "gmail" | "data" | "account" | null;
const COPY: Record<Exclude<Ask, null>, [string, string, string]> = {
  gmail: ["Disconnect Gmail?", "Actually stops reading your email. What's already here stays. You can connect again any time.", "Disconnect"],
  data: ["Delete your orders and closet?", "Orders, closet, points and hidden stores are deleted. Your account and shopping email stay, so you can bring everything in again.", "Delete my data"],
  account: ["Delete your account?", "Your account, shopping email name and everything in Actually are deleted for good. Your Gmail isn't touched.", "Delete everything"],
};

export default function Settings() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; handle: string | null } | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [follows, setFollows] = useState<BrandFollow[] | null>(null);
  useEffect(() => { loadFollows().then(setFollows); }, []);
  const [gmail, setGmail] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data } = await sb.auth.getSession();
      if (!data.session) return router.replace("/login");
      const { data: p } = await sb.from("profiles").select("handle").eq("id", data.session.user.id).maybeSingle();
      setMe({ email: data.session.user.email ?? "", handle: (p?.handle as string | null) ?? null });
      const { data: g } = await sb.functions.invoke("gmail-token", { body: { status: true } });
      setGmail(!!g?.connected);
    })();
  }, [router]);

  const run = async () => {
    if (!ask) return;
    setBusy(true);
    if (ask === "gmail") { await disconnectGmail(); setGmail(false); setNote("Gmail disconnected."); }
    if (ask === "data") setNote((await clearData()) ? "Your orders and closet are deleted." : "That didn't work. Try again in a minute.");
    if (ask === "account") {
      if (await deleteAccount()) return router.replace("/");
      setNote("That didn't work. Try again in a minute.");
    }
    setBusy(false);
    setAsk(null);
  };

  const row = (label: string, sub: string, onClick: () => void, red = false) => (
    <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", border: "1.5px solid var(--line)", background: "#fff", borderRadius: 20, padding: "14px 16px", font: "inherit", color: red ? "#C9402F" : "var(--ink)", cursor: "pointer" }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );
  const head = (t: string) => <div className="kicker" style={{ padding: "22px 20px 8px" }}>{t}</div>;

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <BackLink fallback="/today" />
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>Settings</h1>
          {me?.handle && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <PhotoPicker handle={me.handle} size={56} />
              <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.4 }}>Tap to add or change your photo.<br />Friends see it on your feed.</div>
            </div>
          )}
          {me && <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Signed in as {me.email}{me.handle ? <><br />Shopping email: {me.handle}@{DOMAIN}</> : null}</div>}
        </div>

        {note && <div style={{ margin: "16px 16px 0", background: "#DCEFDF", borderRadius: 16, padding: "10px 14px", fontSize: 14 }}>{note}</div>}

        <div id="brands" style={{ margin: "18px 16px 0", background: "#FAF8F6", borderRadius: 22, padding: "14px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Brands you follow</div>
          {follows !== null && follows.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>None yet. <Link href="/follow?from=settings" style={{ fontWeight: 700 }}>Pick your brands</Link></div>}
          {follows?.map(f => (
            <div key={f.brand} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 6 }}>
              <Link href={`/brand/${encodeURIComponent(f.brand)}`} style={{ flex: 1, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>{f.brand}</Link>
              <button type="button" onClick={async () => { setFollows(l => (l ?? []).filter(x => x.brand !== f.brand)); await unfollowBrand(f.brand); }} style={{ border: 0, background: "none", font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>Unfollow</button>
            </div>
          ))}
          {!!follows?.length && <Link href="/follow?from=settings" style={{ display: "inline-block", marginTop: 8, fontSize: 13, fontWeight: 700 }}>Follow more brands</Link>}
        </div>

        {ask ? (
          <div style={{ margin: "18px 16px 0", background: "#FFE1DC", borderRadius: 22, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{COPY[ask][0]}</div>
            <div style={{ fontSize: 13, color: "#6B4A44", marginTop: 4, lineHeight: 1.4 }}>{COPY[ask][1]}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-line" disabled={busy} style={{ marginTop: 0, height: 44, fontSize: 14 }} onClick={() => setAsk(null)}>Cancel</button>
              <button className="btn" disabled={busy} style={{ height: 44, fontSize: 14, background: "#C9402F" }} onClick={run}>{busy ? "Working…" : COPY[ask][2]}</button>
            </div>
          </div>
        ) : (
          <>
            {head("Gmail")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
              {gmail === false && row("Connect Gmail", "Lets Actually keep finding orders and points without asking again.", () => signIn("/settings", true))}
              {row("Look for new orders", "Checks your Gmail for anything new.", () => router.push("/import?from=settings"))}
              {gmail && row("Disconnect Gmail", "Connected. Tap to stop Actually from reading your email.", () => setAsk("gmail"))}
            </div>
            {head("Your data")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
              {row("Delete my orders and closet", "Start fresh: orders, closet, points, saved hearts and outfits. Keeps your account and shopping email.", () => setAsk("data"), true)}
            </div>
            {head("Legal")}
            <Link href="/legal" style={{ margin: "0 16px", display: "flex", alignItems: "center", background: "#FAF8F6", borderRadius: 16, padding: "14px 16px", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
              <span style={{ flex: 1 }}>Privacy, terms and your data</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
            {head("Account")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
              {row("Sign out", "On this device.", async () => { await signOut(); router.replace("/"); })}
              {row("Delete my account", "Deletes your account and everything in Actually.", () => setAsk("account"), true)}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </main>
  );
}
