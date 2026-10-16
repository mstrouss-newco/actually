# Actually: guide for AI agents

Read this first. It is the single source of truth for how this project works.
Update it in the same change whenever you change something it describes.

## What Actually is

A shopping app. People get a free "shopping email" (name@shop.myocto.co for now)
and connect Gmail. Actually finds their past orders, keeps returns and deliveries in
one place, builds a closet of what they bought, finds points and credit about to
expire, estimates resale value, and lets friends share pieces.

Live app: https://actually-app.vercel.app
Clickable demo (design reference only): https://actually-demo.vercel.app

## The owner

Mike (mstrouss@gmail.com) is not a coder. When talking to him:

- Plain words, no jargon. Short bullets. Less is more.
- Never use em dashes.
- Plan or mock before big work, so tokens are not wasted.
- Never tell him to open a terminal, run commands or push code. Do it yourself with
  the connected tools (GitHub, Vercel, Supabase). If a tool can't do it, say so and
  give him a short prompt he can paste into a Claude chat that has Chrome.
- Never ask him to paste keys or secrets into chat.

## Repo layout

| Path | What it is |
|---|---|
| `app/` | The real app. Next.js 15 (App Router), TypeScript, no CSS framework. |
| `app/src/app/` | Screens, one folder per route. `/settings` (from the person icon on Today) has disconnect Gmail, delete data, sign out, delete account. `/brand/[name]` is one brand (from Closet > Brands). |
| `app/src/lib/` | Shared logic (Gmail reading, orders, items, earn, social, UI pieces). |
| `supabase/functions/` | Server functions (Deno). Source of truth for what is deployed. |
| `supabase/migrations/` | Every database change, in order. Source of truth for the schema. |
| `demo/` | The old clickable demo (static). Design reference. Deployed as `actually-demo`. |
| `design/` | Original screen designs. Reference only. |
| `CHANGELOG.md` | What changed, newest first. Add an entry for every change. |

## Services and IDs

No secrets in this file or in the repo. Ever.

| Service | What | ID / where |
|---|---|---|
| Vercel | Project `actually-app`, root dir `app/` | Team `team_XAysQqH39hDz1bEe1FpwHDAM`. Every push to `main` deploys production. |
| Vercel | Project `actually-demo`, root dir `demo/` | Same team. |
| Supabase | Project `actually` | Ref `mfqdcwdlrnipzhseoiai`, URL `https://mfqdcwdlrnipzhseoiai.supabase.co` |
| Google Cloud | Project "Actually", OAuth client "Actually web" | Publishing status: Testing (max 100 test users, added by hand). |
| Resend | Domain `shop.myocto.co` (sending + receiving) | Webhook `email.received` → `/functions/v1/inbound-email` |
| GoDaddy | DNS for `myocto.co` (owned by Octo, another project) | Only touch records on `shop` / `*.shop`. Never touch myocto.co's own MX. |
| Anthropic | API key "actually-app", $25/month limit | Stored only as a Supabase secret. |

Supabase edge function secrets (names only): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set 2026-10-14).

The browser Supabase URL and publishable key live in `app/src/lib/supabase.ts` (public by
design; safety comes from row level security). Env overrides: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SHOPPING_DOMAIN`.

## How data flows

1. **Sign-up:** Welcome → Claim (pick a name, saved on device) → Goal → Live (email ready
   plus the Gmail button; `/permission` is the same button for later entry points). Google is asked once: "Continue with Gmail" (with `gmail.readonly`) or
   "Not now" (sign-in only). `/auth` finishes sign-in and saves the profile.
   Returning users use `/login`.
2. **Gmail import** (`lib/importer.ts`, runs in the browser as a shared background job):
   list matching emails → read headers → `parse()` in `lib/gmail.ts` drops non-orders,
   blocked senders and sensitive mail → each batch goes to `screen-emails` (AI) →
   only "shopping" is saved to `orders` → then `read-order` (AI) reads full order emails
   into `items` (also numbered shipping emails for orders with no order email, except Amazon). After the first import, only mail since `profiles.last_import_at` is read.
3. **Shopping email:** mail to name@shop.myocto.co → Resend → `inbound-email` forwards
   it to the user's inbox, screens it and saves orders and items.
3b. **Catch-up pass:** when `profiles.backfill_v` is below `BACKFILL` in `lib/importer.ts`, the next import re-lists all past mail (new emails only), then `fillPhotos()` finds missing product photos and `readReturnRules()` reads return rules for recent orders. Cancellations have their own Gmail search (`CANCEL_QUERY`, includes Promotions).
4. **Grouping:** `groupOrders()` in `lib/orders.ts` turns emails into orders in the
   browser: store key (web address, or name for relay senders) + order number, else store +
   contents within 21 days (Amazon), else an email with neither joins the store's latest
   open order from the last 10 days. A numbered email can adopt an open unnumbered order.
   "Out for delivery" 2+ days ago = delivered. Relay senders
   (`RELAY`, e.g. Narvar) don't count as the store's address. Shipped 7+ days or ordered 14+ days with no news = arrived (`assumed`, shown as "Likely arrived"). Store names via a relay map to the store's own web address when one is seen. Amazon delay-only orders fold into the nearest order with contents.
5. **Gmail pass:** Google's token lasts about an hour and Supabase drops it on refresh.
   `/auth` hands Google's refresh token to `gmail-token` (stored in `gmail_tokens`, server
   only). `gmailToken()` in `lib/supabase.ts` uses the session token, then a device copy,
   then asks `gmail-token` for a new one. Needs `GOOGLE_CLIENT_SECRET`; GET on the function
   says `{ ready }`. Users who signed in before this must tap "Connect Gmail" in Settings once (`/login` doesn't ask for Gmail).

## Server functions (`supabase/functions/`)

| Function | Login needed | Does |
|---|---|---|
| `screen-emails` | Yes | Sorts emails into shopping / sensitive / other. Also a one-time `clean` mode. |
| `read-order` | Yes | AI reads one order email into items. |
| `read-reward` | Yes | AI reads a points / credit / gift card email. |
| `value-items` | Yes | AI estimates resale ranges, 40 items at a time. |
| `inbound-email` | No (checks Resend signature) | Shopping email receiver. |
| `gmail-token` | Own check (GET is public, says only ready or not) | Saves Google's refresh token, hands out fresh Gmail passes, forgets on disconnect. |
| `delete-account` | Yes | `data`: deletes orders, items, rewards, blocked stores, brand follows, loves (keeps account). `account`: deletes the user; every table cascades. |

All AI calls use `claude-haiku-5-5` with structured output, chosen for cost (about
$0.50 per user to start). Ask Mike before switching to a pricier model.

Deploying a function: use the Supabase connector's deploy tool with the file content
from this repo. Keep repo and deployed code identical.

## Database

Orders kinds: order, shipping, delivered, return, refund, receipt, cancel. A cancel email, or a refund within 3 days of ordering with nothing shipped, makes the order "cancelled": it shows under Orders > Cancelled and its pieces stay out of Closet and Worth.
Order pieces are one per product and color (`groupOrders`), so three colors of a tee are three pieces.
Motion lives in `app/globals.css` (classes `up`, `press`, `drop`, `bell`, `float`, `heroIn`, `barfill`, `glow`, `fanin`) and `lib/motion.tsx` (`delay()` for staggered lists, `useCountUp`, `TrackBar`, `Confetti`). Reduced-motion settings shorten all of it.
Product images never fall back to a store logo or a letter: `ItemImage` shows a small drawing of what the item is (`lib/drawings.tsx`, matched from the item name, then the store; a box if nothing matches). Logos (`StoreTile`, `BrandLogo`) are for brands and stores only, and never fall back to a letter: `StoreTile` shows a drawing, `BrandLogo` shows nothing.

Tables: `profiles`, `orders`, `items`, `rewards`, `follows` (people), `brand_follows` (brands she chose, with sales / arrivals / drops switches), `blocked_stores`, `loves` (hearts on friends' shared pieces; changed only through `set_love`, counts via `love_state`, her list via `saved_pieces`; owners see counts, never who), `gmail_tokens` (no policies; server only).
Brand follows: `/follow` asks once (`profiles.brands_asked_at`) with every closet brand pre-checked; she confirms with one tap. Offers and alerts must come from brands she follows, never picked straight from Gmail data (Google's Limited Use rule). `brand_suggestions` returns brands followed by at least 3 of a brand's fans, counts only.
`items.returned_at`: set when a return or refund email names that piece (`readReturns()` → `read-order` mode `returns`, which marks the email `items_read`). Returned pieces, and pieces of whole-order returns with no item list, stay out of Closet, Sort, Worth and the feed.
`items.for_whom` (me / kids / partner / other, guessed by `whoFor()` in `lib/items.ts` when empty)
and `items.hidden` (removed from closet; kept so imports don't bring it back).
Every table has row level security: people only see their own rows. Shared pieces
leave the database only through the `profile_page`, `following_feed` (old), `friends_feed`, `search_people`,
`similar_people` and `my_people` functions, which return photo, brand and name only (plus the note she wrote, `items.note`, on `profile_page`, and `items.product_url`, the cleaned store page link with nothing after the "?"). `read-order` finds product links from the photo links in order emails (and `fillLinks()` in `lib/items.ts` for older pieces), following tracking redirects server side.

To change the schema: apply a migration with the Supabase connector, then add the same
SQL to `supabase/migrations/<version>_<name>.sql`. Run the security advisor afterwards.

## Privacy rules (do not weaken)

- Never save health, pharmacy, telehealth, testing, adult, insurance, legal or banking
  mail. Layers: sender domains (`SENSITIVE` in `lib/sensitive.ts` and the functions),
  brand names (`SENSITIVE_BRAND`, for mail sent through shipping services like Narvar),
  subject words (`SENSITIVE_SUBJECT`), then the AI screen.
- One narrow exception for banks: credit card points. `CARD_PROGRAMS` in `lib/gmail.ts` lists the card companies; their mail is read only when the subject is about rewards and has none of `BANK_WORDS` (statement, payment, account...), and `read-reward` saves only points or cash back from them, never balances owed or spending. People can also type points in (`gmail_id` starting `manual:`).
- Also never saved: eyewear (glasses, contacts), carrier notices (UPS, FedEx, USPS, DHL),
  phone and cable bills, restaurants, kids' teams, camps and school sign-ups (`NOT_STORE`,
  `KIDS_FROM`, `KIDS_SUBJECT` in `lib/gmail.ts`, plus the AI prompt).
- Closet, Sort and Worth show only wearables (`WEAR` in `lib/items.ts` and `value-items`).
  Other items stay saved for Orders and future points or cash back.
- Sort and sharing are private by default. Pieces for kids or others are always private.
- When unsure, drop it. A missed order is fine; a saved prescription is not.
- Never show price, size or order details on anything shared.
- Only read the sender, subject and preview to decide; full emails are read only for
  orders already judged to be shopping.
- Keep the three copies of the sensitive lists in sync: `app/src/lib/sensitive.ts`,
  `supabase/functions/screen-emails/index.ts`, `supabase/functions/inbound-email/index.ts`.

## Working on it

- **Branches:** work on a feature branch, open a PR to `main`, merge. `main` is production.
  Never force-push `main`. If another agent is working, keep PRs small and pull `main` first.
- **Before pushing:** in `app/`, run `npm run lint` and `npm run build`. Both must be clean.
- **Testing screens without a real login:** start `next start`, set a fake Supabase
  session cookie (`sb-mfqdcwdlrnipzhseoiai-auth-token`) and mock `/rest/v1/*` with
  Playwright routes. Chromium is at `/opt/pw-browsers`.
- **Testing parsing:** run `parse()` and `groupOrders()` with `npx tsx` on sample
  subjects. Add real subjects from QA reports as test cases.
- **Gmail limits:** Gmail answers "slow down" with 403 too; `get()` retries those.
  Keep concurrency at 4.
- **Copy:** write for the end user, plain and warm. No em dashes.
- **Log it:** add a line to `CHANGELOG.md` for every change.

## Known gaps and next steps

- Import only runs while the app is open. Refresh tokens are now stored, so a server job
  for true background sync is the next step.
- Cash back is "coming soon". Partner research done (Wildfire recommended); on hold.
- Shopping email uses `shop.myocto.co` for testing. Real domain (e.g. actually.shop)
  not bought yet.
- Google app is in Testing: each tester's Gmail must be added in Google Cloud. Going
  past 100 users needs Google's review plus privacy policy, terms and delete-account.
- Restaurants, tickets, groceries and digital purchases are skipped on purpose.
- Return windows use each store's rule when its emails state one (`orders.return_days`, `return_note`, read by `read-order`); otherwise the usual 30 days, and the order page says so.
