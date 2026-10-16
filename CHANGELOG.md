# Changelog

Newest first. One line per change, in plain words. Link the PR.

## 2026-10-15

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
