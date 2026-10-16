import { cookies } from "next/headers";
import { MODEL_HTML } from "./model-html";

// Owner-only model page at /model, behind a simple password.
const PASSWORD = "mike";
const COOKIE = "model_ok";

const gate = (error = false) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Actually Model</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5f2;color:#1c2230;font:15px system-ui,sans-serif}
form{display:flex;flex-direction:column;gap:10px;width:260px}input,button{font:inherit;padding:10px;border-radius:6px;border:1px solid #dfdcd5}
button{background:#1c2230;color:#fff;border:0;cursor:pointer}p{margin:0;color:#a8321f;font-size:.85rem}</style></head>
<body><form method="post"><label for="pw">Password</label><input id="pw" name="pw" type="password" autofocus>
${error ? "<p>Wrong password. Try again.</p>" : ""}<button type="submit">Open model</button></form></body></html>`;

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function GET() {
  const ok = (await cookies()).get(COOKIE)?.value === "1";
  return html(ok ? MODEL_HTML : gate());
}

export async function POST(req: Request) {
  const form = await req.formData();
  if (form.get("pw") !== PASSWORD) return html(gate(true));
  (await cookies()).set(COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/model", maxAge: 60 * 60 * 24 * 30 });
  return new Response(null, { status: 303, headers: { location: "/model" } });
}
