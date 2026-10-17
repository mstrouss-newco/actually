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

## Mike's product rules (from his feedback; keep them)

- No letter tiles for brands or products, ever. A brand's name written out is enough; products get a drawing.
- No spending totals that make people feel bad (no "you spent $X this month").
- It should feel like an app, not a website: no sideways drift, bounce or zoom on iPhone; tab bar respects the Safari bar.
- Keep it calm and compact: one line beats two rows of pills; short headers; no extra explainer lines.
- No emojis or emoji-style symbols (iPhone turns ↗ into an emoji). Use drawn icons. No "Shop" labels where tapping obviously shops.
- Copy is about pleasure, never spam. Don't promise emails or say "inside the app".
- Earning copy stays in ("Share it and you could earn if a friend buys it", cash back): we're testing it and Wildfire goes in before launch. QA should not flag it as an unkept promise.
- Owners see counts (loves), never who. Never prices, sizes or order details on anything shared.
- Privacy rules are for us, not her: don't put them in the app as copy (no "Never prices or sizes", "Only you see this"). Keep only what she needs to decide, like Google's permission note.
- Products link to their real store page when we have it; otherwise a shopping search.
- Show only what she has: type tabs, rows and filters appear only when there's something in them.
- Mock first on the design board for anything new, then build what he picks. Design board: claude.ai artifact "Actually" Design (HpSXVJtLvkRLiXjAchBbdw).
- After a batch of changes, run a blind QA pass (a separate agent that didn't build it), fix what it finds, then log it here and in CHANGELOG.md.

## Repo layout

| Path | What it is |
|---|---|
| `app/` | The real app. Next.js 15 (App Router), TypeScript, no CSS framework. |
| `app/src/app/` | Screens, one folder per route. `/settings` (from the person icon on Today) has disconnect Gmail, delete data, sign out, delete account. `/brand/[name]` is one brand (from Closet > Brands). |
| `app/src/app/brief/` | The Actually deck for ownership and the tech team at `/brief/deck`: full-screen slides (what it is, features as moving phones, money, go to market, roadmap, asks, appendix). `/brief` is the password door (only a SHA-256 hash in `pass.ts`; cookie set by `route.ts`); `/brief/features` redirects to the deck. Phones reuse the lander's screens (`lander.tsx` exports them) plus `brief/features/screens.tsx`. Keep the numbers in step with the Claude doc "Actually: one sheet". |
| `app/src/app/model/` | Owner-only 5 year money model at `/model`, behind a password (cookie set by the route). HTML lives in `model-html.ts`. |
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

0. **Lander:** "/" in a browser shows the lander (`app/lander.tsx` + `lander.css`, a fixed full-page layer over the phone frame, hidden by `@media (display-mode: standalone)`), with Gmail buttons (`lander-cta.tsx`) and Sign in. From the Home Screen, "/" is the app welcome (`app/welcome.tsx`). Its phone screens are CSS loops made from the app's own art (`public/art`) and store favicons.
1. **Sign-up (Gmail first):** Welcome has "Continue with Gmail" right away (`GmailStart` in
   `permission/connect.tsx`; "Not now" signs in without Gmail). Google is asked once. `/auth` gives new
   accounts a name from their Google first name (`autoHandle()` in `lib/profile.ts`, adds digits if taken),
   then goes to `/import`, where she can keep or change the name (`changeHandle()`; it is also her
   shopping email). The shopping email is a card on Today, not a step. `/claim`, `/goal`, `/live` just
   send people to the welcome. `/permission` is the Gmail button for later entry points. Returning users use `/login`.
2. **Gmail import** (`lib/importer.ts`, runs in the browser as a shared background job):
   list matching emails → read headers → `parse()` in `lib/gmail.ts` drops non-orders,
   blocked senders and sensitive mail → each batch goes to `screen-emails` (AI) →
   only "shopping" is saved to `orders` → then `read-order` (AI) reads full order emails
   into `items` (also numbered shipping emails for orders with no order email, except Amazon). After the first import, only mail since `profiles.last_import_at` is read. `AutoSync` (`lib/auto-sync.tsx`, in the layout) runs a quiet `startImport({ quiet: true })` when she opens or returns to the app, at most once an hour per device (`last-sync` in localStorage), never on signed-out or onboarding pages and never as a first import; when any import finishes it fires `orders-updated`, and Today and Orders reload.
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
| `cut-out` | Yes (own pieces, or pieces someone shares on their own or in a shared look) | Removes an even photo background from a piece; saves `cutouts/<item_id>.png` (public bucket, server writes only). Says "busy background" when the photo isn't a plain studio shot. |
| `style-outfits` | Yes (own pieces only) | AI puts together 3 looks from the piece ids she sends (occasion, or 3 ways to wear an anchor piece). Sees only type, brand, name and color. |
| `admin-delete` | Owners only (`admins` table) | Deletes someone's account like Settings does (photo, cut-outs, user) and writes `admin_log`. Can't delete yourself. |
| `report-error` | No (capped: 300 an hour) | Saves app errors to `app_errors` and emails owners at most once an hour (Resend, from alerts@ the shopping domain). The app sends only the error, page and device type. |
| `delete-account` | Yes | `data`: deletes orders, items, rewards, blocked stores, brand follows, loves, outfits (keeps account). `account`: deletes the user, her photo and her cut-outs; every table cascades. Both modes remove her cut-outs. |

All AI calls use `claude-haiku-5-5` with structured output, chosen for cost (about
$0.50 per user to start). Ask Mike before switching to a pricier model.

Deploying a function: use the Supabase connector's deploy tool with the file content
from this repo. Keep repo and deployed code identical.

## Database

Orders kinds: order, shipping, delivered, return, refund, receipt, cancel. A cancel email, or a refund within 3 days of ordering with nothing shipped, makes the order "cancelled": it shows under Orders > Cancelled and its pieces stay out of Closet and Worth.
Order pieces are one per product and color (`groupOrders`), so three colors of a tee are three pieces.
Motion lives in `app/globals.css` (classes `up`, `press`, `drop`, `bell`, `float`, `heroIn`, `barfill`, `glow`, `fanin`) and `lib/motion.tsx` (`delay()` for staggered lists, `useCountUp`, `TrackBar`, `Confetti`). Reduced-motion settings shorten all of it.
Product photo tiles take the photo's plain background color when we can read it (`usePhotoBg` in `lib/tabs.tsx`, corner sampling, CORS permitting), so there is no visible edge; white backgrounds blend via multiply. Product images never fall back to a store logo or a letter: `ItemImage` shows a small drawing of what the item is (`lib/drawings.tsx`, matched from the item name, then the store; a box if nothing matches). Logos (`StoreTile`, `BrandLogo`) are for brands and stores only, and never fall back to a letter: `StoreTile` shows a drawing, `BrandLogo` shows nothing.

Tables: `profiles`, `orders`, `items`, `rewards`, `follows` (people), `brand_follows` (brands she chose, with sales / arrivals / drops switches), `blocked_stores`, `loves` (hearts on friends' shared pieces; changed only through `set_love`, counts via `love_state`, her list via `saved_pieces`; owners see counts, never who), `gmail_tokens` (no policies; server only).
Brand follows: `/follow` asks once (`profiles.brands_asked_at`) with every closet brand pre-checked; she confirms with one tap. Offers and alerts must come from brands she follows, never picked straight from Gmail data (Google's Limited Use rule). `brand_suggestions` returns brands followed by at least 3 of a brand's fans, counts only.
`items.returned_at`: set when a return or refund email names that piece (`readReturns()` → `read-order` mode `returns`, which marks the email `items_read`). Returned pieces, and pieces of whole-order returns with no item list, stay out of Closet, Sort, Worth and the feed.
`items.for_whom` (me / kids / partner / other, guessed by `whoFor()` in `lib/items.ts` when empty). `loadItems()` merges copies of one piece from several emails into one `Item` with `ids` (every copy); `setWho`, `confirmMine`, `setPick` and `hideItem` write to all of them (except sharing: "share" goes on the shown copy only and the other copies are cleared, so friends never see a piece twice), and a merge never drops an answer from any copy.
and `items.hidden` (removed from closet; kept so imports don't bring it back).
Every table has row level security: people only see their own rows. Shared pieces
leave the database only through the `profile_page`, `following_feed` (old), `friends_feed`, `search_people`,
`similar_people` and `my_people` functions, which return photo, brand and name only (plus the note she wrote, `items.note`, on `profile_page`, and `items.product_url`, the cleaned store page link with nothing after the "?"). `read-order` finds product links from the photo links in order emails (and `fillLinks()` in `lib/items.ts` for older pieces), following tracking redirects server side (manual hops, https only, no IP or internal hosts). Only the server can write `product_url` (trigger `keep_product_url`), and `findIt()` uses it only when the link's site matches the store or brand name. Next fallback: the store's own site search (`siteSearch()` in `lib/social.ts`, from `items.store_site`, set by trigger `set_store_site` from the order's sender via `site_of()`, server-only; feeds get it through `item_sites`, her page and shared looks include it), only for well-known stores in the `SEARCH` list and only when the store or brand name matches the site exactly. Last resort: Google Shopping. `read-order` also unwraps destinations embedded in tracking links (`embedded()`, only on tracker hops).

Outfits: table `outfits` (owner-only; `layout` is a list of {id, x, y, w, r, cut}, shares of the board width, max 12 pieces; `cut` means show the cut-out photo). Built at `/outfit/edit/[id]` (`new` to start, `?with=<item>` to start from a piece) with `CollageEditor` in `lib/collage.tsx`; shown at `/outfit/[id]` and in Closet > Outfits. Shared looks reach others only through `friends_outfits` and `profile_page` (via `outfit_public`), which drop pieces marked for kids, partner or someone else, hidden or sent back, and return photo, brand, name and store link only; the layout they return is filtered to those same pieces. On feeds, the "Outfits" type tab and the Friends "All" stream show them; each piece in a look is tappable to shop it.
The "Is this yours?" closet prompt is one line. `likelyWho()` guesses only on a real sign (a men's piece in a women's closet or the reverse means partner); otherwise it asks "Is this one yours?" with Mine, or Change (a small menu). Each non-cut piece sits on a patch of board color with its photo multiplied onto it, so white backgrounds vanish but overlapping photos stay solid. Pieces are cut out automatically: `ensureCutouts()` (`lib/cutouts.ts`) asks `cut-out` for each of her pieces once per device (from Closet, the outfit builder and outfit pages), and `ItemImage` (pass `cutId`) and boards show `cutouts/<id>.png` whenever it exists, else the photo. Which pieces have one is remembered on the device (`cut-ok`, `cut-no`, `cut-tried`); a piece with no copy yet (including friends' shared pieces) is queued for one. On a board, "Show photo" stores `cut: false` for that piece. No wear tracking is shown. New outfits are private until she turns sharing on; saving a look marks its pieces as hers.

AI styling (capped at 40 runs a day per person via `ai_runs`, server only): `StyleMe` in `lib/style.tsx` (Closet > Outfits card, and the "Style this piece" sheet) calls `style-outfits`; `autoLayout()` places pieces by type on a board; Save or Tweak saves a private outfit.
Share links: `ShareSheet` in `lib/share.tsx` (outfit page and the closet piece sheet) asks first, then on "Make a link" sets `link_shared` on the outfit or item, which makes `/l/[id]` or `/p/[id]` public (read through `public_look` / `public_piece`, which return only her first name, same privacy as feeds: no kids or others' pieces, nothing hidden or sent back, never price or size). `/api/story/[kind]/[id]` draws the Instagram story picture (1080x1920; `?t=clean|blush|night`) or link preview (`?og=1`) with next/og, cut-outs first, PNG/JPEG only. Sharing to Instagram copies the link for a link sticker; a website can't add the sticker itself. Public pages are fixed layers over the phone frame (`app/pub.tsx`, `pub.css`).
Closet tabs follow `?view=` via `useSearchParams` (page wrapped in Suspense).
Getting around (`lib/nav.tsx`): every history entry is stamped with `actDepth` (pushState/replaceState are wrapped once, so Next's own writes keep it; push = one deeper, replace = same, fresh load = 0). `BackLink` / `useGoBack(fallback)` go back when the page behind is in the app, else replace to the fallback, so use them for every back control instead of fixed links. `useSheetHistory(open, close)` gives each sheet a history step so the iPhone back swipe closes it; call `leaveSheets()` before replacing the page from inside a sheet. `NavTracker` (layout) remembers each tab's last view (without `piece`, `shelf`, `find`) and the tab bar opens it. The Closet shelf is `?shelf=`; `?piece=` is taken out of the address as soon as the sheet opens. `app/not-found.tsx` is the 404.
Error alerts: `ErrorReporter` (`lib/errors.tsx`, in the layout) and `app/error.tsx` send crashes to `report-error`, at most 5 per page load, skipping network and browser-extension noise. Owners see the last 20 on `/admin` and can clear them.
Owner dashboard: `/admin`, a full-width web page outside the phone frame (`.adm` styles in `globals.css`; not linked from the app, open it by address), owners listed in `admins` (no policies, server only). `admin_stats()` and `admin_users(q)` refuse non-owners. Funnel uses `events` (step names only: welcome, claimed, goal, app_open; logged by `track()` in `lib/track.tsx`, once per device, app_open once a day). `expenses` and `admin_log` are owner-only. AI cost is an estimate (per-email constants in the page). Traffic is Vercel Analytics (`<Analytics />` in the layout).

Legal pages: DRAFTS in `lib/legal.tsx` (one data object per document), shown at `/legal`, `/legal/[doc]`, `/privacy`, `/terms`. They describe what the app actually does; when you change data collection, sharing, storage or providers, update them in the same change. [Brackets] are for counsel. Remove the draft banner only after legal review.

Profile photos: public Storage bucket `avatars`, one file per person at `<handle>.jpg` (shrunk to 320px on the phone by `PhotoPicker` in `lib/feed-ui.tsx`); only the owner can write hers. `Avatar` shows the photo when there is one, else the colored initial.
Auto-update: each deploy bakes its version into the app (`NEXT_PUBLIC_BUILD_ID` from `next.config.ts`); `AutoUpdate` in `lib/auto-update.tsx` checks `/api/version` when the app comes back to the screen and every 5 minutes, and reloads once per new version (not while she's typing).
Today shows no spending totals (people don't enjoy seeing them); prices stay on orders and brand pages.
First run (from a blind new-user test): the lander pins a Gmail button to the bottom on phones whenever its own buttons are off screen (`LanderSticky` in `lander-cta.tsx`) and says plainly that Google will ask to read email. `/import` ends with a grid of her pieces and "Open my closet". Today shows one setup card at a time, after the big card (shopping email on day one, Home Screen tip from day two; `first-day` in localStorage), and only sends her to `/follow` after she has opened Closet once (`seen-closet`). Today's "Style me for the weekend" card opens Closet > Outfits with `?style=Weekend`, which starts a run. Closet shows one prompt at a time (who it's for, then the feed card). A men's piece without a men's majority in her closet is asked about (`needsAsk`, `askReason`). Empty Orders, Closet and Feed each have one plain empty state; zero-count tabs and empty filter rows are hidden.

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

- Gmail is checked only while the app is open (hourly quiet check plus Settings > Look for new orders). Refresh tokens are stored, so a server job
  for true background sync (and alerts with the app closed) is the next step.
- Cash back is "coming soon". Partner research done (Wildfire recommended); on hold.
- Shopping email uses `shop.myocto.co` for testing. Real domain (e.g. actually.shop)
  not bought yet.
- Google app is in Testing: each tester's Gmail must be added in Google Cloud. Going
  past 100 users needs Google's review; draft privacy policy, terms and delete-your-data pages exist (`/legal`) and need counsel review.
- Restaurants, tickets, groceries and digital purchases are skipped on purpose.
- Return windows use each store's rule when its emails state one (`orders.return_days`, `return_note`, read by `read-order`); otherwise the usual 30 days, and the order page says so.
