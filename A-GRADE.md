# A-grade experiment

A trial copy of the site, made 2026-10-24 to try fixing every finding from the UX-law audit and competitor research,
then used for the people-photo and "warm stock" rounds (2026-10-26 to 27). It lives on the `a-grade` branch of
comarket-dev/site; the owner may delete the branch. Nothing on the main site depends on it.

- Dev server: http://localhost:4322 (the original runs on :4321), on its own database (`comarket_agrade`). Without a
  database the waitlist answers "isn't connected yet", which is expected.
- The owner's standing rules in AGENTS.md still apply in full (no em dashes, outcome first, first-person CTAs,
  creators "claim", yellow marks the sale moment, no icon libraries, no clipped text, commit only when asked).
- Note: all eight example storefronts are already built here.

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
- lead, rejected photo work removed (2026-10-27, owner's "tacked on", "like widgets"): the framed photos beside section headings in `brands/Outcome.astro` (the packing shot over the cards, and the cards' negative margin), `brands/Find.astro` (the row of three creator tiles; the headline is a plain step-head again), `creators/Earnings.astro` (the desk photo, the paired sliders and their ResizeObserver), `creators/Pitch.astro` (the backdrop photo; the offer card sits in its column again), `Faq.astro` (the `person` prop and its portrait, and `brands.astro` no longer passes it), and the "people" block at the end of `global.css` (`.shot`). Not yet replaced: the hero `.scene` tile and the fork's faces stay until the new hero photos are picked. Build, 10 tests, no page errors, no sideways overflow at 1440 and 390.
- lead, sourcing (2026-10-27): with network access opened, Pexels search pages still sit behind a bot check (not worked around); candidates were found by web search and pulled full size from images.pexels.com. Contact sheet for the owner's pick: `design/people/candidates/contact-sheet.jpg` (A to I). Brands duos: MART PRODUCTION's boutique owner and creator (7679665, 7679663, 7679677), Amina Filkins' florists (5414021, 5414014). Creators duos: Mizuno K (13929793, 13929799, 13929234); solo: Anna Shvets (12674093). Dropped: 13929798 (3.4M downloads, overused), the radio-studio podcast series and posed office shots. Pexels license: no model releases, so the handoff's limits hold (never named, quoted, given results or shown using the product). people.json changes once the owner picks.

### People and warmth, round 3 (2026-10-27, owner picked B, C, D and I from the contact sheet)
- lead, design/texture/ (new): the texture and warmth direction, "warm stock": the site as Wada 295 inks on uncoated cream paper in late-afternoon window light, with the photos printed on the same paper. `README.md` is the rule set (paper, light, grade, not this); `board.png` shows it (rendered from `board.html` by `scripts/render-texture-board.py`). Aesthetic-usability.
- lead, scripts/texture.py (new): builds `public/assets/texture/grain.webp` (warm specks, half ink and half Cream Yellow, on cream) and `grain-ink.webp` (Cream Yellow specks on ink), 384px seamless tiles at 1x, 35 KB each.
- lead, global.css: tokens `--sun` (Cream Yellow as light), `--grain`, `--grain-ink`; the grain is on html, body, .band-paper, .band-2 and .band-ink; Faq.astro and Outcome.astro carry it on their own paper-2. Product UI (phone, storefronts, posts, forms, cards) stays clean.
- lead, scripts/people.py: `grade: warm` bakes one photo grade (black lifts to ink, white settles on paper, mids catch Cream Yellow, colour eases back 12%); originals are graded at 2400px wide; a 2400 width joins the srcset (people.ts).
- lead, people.json + design/people/originals/: the four picked Pexels photos, full size: `shop-plan` (B, MART PRODUCTION), `shop-film` (C, MART PRODUCTION), `florists` (D, Amina Filkins by series), `cook` (I, Anna Shvets). Old Kaboompics entries stay only for the fork faces until those go.
- lead, Person.astro: a full photo renders as `.photo` (cover, cropped at the focal point, optional `focal` override) with the page's grain over it; `face` unchanged.
- lead, Hero.astro: the rejected 4:5 tile is gone. New `photo` and `look` props. `split`: the photo takes the right 46vw, top to bottom, and the phone's centre stands on its left edge, with a Cream Yellow spill onto the paper beside it. `band`: the photo runs edge to edge across the hero's foot, the phone steps 36% of its height down into it, the copy ends 40px above it. Stacked (960px and under) both become copy, then the photo to both edges, then the phone hanging off the photo's foot so it covers hands and counter, never a face. Preview on a live page with `?hero=split|band` and `?photo=<id>` (`heroPreview` in people.ts). Defaults: /brands split + shop-plan, /creators split + cook.
- lead, Nav.astro: the Brands/Creators switch carries its own paper fill, since it can sit over a hero photo.
- lead, Waitlist.astro: optional `photo`: edge to edge across the top of the ink band (cropped higher, so heads stay whole), with the form card rising over its foot. /brands passes the brands photo the hero isn't using (florists, or shop-plan when the hero shows the florists). /creators has no second creator photo yet.
- Checked at 1440x900 and 390x844: no sideways overflow, no page errors; build passes; 10 tests pass; no em dashes. Not run here: `scripts/qa/shadows.py` (needs Playwright for Python and Chrome).
- Still needed: more photos beyond the heroes, especially a creator with a collaborator for /creators (only I was picked, and it's solo) and one or two for the middle of /brands. Source them only after the owner settles the direction and a hero.

### People and warmth, round 4 (2026-10-27, owner feedback on round 3)
- lead, Scene.astro (new): a photo edge to edge, zoomed and shifted so a spot its people are looking at lands where an object sits (the phone in a hero, the sign-up card in the waitlist). Spots live in people.json (`spots.phone`, `spots.form`, each with an `m` for 960px and under) and are typed in people.ts. Optional photo: without one it renders its slot as is.
- lead, Hero.astro: `band` is now the default look. The photo runs edge to edge from the claim field down (the field straddles its top edge, the copy sits just above it), and the phone, now up to 76% of the photo's height, stands in front of the photo's `phone` spot. /brands uses the florists with the phone at the basket, so the florist looks down at it. /creators uses B with the phone between the two of them. The tracker under the phone is 400px wide so its five steps stay on one row. `split` stays available with `?hero=split`.
- lead, Waitlist.astro: with a photo, the heading, lede and form are one ink card floating on the photo at its `form` spot. On B (/brands) it sits in the gap between their faces, at their eye line, covering neither face. On the florists (/creators) it sits at the basket, under their faces. The photo runs further down and the preview hangs under the card. Each page's waitlist uses the photo its hero doesn't.
- lead, index.astro: the profile bubbles are gone. The florists (Brands) and the cook (I, Creators) bleed off each outer edge, from under the wordmark's bar to just above each word, both looking in at the device; stacked, they flank the phone. Placed by a ResizeObserver from the layout, so they follow the device pick. They fade when a side is chosen.
- lead, texture: grain dialed down (cream 0.2 to 0.13, ink 0.1 to 0.07); new crease tiles (`creases.webp`, `creases-ink.webp`, scripts/texture.py) under the grain on every surface. Photos keep the grain only (`--tooth`). README updated.
- lead, yarn buttons (on trial, the owner may roll it back): src/styles/yarn.css knits every conversion button (class `convert`: hero claim and join, waitlist submit, nav and dock, Outcome, Split, Earnings, Pitch claim, "Your turn", the fork's choices) in stockinette from scripts/yarn.py (public/assets/yarn/): blue, blue-ink on hover, cream on ink bands, with a twisted cord rim and stray fibres. Ghost buttons, utility buttons and the example storefronts' own buttons are untouched. Rollback: `const YARN = false` in Base.astro. Removal: delete yarn.css, its import, scripts/yarn.py and public/assets/yarn/.
- people.py: photos also built at 3200 wide (the zoomed bands need it); float32 grading.
- Checked at 1440x900 and 390x844 (both heroes, both waitlists, the fork), the fork-to-brands trip (no errors; the phone's screen still fades in for about 3 seconds after landing, as before). Build passes, 10 tests pass, no em dashes, no sideways overflow.

### People and warmth, round 5 (2026-10-27, owner feedback on round 4; four workers in parallel)
- hero (Hero.astro, Scene.astro, florists spots.phone, creators.astro): both heroes use only the florists. On desktop the photo is a banner across the top of the hero, under the nav, its lower part fading into the paper; the copy starts in that fade and stops short of the phone. The phone stands on the basket, its top under the florist's chin, sized to fit with its tracker in the first screen (Scene `fit`: about 500px at 1440x900, 580px at 1920x1080). Phones keep the stacked layout. Spot: z 1, x 0.595, tx 0.595, y0 0.06, y1 0.56, top 0.385, h 0.76.
- waitlist (Waitlist.astro, shop-plan spots.form, both pages): both waitlists use B. From 1200px the heading, lede and preview sit in a column left of the woman's head on a soft ink scrim, and the form card floats between the two faces; under 1200px they stack (faces, then the card, then the preview). The preview still updates. Spot: z 1.2, x 0.585, tx 0.696, y0 0.14, y1 1, top 0.36, w 0.19, clear 0.24. Trade-off: the man's beanie crops at the right edge at zoom 1.2.
- fork (index.astro, new florists-tall entry): on desktop each side's photo runs from under the wordmark bar to the bottom of the screen; Brands uses Pexels 5414014 (the same florists, portrait), Creators the cook. The word, line and button sit on a paper card on the photo's lower part, below every face. Mobile unchanged.
- yarn (yarn.py, yarn.css): tiles calibrated to the tokens (tile means within a few units of #006eb8, #00558f, #fff7ec); shadows go toward ink, not grey. The striped rim is gone: the knit rolls under at its edge with a soft fibre fringe. `knit-cream` is now `knit-paper-hover`.
- Checked: all pages at 1440x900 and 390x844 (no page errors, no sideways overflow), workers checked 1280, 1920 and phones; build passes, 10 tests pass, no em dashes.


### People and warmth, round 6 (2026-10-27, owner feedback on round 5; five workers in parallel)
- paper (texture.py, paper.ts, global.css surfaces, Faq, Outcome): creases are now about 260 small kinked crinkles and one faint long fold, much subtler (cream 0.09/0.34, ink 0.24/0.04). Cream and ink tiles share one field, and src/scripts/paper.ts anchors every surface's pattern to the page (--paper-x/--paper-y), so creases run straight across section boundaries.
- hero (Hero.astro, florists spots.phone): the banner is heads to shoulders and fades into the paper; the copy starts in the fade, higher on screen. The phone stands right of the second florist's head (spot `clear` 0.69), as tall as the first screen allows with its tracker (636px at 1512x860, 711 at 1440x960, 799 at 1920x1080). iPhone phone 458px, up from about 370.
- waitlist (Waitlist.astro, shop-plan spots.form): the card drifted because its width and its centre scaled differently with the photo; now it's sized and placed from the two inner face edges (spot `fl` 0.475, `fr` 0.69), so it sits between the faces at every size. Shorter photo (heads to chests, foot fading into the ink). Side by side from 1280px, stacked below.
- fork (index.astro, stage.ts, candle-maker): the cards are gone; each side's word, line and button sit on its photo over an ink gradient. Hovering or focusing a side zooms its photo to 1.07 inside the same box. The device no longer previews or tilts on hover (stage.ts FORK_HOVER_PREVIEW = false); one shared sale until a click. New Brands photo: Pexels 5761119 (Anna Shvets), a candle maker pouring wax; florists-tall removed.
- switch (switch.ts, switch.css, two imports in Base.astro): going between /brands and /creators keeps the photo, nav and phone still; the old title lifts and fades (180ms), the new one rises word by word, the yellow draws in on its mark, sub and field follow; about 700ms. Instant with reduced motion; the fork trip is untouched.
- yarn (yarn.css, lead): the nav's "Get early access" over ink bands was painted flat by Nav.astro's .on-dark rule; it now gets the paper yarn.
- Checked: all pages at 1512x860, 1440x960, 1920x1080 and 390x844 (no page errors, no sideways overflow); the switch both ways and browser back; build passes; 10 tests pass; no em dashes.

## HANDOFF (2026-10-29): start here

**State.** Pushed to `a-grade` through round 6 (commit 5b74c7e). Builds, 10 tests pass, no page errors and no sideways
overflow at 1512x860, 1440x960, 1920x1080 and 390x844, no em dashes. Everything below is in review with the owner.

**Where the people are now** (sources and credits in `design/people/people.json`, all Pexels, all graded "warm"):
- Both heroes: the florists (5414021) as a short banner across the top, heads to shoulders, fading into the paper.
  The copy sits high in the first screen; the phone stands right of the second florist's head, sized per viewport
  (Hero.astro, `Scene.astro` with `fit`, the florists' `spots.phone`). Phones stack copy, photo, phone.
- Both waitlists: B, the shop owner and creator (7679663). The form card sits between their faces at every size (its
  width and place come from the faces' inner edges, `fl` and `fr` in `spots.form`); heading, lede and preview sit left
  of her head on an ink scrim. Side by side from 1280px, stacked below.
- The fork: full-height photos from under the wordmark to the bottom on desktop, a candle maker (5761119) for Brands
  and the cook (12674093) for Creators, each side's word, line and button on the photo over an ink gradient. Hovering
  zooms a side; the device no longer previews or tilts (stage.ts `FORK_HOVER_PREVIEW = false`). Phones: the florists
  and the cook beside the device, plain cards under it.
- Unused: shop-film (7679677) and the Kaboompics stand-ins from rounds 1 and 2.

**How the pieces work:**
- `src/components/Scene.astro` draws a photo edge to edge, zoomed and shifted so a spot its people look at (people.json
  `spots`, fractions of the photo, with `m` for 960px and under) lands where an object sits. The phone or the card
  then reads as what they're looking at. New photo, new placement: add a spot, don't hand-tune pixels.
- "Warm stock" (`design/texture/README.md`, board in `design/texture/board.png`): one grain and small creases on every
  surface (`scripts/texture.py`), anchored to the page by `src/scripts/paper.ts` so creases run across sections; one
  warm grade baked into every photo (`scripts/people.py`); Cream Yellow light only as soft washes.
- Yarn buttons (on trial): every conversion button has class `convert`; `src/styles/yarn.css` knits them from
  `scripts/yarn.py` tiles calibrated to the palette (blue, blue-ink hover, paper on ink, including the nav over ink).
  Roll back with `const YARN = false` in `src/layouts/Base.astro`.
- Brands/Creators switch: `src/scripts/switch.ts` + `src/styles/switch.css` keep the photo, nav and phone still and
  animate the hero text (about 700ms; instant with reduced motion). It can stall under software WebGL in headless
  Chromium; it runs on a normal GPU.

**License limits (unchanged):** Pexels collects no model releases and forbids implying endorsement, so the people in
these photos are never named, quoted, given a handle or result, or shown using our product. They illustrate a side of
the market. The named example people stay the 8 fictional creators in `src/lib/examples.ts`.

**Sourcing, from a cloud session:** Pexels search pages sit behind a bot check (don't try to get around it); find
candidates with web search and download full size from `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg`.
Kaboompics downloads need a human. Avoid overused names (cottonbro, Mikhail Nilov, Andrea Piacquadio), posed handshakes,
headsets and glass offices; zoom into faces and hands at full size before showing anything.

**Next (owner):** the example posts and storefronts sections. Still open from the photo work: the owner's verdict on
the yarn trial; JSON-LD; the items in AGENTS.md "Next".
