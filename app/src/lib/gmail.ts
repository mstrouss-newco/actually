import { SENSITIVE, SENSITIVE_BRAND, SENSITIVE_IN_SUBJECT } from "./sensitive";

// Reads shopping emails from Gmail in the browser, using the read-only access she granted.

export type Kind = "order" | "shipping" | "delivered" | "return" | "refund" | "receipt" | "cancel" | "other";
export type Order = {
  from?: string; snippet?: string;
  gmail_id: string; store: string; store_domain: string | null; subject: string;
  kind: Kind; order_no: string | null; amount: number | null; sent_at: string;
};

const API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const QUERY = '(category:purchases OR subject:(order OR receipt OR shipped OR delivered OR refund OR return OR cancelled OR canceled)) -category:promotions -category:social -category:forums newer_than:3y';
// Cancellations and refunds often land in Promotions, so they get their own search.
const CANCEL_QUERY = '(subject:(cancel OR cancelled OR canceled OR cancellation OR refund) OR "cancelled order" OR "canceled order" OR "order has been cancelled" OR "order has been canceled") -category:social -category:forums newer_than:3y';
const MAX = 1500;

// Senders that aren't stores.
const SKIP = /(amctheatres|fandango|ticketmaster|livenation|stubhub|seatgeek|eventbrite|cinemark|regmovies|olo\.com|order\.online|toasttab|chownow|mcdonalds|chick-fil-a|wendys|dominos|jerseymikes|baskinrobbins|starbucks|grubhub|postmates|paypal|venmo|chase|amex|americanexpress|bankofamerica|wellsfargo|capitalone|citi\.com|square|intuit|irs\.gov|doordash|ubereats|uber\.com|lyft|grubhub|instacart|apple\.com|google\.com|linkedin|github|netflix|spotify|openai|anthropic|discover|barclays|synchrony)/i;
const FREE_MAIL = /^(gmail|yahoo|outlook|hotmail|icloud|aol|me)\./i;
// Carriers (they hide the real store), phone and cable bills, restaurants, kids' sports and school sign-ups.
const NOT_STORE = /(^|\.)(ups|fedex|usps|dhl|ontrac|lasership|verizon|verizonwireless|vzw|att|t-mobile|tmobile|xfinity|comcast|spectrum|cox|chipotle|sweetgreen|cava|panera|tacobell|sportsengine|leagueapps|teamsnap|playmetrics|gotsport|ottosportmail|active|signupgenius|jotform|campminder|schoolpay|myschoolbucks|educationalproducts|schoolkidz|owner|popmenu|bentobox|slicelife)\.(com|ai|net|org)$/i;
// Kids' teams, camps and school sign-ups: never saved, even when the email says "order".
const KIDS_FROM = /\byouth\b|\bsoccer\b|little league|\bacademy\b|\bschool\b|\bpta\b|preschool|daycare|\bcamps?\b/i;
const KIDS_SUBJECT = /\bregistration\b|\benroll(ment|ed)?\b|\btryouts?\b|\bsummer camp\b/i;

async function get<T>(url: string, token: string): Promise<T> {
  for (let tries = 0; ; tries++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r.json();
    if (r.status === 401) throw new Error("expired");
    // Gmail answers "slow down" with 403 too. Only a missing permission means no access.
    const slowDown = r.status === 429 || r.status >= 500 || (r.status === 403 && /rateLimit|quota/i.test(await r.text()));
    if (r.status === 403 && !slowDown) throw new Error("no-access");
    if (slowDown && tries < 6) { await new Promise(res => setTimeout(res, 1000 * 2 ** tries + Math.random() * 500)); continue; }
    throw new Error(`gmail ${r.status}`);
  }
}

export async function listIds(token: string, since?: string | null): Promise<string[]> {
  // After the first scan, only look at mail since the last one (with a day of overlap).
  const after = since ? ` after:${Math.floor(Date.parse(since) / 1000) - 86400}` : "";
  const [main, cancels] = await Promise.all([listQuery(token, QUERY + after), listQuery(token, CANCEL_QUERY + after)]);
  return [...new Set([...main, ...cancels])];
}

async function listQuery(token: string, query: string): Promise<string[]> {
  const ids: string[] = [];
  let page = "";
  do {
    const q = new URLSearchParams({ q: query, maxResults: "500", ...(page ? { pageToken: page } : {}) });
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

// Marketing and follow-ups that mention an order but aren't one.
// Order contents that point to health. Never saved, even from regular stores.
const SENSITIVE_SUBJECT = /health ?care|medical|pharmacy|prescription|vitamin|\bhealth|hair (loss|fiber|regrowth)|minoxidil|rogaine|toppik|wellness|eye ?glasses|contact lens|supplement|sexual|incontinence|pregnan|ovulation|fertility|covid|test kit|first aid/i;
const NOT_ORDER = /order (today|now|by)\b|last chance|don't miss|ends (soon|tonight|today)|reminder|time to review|review it|meet your expectations|rate (your|us)|how did we do|survey|feedback|tell us what you think|write a review|recommended for you/i;
// "Your order has been cancelled", "We have cancelled order #1103923".
const CANCELLED = /\border (has been |was |is )?cancel+ed\b|\b(we('ve| have)|has been|have been|was|were) cancel+ed\b|\bcancel+ation (confirm|of (your )?order)|\bcancel+ed (order|item)s?\b|^cancel+ed\b/i;
// Invisible direction marks some stores put around order numbers.
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

export function parse(id: string, from: string, subjectRaw: string, snippetRaw: string, ms: number): Order | null {
  const subject = subjectRaw.replace(INVISIBLE, "");
  const snippet = snippetRaw.replace(INVISIBLE, "");
  if (NOT_ORDER.test(subject) || SENSITIVE_SUBJECT.test(subject) || SENSITIVE_IN_SUBJECT.test(subject)) return null;
  const email = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  const domain = email.split("@")[1] ?? "";
  if (!domain || SKIP.test(domain) || NOT_STORE.test(domain) || FREE_MAIL.test(domain) || SENSITIVE.test(domain)) return null;
  if (KIDS_FROM.test(from.replace(/<[^>]*>/, "")) || KIDS_SUBJECT.test(subject)) return null;

  const text = `${subject} ${snippet}`;
  const kind: Kind =
    CANCELLED.test(text) && !/\b(shipped|delivered)\b/i.test(subject) ? "cancel" :
    /\brefund(ed| issued| processed| is on| on its way| has been)|your refund|advance refund/i.test(text) ? "refund" :
    /return (label|request|started|received)|your return|dropoff confirmed/i.test(text) ? "return" :
    /delivered|has arrived/i.test(subject) ? "delivered" :
    /shipped|on (its|the) way|out for delivery|tracking|delivery estimate|arriving|arrives/i.test(subject) ? "shipping" :
    /receipt/i.test(subject) ? "receipt" :
    /\b(your|new|online|web) order\b|\byour (?!next|first|last|new)[\w&'’.-]+ order\b|details inside|\border (confirm|number|no\b|#|received|placed|details|summary|from|is|has|was)|thank(s| you) for (your )?(order|purchase|shopping)|\bpurchase (confirm|receipt)|^ordered\b|^order\b/i.test(subject) ? "order" : "other";
  if (kind === "other") return null;

  const order_no = [...text.matchAll(/(?:order|confirmation)\s*(?:number|no\.?|#)?\s*[:#]?\s*(?=[A-Z0-9-]*\d)([A-Z0-9][A-Z0-9-]{4,24})/gi)]
    .map(m => m[1]).find(v => /\d/.test(v)) ?? null;
  const money = text.match(/\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/);
  const amount = money ? Number(money[1].replace(/,/g, "")) : null;

  if (SENSITIVE_BRAND.test(storeName(from, domain, subject))) return null;
  return {
    from, snippet: snippet.slice(0, 200),
    gmail_id: id, store: storeName(from, domain, subject), store_domain: rootDomain(domain), subject: subject.slice(0, 300),
    kind, order_no: order_no?.toUpperCase() ?? null, amount, sent_at: new Date(ms).toISOString(),
  };
}

export function rootDomain(d: string) {
  const parts = d.split(".");
  const two = /\.(co|com)\.[a-z]{2}$/.test(d) ? 3 : 2;
  return parts.slice(-two).join(".");
}

// "Nike <nike@official.nike.com>" -> "Nike". Falls back to the web address.
export function storeName(from: string, domain: string, subject = "") {
  // "Receipt from itch.io" sent by Stripe: the store is in the subject.
  const via = /(^|\.)(stripe\.com)$/.test(domain) ? subject.match(/(?:receipt|order|payment) from ([^#(\[]+)/i)?.[1]?.trim() : null;
  if (via) return via.slice(0, 40);
  let name = from.replace(/<[^>]*>/, "").replace(/"/g, "").trim();
  name = name.replace(/\b(customer (service|care)|orders?|order updates|confirmations?|shipping|no-?reply|team|store|shop|online|support|notifications?)\b/gi, "").replace(/[|·,:-]+\s*$/, "").replace(/\s{2,}/g, " ").trim();
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

// ---------- rewards emails (points, store credit, gift cards) ----------

const REWARDS_QUERY = '(subject:(points OR rewards OR "store credit" OR "gift card" OR balance OR expiring OR expire) OR "points balance" OR "reward balance") newer_than:1y';
const REWARD_SUBJECT = /point|reward|credit|gift card|balance|expir|certificate/i;

export type RewardEmail = { gmail_id: string; store: string; store_domain: string; subject: string; sent_at: string };

// Finds rewards emails from stores. Skips banks, apps and personal mail.
export async function listRewardEmails(token: string, skip: Set<string>): Promise<RewardEmail[]> {
  const q = new URLSearchParams({ q: REWARDS_QUERY, maxResults: "300" });
  const res = await get<{ messages?: { id: string }[] }>(`${API}?${q}`, token);
  const ids = (res.messages ?? []).map(m => m.id).filter(id => !skip.has(id));
  const out: RewardEmail[] = [];
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const m = await get<Msg>(`${API}/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, token).catch(() => null);
      if (!m) continue;
      const h = (n: string) => m.payload?.headers?.find(x => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
      const from = h("From"), subject = h("Subject");
      const domain = ((from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase().split("@")[1]) ?? "";
      if (!domain || SKIP.test(domain) || NOT_STORE.test(domain) || FREE_MAIL.test(domain) || SENSITIVE.test(domain) || !REWARD_SUBJECT.test(subject)) continue;
      out.push({ gmail_id: id, store: storeName(from, domain), store_domain: rootDomain(domain), subject, sent_at: new Date(Number(m.internalDate)).toISOString() });
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  // A balance only needs the newest email from each store.
  const newest = new Map<string, RewardEmail>();
  for (const e of out.sort((a, b) => b.sent_at.localeCompare(a.sent_at))) if (!newest.has(e.store_domain)) newest.set(e.store_domain, e);
  return [...newest.values()];
}
