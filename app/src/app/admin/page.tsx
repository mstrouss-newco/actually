"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Owner dashboard. Only emails in the admins table see anything; everyone else gets "Not found".
type Stats = {
  users: number; users_7d: number; gmail: number; imported: number; active_7d: number; active_30d: number; open_7d: number;
  orders: number; items: number; shared: number; sharers: number; loves: number; outfits: number; outfits_shared: number; follows: number; brand_follows: number;
  funnel: { step: string; n: number }[];
  weekly: { week: string; signups: number; shares: number; loves: number; outfits: number; emails_read: number }[];
  top_brands: { brand: string; loves: number }[];
  ai_30d: { emails_screened: number; orders_read: number; cutouts: number };
  expenses: { id: string; month: string; vendor: string; amount: number; monthly: boolean; note: string | null }[];
  log: { at: string; by_email: string; action: string; target: string | null }[];
};
type Person = { id: string; email: string; handle: string | null; joined: string; last_seen: string | null; gmail: boolean; orders: number; pieces: number; shared: number };

// Rough AI cost per email, from the model's prices and our prompt sizes. Good enough to watch the trend.
const COST_SCREEN = 0.0004, COST_READ = 0.004;
const AI_CAP = 25;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n < 10 && n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never");

export default function Admin() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [s, setS] = useState<Stats | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [sure, setSure] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [exp, setExp] = useState({ vendor: "", amount: "", monthly: true });
  const [errs, setErrs] = useState<{ id: number; created_at: string; page: string | null; message: string }[]>([]);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: admin } = await sb.rpc("is_admin");
    setOk(!!admin);
    if (!admin) return;
    const [{ data }, { data: e }] = await Promise.all([
      sb.rpc("admin_stats"),
      sb.from("app_errors").select("id, created_at, page, message").order("created_at", { ascending: false }).limit(20),
    ]);
    setS(data as Stats);
    setErrs(e ?? []);
  }, []);
  const find = useCallback(async (text: string) => {
    const { data } = await supabase().rpc("admin_users", { q: text.trim() });
    setPeople((data ?? []) as Person[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (ok) { const t = setTimeout(() => find(q), 250); return () => clearTimeout(t); } }, [ok, q, find]);

  const remove = async (p: Person) => {
    if (sure !== p.id) { setSure(p.id); setTimeout(() => setSure(x => (x === p.id ? null : x)), 4000); return; }
    setSure(null);
    const { error } = await supabase().functions.invoke("admin-delete", { body: { user_id: p.id } });
    setNote(error ? `Couldn't delete ${p.handle ?? p.email}.` : `Deleted ${p.handle ?? p.email}.`);
    find(q); load();
  };
  const addExpense = async () => {
    const amount = Number(exp.amount);
    if (!exp.vendor.trim() || !(amount >= 0)) return;
    await supabase().from("expenses").insert({ vendor: exp.vendor.trim(), amount, monthly: exp.monthly });
    setExp({ vendor: "", amount: "", monthly: true });
    load();
  };
  const clearErrors = async () => { await supabase().from("app_errors").delete().gte("id", 0); load(); };
  const dropExpense = async (id: string) => { await supabase().from("expenses").delete().eq("id", id); load(); };

  if (ok === null) return <main className="tabscreen"><div className="scroll" style={{ padding: "0 20px" }}><p className="lead">Loading…</p></div></main>;
  if (!ok) return <main className="tabscreen"><div className="scroll" style={{ padding: "0 20px" }}><Link href="/today" className="back">← Today</Link><p className="lead">Not found.</p></div></main>;

  const aiCost = s ? s.ai_30d.emails_screened * COST_SCREEN + s.ai_30d.orders_read * COST_READ : 0;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthly = (s?.expenses ?? []).filter(e => e.monthly || e.month.startsWith(thisMonth)).reduce((t, e) => t + Number(e.amount), 0);
  const top = Math.max(1, ...(s?.funnel ?? []).map(f => f.n));
  const wk = Math.max(1, ...(s?.weekly ?? []).map(w => Math.max(w.signups, w.shares, w.loves, w.outfits)));

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div style={{ background: "#FAF8F6", borderRadius: 18, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{label}</div>
      <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const Head = ({ t }: { t: string }) => <div className="kicker" style={{ padding: "24px 20px 10px" }}>{t}</div>;
  const grid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, padding: "0 16px" } as const;
  const field = { height: 42, borderRadius: 12, border: "1.5px solid var(--line)", padding: "0 12px", font: "15px var(--font-sans), sans-serif", minWidth: 0, boxSizing: "border-box" as const };

  return (
    <main className="tabscreen" style={{ paddingBottom: 0 }}>
      <div className="scroll" style={{ paddingBottom: 60 }}>
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/settings" className="back">← Settings</Link>
          <button type="button" onClick={() => { load(); find(q); }} style={{ border: 0, background: "none", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>Refresh</button>
        </div>
        <h1 className="serif" style={{ fontWeight: 400, fontSize: 34, margin: "10px 20px 0", letterSpacing: "-0.02em" }}>Owner</h1>
        {note && <div role="status" style={{ margin: "12px 16px 0", background: "#DCEFDF", borderRadius: 14, padding: "10px 14px", fontSize: 14 }}>{note}</div>}
        {!s && <p className="lead" style={{ padding: "0 20px" }}>Loading…</p>}

        {s && (
          <>
            <Head t="Users" />
            <div style={grid}>
              <Tile label="Signed up" value={s.users} sub={`${s.users_7d} this week`} />
              <Tile label="Connected Gmail" value={s.gmail} sub={`${s.users ? Math.round((s.gmail / s.users) * 100) : 0}% of sign-ups`} />
              <Tile label="Active, 7 days" value={s.active_7d} sub={`${s.open_7d} opened the app`} />
              <Tile label="Active, 30 days" value={s.active_30d} />
            </div>

            <Head t="Sign-up funnel" />
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {s.funnel.map((f, n) => {
                const prev = n ? s.funnel[n - 1].n : 0;
                return (
                  <div key={f.step}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                      <span>{f.step === "Picked a name" ? "Tapped Gmail" : f.step}</span>
                      <span>{f.n}{n > 0 && prev > 0 ? <span style={{ color: "var(--muted)", fontWeight: 500 }}> · {Math.round((f.n / prev) * 100)}%</span> : null}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "#EAE6E1", marginTop: 4 }}><div style={{ width: `${(f.n / top) * 100}%`, height: "100%", borderRadius: 4, background: "var(--ink)" }} /></div>
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>The first two steps started counting on Oct 16. Tapped Gmail counts from the new sign-up.</div>
            </div>

            <Head t="Feed activity" />
            <div style={grid}>
              <Tile label="Pieces shared" value={s.shared} sub={`by ${s.sharers} ${s.sharers === 1 ? "person" : "people"}`} />
              <Tile label="Hearts" value={s.loves} />
              <Tile label="Outfits" value={s.outfits} sub={`${s.outfits_shared} shared`} />
              <Tile label="Follows" value={s.follows} sub={`${s.brand_follows} brand follows`} />
            </div>
            {s.top_brands.length > 0 && (
              <div style={{ padding: "10px 20px 0", fontSize: 13, color: "var(--soft)" }}>Most loved brands: {s.top_brands.map(b => `${b.brand} (${b.loves})`).join(", ")}</div>
            )}

            <Head t="Last 8 weeks" />
            <div style={{ padding: "0 16px", overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.weekly.length}, minmax(34px, 1fr))`, gap: 6, alignItems: "end", height: 110 }}>
                {s.weekly.map(w => (
                  <div key={w.week} style={{ display: "flex", gap: 2, alignItems: "end", height: "100%" }} title={`${w.week}: ${w.signups} sign-ups, ${w.shares} shares, ${w.loves} hearts, ${w.outfits} outfits`}>
                    {[["#141210", w.signups], ["#FF6159", w.shares], ["#7BB08C", w.loves], ["#9C8CE0", w.outfits]].map(([c, v], k) => (
                      <div key={k} style={{ flex: 1, height: `${(Number(v) / wk) * 100}%`, minHeight: Number(v) ? 3 : 0, background: String(c), borderRadius: 2 }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.weekly.length}, minmax(34px, 1fr))`, gap: 6, fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                {s.weekly.map(w => <div key={w.week} style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{w.week}</div>)}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--soft)", marginTop: 8 }}>
                {[["#141210", "Sign-ups"], ["#FF6159", "Shares"], ["#7BB08C", "Hearts"], ["#9C8CE0", "Outfits"]].map(([c, l]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}</span>)}
              </div>
            </div>

            <Head t="Traffic" />
            <div style={{ padding: "0 20px", fontSize: 14, color: "var(--soft)", lineHeight: 1.5 }}>
              Visits and where people come from are in Vercel Analytics.{" "}
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "var(--ink)" }}>Open Vercel</a>
            </div>

            <Head t="Money, this month" />
            <div style={grid}>
              <Tile label="Revenue" value={usd(0)} sub="Cash back starts with Wildfire" />
              <Tile label="Expenses" value={usd(monthly)} sub={`${s.expenses.length} line${s.expenses.length === 1 ? "" : "s"}`} />
              <Tile label="AI, last 30 days" value={usd(aiCost)} sub={`estimate, of ${usd(AI_CAP)} cap`} />
              <Tile label="AI per user" value={usd(s.imported ? aiCost / s.imported : 0)} sub={`${s.ai_30d.emails_screened} emails, ${s.ai_30d.orders_read} orders read`} />
            </div>
            <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 6 }}>
              {s.expenses.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, background: "#FAF8F6", borderRadius: 12, padding: "8px 12px" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{e.vendor}<span style={{ color: "var(--muted)" }}> · {e.monthly ? "monthly" : new Date(e.month + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></span>
                  <b>{usd(Number(e.amount))}</b>
                  <button type="button" onClick={() => dropExpense(e.id)} aria-label={`Remove ${e.vendor}`} style={{ border: 0, background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>Remove</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <input placeholder="Vendor, like Vercel" value={exp.vendor} onChange={e => setExp({ ...exp, vendor: e.target.value })} style={{ ...field, flex: "2 1 140px" }} />
                <input placeholder="$" inputMode="decimal" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value.replace(/[^0-9.]/g, "") })} style={{ ...field, flex: "1 1 70px" }} />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={exp.monthly} onChange={e => setExp({ ...exp, monthly: e.target.checked })} />Monthly</label>
                <button type="button" onClick={addExpense} className="press" style={{ height: 42, padding: "0 16px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>Add</button>
              </div>
            </div>

            <Head t="People" />
            <div style={{ padding: "0 16px" }}>
              <input placeholder="Search by email or name" value={q} onChange={e => setQ(e.target.value)} style={{ ...field, width: "100%" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {people.map(p => (
                  <div key={p.id} style={{ background: "#FAF8F6", borderRadius: 16, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.handle ?? "No name yet"} <span style={{ fontWeight: 500, color: "var(--muted)" }}>{p.email}</span></div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Joined {day(p.joined)} · seen {day(p.last_seen)} · {p.gmail ? "Gmail on" : "no Gmail"} · {p.orders} emails · {p.pieces} pieces · {p.shared} shared</div>
                    </div>
                    <button type="button" onClick={() => remove(p)} style={{ flex: "none", height: 34, padding: "0 12px", borderRadius: 999, border: "1.5px solid #C9402F", background: sure === p.id ? "#C9402F" : "#fff", color: sure === p.id ? "#fff" : "#C9402F", font: "700 12px var(--font-sans), sans-serif", cursor: "pointer" }}>{sure === p.id ? "Tap again" : "Delete"}</button>
                  </div>
                ))}
                {!people.length && <div style={{ fontSize: 14, color: "var(--muted)" }}>No one matches.</div>}
              </div>
            </div>

            <Head t="Errors" />
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {!errs.length && <div style={{ color: "var(--muted)" }}>No errors. You get an email (at most one an hour) when someone hits one.</div>}
              {errs.map(e => (
                <div key={e.id} style={{ background: "#FAF8F6", borderRadius: 14, padding: "8px 12px" }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{day(e.created_at)} · {e.page ?? "unknown page"}</div>
                </div>
              ))}
              {errs.length > 0 && <button type="button" onClick={clearErrors} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>Clear all</button>}
            </div>

            {s.log.length > 0 && (
              <>
                <Head t="Owner log" />
                <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--soft)" }}>
                  {s.log.map((g, n) => <div key={n}>{day(g.at)}: {g.by_email} {g.action}{g.target ? ` (${g.target})` : ""}</div>)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
