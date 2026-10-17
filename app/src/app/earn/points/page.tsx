"use client";

import { useCallback, useEffect, useState } from "react";
import { BackLink } from "@/lib/nav";
import { KIND, type Reward, addPoints, daysUntil, fmtDay, loadRewards, money, programName, removeReward, scanRewards } from "@/lib/earn";
import { Job } from "@/lib/read-items";
import { StoreTile, TabBar } from "@/lib/tabs";
import { delay } from "@/lib/motion";

export default function Points() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const load = useCallback(() => { loadRewards().then(setRewards); }, []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", points: "", value: "", expires: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const pts = form.points ? Math.round(Number(form.points.replace(/,/g, ""))) : null;
    const val = form.value ? Number(form.value.replace(/[$,]/g, "")) : null;
    if (!form.name.trim() || (pts == null && val == null) || Number.isNaN(pts) || Number.isNaN(val)) return;
    setSaving(true);
    if (await addPoints(form.name, pts, val, form.expires || null)) { setForm({ name: "", points: "", value: "", expires: "" }); setAdding(false); load(); }
    setSaving(false);
  };
  const field = { height: 44, borderRadius: 14, border: "1.5px solid var(--line)", padding: "0 12px", font: "15px var(--font-sans), sans-serif", width: "100%", boxSizing: "border-box" as const, background: "#fff" };
  useEffect(load, [load]);

  const list = rewards ?? [];
  const cash = list.reduce((s, r) => s + (r.value ?? 0), 0);
  // Points from different programs can't be added up.
  const programs = list.filter(r => !r.value && r.points).length;
  const expiring = list.filter(r => r.expires_on && daysUntil(r.expires_on) <= 30).reduce((s, r) => s + (r.value ?? 0), 0);

  return (
    <main className="tabscreen">
      <div className="scroll">
        <div style={{ padding: "0 20px" }}>
          <BackLink fallback="/earn" />
          <h1 className="serif" style={{ fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", margin: "18px 0 0" }}>Points and credit</h1>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Store points, miles, card points and credit, found in your email.</div>
        </div>

        {list.length > 0 && (
          <div style={{ margin: "18px 16px 0", background: "var(--ink)", color: "#fff", borderRadius: 26, padding: "20px 18px" }}>
            <div className="kicker" style={{ color: "#C9C3BC" }}>{cash ? "Ready to use" : "Points in"}</div>
            <div className="serif" style={{ fontSize: cash ? 52 : 40, lineHeight: 1.05, marginTop: 6 }}>{cash ? money(cash) : `${programs} points ${programs === 1 ? "program" : "programs"}`}</div>
            {cash > 0 && programs > 0 && <div style={{ fontSize: 14, color: "#C9C3BC", marginTop: 6 }}>Plus points in {programs} {programs === 1 ? "program" : "programs"}.</div>}
            {expiring > 0 && <div style={{ fontSize: 14, color: "#FFB4AB", marginTop: 6 }}>{money(expiring)} of it expires in the next 30 days.</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 0" }}>
          {rewards !== null && list.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14, padding: 4 }}>No balances found yet.</div>}
          {list.map((r, n) => {
            const left = r.expires_on ? daysUntil(r.expires_on) : null;
            return (
              <div key={`${r.store}|${r.kind}`} className="up" style={{ ...delay(n), display: "flex", alignItems: "center", gap: 12, background: "#FAF8F6", borderRadius: 22, padding: "12px 14px 12px 12px" }}>
                <StoreTile store={r.store} domain={r.store_domain} w={46} h={46} radius={14} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{programName(r.store)}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)" }}>
                    {r.points != null ? `${r.points.toLocaleString("en-US")} points` : KIND[r.kind]}
                    {r.expires_on ? ` · gone after ${fmtDay(r.expires_on)}` : " · no expiry found"}
                  </div>
                  {r.store_domain && <a href={`https://www.${r.store_domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700 }}>Use at {programName(r.store)} →</a>}
                  {r.gmail_id.startsWith("manual:") && <button type="button" onClick={async () => { await removeReward(r.gmail_id); load(); }} style={{ border: 0, background: "none", padding: 0, font: "700 13px var(--font-sans), sans-serif", color: "var(--muted)", cursor: "pointer" }}>Added by you · Remove</button>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {r.value != null && <div className="serif" style={{ fontSize: 22 }}>{money(r.value)}</div>}
                  {left != null && left <= 30 && <div style={{ background: "#FF6159", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 700, marginTop: 4 }}>{left}d left</div>}
                </div>
              </div>
            );
          })}
        </div>

        {rewards !== null && (
          <div style={{ padding: "14px 16px 0" }}>
            {!adding ? (
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)} style={{ height: 46, fontSize: 15, border: "1.5px solid var(--line)" }}>+ Add points yourself</button>
            ) : (
              <div className="up" style={{ background: "#FAF8F6", borderRadius: 22, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Add points</div>
                <input aria-label="Program" placeholder="Program (Delta SkyMiles, Chase, Sephora)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={field} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input aria-label="Points" inputMode="numeric" placeholder="Points or miles" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} style={field} />
                  <input aria-label="Dollar value" inputMode="decimal" placeholder="$ value (optional)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} style={field} />
                </div>
                <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Expires (optional)
                  <input type="date" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} style={{ ...field, marginTop: 4 }} />
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn" disabled={saving || !form.name.trim() || (!form.points && !form.value)} onClick={save} style={{ height: 46, fontSize: 15 }}>{saving ? "Saving" : "Save"}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)} style={{ height: 46, fontSize: 15, width: 120 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
        {rewards !== null && (
          <div style={{ padding: "12px 16px 0" }}>
            <Job run={scanRewards} label="Check for new points" working="Checking email" noun={["new balance", "new balances"]} onDone={load} />
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--muted)", padding: "14px 20px 0", lineHeight: 1.45 }}>Balances come from the latest email each program sent. From card companies we only read rewards emails, never statements or payments. Check the store&apos;s site or app to be sure before you spend.</div>
      </div>
      <TabBar />
    </main>
  );
}
