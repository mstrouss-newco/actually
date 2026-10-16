// The exec one-sheet at /brief: what Actually is, what's built, how, the stack, money and roadmap.
// Written for company ownership and the tech team. Keep it true to the app; update it when big things change.
export const BRIEF_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Actually: one sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,400;1,9..144,600&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#141210;--soft:#5E5852;--muted:#8A837C;--line:#ECE7E1;--paper:#FFFFFF;--tint:#FAF8F6;--blush:#FFE1DC;--sage:#DCEFDF;--butter:#FFF0BF;--sky:#DCEBFF;--red:#C9402F}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 'DM Sans',system-ui,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:48px 28px 80px}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.logo{font-family:'Fraunces',serif;font-style:italic;font-weight:600;font-size:26px}
.stamp{font-size:13px;color:var(--muted)}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:clamp(40px,7vw,68px);line-height:1;letter-spacing:-.03em;margin:36px 0 0}
h1 em{font-weight:400}
.lede{font-size:clamp(17px,2.2vw,20px);color:var(--soft);max-width:720px;margin:18px 0 0}
h2{font-family:'Fraunces',serif;font-weight:400;font-size:30px;letter-spacing:-.02em;margin:0}
section{padding:44px 0 0;margin-top:44px;border-top:1px solid var(--line)}
.kick{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.note{font-size:14px;color:var(--muted);margin-top:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px}
.card{border-radius:20px;padding:18px 20px;background:var(--tint)}
.card h3{margin:0;font-size:16px}
.card p{margin:6px 0 0;font-size:14.5px;color:var(--soft)}
.card ul{margin:8px 0 0;padding-left:18px;font-size:14.5px;color:var(--soft)}
.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.c1{background:var(--blush)}.c2{background:var(--sage)}.c3{background:var(--butter)}.c4{background:var(--sky)}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14.5px}
th{text-align:left;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px 12px 8px 0;border-bottom:1px solid var(--line)}
td{padding:11px 12px 11px 0;border-bottom:1px solid var(--line);vertical-align:top}
td b{font-weight:700}
.tw{overflow-x:auto}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px}
.step{border-left:3px solid var(--ink);padding:2px 0 2px 16px}
.step .when{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
.step h3{font-family:'Fraunces',serif;font-weight:400;font-size:22px;margin:4px 0 6px}
.step ul{margin:0;padding-left:18px;font-size:14.5px;color:var(--soft)}
.big{font-family:'Fraunces',serif;font-size:44px;line-height:1;letter-spacing:-.02em}
.pull{background:var(--ink);color:#fff;border-radius:24px;padding:26px 28px;margin-top:18px}
.pull p{margin:0;font-size:17px;color:#E8E3DD}.pull b{color:#fff}
a{color:var(--ink)}
@media print{.wrap{padding:24px}section{break-inside:avoid}}
</style></head><body><div class="wrap">

<div class="top"><div class="logo">Actually</div><div class="stamp">One sheet for ownership and the tech team · October 16, 2026 · Confidential</div></div>
<h1>Your order emails, <em>sorted out.</em></h1>
<p class="lede">Actually reads a shopper's order emails (with her permission) and turns them into a closet of everything she owns, every return deadline and delivery, points about to expire, what her clothes would resell for, and a feed of what her friends love. It is live in a private beta at <a href="https://actually-app.vercel.app">actually-app.vercel.app</a>.</p>

<section>
<div class="kick">The plan in one line</div>
<div class="pull"><p><b>Take it as far as we can agentically, then add tech people where they're needed.</b> One owner has built the product end to end by directing AI agents: design, code, database, releases and testing. That keeps cost near zero while we prove people want it. As specific needs appear (security audits, an App Store app, scale, payments), we bring in our tech team for those pieces, on a codebase that is documented and ready to hand over.</p></div>
</section>

<section>
<div class="kick">What's built and live</div>
<h2>A working app, not a prototype</h2>
<div class="grid grid2">
<div class="card c1"><h3>Inbox to closet</h3><ul><li>One tap "Continue with Gmail" (read-only)</li><li>AI sorts shopping mail from everything else</li><li>Orders, returns, deliveries and cancellations grouped automatically</li><li>A free shopping email address for new orders</li></ul></div>
<div class="card c2"><h3>Organize</h3><ul><li>Closet of every piece, with photos, brand and size</li><li>Return deadlines using each store's own rule</li><li>Delivery tracking and "likely arrived"</li><li>Brands page: her size and return rules per brand</li></ul></div>
<div class="card c3"><h3>Earn</h3><ul><li>Store points and card rewards about to expire</li><li>Resale value estimates for her closet</li><li>Cash back links: designed, partner talks next</li></ul></div>
<div class="card c4"><h3>Social and style</h3><ul><li>Friends feed with hearts and Taste Match</li><li>Outfit maker with automatic background removal</li><li>AI styling: "Style me" and "Style this piece"</li><li>Share links and Instagram story pictures</li></ul></div>
</div>
<div class="grid">
<div class="card"><h3>Front door</h3><p>A moving landing page, Gmail-first sign-up in two taps, name filled in from Google.</p></div>
<div class="card"><h3>Running the business</h3><p>Owner dashboard (users, funnel, weekly activity, costs, errors, account deletion), error alerts by email, traffic analytics.</p></div>
<div class="card"><h3>Trust</h3><p>Draft privacy policy, terms, cookie and delete-your-data pages. She can delete her data or her whole account from Settings.</p></div>
</div>
</section>

<section>
<div class="kick">How it's built</div>
<h2>Agentic by default</h2>
<table><tbody>
<tr><td><b>Who builds</b></td><td>The owner directs AI coding agents (Claude). Agents write the code, design screens on a shared design board, change the database, deploy, and write the documentation.</td></tr>
<tr><td><b>How quality is kept</b></td><td>Every batch of changes is checked by a separate AI tester that didn't build it, acting as a first-time user on phone and computer sizes. It reports problems; they get fixed before moving on.</td></tr>
<tr><td><b>How work ships</b></td><td>Each change is a small reviewed branch with an automatic preview, then merged to live. Every change is logged in plain English.</td></tr>
<tr><td><b>Handover-ready</b></td><td>The code repository includes a guide for engineers and agents (how data flows, every server function, every privacy rule), every database change in order, and a dated change log.</td></tr>
</tbody></table>
</section>

<section>
<div class="kick">Tech stack</div>
<h2>Standard, hosted, low cost</h2>
<div class="tw"><table><thead><tr><th>Layer</th><th>What we use</th><th>Why</th></tr></thead><tbody>
<tr><td>App</td><td>Next.js 15 and TypeScript, as a web app that installs to the iPhone home screen</td><td>One codebase for phone and computer; no App Store wait</td></tr>
<tr><td>Hosting</td><td>Vercel</td><td>Every change gets a preview; live in minutes</td></tr>
<tr><td>Data and accounts</td><td>Supabase: Postgres database, sign-in, file storage, server functions</td><td>Row level security: each person can only ever read her own rows</td></tr>
<tr><td>AI</td><td>Anthropic Claude (Haiku) for sorting and reading order emails, resale estimates and styling</td><td>Cheapest capable model; capped at $25 a month today, with a daily cap per person on styling</td></tr>
<tr><td>Email</td><td>Gmail API (read-only), Resend for the shopping email address and alerts</td><td>Read-only access; we can never send, delete or change her mail</td></tr>
<tr><td>Code and history</td><td>GitHub</td><td>Every change reviewed and recorded</td></tr>
</tbody></table></div>
<p class="note">Running cost today is small: hosting on starter plans and AI capped at $25 a month. About $0.50 of AI per new user to read their history, then pennies a month after that.</p>
</section>

<section>
<div class="kick">Privacy, built in</div>
<h2>What we never keep</h2>
<p class="lede" style="font-size:16px">Health, pharmacy, banking, insurance, legal and adult mail are dropped before anything is read, in four layers (sender, brand, subject words, then AI). Only sender, subject and preview are used to decide; full emails are read only for orders. Anything shared with friends never shows price, size or order details, and pieces for kids or a partner are always private. This follows Google's rules for apps that read Gmail.</p>
</section>

<section>
<div class="kick">How it makes money</div>
<h2>Five ways, added as we grow</h2>
<div class="tw"><table><thead><tr><th>Way</th><th>Who pays</th><th>How</th><th>Starts at about</th></tr></thead><tbody>
<tr><td><b>Shopping links</b></td><td>Stores, through a partner like Wildfire</td><td>She buys through our link; the store pays a fee; we share part as cash back</td><td>Day one</td></tr>
<tr><td><b>Feed sales</b></td><td>Stores</td><td>A friend buys something she shared; we split the store's fee with her</td><td>5,000 users</td></tr>
<tr><td><b>Resale and trade-ins</b></td><td>Resale sites</td><td>We send her pieces to sites like ThredUp, eBay and The RealReal</td><td>5,000 users</td></tr>
<tr><td><b>Brand offers</b></td><td>Brands directly</td><td>"Buy from this brand, get $10 back"; paid per proven new buyer</td><td>25,000 users</td></tr>
<tr><td><b>Trend reports</b></td><td>Brands and retailers</td><td>Combined, anonymous buying patterns, never built from Gmail data (Google's rule)</td><td>250,000 users</td></tr>
</tbody></table></div>
<div class="grid">
<div class="card"><div class="big">$5 to $20</div><p>per active user a year from links alone (similar apps)</p></div>
<div class="card"><div class="big">$20 to $40</div><p>per user a year once brand offers are on (Ibotta and Fetch range)</p></div>
<div class="card"><div class="big">$3 to $7</div><p>what an interested lead has cost in our ad tests (Sept: $7.07 average)</p></div>
</div>
<p class="note">Revenue today is $0; the app is in a private beta. Watch-outs: a large share of orders are from Amazon, which pays low fees with strict link rules; and links only pay if she taps through us before buying, which we still need to prove. A live, editable 5 year model is at /model.</p>
</section>

<section>
<div class="kick">Roadmap</div>
<h2>Where it goes next</h2>
<div class="steps">
<div class="step"><div class="when">Now · next 6 weeks</div><h3>Open the doors</h3><ul><li>Google's Gmail approval plus its yearly security check ($500 to $1,000 a year, 4 to 12 weeks)</li><li>Legal review of the draft policies</li><li>Real domain and shopping email address</li><li>Cash back partner (Wildfire) conversation</li><li>Grow testers past family and friends</li></ul></div>
<div class="step"><div class="when">Next · this quarter</div><h3>Make it earn</h3><ul><li>Cash back links live</li><li>Orders sync in the background, even with the app closed</li><li>Alerts for returns closing and points expiring</li><li>Outlook support; Pinterest sharing</li></ul></div>
<div class="step"><div class="when">Later · 2027</div><h3>Scale</h3><ul><li>App Store app (link stickers, notifications)</li><li>Brand offers at about 25,000 users</li><li>Resale and trade-in partners</li><li>Trend reports at scale</li></ul></div>
</div>
</section>

<section>
<div class="kick">Where the tech team comes in</div>
<h2>Clear moments to add people</h2>
<div class="tw"><table><thead><tr><th>When</th><th>What we'd ask for</th></tr></thead><tbody>
<tr><td><b>Now, light touch</b></td><td>A weekly look at what the agents shipped; own the Google security check and any penetration test</td></tr>
<tr><td><b>Background sync</b></td><td>Review the server jobs that read mail while the app is closed: reliability, retries, cost</td></tr>
<tr><td><b>Money moves</b></td><td>Cash back payouts to users: payments, tax forms, fraud and compliance</td></tr>
<tr><td><b>App Store app</b></td><td>A native iPhone app once the web app proves itself</td></tr>
<tr><td><b>Scale and on-call</b></td><td>Monitoring, incident response and data engineering past about 10,000 users</td></tr>
</tbody></table></div>
</section>

<section>
<div class="kick">What we need</div>
<div class="grid">
<div class="card c1"><h3>From ownership</h3><ul><li>A small budget: Google's security check, domain, legal review, a few thousand in ads to test growth</li><li>A yes on the agent-first approach, with checkpoints</li></ul></div>
<div class="card c2"><h3>From the tech team</h3><ul><li>A named reviewer, an hour a week</li><li>An owner for the security check</li><li>Your read on when we need a native app</li></ul></div>
</div>
</section>

</div></body></html>`;
