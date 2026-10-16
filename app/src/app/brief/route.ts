import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { BRIEF_HTML } from "./brief-html";
import { BRIEF_HASH as HASH, BRIEF_COOKIE as COOKIE } from "./pass";

// The exec one-sheet at /brief, behind a password. Only a hash of the password is kept here.
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const gate = (error = false) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Actually: one sheet</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,600&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF8F6;color:#141210;font:15px 'DM Sans',system-ui,sans-serif}
form{display:flex;flex-direction:column;gap:10px;width:280px}.l{font:italic 600 28px Fraunces,serif;margin-bottom:8px}
input,button{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid #E2DDD7}
button{background:#141210;color:#fff;border:0;cursor:pointer;font-weight:700;border-radius:999px}p{margin:0;color:#C9402F;font-size:.9rem}</style></head>
<body><form method="post"><div class="l">Actually</div><label for="pw">Password</label><input id="pw" name="pw" type="password" autofocus>
${error ? "<p>Wrong password. Try again.</p>" : ""}<button type="submit">Open the one sheet</button></form></body></html>`;

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function GET() {
  const ok = (await cookies()).get(COOKIE)?.value === HASH.slice(0, 16);
  return html(ok ? BRIEF_HTML : gate());
}

export async function POST(req: Request) {
  const form = await req.formData();
  if (sha(String(form.get("pw") ?? "")) !== HASH) return html(gate(true));
  (await cookies()).set(COOKIE, HASH.slice(0, 16), { httpOnly: true, secure: true, sameSite: "lax", path: "/brief", maxAge: 60 * 60 * 24 * 30 });
  return new Response(null, { status: 303, headers: { location: "/brief" } });
}
