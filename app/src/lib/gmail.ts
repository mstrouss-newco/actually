// Reads shopping emails from Gmail in the browser, using the read-only access she granted.

export type Kind = "order" | "shipping" | "delivered" | "return" | "refund" | "receipt" | "other";
export type Order = {
  gmail_id: string; store: string; store_domain: string | null; subject: string;
  kind: Kind; order_no: string | null; amount: number | null; sent_at: string;
};

const API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const QUERY = '(category:purchases OR subject:(order OR receipt OR shipped OR delivered OR refund OR return)) -category:promotions -category:social -category:forums newer_than:3y';
const MAX = 1500;

// Senders that aren't stores.
const SKIP = /(paypal|venmo|chase|amex|americanexpress|bankofamerica|wellsfargo|capitalone|citi\.com|stripe|square|intuit|irs\.gov|doordash|ubereats|uber\.com|lyft|grubhub|instacart|apple\.com|google\.com|linkedin|github|netflix|spotify)/i;
const FREE_MAIL = /^(gmail|yahoo|outlook|hotmail|icloud|aol|me)\./i;

async function get<T>(url: string, token: string): Promise<T> {
  for (let tries = 0; ; tries++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r.json();
    if (r.status === 401) throw new Error("expired");
    if ((r.status === 429 || r.status >= 500) && tries < 4) { await new Promise(res => setTimeout(res, 500 * 2 ** tries)); continue; }
    throw new Error(`gmail ${r.status}`);
  }
}

export async function listIds(token: string): Promise<string[]> {
  const ids: string[] = [];
  let page = "";
  do {
    const q = new URLSearchParams({ q: QUERY, maxResults: "500", ...(page ? { pageToken: page } : {}) });
    const res = await get<{ messages?: { id: string }[]; nextPageToken?: string }>(`${API}?${q}`, token);
    ids.push(...(res.messages ?? []).map(m => m.id));
    page = res.nextPageToken ?? "";
  } while (page && ids.length < MAX);
  return ids.slice(0, MAX);
}

type Msg = { id: string; snippet?: string; internalDate: string; payload?: { headers?: { name: string; value: string }[] } };

export async function readOne(id: string, token: string): Promise<Order | null> {
  const q = "format=metadata&metadataHeaders=From&metadataHeaders=Subject";
  const m = await get<Msg>(`${API}/${id}?${q}`, token);
  const h = (n: string) => m.payload?.headers?.find(x => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  return parse(m.id, h("From"), h("Subject"), m.snippet ?? "", Number(m.internalDate));
}

export function parse(id: string, from: string, subject: string, snippet: string, ms: number): Order | null {
  const email = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  if (!domain || SKIP.test(domain) || FREE_MAIL.test(domain)) return null;

  const text = `${subject} ${snippet}`;
  const kind: Kind =
    /refund/i.test(text) ? "refund" :
    /return (label|request|started|received)|your return/i.test(text) ? "return" :
    /delivered|has arrived/i.test(subject) ? "delivered" :
    /shipped|on (its|the) way|out for delivery|tracking/i.test(subject) ? "shipping" :
    /receipt/i.test(subject) ? "receipt" :
    /order|purchase|thanks for shopping|thank you for shopping/i.test(subject) ? "order" : "other";
  if (kind === "other") return null;

  const order_no = [...text.matchAll(/(?:order|confirmation)\s*(?:number|no\.?|#)?\s*[:#]?\s*(?=[A-Z0-9-]*\d)([A-Z0-9][A-Z0-9-]{4,24})/gi)]
    .map(m => m[1]).find(v => /\d/.test(v)) ?? null;
  const money = text.match(/\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/);
  const amount = money ? Number(money[1].replace(/,/g, "")) : null;

  return {
    gmail_id: id, store: storeName(from, domain), store_domain: rootDomain(domain), subject: subject.slice(0, 300),
    kind, order_no: order_no?.toUpperCase() ?? null, amount, sent_at: new Date(ms).toISOString(),
  };
}

function rootDomain(d: string) {
  const parts = d.split(".");
  const two = /\.(co|com)\.[a-z]{2}$/.test(d) ? 3 : 2;
  return parts.slice(-two).join(".");
}

// "Nike <nike@official.nike.com>" -> "Nike". Falls back to the web address.
function storeName(from: string, domain: string) {
  let name = from.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  name = name.replace(/\b(customer (service|care)|orders?|order updates|shipping|no-?reply|team|store|shop|online|support|notifications?)\b/gi, "").replace(/[|·,:-]+\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (!name || name.includes("@") || name.length > 40) {
    const base = rootDomain(domain).split(".")[0];
    name = base.charAt(0).toUpperCase() + base.slice(1);
  }
  return name;
}

// ---------- full email text, for the AI item reader ----------

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };

const decode = (b64: string) => {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
};

function findPart(p: Part | undefined, type: string): string | null {
  if (!p) return null;
  if (p.mimeType === type && p.body?.data) return decode(p.body.data);
  for (const c of p.parts ?? []) {
    const hit = findPart(c, type);
    if (hit) return hit;
  }
  return null;
}

// Turns an order email into plain text, keeping product photos as [image: alt | url].
export function emailToText(html: string | null, plain: string | null) {
  if (!html) return (plain ?? "").replace(/\s+\n/g, "\n").trim();
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, head").forEach(n => n.remove());
  doc.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") ?? "";
    const w = Number(img.getAttribute("width") ?? 99);
    // Skip tracking pixels, spacers and tiny icons.
    if (!src.startsWith("https://") || w < 40) return img.remove();
    img.replaceWith(doc.createTextNode(` [image: ${img.getAttribute("alt") ?? ""} | ${src}] `));
  });
  doc.querySelectorAll("br, p, div, tr, li, h1, h2, h3, td").forEach(n => n.append("\n"));
  return (doc.body.textContent ?? "").replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export async function readFullText(id: string, token: string) {
  const m = await get<{ payload?: Part }>(`${API}/${id}?format=full`, token);
  return emailToText(findPart(m.payload, "text/html"), findPart(m.payload, "text/plain"));
}
