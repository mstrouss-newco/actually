// Receives mail sent to <name>@shop.myocto.co from Resend, saves orders and items,
// and forwards every email to her real inbox.
import { Resend } from "npm:resend@6.32.1";
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const DOMAIN = Deno.env.get("SHOPPING_DOMAIN") ?? "shop.myocto.co";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Known health, pharmacy, telehealth, testing and adult senders. Blocked without asking the AI.
const SENSITIVE = /(^|\.)(ro\.co|getroman\.com|hims\.com|forhers\.com|hers\.com|nurx\.com|keeps\.com|thirtymadison\.com|cove\.com|picnicallergy\.com|curology\.com|apostrophe\.com|musely\.com|agencyskincare\.com|cerebral\.com|donefirst\.com|done\.com|betterhelp\.com|talkspace\.com|brightline\.com|lemonaidhealth\.com|plushcare\.com|teladoc\.com|mdlive\.com|amwell\.com|onemedical\.com|zocdoc\.com|goodrx\.com|cvs\.com|caremark\.com|walgreens\.com|riteaid\.com|capsule\.com|alto\.com|altopharmacy\.com|pillpack\.com|truepill\.com|expressscripts\.com|express-scripts\.com|optumrx\.com|optum\.com|honeybeehealth\.com|costplusdrugs\.com|blinkhealth\.com|everlywell\.com|letsgetchecked\.com|myLAB(box)?\.com|mylabbox\.com|labcorp\.com|questdiagnostics\.com|23andme\.com|natalist\.com|modernfertility\.com|proovtest\.com|kindbody\.com|plannedparenthood\.org|pandiahealth\.com|thepill\.com|wisp\.com|hellowisp\.com|lovehoney\.com|adameve\.com|dameproducts\.com|lelo\.com|babeland\.com|hims-hers\.com|weightwatchers\.com|noom\.com|found\.com|joinfound\.com|calibrate\.com|henrymeds\.com|ivim\.com|sesamecare\.com|1800contacts\.com|kaiserpermanente\.org|mychart\.com|pharmacy\.amazon\.com|healthequity\.com|hsastore\.com|fsastore\.com|warbyparker\.com|zennioptical\.com|glassesusa\.com|eyebuydirect\.com|lenscrafters\.com|visionworks\.com|contactsdirect\.com|hubblecontacts\.com|discountcontactlenses\.com|lensdirect\.com|acuvue\.com)$/i;

// Health brands by name, for mail sent through shipping services (Ro via Narvar).
const SENSITIVE_BRAND = /^(ro|roman|hims|hers|hims ?& ?hers|nurx|keeps|cove|curology|apostrophe|musely|cerebral|done|talkspace|betterhelp|lemonaid|plushcare|teladoc|goodrx|cvs( pharmacy)?|walgreens|rite ?aid|capsule|alto( pharmacy)?|pillpack|truepill|amazon pharmacy|everlywell|letsgetchecked|23andme|wisp|thirty madison|noom|found|calibrate|henry ?meds|lovehoney|adam ?& ?eve|1-?800 ?contacts|warby ?parker|zenni( optical)?|glassesusa|eyebuydirect|lenscrafters|visionworks|hubble( contacts)?|contacts ?direct|lensdirect)$/i;

// ---------- is it a real shopping order? (same rules as screen-emails) ----------

const SCREEN_SYSTEM = `You sort emails for a personal shopping app. For the email, answer with one verdict:
- "shopping": an order, shipping, delivery, return, refund or receipt for physical goods bought from a store. Clothing, shoes, bags, accessories, jewelry, beauty and cosmetics, home goods, furniture, electronics, toys, gifts, sports gear, books, pet food and pet supplies, garden and household supplies. Repeat deliveries of physical goods (Autoship, Subscribe & Save) count as shopping.
- "sensitive": anything about health or privacy, even if it is an order. Pharmacy, prescriptions, medicine, vitamins sold for a condition, telehealth, doctors, labs and tests, mental health, fertility, pregnancy, birth control, sexual health or adult products, weight-loss programs, hair-loss treatment, medical devices, eyeglasses and contact lenses (Warby Parker, Zenni, 1-800 Contacts), insurance, legal, debt or banking.
- "other": everything else. Software and online services, app and cloud bills, digital subscriptions and memberships, in-game or account credit, news, utilities, phone bills, school or kids' activity notices, kids' sports and camp registrations (even when called an order), carrier notices from UPS, FedEx, USPS or DHL that do not name the store, events and tickets, school or team forms and photo-day reminders, travel, rides, food delivery and restaurants, groceries, donations, newsletters, work emails, marketing and promotions without a confirmed purchase.
Telehealth and pharmacy brands are always sensitive, even when a shipping service sends the email: Ro, Roman, Hims, Hers, Nurx, Keeps, Curology, Cerebral, Wisp, GoodRx, Capsule, CVS, Walgreens, Warby Parker and similar.
If unsure between shopping and sensitive, choose sensitive. If unsure whether it is a purchase at all, choose other.`;

const Verdict = z.object({ verdict: z.enum(["shopping", "sensitive", "other"]) });

async function isShopping(from: string, subject: string, text: string) {
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 200,
      output_config: { effort: "low", format: zodOutputFormat(Verdict) },
      system: SCREEN_SYSTEM,
      messages: [{ role: "user", content: `From: ${from.slice(0, 120)} | Subject: ${subject.slice(0, 200)} | Preview: ${text.slice(0, 300)}` }],
    });
    return res.stop_reason !== "refusal" && res.parsed_output?.verdict === "shopping";
  } catch {
    return false;
  }
}

// ---------- sorting an email (same rules as the Gmail import) ----------

type Kind = "order" | "shipping" | "delivered" | "return" | "refund" | "receipt";

function classify(subject: string, text: string): Kind | null {
  const all = `${subject} ${text.slice(0, 600)}`;
  if (/refund/i.test(all)) return "refund";
  if (/return (label|request|started|received)|your return/i.test(all)) return "return";
  if (/delivered|has arrived/i.test(subject)) return "delivered";
  if (/shipped|on (its|the) way|out for delivery|tracking/i.test(subject)) return "shipping";
  if (/receipt/i.test(subject)) return "receipt";
  if (/order|purchase|thanks for shopping|thank you for shopping/i.test(subject)) return "order";
  return null;
}

function rootDomain(d: string) {
  const parts = d.split(".");
  return parts.slice(/\.(co|com)\.[a-z]{2}$/.test(d) ? -3 : -2).join(".");
}

function storeName(from: string, domain: string) {
  let name = from.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  name = name.replace(/\b(customer (service|care)|orders?|order updates|shipping|no-?reply|team|store|shop|online|support|notifications?)\b/gi, "").replace(/[|·,:-]+\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (!name || name.includes("@") || name.length > 40) {
    const base = rootDomain(domain).split(".")[0];
    name = base.charAt(0).toUpperCase() + base.slice(1);
  }
  return name;
}

// Plain text for the AI, keeping product photos as [image: alt | url].
function htmlToText(html: string) {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, tag => {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1] ?? "";
      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
      const w = Number(tag.match(/width=["']?(\d+)/i)?.[1] ?? 99);
      return src.startsWith("https://") && w >= 40 ? ` [image: ${alt} | ${src}] ` : " ";
    })
    .replace(/<(br|p|div|tr|li|h\d|td)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

// ---------- reading items (same as read-order) ----------

const CATEGORIES = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "beauty", "home", "other"] as const;
const Items = z.object({
  is_order: z.boolean().describe("True only if this email confirms a purchase and lists what was bought."),
  items: z.array(z.object({
    name: z.string().describe("Short product name as a shopper would say it, without size or color."),
    brand: z.string().nullable(),
    size: z.string().nullable().describe("Size exactly as written."),
    color: z.string().nullable(),
    price: z.number().nullable().describe("Price paid for one unit, in dollars."),
    quantity: z.number().int(),
    image_url: z.string().nullable().describe("The product photo URL, if one clearly belongs to this item. Never a logo or banner."),
    category: z.enum(CATEGORIES),
  })),
});
const ITEMS_SYSTEM = `You read online shopping emails and list the products that were bought.
Only list items actually purchased in this order. Ignore ads and recommendations.
If no specific products are listed, return is_order false and no items.
Use null when a detail is not in the email. Never guess sizes or prices.`;

async function readItems(store: string, text: string) {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return [];
  try {
    const res = await anthropic.messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Items) },
      system: ITEMS_SYSTEM,
      messages: [{ role: "user", content: `Store: ${store}\n\n${text.slice(0, 40000)}` }],
    });
    const out = res.stop_reason === "refusal" ? null : res.parsed_output;
    return out?.is_order ? out.items.slice(0, 40) : [];
  } catch {
    return [];
  }
}

// ---------- the webhook ----------

Deno.serve(async req => {
  if (req.method !== "POST") return new Response("ok");
  if (!Deno.env.get("RESEND_API_KEY") || !Deno.env.get("RESEND_WEBHOOK_SECRET")) return new Response("not set up", { status: 503 });
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const payload = await req.text();
  try {
    resend.webhooks.verify({
      payload,
      headers: { id: req.headers.get("svix-id") ?? "", timestamp: req.headers.get("svix-timestamp") ?? "", signature: req.headers.get("svix-signature") ?? "" },
      webhookSecret: Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "",
    });
  } catch {
    return new Response("bad signature", { status: 401 });
  }

  const event = JSON.parse(payload);
  if (event.type !== "email.received") return new Response("ignored");
  const emailId: string = event.data.email_id;
  const recipients: string[] = [...(event.data.received_for ?? []), ...(event.data.to ?? [])].map((s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase());

  // Match the address to her shopping-email name. "sam+zara@" still goes to sam.
  const local = recipients.find(r => r.endsWith(`@${DOMAIN}`))?.split("@")[0].split("+")[0];
  if (!local) return new Response("not ours");
  const { data: profile } = await admin.from("profiles").select("id").eq("handle", local).maybeSingle();
  if (!profile) return new Response("no such name");
  const { data: user } = await admin.auth.admin.getUserById(profile.id);

  // Forward first, so she gets every email even if reading it fails.
  if (user.user?.email) {
    await resend.emails.receiving.forward({ emailId, to: user.user.email, from: `${local}@${DOMAIN}` }).catch(() => null);
  }

  const { data: email } = await resend.emails.receiving.get(emailId);
  if (!email) return new Response("saved nothing");
  const from: string = (email.headers?.from as string) ?? email.from ?? "";
  const subject: string = email.subject ?? "";
  const text = email.html ? htmlToText(email.html) : (email.text ?? "");
  const domain = ((from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase().split("@")[1]) ?? "";
  const kind = classify(subject, text);
  if (!kind || !domain) return new Response("not a shopping email");

  // Never save sensitive senders, stores she blocked, or anything that isn't a real shopping order.
  if (SENSITIVE.test(domain) || SENSITIVE_BRAND.test(from.replace(/<[^>]*>/, "").replace(/["']/g, "").trim())) return new Response("sensitive, not saved");
  const { data: blocks } = await admin.from("blocked_stores").select("store_domain").eq("user_id", profile.id);
  if ((blocks ?? []).some(b => domain === b.store_domain || domain.endsWith(`.${b.store_domain}`))) return new Response("blocked store");
  if (!Deno.env.get("ANTHROPIC_API_KEY") || !(await isShopping(from, subject, text))) return new Response("not a shopping order");

  const store = storeName(from, domain);
  const all = `${subject} ${text.slice(0, 2000)}`;
  const orderNo = [...all.matchAll(/(?:order|confirmation)\s*(?:number|no\.?|#)?\s*[:#]?\s*(?=[A-Z0-9-]*\d)([A-Z0-9][A-Z0-9-]{4,24})/gi)].map(m => m[1])[0]?.toUpperCase() ?? null;
  const money = all.match(/\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/);
  const sentAt = email.created_at ?? new Date().toISOString();
  const id = `rs_${emailId}`;

  await admin.from("orders").upsert({
    user_id: profile.id, gmail_id: id, store, store_domain: rootDomain(domain), subject: subject.slice(0, 300), kind,
    order_no: orderNo, amount: money ? Number(money[1].replace(/,/g, "")) : null, sent_at: sentAt, source: "shopping",
    items_read: kind !== "order" && kind !== "receipt",
  }, { onConflict: "user_id,gmail_id", ignoreDuplicates: true });

  if (kind === "order" || kind === "receipt") {
    const items = (await readItems(store, text)).map(i => ({
      user_id: profile.id, gmail_id: id, store, ordered_at: sentAt, source: "shopping",
      name: i.name.slice(0, 200), brand: i.brand?.slice(0, 100) ?? null, size: i.size?.slice(0, 40) ?? null,
      color: i.color?.slice(0, 60) ?? null, price: i.price, quantity: Math.max(1, i.quantity || 1),
      image_url: i.image_url?.startsWith("https://") ? i.image_url.slice(0, 1000) : null, category: i.category,
    }));
    if (items.length) await admin.from("items").upsert(items, { onConflict: "user_id,gmail_id,name,size,color", ignoreDuplicates: true });
    await admin.from("orders").update({ items_read: true }).eq("user_id", profile.id).eq("gmail_id", id);
  }
  return new Response("saved");
});
