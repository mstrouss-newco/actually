// Owner tool: delete someone's account the same clean way Settings does, and log it.
// Only emails listed in the admins table can use it.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  const me = auth.user?.email?.toLowerCase();
  if (!me) return json({ error: "signed out" }, 401);
  const { data: ok } = await admin.from("admins").select("email").eq("email", me).maybeSingle();
  if (!ok) return json({ error: "not allowed" }, 403);

  const { user_id } = await req.json().catch(() => ({}));
  if (typeof user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(user_id)) return json({ error: "bad request" }, 400);
  if (user_id === auth.user!.id) return json({ error: "use Settings to delete your own account" }, 400);
  const { data: target } = await admin.auth.admin.getUserById(user_id);
  if (!target?.user) return json({ error: "not found" }, 404);

  // Public files first: profile photo and cut-outs.
  const { data: p } = await admin.from("profiles").select("handle").eq("id", user_id).maybeSingle();
  if (p?.handle) await admin.storage.from("avatars").remove([`${p.handle}.jpg`]);
  const { data: its } = await admin.from("items").select("id").eq("user_id", user_id).limit(10000);
  const names = (its ?? []).map(i => `${i.id}.png`);
  for (let n = 0; n < names.length; n += 100) await admin.storage.from("cutouts").remove(names.slice(n, n + 100));

  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return json({ error: "failed" }, 500);
  await admin.from("admin_log").insert({ by_email: me, action: "deleted account", target: p?.handle ?? target.user.email ?? user_id });
  return json({ deleted: true });
});
