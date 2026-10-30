# Example brands: style guide

The eight brands on the site are fictional, but each has to read as a real company within a second: what it is, what
it does, who it's for. This is the standard every screen that shows them works from: storefronts, posts, the hero
phone, the brand-match card, the creator hub. Fernwood comes first and goes deepest, because it's the cover example
everywhere.

`board.html` shows every brand side by side (render it with `python3 scripts/render-brand-board.py`). Fonts are in
`fonts/` (all SIL Open Font License); `scripts/subset-brand-fonts.sh` writes the web versions to
`public/fonts/brands/`. They're used only inside the brands' own screens. The site itself stays in Satoshi.

## The storefront standard

A Comarket storefront is the brand's page, with the creator's face and voice on it. The brand owns the look; the
creator owns the welcome.

**Above the fold, in this order:** who sent you (the creator), what this is (brand name and its category in plain
words), what you get (the creator's offer), one thing to do.

1. **Lockup.** One row at the top: brand logo, a thin ×, the creator's portrait and name. Equal visual weight. The
   creator's name is set in the brand's type.
2. **Category in words.** The brand's one-liner appears once, near the headline ("Onboarding analytics for SaaS
   teams"). A visitor should never have to infer what the product is from a chart.
3. **The offer is the creator's.** "Sarah's readers get 30 days free", not "30-day free trial". It matches the post
   word for word in substance.
4. **The creator's face.** The approved portrait appears at least once at 48px or larger (design pixels), beside a
   short note in their own voice from their post.
5. **One product visual.** SaaS brands show their own UI, drawn in code, carrying the brand's signature element.
   Shops show their product photo with labels printed by `scripts/print-labels.py`.
6. **One action.** One button, first person ("Start my free 30 days"), in the brand's CTA style, low in the thumb
   zone. Under it, `StoreFoot.astro`: "<first name> earns a commission if you buy." and "Storefront by Comarket".
7. **Restraint.** Two type families at most. One accent color, used once. One card or one photo as the hero
   visual. No decorative patterns, particles or gradients unless they are the brand's own signature.
8. **A screenshot, not a demo.** Storefronts are static, the way a phone screenshot of a live page looks. No motion.
9. **Real page.** Safari's bar at the bottom shows `<brand>.comarket.si/creators/<creator>`. Phone clocks vary.

## Fernwood

**Onboarding analytics for SaaS teams.**

- **Who it's for:** founders and growth or product leads at B2B SaaS companies that run free trials, roughly 100 to
  5,000 trials a month.
- **What it does:** follows every trial user's first week, screen by screen, and flags the one step where most of
  them stall, so the team fixes that step and more trials turn into paying customers.
- **Promise:** Find the screen where your trials stall.
- **Personality:** calm, exact, patient. A gardener's patience applied to growth. Never hype.
- **Price:** $49/mo. Trial: 14 days normally; 30 days through a creator.

**Logo.** A filled leaf with a straight midrib cut through it, rising to the upper right like a line on a chart.
Wordmark "Fernwood" in Instrument Serif Regular, title case, tracking -1%. The mark sits left of the wordmark at 1.15x
the cap height. On dark grounds the leaf is Sprout; on light it's Fern. Never inside a rounded square, except as a small
tile on Paper where a list shows every brand's icon: it's a leaf, not an app icon.

**Color.**

| Name | Hex | Role |
|---|---|---|
| Fern | `#1E6B47` | Logo, buttons, the brand's own data |
| Pine | `#0F2A1E` | Ink: headlines and body |
| Paper | `#F3F0E8` | Page |
| Card | `#FFFFFF` | Product UI surfaces |
| Moss | `#DCE2D5` | Hairlines, bar tracks |
| Lichen | `#6E7D72` | Secondary text |
| Sprout | `#C8E36A` | The stall marker only. One per screen. |

**Type.** Instrument Serif for headlines (36 to 46px, line height 1.0, tracking -1.5%), with one phrase in italic,
in Fern. Instrument Sans for everything else: UI 12 to 14px, body 15 to 16px, numbers tabular.

**Signature: the stall marker.** A Sprout pill pinned to the one step where users stop, with the number who stopped
("570 stalled"). Every Fernwood visual has exactly one, and it is the brightest thing on the screen.

**Product UI.** White cards, Moss hairlines, 14px radius, one soft shadow. Funnel bars in Fern at 25 to 60% tint, the
stalled step in full Fern. Thin, quiet charts: Fernwood shows one finding, not a dashboard.

**Voice.** Short, specific, numerical. "1 in 5 trials paid." "Mine was integrations." Don't: "unleash",
"supercharge", "insights", exclamation marks.

**Storefront: Editorial.** Paper page. Centered lockup. A three-line serif headline with one italic word. The
one-liner and Sarah's offer in a single sentence under it. The product card set on a Fern panel, the way Fernwood's
own site frames screenshots. Sarah's portrait and note. One Fern button.

**References.**
- [Earnest Analytics](https://www.awwwards.com/sites/earnest-analytics) (Honorable Mention): deep green type on a
  warm near-white page, one underlined phrase, calm pill buttons. We take the palette logic and the single emphasized
  phrase.
- [Jimo Adoption Agent](https://www.awwwards.com/sites/jimo-adoption-agent) (Nominee): an onboarding tool, same
  category. One focal light on a quiet stage, one line of copy, one button. We take the restraint: one stall marker,
  one finding.

**Where it appears:** Sarah's newsletter (the Fernwood chart she screenshots), her storefront, the hero phone, the
creators' brand-match card, the creator hub, the brands waitlist preview.

## Tallyhawk

**Invoicing for freelancers.**

- **Who:** solo freelancers (designers, developers, writers, consultants) who bill clients by the project.
- **What it does:** an invoice in two minutes, then it chases the payment for you: reminders on day 3, 7 and 14,
  card or bank payment in one tap.
- **Promise:** Invoice. Remind. Get paid.
- **Personality:** sharp, quick, a little cheeky. A hawk watches; it doesn't nag.
- **Price:** $12/mo. Through a creator: 2 months free.
- **Logo:** a hawk's head in profile, solid, hooked beak, round eye cut out. Wordmark "TALLYHAWK" in Archivo Extra
  Condensed Black, caps.
- **Color:** Signal `#E4572E` (actions, logo), Ink `#141210`, Bone `#F2EEE7` (page), White (invoices), Paid
  `#1F9D63` (only the paid status).
- **Type:** Archivo at 62% width, Black, caps for headlines (tight, 0.9 line height); Archivo Regular and Semibold for
  UI.
- **Signature:** the reminder rail. Day 0, 3, 7, 14 as ticks on a line, ending in a "Paid" status with the date.
- **Voice:** blunt numbers. "41 days to 4." Don't: "seamless", "effortless", "solution".
- **Storefront: Poster.** Bone page, a giant condensed caps headline built from Odessa's numbers, the invoice card with
  the reminder rail, Odessa's line, and the offer as a solid Signal block.
- **References:** [Invoice Builder by Tola](https://www.awwwards.com/sites/invoice-builder-by-tola) (Honorable
  Mention): the invoice as a physical hero object. [Run Payments](https://www.awwwards.com/sites/run-payments)
  (Honorable Mention): one huge two-word headline over the product.

## Pagewell

**Landing page builder.**

- **Who:** indie makers, developers and first-time founders launching something, without a designer.
- **What it does:** pick a template, type your words, publish a waitlist or launch page in under an hour. Forms,
  domains and visitor counts built in.
- **Promise:** Launch pages, made well.
- **Personality:** playful, crafty, fast.
- **Price:** $29/mo. Through a creator: the first page free, for good.
- **Logo:** a page with its top-right corner folded down. Wordmark "pagewell" in Bricolage Grotesque ExtraBold,
  lowercase.
- **Color:** Violet `#7A3EF0` (logo, buttons), Ink `#17112B`, Lilac `#F1ECFF` (page), White, Lime `#D8F45B` (the
  editor's selection only).
- **Type:** Bricolage Grotesque: ExtraBold display, Medium UI.
- **Signature:** the selection. A Lime frame with square handles around the thing being edited, and a name tag on
  the cursor.
- **Voice:** maker-to-maker, quick. "No designer, no Figma." Don't: "enterprise", "robust".
- **Storefront: Canvas.** The page shows Pagewell's editor with Lena's launch template open and its headline
  selected, so the product and the offer are one picture.
- **References:** [Refokus Tools](https://www.awwwards.com/sites/refokus-tools-1) (Honorable Mention): bold
  geometric type with building blocks floating around it. [Heron AI](https://www.awwwards.com/sites/heron-ai) (Site of
  the Day): a design tool's canvas with annotation tags and corner crosshairs.

## Orbitly

**Team scheduling.**

- **Who:** small teams of 3 to 20 (agencies, consultancies, client services) who book a lot of client calls.
- **What it does:** one booking link that checks the whole team's calendars and offers only times that work, routed
  to whoever's free. No email tag.
- **Promise:** Book the call, skip the email tag.
- **Personality:** sunny, friendly, organized.
- **Price:** $8 per seat a month. Through a creator: 45 days free.
- **Logo:** a planet with a tilted orbit ring and one small moon. Wordmark "orbitly" in Gabarito Bold, lowercase.
- **Color:** Marigold `#F2B134` (logo, chosen slot, buttons), Umber `#2B1B00` (ink), Cream `#FFF6E3` (page), White.
- **Type:** Gabarito: Bold display, Medium UI.
- **Signature:** the orbit. Teammates' faces on a ring around the booking link; the time that works for everyone
  is the one filled slot.
- **Voice:** warm and plain. "Booking calls stopped being a group project." Don't: "synergy", "streamline".
- **Storefront: Booking.** The page is the booking moment: a week strip where three calendars overlap and one slot
  is filled, with Devon's floating note.
- **References:** [Superlist](https://www.awwwards.com/sites/superlist) (Site of the Day): one saturated full-bleed
  color, a bold headline, a pill button. [Trafft](https://www.awwwards.com/sites/trafft-booking-saas) (Nominee):
  booking software with a testimonial card overlapping the product screenshot.

## Kindred Skin

**Barrier-repair skincare.**

- **Who:** people with dry, sensitive or reactive skin, worst in winter.
- **What it does:** a three-step routine (Gentle Cleanser, Barrier Serum, Repair Cream) built on ceramides to calm
  and rebuild the skin barrier. Fragrance-free.
- **Promise:** Skin that stops fighting back.
- **Personality:** warm, gentle, honest.
- **Price:** Repair Cream $38, Barrier Serum $34, Gentle Cleanser $24. The Reset Routine (all three) $86. Through a
  creator: a free travel kit with the routine.
- **Logo:** "kindred" in Newsreader Medium, lowercase, the way it's printed on the jar. The drop mark is used small,
  never with the wordmark. Reprint the product labels in Newsreader so page and jar match.
- **Color:** Clay `#B8664F` (the products, buttons), Cocoa `#3A2420` (ink), Cream `#F7F1EA` (page), Blush `#F1DDD2`
  (panels), Sand `#E6D8C8` (rules).
- **Type:** Newsreader for display and body, italic for warmth; system sans for small UI.
- **Signature:** the routine row. Three steps, numbered, each with its product and one word: Cleanse, Treat, Repair.
- **Voice:** warm and direct, no clinical jargon beyond "ceramides". Don't: "miracle", "flawless", "anti-aging".
- **Storefront: Shop the routine.** Kindred's flat lay full-bleed at the top under a co-branded announcement bar, the
  routine row, the kit offer, one Clay button.
- **References:** [Uruoi](https://www.awwwards.com/sites/uruoi-japanese-skincare) (Site of the Day): a full-bleed
  photo, a thin elegant serif, the product resting on the bottom edge. [Soho Skin](https://www.awwwards.com/sites/soho-skin)
  (Honorable Mention): a serif headline set on the photo and a slim announcement bar above it.

## Hollow Tea

**Loose-leaf tea, one a month.**

- **Who:** people for whom tea is a slow-morning ritual, who want to discover single-origin teas without guessing.
- **What it does:** a tin of one single-origin loose-leaf tea every month (about 30 cups), numbered like issues, with
  a brewing card. Skip or cancel anytime.
- **Promise:** One good tea a month.
- **Personality:** quiet, crafted, seasonal.
- **Price:** $22 a box. Through a creator: the first box half off ($11).
- **Logo:** "HOLLOW" in Cormorant Garamond SemiBold, caps, tracked +12%, the cup mark above it, as on the tin. Reprint
  the tin label in Cormorant so page and tin match.
- **Color:** Sage `#5E7F64` (the tin, buttons), Leaf `#2F4536` (ink), Label `#E9E1CD`, Oat `#F5F1E6` (page), Amber
  `#C98A2B` (brewed tea; the offer only).
- **Type:** Cormorant Garamond: caps for names, italic for tea names and issue numbers; system sans for small UI.
- **Signature:** the issue. Every tea is "no. 32" in italic, set like a journal entry, with a hairline rule.
- **Voice:** quiet and sensory. "Smoky, with a sweet finish." Don't: "detox", "superfood", "boost".
- **Storefront: Journal.** Hollow's pour photo at the top, this month's issue line, Alma's note in her own lowercase,
  the half-off offer in Amber, one Sage button.
- **References:** [Hamada Tea](https://www.awwwards.com/sites/hamada-tea) (Site of the Day): airy white, tea seen from
  above, a thin serif, a small round mark. [Lune Tea](https://www.awwwards.com/sites/lune-tea) (Honorable Mention):
  a full-bleed pouring shot with the tin as the hero.

## Pingfield

**API uptime monitoring.**

- **Who:** small engineering teams and solo developers running a SaaS API without an on-call rota.
- **What it does:** checks every endpoint every 30 seconds from six regions, including the response body and
  latency, not just the status code, and calls you when something breaks.
- **Promise:** Know before your customers do.
- **Personality:** technical, dry, dependable.
- **Price:** $19/mo. Through a creator: 3 months at $9.
- **Logo:** a dot with two arcs rippling out to the upper right. Wordmark "pingfield" in Geist Mono Medium, lowercase.
- **Color:** Night `#0E151B` (page), Panel `#16212A`, Line `#24313C`, Signal `#C8F560` (healthy, buttons), Alert
  `#FF6B57` (one incident only), Fog `#8D9AA5` (secondary text), White.
- **Type:** Geist Semibold for headlines, Geist for UI, Geist Mono for data, endpoints and the logo.
- **Signature:** the uptime strip. A row of thin bars, one a day, all Signal but one Alert bar where the silent
  failure was.
- **Voice:** engineer to engineer, dry. "200 OK. Still broken." Don't: "AI-powered", "observability platform".
- **Storefront: Console.** Dark. A short, full-stop headline. The monitor card for Mika's signup endpoint with the
  uptime strip and the 3am incident. Mika's comment. Signal button.
- **References:** [GrowthBook](https://www.awwwards.com/sites/growthbook) (Nominee): a developer product's real UI
  framed in a dark device, plain bold sans. [Netlify, 5 Million Developers](https://www.awwwards.com/sites/netlify-5-million-developers)
  (Honorable Mention): a huge headline of two short sentences, each ending in a full stop.

## Quietly

**Focus app for Mac.**

- **Who:** people who do deep work at a computer (writers, developers, designers, students) and lose hours to tabs
  and notifications.
- **What it does:** start a session and it blocks the apps and sites you choose until the timer ends, and keeps
  count of your focused hours.
- **Promise:** Fewer tabs. Deeper work.
- **Personality:** calm, nocturnal, minimal.
- **Price:** $4/mo, or $60 once for lifetime. Through a creator: lifetime 40% off ($36).
- **Logo:** a crescent moon. Wordmark "quietly" in Manrope Light, lowercase, tracked +4%.
- **Color:** Midnight `#0A2229` (page), Deep Teal `#0F4C5C` (panels, logo), Mist `#DCE8E6` (text), Lamp `#F4C77B`
  (the running timer and the button), Slate `#6E8C92` (secondary).
- **Type:** Manrope: ExtraLight for the big timer and headline, Semibold for UI.
- **Signature:** the timer ring. One thin circle, the elapsed arc in Lamp, the time left in light numerals.
- **Voice:** few words, unhurried. "Four focused hours a day, most days." Don't: "productivity hacks", "10x".
- **Storefront: Night mode.** Midnight page, the timer ring as the hero with the blocked apps dimmed under it,
  June's note, the lifetime offer, one Lamp button.
- **References:** [Fotrack](https://www.awwwards.com/sites/fotrack-pomodoro-timer) (Honorable Mention): one thin
  timer ring and light numerals on black. [MNDFL Meditation](https://www.awwwards.com/sites/mndfl-meditation)
  (Honorable Mention): calm, soft shapes and muted color.
