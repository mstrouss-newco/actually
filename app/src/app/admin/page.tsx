"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { signIn } from "@/lib/signin";

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
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never");

// Pieces of the page. Kept outside the page so typing in a box never resets it.
const Kpi = ({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) => (
  <div className="adm-card" style={{ padding: "16px 18px" }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>{label}</div>
    <div className="serif" style={{ fontSize: 42, lineHeight: 1, marginTop: 8, color: warn ? "#C9402F" : "var(--ink)" }}>{typeof value === "number" ? value.toLocaleString("en-US") : value}</div>
    {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{sub}</div>}
  </div>
);

const Mini = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div style={{ background: "#FAF8F6", borderRadius: 16, padding: "12px 14px", minWidth: 0 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{label}</div>
    <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 4 }}>{typeof value === "number" ? value.toLocaleString("en-US") : value}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Card = ({ id, t, children, right }: { id?: string; t: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section id={id} className="adm-card" style={{ padding: "20px 22px", minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}><div className="serif" style={{ fontSize: 24 }}>{t}</div>{right}</div>
    {children}
  </section>
);

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

  if (ok === null) return <div className="adm"><p className="lead" style={{ padding: 40 }}>Loading…</p></div>;
  if (!ok) return (
    <div className="adm" style={{ display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="logo">Actually</div>
        <p className="lead">Not found.</p>
        <button type="button" onClick={() => signIn("/admin")} className="btn" style={{ marginTop: 16, width: 220 }}>Sign in</button>
      </div>
    </div>
  );

  const aiCost = s ? s.ai_30d.emails_screened * COST_SCREEN + s.ai_30d.orders_read * COST_READ : 0;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthly = (s?.expenses ?? []).filter(e => e.monthly || e.month.startsWith(thisMonth)).reduce((t, e) => t + Number(e.amount), 0);
  const top = Math.max(1, ...(s?.funnel ?? []).map(f => f.n));
  const wk = Math.max(1, ...(s?.weekly ?? []).map(w => Math.max(w.signups, w.shares, w.loves, w.outfits)));


  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  const field = { height: 40, borderRadius: 12, border: "1.5px solid var(--line)", padding: "0 12px", font: "14px var(--font-sans), sans-serif", minWidth: 0, boxSizing: "border-box" as const };
  const NAV = [["#overview", "Overview"], ["#people", "People"], ["#feed", "Feed activity"], ["#money", "Money"], ["#errors", "Errors"], ["#log", "Owner log"]];

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="logo" style={{ fontSize: 22 }}>Actually</div>
        <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 24px" }}>Owner dashboard</div>
        {NAV.map(([h, l]) => <a key={h} href={h} className="adm-nav">{l}</a>)}
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="adm-nav" style={{ marginTop: 16 }}>Traffic (Vercel)</a>
        <Link href="/today" className="adm-nav">Open the app</Link>
      </aside>
      <main className="adm-main">
        <div id="overview" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div><div className="serif" style={{ fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1 }}>Overview</div><div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Live from the app</div></div>
          <button type="button" onClick={() => { load(); find(q); }} className="press" style={{ height: 40, padding: "0 16px", borderRadius: 999, border: "1.5px solid var(--line)", background: "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>Refresh</button>
        </div>
        {note && <div role="status" style={{ marginBottom: 16, background: "#DCEFDF", borderRadius: 14, padding: "10px 14px", fontSize: 14 }}>{note}</div>}
        {!s && <p className="lead">Loading…</p>}
        {s && (
          <>
            <div className="adm-kpis">
              <Kpi label="People" value={s.users} sub={`+${s.users_7d} this week`} />
              <Kpi label="Gmail connected" value={s.gmail} sub={`${pct(s.gmail, s.users)} of people`} />
              <Kpi label="Closets filled" value={s.imported} sub={`${pct(s.imported, s.gmail)} of connected`} />
              <Kpi label="Active, 7 days" value={s.active_7d} sub={`${s.open_7d} opened the app · ${s.active_30d} in 30 days`} />
              <Kpi label="Errors" value={errs.length} sub={errs[0] ? `Last: ${errs[0].page ?? "unknown"}` : "None"} warn={errs.length > 0} />
            </div>

            <div className="adm-two">
              <Card t="Sign-up funnel">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {s.funnel.map((f, n) => {
                    const prev = n ? s.funnel[n - 1].n : 0;
                    return (
                      <div key={f.step} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13.5 }}>
                        <span style={{ width: 140, flex: "none" }}>{f.step === "Picked a name" ? "Tapped Gmail" : f.step}</span>
                        <div style={{ flex: 1, height: 20, background: "#F3F0EB", borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${(f.n / top) * 100}%`, height: "100%", background: "var(--ink)", borderRadius: 6 }} /></div>
                        <span style={{ width: 80, textAlign: "right", fontWeight: 700 }}>{f.n}{n > 0 && prev > 0 ? <span style={{ color: "var(--muted)", fontWeight: 500 }}> {pct(f.n, prev)}</span> : null}</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>The first two steps started counting on Oct 16.</div>
                </div>
              </Card>
              <Card t="Each week">
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.weekly.length}, minmax(0, 1fr))`, gap: 8, alignItems: "end", height: 180 }}>
                  {s.weekly.map(w => (
                    <div key={w.week} style={{ display: "flex", gap: 3, alignItems: "end", height: "100%" }} title={`${w.week}: ${w.signups} sign-ups, ${w.shares} shares, ${w.loves} hearts, ${w.outfits} outfits`}>
                      {[["#141210", w.signups], ["#FF6159", w.shares], ["#7BB08C", w.loves], ["#9C8CE0", w.outfits]].map(([c, v], k) => (
                        <div key={k} style={{ flex: 1, height: `${(Number(v) / wk) * 100}%`, minHeight: Number(v) ? 3 : 0, background: String(c), borderRadius: "3px 3px 0 0" }} />
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.weekly.length}, minmax(0, 1fr))`, gap: 8, fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                  {s.weekly.map(w => <div key={w.week} style={{ whiteSpace: "nowrap", overflow: "hidden", textAlign: "center" }}>{w.week}</div>)}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--soft)", marginTop: 10 }}>
                  {[["#141210", "Sign-ups"], ["#FF6159", "Shares"], ["#7BB08C", "Hearts"], ["#9C8CE0", "Outfits"]].map(([c, l]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>)}
                </div>
              </Card>
            </div>

            <div className="adm-wide">
              <Card id="people" t="People" right={<input placeholder="Search by email or name" value={q} onChange={e => setQ(e.target.value)} style={{ ...field, width: 280 }} />}>
                <div style={{ overflowX: "auto" }}>
                  <table className="adm-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Last seen</th><th>Gmail</th><th>Emails</th><th>Pieces</th><th>Shared</th><th /></tr></thead>
                    <tbody>
                      {people.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.handle ?? "No name yet"}</td><td style={{ color: "var(--soft)" }}>{p.email}</td><td>{day(p.joined)}</td><td>{day(p.last_seen)}</td>
                          <td>{p.gmail ? "Yes" : "No"}</td><td>{p.orders}</td><td>{p.pieces}</td><td>{p.shared}</td>
                          <td style={{ textAlign: "right" }}><button type="button" onClick={() => remove(p)} style={{ height: 30, padding: "0 12px", borderRadius: 999, border: "1.5px solid #C9402F", background: sure === p.id ? "#C9402F" : "#fff", color: sure === p.id ? "#fff" : "#C9402F", font: "700 12px var(--font-sans), sans-serif", cursor: "pointer" }}>{sure === p.id ? "Click again" : "Delete"}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!people.length && <div style={{ fontSize: 14, color: "var(--muted)", padding: "10px 0" }}>No one matches.</div>}
                </div>
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
                <Card id="money" t="Money, this month">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <Mini label="Revenue" value={usd(0)} sub="Cash back not live yet" />
                    <Mini label="Expenses" value={usd(monthly)} sub={`${s.expenses.length} line${s.expenses.length === 1 ? "" : "s"}`} />
                    <Mini label="AI, 30 days" value={usd(aiCost)} sub={`estimate, of ${usd(AI_CAP)} cap`} />
                    <Mini label="AI per user" value={usd(s.imported ? aiCost / s.imported : 0)} sub={`${s.ai_30d.emails_screened} emails screened`} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                    {s.expenses.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, background: "#FAF8F6", borderRadius: 12, padding: "8px 12px" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{e.vendor}<span style={{ color: "var(--muted)" }}> · {e.monthly ? "monthly" : new Date(e.month + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></span>
                        <b>{usd(Number(e.amount))}</b>
                        <button type="button" onClick={() => dropExpense(e.id)} aria-label={`Remove ${e.vendor}`} style={{ border: 0, background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12.5 }}>Remove</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      <input placeholder="Vendor, like Vercel" value={exp.vendor} onChange={e => setExp({ ...exp, vendor: e.target.value })} style={{ ...field, flex: "2 1 130px" }} />
                      <input placeholder="$" inputMode="decimal" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value.replace(/[^0-9.]/g, "") })} style={{ ...field, flex: "1 1 60px" }} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={exp.monthly} onChange={e => setExp({ ...exp, monthly: e.target.checked })} />Monthly</label>
                      <button type="button" onClick={addExpense} className="press" style={{ height: 40, padding: "0 16px", borderRadius: 999, border: 0, background: "var(--ink)", color: "#fff", font: "700 14px var(--font-sans), sans-serif", cursor: "pointer" }}>Add</button>
                    </div>
                  </div>
                </Card>
                <Card id="errors" t="Errors" right={errs.length > 0 ? <button type="button" onClick={clearErrors} style={{ border: 0, background: "none", font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>Clear all</button> : undefined}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    {!errs.length && <div style={{ color: "var(--muted)" }}>No errors. You get an email (at most one an hour) when someone hits one.</div>}
                    {errs.map(e => (
                      <div key={e.id} style={{ background: "#FAF8F6", borderRadius: 12, padding: "8px 12px" }}>
                        <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{day(e.created_at)} · {e.page ?? "unknown page"}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div className="adm-two">
              <Card id="feed" t="Feed activity">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  <Mini label="Pieces shared" value={s.shared} sub={`by ${s.sharers} ${s.sharers === 1 ? "person" : "people"}`} />
                  <Mini label="Hearts" value={s.loves} />
                  <Mini label="Outfits" value={s.outfits} sub={`${s.outfits_shared} shared`} />
                  <Mini label="Follows" value={s.follows} sub={`${s.brand_follows} brand follows`} />
                </div>
                {s.top_brands.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: "var(--soft)" }}>Most loved brands: {s.top_brands.map(b => `${b.brand} (${b.loves})`).join(", ")}</div>}
              </Card>
              <Card id="log" t="Owner log">
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--soft)" }}>
                  {!s.log.length && <div style={{ color: "var(--muted)" }}>Nothing yet.</div>}
                  {s.log.map((g, n) => <div key={n}>{day(g.at)}: {g.by_email} {g.action}{g.target ? ` (${g.target})` : ""}</div>)}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
