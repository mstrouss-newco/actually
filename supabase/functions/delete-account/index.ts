// Deletes her data. "data" clears orders, closet, points, blocked stores, followed brands, saved hearts and outfits so she can start
// fresh. "account" deletes the account itself, her photo and cut-outs; every table goes with it.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const { data: auth } = await admin.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
  if (!auth.user) return json({ error: "signed out" }, 401);
  const uid = auth.user.id;
  const { mode } = await req.json().catch(() => ({}));
  // Her cut-out photos (public files named by piece) go in both modes.
  const dropCutouts = async () => {
    const { data: its } = await admin.from("items").select("id").eq("user_id", uid).limit(10000);
    const names = (its ?? []).map(i => `${i.id}.png`);
    for (let n = 0; n < names.length; n += 100) await admin.storage.from("cutouts").remove(names.slice(n, n + 100));
  };

  if (mode === "account") {
    // Her profile photo goes too.
    const { data: me } = await admin.from("profiles").select("handle").eq("id", uid).maybeSingle();
    if (me?.handle) await admin.storage.from("avatars").remove([`${me.handle}.jpg`]);
    await dropCutouts();
    const { error } = await admin.auth.admin.deleteUser(uid);
    return error ? json({ error: "failed" }, 500) : json({ deleted: true });
  }
  if (mode === "data") {
    await dropCutouts();
    for (const t of ["items", "orders", "rewards", "blocked_stores", "brand_follows", "loves", "outfits"]) {
      const { error } = await admin.from(t).delete().eq("user_id", uid);
      if (error) return json({ error: "failed" }, 500);
    }
    await admin.from("profiles").update({ last_import_at: null, brands_asked_at: null }).eq("id", uid);
    return json({ cleared: true });
  }
  return json({ error: "bad request" }, 400);
});
