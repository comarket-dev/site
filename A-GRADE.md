# A-grade experiment

A throwaway copy of `../site`, made 2026-10-24 to try fixing every finding from the UX-law audit and competitor
research. Delete this whole folder to drop it; nothing in `../site` depends on it. Not a git repo on purpose.

- Dev server: http://localhost:4322 (the original runs on :4321). Both use the same local Postgres.
- The owner's standing rules in AGENTS.md still apply in full (no em dashes, outcome first, first-person CTAs,
  creators "claim", yellow marks the sale moment, no icon libraries, no clipped text, never commit).
- Note: all eight example storefronts are already built here (AGENTS.md "Next 1" is stale on that point).

## Who owns which files (only edit your own; ask the owner of a file for changes to it)

| Owner | Files |
|---|---|
| Lead (main session) | `src/components/Hero.astro`, `src/pages/index.astro`, `src/scripts/stage/*`, `src/components/Stage.astro`, `src/layouts/Base.astro`, `src/components/Waitlist.astro`, `src/scripts/waitlist.ts`, `src/scripts/pass.ts`, `src/pages/api/*`, `src/lib/*` |
| UI/UX agent | `src/styles/global.css`, `src/components/Nav.astro`, `Faq.astro`, `Steps.astro`, `Footer.astro`, `Terms.astro`, `brands/Outcome.astro`, `brands/Split.astro`, `creators/Earnings.astro`, `creators/Pitch.astro`, `creators/Hub.astro`, `creators/Credit.astro` |
| Marketing agent | `src/pages/brands.astro`, `src/pages/creators.astro`, `brands/Find.astro`, `brands/Gallery.astro`, `creators/Posts.astro`, and the copy deck below |

## Target: an A on every law

Aesthetic-usability, Hick, Fitts, Jakob, Miller, Doherty, proximity, similarity, common region, visual hierarchy,
progressive disclosure, recognition over recall, von Restorff, peak-end, goal-gradient, serial position, Tesler,
Postel, Occam, feedback loops.

## Copy deck (marketing agent writes; others pull from it)

Exact strings. `{x}` is a variable. Use curly apostrophes (’) in the UI, as the site already does. No em dashes.
Pricing numbers live in one canonical place per page: the Outcome terms block on /brands (from `arm`), the Terms
cards on /creators. Heroes, notes and captures carry no numbers except the follower floor.

### a. /brands hero (brands.astro, marketing)
- title: `Creators sell your product. You pay only for completed sales.`
- mark: `completed sales.` (16 chars, stays on one line; it is the sale moment, so it earns the yellow)
- sub: `We match you with micro-creators your buyers already follow and give each one a storefront in your look. No retainer, no monthly fee, nothing before a sale.`
- button (unchanged): `Show me my storefront`

### b. Fit note under each hero claim field (Hero `note` prop)
- brands: `For subscription and software brands with a Stripe checkout. Shopify is next.`
- creators: `Free, always. From about 1,000 followers, on any platform.`

### c. /creators hero (creators.astro, marketing)
- title: `Brand deals at your size. Get paid on every sale you send.`
- mark: `every sale`
- sub: `Brands pay only when you sell, so they don’t need a big following. They pitch you with the rate up front, and every renewal pays you again.`
  ("you post the way you already do" was cut: the Posts heading right below says it.)
- button (unchanged): `Claim my page`

### d. Inline capture in the hero result line (Hero.astro, lead)
Brands, once the phone re-dresses:
- line: `That’s <b>{name}</b> on Sarah’s storefront. Hold your spot and we’ll build the real one.`
- email placeholder `you@company.com`, hidden label `Work email`, button `Hold my spot`
- success: `You’re No. {N}. We’ll email you once, when your spot opens.` + link `See my pass` (to `#waitlist`, where the pass shows)

Creators, after the handle check:
- free: `<b>comarket.si/{h}</b> is free. Claim it before someone else does.` + email (placeholder `you@email.com`, hidden label `Email`) + button `Claim my page`
- unknown (check failed): `That’s <b>comarket.si/{h}</b> on the phone. Claim it now.` + the same email and button
- taken: `<b>comarket.si/{h}</b> is taken. Try another.` (no email field; focus stays in the handle input)
- success: `<b>comarket.si/{h}</b> is yours. You’re No. {N}.` + link `See my pass`
- the inline signup sends platform `other`; profile question g, creators 1, collects it afterwards.

Errors reuse the API's own messages.

### e. Fork (index.astro, lead)
Price hook, one line per card, under `.what`:
- Brands: `$0 until a sale`
- Creators: `Free, always`

Crawlable section under the fork (quiet, below the fold):
- h2: `Creator marketing, paid per sale.`
- Brands h3 `Pay only for completed sales.` p `Creators your buyers already follow send them to a storefront in your brand. You pay only when a new customer pays.` link `For brands`
- Brands h3 `A storefront for every creator.` p `Your logo, colors and offer, with the creator’s name on top. Nothing to build.`
- Creators h3 `Get paid on every sale.` p `Brands pitch you with the rate up front, and every renewal pays you again.` link `For creators`
- Creators h3 `A page with your name on it.` p `comarket.si/yourname, free, always. Keep your link page and add it inside.`

### f. Waitlist (Waitlist.astro, lead)
- brand h2 (unchanged): `Get your first creator sales.`
- brand lede: `Join now. We build your storefront and line up your first creators when your spot opens.`
- brand risk line, right under the submit: `No card needed. You pay nothing until a new customer pays.`
- creator h2 (unchanged): `Claim your page.`
- creator lede: `Pick your handle. It’s yours when your spot opens.`
- creator risk line, under the submit: `Free, always. Brands pay Comarket, never you.`
- keep the fine print after it: `We email once when your spot opens. Privacy`
- founder note, both sides, a short signed note (no photo, no avatar needed):
  `Questions before you join? Email me directly at hello@comarket.si.` signature `Carter Daly, founder`
  PLACEHOLDER: hello@comarket.si is not a live inbox yet. The owner confirms the address before deploy.
- OWNER DECISION, founding-brand line (brands only, above the submit). It is a pricing promise; do not ship it
  without the owner's yes: `Join before launch and keep today’s rate for good.`
  The API already stores each brand's shown price (`price_first`, `price_after`), so it is enforceable as written.

### g. After signup (the pass; Waitlist.astro, waitlist.ts, lead)
- join line (existing, keep): h `You’re No. {N}.` p `We’ll email you once, when your spot opens.`
  `pass_no` is one sequence across both sides: a join number, not a place in a per-side queue. Never say "in line"
  or "ahead of you".
- referral, only if `?ref={passNo}` is recorded on signup AND the owner agrees to open spots by it:
  `Invite a creator with your link. When they join, you both move up.`
  If either is missing, ship this instead (true today): `Know a creator who’d want this? Send them your link.` button `Copy my link`
  Brands get their own line (round 2): `Know creators who already talk about your product? Send them your link.` A brand recruiting its own fans is the stronger ask.
- optional profile step under the pass. h `Help us match you faster.` small `Optional. Takes 10 seconds.`
  buttons `Save my answers` / `Skip`. saved: `Saved. That helps us match you.`
  Brands (one choice each):
  1. `What do you sell?` Software / An app / A subscription box / Physical products / Courses or memberships / Something else
  2. `How do customers pay you?` Stripe, on my site / Shopify / App Store or Google Play / Something else
  3. `Your main plan’s price` Under $20 a month / $20 to $50 / $50 to $150 / Over $150 / A one-time price
  Creators:
  1. `Where’s your audience?` YouTube / TikTok / Instagram / Substack or a newsletter / Reddit / X / A podcast / A blog / Somewhere else
  2. `How many followers there?` Under 1,000 / 1,000 to 5,000 / 5,000 to 20,000 / 20,000 to 50,000 / Over 50,000
  3. `What does your audience ask you about?` Software and apps / Money and work / Beauty and skincare / Food and drink / Health and fitness / Something else

### h. CTAs
- Split peak on /brands, under the table: `Get my first creator sales` (to `#waitlist`)
- Earnings peak on /creators, under the estimate: `Claim my page` (to `#waitlist`)
- Mobile sticky CTA: brands `Get early access`, creators `Claim my page` (same as the nav button, so it is recognized)

### i. Outcome comparison (Outcome.astro, UI/UX)
Decision: no third card. A monthly-fee card adds a choice to a pinned two-card scroll story, breaks the one-to-one
"same post, paid two ways" comparison, and costs a third column on phones (Hick, Occam). Our buyers mostly weigh us
against sponsored posts and ads, not $500-a-month platforms. If a later round wants that contrast, it goes in one FAQ
answer, not a card.
- finished-state verdict (unchanged; it lands): `If the post flops, one costs you ${FLAT}. The other costs <mark class="hl">nothing.</mark>`
- the Outcome terms block stays the one canonical price on /brands, now in screen 2 (see change log).

### j. Pitch card feedback (Pitch.astro, UI/UX)
- Accept: `Accepted. Your Fernwood storefront is live.` small `That’s how a match works. This one is an example.` link `Claim my page`
- Pass: `Passed. We won’t pitch you Fernwood again.` small `Passing costs nothing.` link `Claim my page`
- once either shows, the foot line `Nothing to pay, ever. Pass and we won’t pitch you this brand again.` can go.

### k. /creators dedupe: which fact lives where
- Terms (screen 2, the money), three cards: `Paid on every sale.`, `Monthly, to your bank.`, `Free, always.`
  "Your rate, up front" leaves Terms because the Pitch card shows it.
- Pitch (why brands say yes, and the ask), bullets:
  1. `Brands pay only on sales, so they say yes.` / `No upfront budget means no follower minimum. Creators your size get real offers.`
  2. `The rate is on the offer.` / `You see what each sale pays before you say yes.`
  3. `One post, in your words.` / `Disclose it as a paid link. Keep it up as long as you like.`
  Drop "The brand pays Comarket." and "Paid to your bank through Stripe." from Pitch (Terms owns them). With bullet 3
  shipped, the card's "The ask" block can go.
- FAQ drops `Does it cost me anything?` (Terms and the hero note say it).

### l. Titles and meta descriptions
- `/` title `Comarket · Creator marketing, paid per sale`
  description `Brands pay creators only for completed sales. Creators get a co-branded storefront and earn on every sale and renewal. Free for creators.`
- `/brands` title `Pay-per-sale creator marketing for brands · Comarket`
  description `Micro-creators your buyers already follow send them to a storefront in your brand. No retainer, no monthly fee: you pay only for completed sales from new customers.`
- `/creators` title `Get paid by brands on every sale · Comarket for creators`
  description `From about 1,000 followers. Brands pitch you with the rate up front, you get a storefront with your name on it, and every renewal pays you again. Free, always.`

## Change log (append one line per change: who, file, what, which law)

- marketing, A-GRADE.md: wrote the copy deck (a to l). Occam, Tesler, recognition over recall.
- marketing, brands.astro: hero now leads with the outcome ("Creators sell your product. You pay only for completed sales.", mark "completed sales."); sub has no numbers; passes `note` (Stripe fit, Shopify next). Visual hierarchy, von Restorff, Jakob.
- marketing, brands.astro: section order is now Hero, Outcome, Gallery, Find, Split, FAQ, Waitlist, so the pay-for-sales argument and the one canonical price land in screen 2. Serial position, goal-gradient.
- marketing, brands.astro: FAQ drops "When do I pay?" (the hero and Outcome answer it) and reorders by objection: cost, existing customers, creator approval, checkout, data, Shopify. Miller, Hick.
- marketing, brands.astro: title and description keyworded ("Pay-per-sale creator marketing for brands"). Jakob.
- marketing, creators.astro: hero answers the micro-creator fear ("Brand deals at your size. Get paid on every sale you send.", mark "every sale"); passes `note` (free, about 1,000 followers, any platform). Visual hierarchy, peak-end.
- marketing, creators.astro: Terms cut to three cards (sale and renewals with the 20% example, free, monthly payouts); "Your rate, up front" moved to Pitch, which shows it. Needs Terms.astro at 3 columns (UI/UX asked). Miller, Occam.
- marketing, creators.astro: FAQ drops "Does it cost me anything?" (Terms and the hero note say it). Occam.
- marketing, creators.astro: title and description keyworded ("Get paid by brands on every sale"). Jakob.
- marketing, creators/Posts.astro: lede lists the platforms the examples actually show (newsletter, video, TikTok, Reddit), not Pinterest or podcasts. Recognition over recall.
- marketing, brands/Gallery.astro: lede drops "One link per creator." Occam.
- marketing, brands/Find.astro: scoped the console selector to `#find [data-replay]`. Outcome's new "Replay the month" button also uses `data-replay` and now sits above Find, so the console mounted on the button and threw at getContext. Feedback loops.
- UI/UX, Steps.astro: the current step's number is paper; yellow only on "Sale confirmed" while it's on (von Restorff, yellow rule).
- UI/UX, Faq.astro: open icon is ink with paper strokes, not yellow (yellow rule, similarity).
- UI/UX, Terms.astro: lead card is ink instead of yellow; H2 up to display-l, bigger cards and padding; N cards in one row, one column at 760px and below so none sits alone (visual hierarchy, von Restorff, common region).
- UI/UX, global.css: reveals 0.35s/12px with delays capped at 0.12s; hero content never hidden (Doherty, aesthetic-usability).
- UI/UX, global.css: yellow audit: band-ink buttons paper, selection blue-2, on-ink focus ring paper, .chip.new paper, on-ink error cream, on-ink focus glow paper (yellow rule, von Restorff).
- UI/UX, global.css: .field input styles skip radios and checkboxes (lead's waitlist profile form) (similarity).
- UI/UX, Nav.astro: phones get a docked CTA (56px tall, full width) once the hero form scrolls away; hidden while the waitlist is on or passed, while typing, and while another in-page waitlist CTA is on screen. The audience switch's links get 44px targets (Fitts, goal-gradient, serial position, Hick).
- UI/UX, Outcome.astro: no pin; the finished month renders by default with a "Replay the month" button (busy state, reduced motion respected); example line labels the numbers; top spacing suits its new place after the hero (progressive disclosure, peak-end, Doherty, feedback).
- UI/UX, Outcome.astro: the $0 / 15% / 10% terms sit in a white panel ringed in ink with the page's largest numbers (visual hierarchy, common region).
- UI/UX, Split.astro: sliders, table and "You keep N%" share one panel, with the "Get my first creator sales" CTA beside the result; values rendered on the server; result is aria-live (common region, proximity, peak-end, goal-gradient).
- UI/UX, Earnings.astro: "Claim my page" CTA beside the "$X to $Y" estimate; estimate is aria-live (peak-end, proximity, goal-gradient).
- UI/UX, Pitch.astro: deck k bullets; "The ask" block removed; Accept and Pass are real buttons. Accept draws a check and shows the storefront URL (with the handle tried in the hero, if any); Pass confirms; both offer Claim my page and Undo, and move focus to the result (feedback loops, Jakob, Postel, Tesler).
- UI/UX, Credit.astro: Fernwood checkout gains its serif headline with the italic Fern word and email and card fields; the add-on gets a drawn "%" mark instead of a striped placeholder and sits clear of the headline on phones; pulse is blue, not off-palette teal (aesthetic-usability, Jakob).
- UI/UX, Hub.astro: Sarah's public page lists what each brand is, not her rate, which is hers to see (recognition, Jakob).
- UI/UX, Footer.astro: "Start page" is now "Home"; the waitlist link only shows on a side page, since the fork has no #waitlist (recognition over recall, Jakob).
- lead, Stage.astro: any tap, key, wheel or touch during the fork trip (in or back) finishes it at once. Doherty, feedback.
- lead, stage/screens.ts: a visitor's brand preview labels its price "Example price: $49/mo" instead of implying it. Postel.
- lead, Hero.astro: `note` prop (fit line under the claim field); an inline email step opens under the result line after the preview or handle check and signs up through waitlist.ts (`waitlist:join`), no trip to the bottom; stacked layouts scroll the line, field and phone into view together under the nav. Goal-gradient, proximity, Fitts, peak-end, feedback.
- lead, waitlist.ts: one `send()` for both forms; `?ref=` pass number recorded in utm; creator platform optional (defaults to other); referral row with Copy my link; optional profile step saved via new `/api/profile` (events table, checked against email and pass number; no migration). Feedback loops, goal-gradient, Hick.
- lead, Waitlist.astro: deck ledes, risk line under the submit, founder note (PLACEHOLDER address), `comarket.si/` handle prefix to match the hero, platform select removed from the form, creator email placeholder, stacked order intro, form, preview. Similarity, Hick, proximity, recognition, aesthetic-usability.
- lead, index.astro: deck title and description; price hook per fork card; both phone cards share one style; no yellow mark on the fork headline (the device's sale owns the yellow); no pointer cursor on empty space; crawlable two-column section and the footer under the fork. Von Restorff, Jakob, Fitts, serial position.
- lead, ui.ts: reveals trigger 15% before the viewport; landing mid-page shows what's on screen at once. Doherty.
- lead, environment: the copy has its own database, `comarket_agrade` on the same local Postgres as the original (port 54329). The connection string lives in the session scratchpad (`agrade.env`); start the copy's server with that variable set. Drop the database to clean up.
- UI/UX, global.css: --section down from clamp(96px, 13vw, 208px) to clamp(80px, 10vw, 160px); back-to-back ink bands (Find, Split) share one gap with a hairline between (aesthetic-usability, common region, goal-gradient).
- UI/UX, Pitch/Hub/Earnings/Outcome: tightened the dead space the marketing grade found (Pitch band 64 to 128px with the card aligned to the copy's top, Hub top 48 to 96px, Earnings bottom 64 to 128px, Outcome bottom 64 to 128px). Largest empty run is now about 300px at a background change (aesthetic-usability, goal-gradient).
- UI/UX, Nav.astro: the dock also steps aside whenever a control (slider, carousel arrow, button) sits in its zone, checked against its layout box, so it never covers something under the thumb (Fitts, Postel).
- UI/UX, Outcome.astro: replay attribute renamed data-month-replay so Find's console selector can't match it.
- lead, Hero.astro: while the email step is open the claim button turns ghost, so one primary is on screen. Hick, similarity.
- lead, Waitlist.astro: founder note moved inside the form card, under the risk line. Proximity.
- lead, Stage.astro: on touch devices three.js loads after the page's load event and an idle moment (the poster covers first paint). Doherty.
- lead, replay.ts + Find.astro (marketing's file, done by lead after its round): console labels 12px in on-ink, cluster labels dropped under 560px. Aesthetic-usability.
- marketing, A-GRADE.md: round 2, deck g gets a brand-side referral line ("Know creators who already talk about your product?"); the pass block should have one primary, `Copy my link`. Peak-end, Hick.
- UI/UX, Pitch.astro: on phones the offer's three terms size their columns to their values, so "12 months" and "$9.80/mo" no longer wrap; under 380px they stack one per row, label left and value right. No overflow at 320, 360 or 390 (aesthetic-usability, no clipped text).
- lead, round 2 (from marketing grading): hero ghost button reads "Try another site" / "Try another" while the email step is open (similarity); after signup "Copy my link" is the one filled button, "Save image" is ghost, "Save my answers" waits for a pick (Hick); brand referral line "Know creators who already talk about your product? Send them your link." (peak-end).

### Owner round (2026-10-26)
- lead, brands.astro + creators.astro: hero titles and subs back to the originals; fit notes removed (Hero's `note` prop removed with them). Owner's call.
- lead, brands.astro: order is Hero, Gallery (examples), Outcome (pay for sales), Find, Split, FAQ, Waitlist.
- lead, index.astro: "One co-branded storefront." highlight restored; price hooks removed from the fork cards.
- lead, api/waitlist.ts, api/event.ts, api/profile.ts: JSON goes in through `sql.json()`; passing a string with `::jsonb` was double-encoding it (rows held a JSON string, not an object). utm keeps only `utm_*` and `ref` string tags and is dropped whole if too big instead of cut mid-JSON. Migration `0003_unwrap_json.sql` repairs rows already stored that way (tested twice on a throwaway database).
- lead, README.md + AGENTS.md: brought up to date with this copy.
- lead, Waitlist.astro: founder note says "Email us", signature dropped (owner, 2026-10-26).

### People photos (2026-10-26/27)
- lead: sourced 8 photos of real, model-released people from Kaboompics (Standard License: commercial use; releases on file; never imply the person endorses, uses or recommends anything). List, alt text and focal points in `design/people/people.json`; `scripts/people.py` builds `public/assets/people/` (widths plus a square face crop); `src/lib/people.ts` + `src/components/Person.astro` render them. Until the owner downloads the originals into `design/people/originals/`, low-res stand-ins are used.
- lead: why not Unsplash/Pexels/Pixabay: Unsplash's terms exclude rights in recognizable people, Pexels forbids implying endorsement and collects no releases, Pixabay puts third-party consent on the user. Kaboompics is the one free source with releases on file.
- lead: the AI example creators stay. Replacing them with real models would show those models recommending products, which every one of these licenses forbids; that needs our own shoot with releases that allow it.
- lead, index.astro: a face per fork card (founder-call for Brands, makeup for Creators), above the word on the device's side on desktop, beside it on phones.

## HANDOFF (paused 2026-10-27): start here

**State.** Builds, 10 tests pass, no page errors, no em dashes. All law-audit work and the owner's round of reverts are done
(see the logs above). The open work is **people photos**, and both attempts so far were rejected by the owner.

**What the owner rejected, in their words:**
1. "Their current integration does not feel natural, it feels like they were tacked on."
2. "Many of these images are far too low of quality still. They also feel implemented like widgets rather than naturally fitting in."
3. "The hero section, which arguably needs it the most, is missing a human touch."
4. Wants **collaborative photos showing two people**, "namely the hero", and nothing overused or obviously stock.
5. Asked us to study Awwwards-level consumer sites for how people are integrated.

**What is in the code now (all of it is the rejected direction; redo, don't polish):**
- `Hero.astro`: a rounded 4:5 photo tile (`.scene`) behind the 3D phone (owner-hero / creator-mic). Widget-like.
- `index.astro`: 64px round faces above "Brands"/"Creators" on the fork cards (26px beside the word on phones).
- UI agent edits, half finished when it hit a usage limit: small framed photos beside section H2s in `brands/Outcome.astro`,
  `brands/Find.astro`, `brands/Split.astro`, `creators/Earnings.astro`, `creators/Pitch.astro`, `Faq.astro` (`person`
  prop, passed from `brands.astro`), plus a "people" block at the end of `src/styles/global.css`. None of it is logged
  above. Remove or replace all of it.
- Pipeline (keep): `design/people/people.json` (ids, sources, focal points, alt), `scripts/people.py` (builds
  `public/assets/people/`), `src/lib/people.ts`, `src/components/Person.astro`.
- `design/people/standins/` are 200 to 600px thumbnails. That is the quality problem. Full-size files never got downloaded.

**Sourcing constraints learned:**
- Kaboompics (current source) is the one free library with model releases on file (Standard License), but its site
  has a Cloudflare bot wall: downloads only work by a human clicking Download, Original size. Automated fetches get 403.
- Pexels works headless (search pages load, `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=2400` serves
  full size). Kaboompics' photographer (Karolina Grabowska) also posts there, which may carry the same release coverage.
  Other Pexels uploads have no release check. Pexels terms forbid implying the person endorses a product.
- Every free license here forbids implying the person endorses, uses or recommends anything. So licensed people are
  never named, quoted, given a handle or result, or shown using our product UI. They illustrate a side of the market.
  The 8 AI example creators (`src/lib/examples.ts`) stay as the named example people until the owner arranges a real
  shoot with releases that allow endorsement-style use.
- "Not overused": avoid the most-downloaded Pexels names (cottonbro, Mikhail Nilov, Andrea Piacquadio), posed
  handshakes, headsets, and glass-office meetings. Prefer candid, warm, home and studio settings that fit palette 295.

**Awwwards and consumer references (what "integrated, not a widget" means):**
- Patreon: a full-bleed portrait IS the hero, with giant type over it; elsewhere, portraits scattered among huge type.
- Kajabi: one big portrait takes half the hero, edge to edge in its column.
- Stan: the person and their phone storefront are one composition, the phone overlapping the photo.
- Spotify for Artists and Linktree: cut-outs breaking frame edges, people over flat palette shapes.
- Common thread: photos are large, high-res, bleed to an edge or fill a column, and share layout with the type. Never a
  small rounded thumbnail next to a heading.

**Suggested next direction (not yet shown to the owner):** a hero with a large, edge-bleeding photo of two people
working together, e.g. a shop owner and a creator at one table for /brands, and a creator filming with a friend for
/creators. "Co-branded" becomes literally two people. The 3D phone stands across the photo's edge. Then at most one
large, edge-bleeding photo on a few sections, chosen for the story, not one per section. Show the owner a hero first
(owner rule: show visual work live and early), before doing sections.
