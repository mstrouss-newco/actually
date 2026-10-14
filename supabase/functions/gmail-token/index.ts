// Keeps Gmail working past Google's one-hour pass. Right after sign-in the browser hands over
// Google's refresh token ({ save }); later it asks for a fresh pass ({}). { forget } drops it,
// { status } says whether one is saved.
// GET answers whether it is set up, without saying anything else.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const ID = Deno.env.get("GOOGLE_CLIENT_ID"), SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "GET") return json({ ready: !!(ID && SECRET) });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  const uid = auth.user.id;
  const body = await req.json().catch(() => ({}));

  if (typeof body.save === "string" && body.save.length > 10) {
    await admin.from("gmail_tokens").upsert({ user_id: uid, refresh_token: body.save, updated_at: new Date().toISOString() });
    return json({ saved: true });
  }
  if (body.status) {
    const { data: row } = await admin.from("gmail_tokens").select("user_id").eq("user_id", uid).maybeSingle();
    return json({ connected: !!row });
  }
  if (body.forget) {
    const { data: row } = await admin.from("gmail_tokens").select("refresh_token").eq("user_id", uid).maybeSingle();
    if (row) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: "POST" }).catch(() => null);
    await admin.from("gmail_tokens").delete().eq("user_id", uid);
    return json({ forgotten: true });
  }

  if (!ID || !SECRET) return json({ error: "not set up" }, 503);
  const { data: row } = await admin.from("gmail_tokens").select("refresh_token").eq("user_id", uid).maybeSingle();
  if (!row) return json({ error: "no token" }, 404);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: ID, client_secret: SECRET, refresh_token: row.refresh_token, grant_type: "refresh_token" }),
  });
  const t = await r.json().catch(() => ({}));
  // Google says the token is no good (she removed access): forget it so the app asks to reconnect.
  if (!r.ok || !t.access_token) {
    if (t.error === "invalid_grant") await admin.from("gmail_tokens").delete().eq("user_id", uid);
    return json({ error: "refresh failed" }, 401);
  }
  return json({ token: t.access_token, expires_in: t.expires_in ?? 3600 });
});
