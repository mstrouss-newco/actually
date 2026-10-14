# Changelog

Newest first. One line per change, in plain words. Link the PR.

## 2026-10-14

- Design pass to match the design board: product photos instead of store logos on Today, Orders and the order page (logos now sit small on a soft colored tile when there's no photo), order page lists each item with its photo, order rows keep long names on two lines with the date chip up top, Earn shows fanned item photos on the closet worth card and store logos on points, welcome alerts stay put and the button no longer squishes, gray text darkened for easier reading. Gray-arrow logo source dropped.
- QA round 4: stores matched across shipping services (Rawlings, Bouqs), Amazon delay notices fold into their order, shipped a week ago with no news = "Likely arrived", every order is in a tab, timeline says "Out for delivery" and "Delivery date changed". Item reader also reads shipping emails for orders with no order email (Chewy, Huckberry) so they get real names. Closet: "Is all of this yours?" quick check, "(our guess)" label, keeps the more specific item name. Points: newest email per store only (much faster), no credit cards or app credit, no empty balances. Import strip says "Checking points and credit".
- Settings shows whether Gmail is connected, with a "Connect Gmail" button that saves Google's pass on the server (Google secret now set).
- QA round 3: one row per order (Kizik, J.Crew, CrunchLabs, Nike, Charmin, EPI), out-for-delivery counts as delivered after 2 days, old quiet orders say "Last update", stores merged by web address, untitled orders say "Store order". Closet drops cases, adapters and key cards, merges the same piece read twice, guesses kids from 12C-style sizes and matching names, asks about women's pieces in a men's closet. Undo lasts 8 seconds and order Remove has Undo. Today's return card only for clothes. Worth skips pieces under $10. Restaurant platforms, school supply packs and hair-loss products skipped. Gmail pass renewed by the server (`gmail-token`, `gmail_tokens`) so no hourly reconnect once Google's secret is set.
- Settings screen (person icon on Today): look for new orders, disconnect Gmail, delete my orders and closet (start fresh), sign out, delete account and all data. New `delete-account` function.
- Closet: "Who is this for?" (kids' items sorted on their own, only odd sizes get asked, answers carry to the same brand and size; Mine / Kids / Partner tabs; Sizes counts only your things). "Remove from closet" with Undo, stays removed after imports. Logos: second logo source, store web address guessed from the name, store logo instead of a letter when there's no photo.
- Blind QA fixes. Privacy: eyewear (Warby Parker and similar), health and wellness labels, carrier notices (UPS, FedEx), phone bills, restaurants and kids' sign-ups are never saved; saved ones scrubbed; Sort keeps things private by default. Orders: one order per order number across store-name spellings, Chewy deliveries close the right order, delay notices aren't "shipped", orders quiet for a month count as arrived, in-store receipts say "Bought in store", years on old dates. Closet, Sort and Worth show only clothes, shoes, bags and accessories (everything else stays in Orders). Points found during import; Gmail pass kept for its full hour. Order page buttons clear the menu, "Never show" moved behind Remove, Closet shelves work with Back.
- Shopping-email receiver now uses the latest rules: pet supplies and Autoship count, health brands blocked by name.
- Project docs for agents: `AGENTS.md`, `CLAUDE.md`, this changelog, and the full database history in `supabase/migrations/`.
- Import runs in the background with a progress strip; later imports only read new mail; import screen no longer gets stuck; health brands blocked by name (Ro via Narvar). ([#13](https://github.com/mstrouss-newco/actually/pull/13))
- QA fixes: "order" must read like a purchase (no news headlines or court orders), real refunds only, promos skipped, Stripe receipts kept, Chewy deliveries close the right order, pet supplies and Autoship count as shopping. ([#12](https://github.com/mstrouss-newco/actually/pull/12))
- Orders say what's inside ("Garden Supplies"), Amazon emails grouped into one order, store logos, review requests and reminders skipped, health contents blocked, tickets and restaurants skipped. ([#11](https://github.com/mstrouss-newco/actually/pull/11))
- Only real shopping orders are saved: AI screen plus a sensitive-sender block list, one-time cleanup of old data, "Remove" and "Never show this store" on orders, new `/login` page. ([#10](https://github.com/mstrouss-newco/actually/pull/10))
- Gmail import no longer stops when Google says "slow down". ([#9](https://github.com/mstrouss-newco/actually/pull/9))
- Sign-up asks Google only once; clear message when the Gmail box isn't ticked. ([#8](https://github.com/mstrouss-newco/actually/pull/8))

## 2026-10-13

- Shopping email: mail to name@shop.myocto.co is forwarded to the user's inbox and saved as orders (Resend + `inbound-email`). ([#7](https://github.com/mstrouss-newco/actually/pull/7))
- Phase 4: Feed tab, public profile pages, follow, find people. ([#6](https://github.com/mstrouss-newco/actually/pull/6))
- Phase 3: Earn tab, points and credit from email, resale estimates, copy-ready listings. ([#5](https://github.com/mstrouss-newco/actually/pull/5))
- Phase 2 part B: AI reads items from order emails, Closet, Sort. ([#4](https://github.com/mstrouss-newco/actually/pull/4))
- Phase 2 part A: Today, Orders, Order detail, tab bar. ([#3](https://github.com/mstrouss-newco/actually/pull/3))
- Gmail import of past orders. ([#2](https://github.com/mstrouss-newco/actually/pull/2))

## 2026-10-12

- Phase 1 sign-up screens, Google sign-in, saved profiles, safe Next.js version. ([#1](https://github.com/mstrouss-newco/actually/pull/1))
- Real app started (blank Next.js starter in `app/`).

## Before 2026-10-12

- Clickable demo (`demo/`) with three journeys (organize, earn, share), resale and donate screens, and product screenshots.
