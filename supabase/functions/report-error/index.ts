// Saves an error someone hit in the app and emails the owners, at most once an hour.
// No login needed (errors happen before sign-in too). Capped so it can't be flooded.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { Resend } from "npm:resend@6.32.1";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const DOMAIN = Deno.env.get("SHOPPING_DOMAIN") ?? "shop.myocto.co";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "post only" }, 405);
  const body = await req.json().catch(() => ({}));
  const message = cut(body.message, 500);
  if (!message) return json({ error: "bad request" }, 400);

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  if ((count ?? 0) >= 300) return json({ saved: false });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = token.split(".").length === 3 ? await admin.auth.getUser(token) : { data: { user: null } };
  const page = cut(body.page, 200);
  const { data: row } = await admin.from("app_errors").insert({
    user_id: auth.user?.id ?? null, page, message, stack: cut(body.stack, 4000), ua: cut(req.headers.get("user-agent"), 300),
  }).select("id").single();

  // One email an hour at most, so a bad deploy doesn't flood the inbox.
  const { count: sent } = await admin.from("app_errors").select("id", { count: "exact", head: true }).eq("emailed", true).gte("created_at", hourAgo);
  if (row && !sent) {
    const { data: owners } = await admin.from("admins").select("email");
    const to = (owners ?? []).map(o => o.email).filter(Boolean);
    if (to.length) {
      const { error } = await resend.emails.send({
        from: `Actually alerts <alerts@${DOMAIN}>`, to,
        subject: `Actually: something broke on ${page ?? "the app"}`,
        html: `<p>Someone hit an error in Actually.</p><p><b>Where:</b> ${esc(page ?? "unknown")}<br><b>What:</b> ${esc(message)}<br><b>Errors in the last hour:</b> ${(count ?? 0) + 1}</p><p>See them all on the <a href="https://actually-app.vercel.app/admin">owner dashboard</a>. You'll get at most one of these an hour.</p>`,
      }).catch(e => ({ error: e }));
      if (!error) await admin.from("app_errors").update({ emailed: true }).eq("id", row.id);
    }
  }
  return json({ saved: true });
});
