# Changelog

Newest first. One line per change, in plain words. Link the PR.

## 2026-10-16: Deck ad tests slide

- New slide with the July to September paid test results (benchmarks, not optimized) and what an active user costs: Earner about $7, Organizer about $13, Chirp users almost $0, with payback months. Ownership ask now includes testing the earning message on Chirp users.

## 2026-10-16: Deck tech stack slide

- Tech stack moved up to its own slide (after Discover) with each product's real logo: Next.js, Vercel, Supabase, Claude, Gmail, Resend, GitHub, Wildfire. The appendix keeps how it's built and privacy.

## 2026-10-16: Deck go-to-market slide

- Go to market is now two customer cards (The Organizer, our priority, and The Earner), each with who she is, the message, a moving example, why it lands and where we find her, plus the three launch steps underneath.

## 2026-10-16: One deck at /brief

- The one sheet and the features tour are merged into one slide deck at `/brief/deck` (same password): cover, connect, organize, earn, discover, money, go to market, roadmap, what we need, appendix. Arrow keys, space or the corner buttons move a slide; phones keep moving. The old one-sheet HTML is gone.

## 2026-10-16: Key features tour

- New `/brief/features` (same password as `/brief`): connect Gmail, organize, earn and discover, each shown as a moving phone built from the lander's screens plus new ones (Gmail import, brand page, Style me, cash back, earn from sharing, resale, her page, Taste Match, saved). Each card says Live or when it's coming.
- The password check now lives in `brief/pass.ts`, shared by both pages. Lander screens are exported for reuse.

## 2026-10-16: /model page
- Added `/model`: owner-only 5 year money model (ad spend, sign ups, revenue, net), behind a password. Source: `app/src/app/model/`.

## 2026-10-16

- Exec one sheet at /brief, behind a password (only its hash is in the code): what Actually is, what's built, how it's built with agents, tech stack, privacy, money, roadmap and when the tech team comes in.

- Styling and sharing QA fixes: a share link is made only when she taps "Make a link", looks and pieces show "Link on", and "Turn off this link" works right away (no caching of shared pages; story pictures cached 1 minute). Shared pages show only her first name and aren't listed by search engines. Styling has a daily cap (40 runs per person, `ai_runs`), always includes the piece being styled, has Try again, and keeps shoes on the board. Share to Instagram waits for the picture. Fixed a page redraw on public pages and the shop tag showing through the share sheet.

- AI styling: "Style me from my closet" in Closet > Outfits (pick an occasion, get 3 looks, save, tweak or see 3 more) and "Style this piece" on any piece (3 ways to wear it). New `style-outfits` function (Haiku; sees only type, brand, name, color). Looks are laid out on boards by `autoLayout()` in `lib/style.tsx`.
- Share links and Instagram: Share on a look or a piece makes a public link (`/l/[id]`, `/p/[id]`; `link_shared` on outfits and items; `public_look` / `public_piece`) with link previews, and a story picture in 3 styles (`/api/story/[kind]/[id]`) that opens the share sheet for Instagram with the link copied for a sticker. "Turn off this link" undoes it. Never prices or sizes. Privacy draft updated.
- Closet tabs (Pieces, Brands, Outfits) now follow the address, so coming back from a look or a brand always lands on the right tab and hopping between them works.

- "Taste Match" capitalized on the feed.

- Cut-outs for looks and pieces already shared: anyone who sees a friend's shared piece or look asks for its cut-out, and `cut-out` now allows pieces that are shared (on their own or in a shared look), not just her own. Failed tries are retried on a later visit.

- Lander on phones: the Gmail button sits right under the moving app screen.

- Lander and dashboard QA fixes: dashboard search and expense boxes keep focus while typing; money shows cents properly and big numbers get commas; phone-width dashboard header tidied. Lander phones fit on smaller laptops (901 to 1240 wide); Gmail buttons never squash; the hidden app welcome no longer sits under the lander; copy says "We only save your shopping emails"; counters count once; page description updated.

- New lander for browser visitors at "/" (`app/lander.tsx`, `lander.css`): moving phone screens (Today with store alerts, Closet filling in, the outfit maker, a scrolling friends feed), a strip of real store logos, money cards and Gmail buttons. Opened from the Home Screen, "/" is still the app's welcome (`app/welcome.tsx`). Phone and computer layouts.
- Owner dashboard is now a full-width web page (sidebar, top numbers, funnel and weekly chart side by side, people table, money, errors, owner log). Removed from the app's Settings; open it at /admin. Signed-out visitors there get a Sign in button.

- Cut-outs everywhere: her pieces get their plain photo background removed automatically in the background (`ensureCutouts()` in `lib/cutouts.ts`, from Closet and outfits), and every piece tile and outfit board uses the see-through copy when there is one, so no grey or off-white boxes. Busy photos (a model, a room) keep theirs. On a board, "Show photo" switches one back (`cut: false`).

- Today header: search on the left, her profile photo (to Settings) in the far right corner.

- New-user QA fixes: Today no longer sends someone who already connected Gmail back to connect again when nothing was found; the shopping email card shows even with no orders; the import screen says "Looking for points and credit" instead of "All done" early, and explains when nothing was found; Gmail button stays on screen on small iPhones; error reports hide email addresses; the crash screen links to Closet and Orders.

- Today greets her by her first name from Google with the time of day ("Good morning, Claire."), and refills her name if the device lost it.

- Blind QA fixes for the new sign-up: name card shows only right after a new account is made (per account); a failed save is no longer treated as success; a failed account lookup never renames someone; accounts always get a row even without a name; accented names keep their letters (José → jose); error reports strip quoted text and links; alert email subject is fixed text; Gmail taps count in the funnel only from the welcome screen.

- Sign-up is now Gmail first: the welcome screen has "Continue with Gmail", her name comes from Google (change it on the import screen), and the name and goal steps are gone. Shopping email moved to a card on Today. Welcome cards now show a return, a friend's love and a resale value.
- Error alerts: app errors go to a new `app_errors` table through the `report-error` function, which emails owners at most once an hour. Errors list on the owner dashboard. A crash screen offers Try again. Privacy draft mentions error reports.

- Draft legal pages (marked pending legal review): Privacy Policy, Terms of Service, Cookie Policy, Google Data Use (Limited Use statement), Delete Your Data, Community Guidelines, Affiliate Disclosure. At /legal, /privacy and /terms; linked from the welcome screen, under the Gmail button and in Settings. Placeholders in [brackets] for counsel.

- Owner dashboard at /admin (link in Settings, owners only): users, sign-up funnel, feed activity, last 8 weeks, AI cost estimate, expenses you can add, revenue (waiting on Wildfire), people search with delete, and an owner log. New tables `admins`, `events` (sign-up step names only), `expenses`, `admin_log`; functions `is_admin`, `admin_stats`, `admin_users`; edge function `admin-delete`. Vercel Analytics added for traffic.

## 2026-10-15

- Blind QA fixes: a shared piece is shared on one copy only (no doubles on friends' feeds); store-site search only for well-known stores with an exact name match (no way to point a friend's tap elsewhere); shared looks no longer carry ids of kids', partner's, hidden or returned pieces; deleting data or an account also deletes her cut-out photos; Today's top card grows to fit instead of spilling; the outfit toolbar fits on one row (✕ on the piece removes it); the app won't auto-reload while she's building an outfit or sorting.

- Links work more often: (1) when we don't have the exact product page, tapping opens the store's own site search for that piece (new `items.store_site` from the order's sender, `item_sites` for feeds); (2) the server now reads the real address many tracking links carry inside them; (3) older pieces get checked faster (80 orders per visit, and every piece gets a fresh try).

- Photos with a plain gray or colored background no longer sit in a visible box: the tile takes the photo's background color (read from its corners when the store allows). White backgrounds already blend in.

- Fix: photos in an outfit no longer show through each other where they overlap. Each photo sits on its own patch of board color, so white backgrounds still disappear.

- Today: card titles are smaller and never cut off. The returnable card reads "Keep it or send it back?" with the piece, store and return date underneath.

- Delivery tracker labels now read Ordered, Shipped, Out for delivery, Delivered.

- Fix: answers stick. A piece that arrived in two emails (order and shipping) kept asking "Is this yours?" because the answer was saved on one copy and the other showed. Now who it's for, Sort choices and Remove apply to every copy.

- Outfits: white photo backgrounds now melt into the board (no more white boxes). New "Cut out" button on a selected piece removes the photo's background for real (new `cut-out` server function, saved once per piece in the `cutouts` bucket); "Show photo" puts it back. Photos with a busy background (someone wearing it, a street) are left as is, and she's told why. Removed wear tracking (Wore it today, Not worn yet) from outfits.

- The app updates itself: when a new version is live, it quietly reloads the next time you open it (or within 5 minutes while open, never while typing). Works from the Home Screen too.

- No emoji-style arrows; removed the "Shop" labels under look pieces and on Saved (tapping already shops). The shop tag on a look is centered so it never runs off the screen.

- Fixes: "Is this yours?" no longer guesses partner without a real sign (size-only cases now ask "Is this one yours?" with Mine / Change); a ✕ on the selected piece takes it off the outfit board; new looks are private until she turns sharing on; only her own pieces can go in a look (and saving marks them hers); second finger always pinches the held piece; shop tags stay on the board; Wore it today uses her local date; a friend with only looks opens on Outfits; friends who only shared looks show in the faces row; Orders photo view shows every recent order.

- Outfits: build a look from your closet on a board (drag, pinch, front/back), name it, tag an occasion, share it. Lives in Closet > Outfits; shared looks show on feeds under a new Outfits tab, and every piece is tappable to shop. "Make an outfit with this" on each closet piece.
- Closet: "Is this yours?" is now one line with our guess, Right or Change.

- Feed: removed the "What people you follow just bought" line under Friends.

- Orders: the photo view now shows every order with pieces, with feed-style type tabs (Tops, Shoes, Bags, Skincare, Home, Other...) that only appear when you have that type. "List" switches to every order.

- QA fixes: product links can only be set by our server and must be on the store's own site; safer link following; a newly hearted piece shows on Saved right away; photo upload says when it fails; names and counts tidied on the feed; Settings explains what "Delete" clears.

- Profile photos: tap your circle on My feed, your page or Settings to add one. Friends see it everywhere your initial used to be.
- Today no longer shows how much you spent this month.

- Friends: type tabs and a sort button (Newest, Brand, Type) on a friend's page and when you tap a friend's face. The sort button now always says what it's sorted by.

- Feed: heart a friend's piece (heart and Shop under each photo), a new Saved tab for everything you loved, love counts on your own pieces (never who), and a row of friends' faces to see just one person.

- Earn: the "worth about" range always stays on one line (replaces old PR #23).

- Pieces now link to their real page on the store's site (found from the order email, tracking stripped). Feed taps and a new "See it on ..." button in the closet use it; a shopping search is the fallback. Older pieces get links on the next import.
- The app no longer slides sideways, bounces or zooms like a web page on iPhone.

- Feed by type: Friends and My feed have plain type tabs (All, Tops, Bottoms, Shoes, Bags, Accessories, Skincare; only types that have pieces). Picking a type on Friends shows a two-column grid with who shared each piece. My feed is calmer: one profile line with Share, a quiet "N new pieces · Sort" row, and a small order button (Newest, Brand, Type).

- Returns leave the closet: each return and refund email is read once (`read-order` mode "returns", `readReturns()` in the import) to learn which pieces went back, matched by store and product name, so partial returns and return emails with no order number (Bloomingdale's, Amazon, Loop, Narvar) now work. Returned pieces (`items.returned_at`) are hidden from Closet, Sort, Worth and the feed; whole-order returns with no item list are hidden too. Migration items_returned.

- Sort: a clear "Show my feed" button while swiping; pieces not swiped stay unsorted and wait for next time (no need to mark them private to leave).

- Follow brands: a one-time "Your brands" screen (`/follow`) after the closet fills in, every brand pre-checked, one tap to follow; Today shows "Brands you follow"; brand pages have Follow / Following, switches for sales, new arrivals and price drops, and "You might also like" (brands at least 3 of its followers also follow, counts only); Settings lists followed brands with Unfollow. New table `brand_follows`, `profiles.brands_asked_at`, function `brand_suggestions` (migration brand_follows). Delete-my-data clears follows. Sales and price drop alerts need the Wildfire deal feed and a price source; not built yet.

- Sharing copy: Sort, My feed and the Closet piece sheet say you could earn when a friend buys something you shared; public pages say the person may earn a small reward. (Assumes the cash back partner, Wildfire, is in place before launch.)

- iPhone: the bottom menu tucks away while scrolling down and comes back on the way up; screens leave room for the phone's edges (safe areas). Added to the Home Screen, Actually opens full screen with its own icon (`manifest.ts`, `apple-icon.png`, `public/icon-*.png`), and Today shows a one-time "Keep Actually on your Home Screen" tip in iPhone Safari (`lib/home-tip.tsx`).

- Feed: My feed is the first tab and opens by default until people you follow have shared something. My feed tiles match the design (tall photo, brand, name) and each piece can carry a short note ("Size down one"), shown on your public page too (migration items_note, `profile_page` returns `note`).

- Brands cards (design A, "Photo shelf"): smaller name, a fanned strip of your pieces with a +N tile, size pills and the return window on one line with a pulsing dot. The brand logo shows only when a real one loads; store tiles never fall back to a letter (a small drawing instead).

- Worth list: every piece has a clear "Sell →" button (or "Selling" once it's on the list), the "Marked to sell" tab is now "Selling" with a one-line explanation.

- Resale posts: each piece's Worth page now picks a site (Poshmark, Depop, eBay, Mercari, ThredUp), suggests a price per site, and builds an editable post (title within the site's limit, condition, description, hashtags for Depop). "Copy and open" copies it, adds the piece to the sell list and opens the site's sell page. Closet piece sheet has "Make a resale post" once a piece is marked to sell.

- Prices: `read-order` now saves the order total (with tax and shipping) into `orders.amount`, in the main read and the rules pass. Orders without one show the piece prices added up as "Items (before tax and shipping)". Each piece shows its price on the order page, Today says how much was spent this month, and brand pages show spent per brand. Never on anything shared.

- Points: airline and hotel miles, and credit card points from a short list of card companies (Chase, Amex, Capital One, Citi, Discover, Bank of America, Wells Fargo, Barclays). Card mail only when the subject is about rewards and says nothing about statements, payments or the account; only points or cash back are saved. New "Add points yourself" on Points and credit (migration rewards_manual_insert).
- Sizes on Brands cards and brand pages are small pills ("Shoes 9.5-10.5") instead of big text.

- Sign in: the home page button just says "Sign in", and people who already have an account go straight in instead of being asked to pick a shopping email (a name left on the device from an earlier sign-up no longer gets in the way).

- Sign-up: "Email ready" and "What we read" are now one page. Gmail button sits on the email-ready page with one small line ("Only shopping emails. Disconnect anytime.") instead of the we read / we never boxes. Same change in the demo. /permission (from Today, Reveal, Import) is the calm version too.

- No-photo pieces and orders now show a small drawing of what they are (sunglasses, pants, tee, garden, beauty and more) instead of a big letter.

- QA round 10: smaller brand names (no cut-off letters), pieces on the way can go on your feed, closet card says "Add pieces to your feed", in-store returns count from purchase day (Sunglass Resort: 5 days, exchange or store credit), Worth counts pieces on the way and prices a color twin the same, sharper Amazon photos, no-photo tiles use the brand's letter, "Levi's" spelling, "nothing new" after a points check, clearer returnable counts, Orders tabs fade at the edge, smaller feed tabs, empty cancelled orders hidden, unnumbered shipping emails read for stores with no order email (J.Crew Factory), Clare V. receipts re-read.

- Blind QA round 9: expected delivery dates (read from the store's email, or "Arriving tomorrow" style subjects) on Today and the order page; orders on the way without one get their email read once. Today: Recent shows the newest orders, "Just landed" only pieces from the last 45 days and opens that piece, the top card keeps one height and holds still while touched, headlines say "8 pieces from Huckberry". Orders: Clothes and shoes leaves out key cards and device cases; Today's search opens it ready to type. Earn prices only pieces that have arrived and names them with colors; different points programs are never added together. Brand pages split Window and Policy. No-photo tiles never split words and show a letter where the name is printed below. Closet rails show the color on its own line; short shelves skip the repeat grid. The month story ends instead of looping.
- Make it feel alive (from the design board's "Make it feel alive" row). Today: a big card that rotates every 5 seconds (arriving, returnable, points, your month), swipe or tap the dots; the return alert drops in with a bell; "On the way" tracking bars slide and pulse; "Just landed" photo rail. Orders opens on "Clothes and shoes" as big photo cards (On the way, Can return, Recent) with household orders folded into "Home and everything else"; "Every order" keeps the tabs. Order page: live tracking bar, floating photo, small confetti the first time you open an order that just arrived. New /story: "Your month in style" tap-through (new pieces, top brand, colors, what's returnable, closet value). Motion everywhere: lists rise in one by one, cards shrink a touch when pressed, Earn numbers count up and the worth bar fills. Fixes: pieces still in the mail say "On the way" and wait to be sorted; each piece uses its order's date; cut-off names end with "…"; refunds name the item; brand pages don't repeat pieces under Past orders and long sizes fit; Earn names the new pieces to price; the closet sort is remembered.
- Pet prescriptions (vet diets, flea and tick medicine) are hidden from the app and removed from saved data. Pet toys and regular food stay.
- Flint and Tinder (Huckberry's own brand) shows the Huckberry logo.
- Blind QA round 8: one piece when two emails name it differently ("Lima" and "Lima shoe", sizes "8" and "8 / Standard"), so Kizik shows 2 pairs, not 4. Look-alike pieces show their color or purchase date. Name tiles never split a word and show a letter, not a number. Taste match buttons fit. Brands keeps the sort you picked. Grid shows item names. "1 piece" wording.
- Catch-up scan follow-up: review requests, "free gift with your order" promos, payment-method warnings, partial item cancellations, Subscribe & Save notices, Whole Foods grocery orders and school yearbooks are skipped. Return rules ignore other countries' rules and are kept to a few words.
- Blind QA round 7 fixes and return reminders. Orders has a "Can return" tab (most urgent first, "Closing soon" for 3 days or less, each store's real rule from its emails) and Today shows a reminder when a return closes within 3 days. Cancelled orders get their own Cancelled tab and stay out of Closet and Worth (cancellations and refunds in Promotions are now found). Each color counts as its own piece and the order photo matches its title. Order emails like "Your Huckberry Order ... Details Inside" are saved. Amazon shipping emails are read for real names and photos. Missing product photos are looked up in the order's other emails. Products never show a store logo; brands show logos on Brands and brand pages. Worth counts the same pieces as Closet and lists what isn't counted and why. Search ignores apostrophes and accents. Kids' socks guessed from same-week kids' orders. Prescription pet items aren't returnable. Points shows point totals instead of $0. Brand cards show the shop's real return rule (no more "our estimate"). Taste match empty state has buttons. Signed-in visitors skip the welcome and sign-in screens. Esc closes sheets. Names capitalized, one avatar color, "since this year" dropped.

## 2026-10-15

- Open QA items: Debbie (joindebbie.com, a debt-payoff app) added to the sensitive list in all three copies and its saved rewards deleted. Sub-brands file under the main brand (TCK Krazisox is TCK). Orders remembers its tab. Sort: a quick flick now counts (it used the last drawn position, which could lag), and a cancelled touch never picks. Amazon emails no longer name the item, only a category, so nothing to read there.
- Same piece in different colors now saves as separate items (Huckberry tee in Black, White and Charcoal was saved once). Items are unique by name, size and color; `read-order` and `inbound-email` redeployed; closet keeps different colors apart. Mike's two missing tees added.
- QA round 6 (real account): Today counts every returnable order, not just clothes. Return countdown starts at the delivery email and counts whole days. "Dropoff confirmed" means return started, not refunded. Worth and Earn count only your own pieces. Order search finds item names. Brand pages say "Returning to" the shop you bought from (Huckberry, not Relwen) and "Open orders". Earn says how many stores have money vs points. Share my feed always copies the link and says "Link copied". Feed remembers its tab. Sort names the shop, wraps long names, says "Swipe up to sell" and "Sort N pieces".
- QA fixes: kids' and partner orders stay off brand pages, returned pieces can't be shared and skip Sort, returns say "Return started" or "Refunded" (not both), Back from a brand lands on Brands, long brand names fit in Sort and brand pages, Sort finish says "All sorted" when nothing is shared and Undo puts back "keep all private", Worth says "Not priced yet" instead of $0, sort tabs hidden on an empty Brands list.
- Feed and Find people match the design board. Feed has three tabs: Friends (big photo posts with brand and name), Taste match (people who shop your brands, with three pieces from their feed) and My feed (followers, Share my feed, Sort N new purchases, On your feed grid). Find people: search, "Friends already here" (people who follow you or you follow) with Follow buttons, a sideways "Shop like you" row, invite card. "Find it" shop links removed from the feed. New `my_people` database function.

## 2026-10-14

- Closet, Brands and Sort match the design board. Closet tabs are Pieces and Brands. Shelves are flat rows with a fan of photos and "N can still go back". Inside a shelf: Sort (Newest, By color, By brand, Returnable first), a hanging rail with Return by, New and Returned tags, then all pieces 3 across. Brands: search, one card per brand with your sizes and the return window (30-day estimate), and a new brand page (sizes, open orders, pieces, past orders). Sort: drag card with Keep private, Share and Up to sell, "Keep the other N private", "Your feed is ready" finish. Fixes the Sort button running off the edge.
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
