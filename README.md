# Comarket site

The marketing site and waitlist for Comarket: brands pay only when a creator's storefront makes a sale; creators earn on every sale they send.

New here (person or agent)? Start with [AGENTS.md](AGENTS.md): the owner's rules, where things stand, how to check your work, and what's next.

**This folder is the A-grade copy** (`site-a-grade`), a separate trial of the UX-law audit fixes next to `../site`. [A-GRADE.md](A-GRADE.md) says why it exists, how to run it on its own database, how to remove it, and logs every change.

- **Fork** (`/`): "More sales for brands. More money for creators. One co-branded storefront." A 3D device shaped like the visitor's own (phone, tablet, laptop or monitor) rests on a completed sale. Hover Brands or Creators to turn it to that side's view. Choosing one types that page's address into the device's browser, shows the real page in its screen for a beat, then flies through the screen into it; any tap, key or scroll during the trip lands at once. Below the fold, a short plain-text section says what each side gets (for anyone who scrolls, and for search), then the footer.
- **Brands** (`/brands`): hero with a live claim field that re-dresses the phone and then opens an email step in place; example posts and storefronts; "Pay for sales, not posts" (a sponsored post billed upfront next to a storefront billed per sale over an example month, shown finished, with "Replay the month", then the one price panel: $0, 15%, 10%); the agent replay; split calculator with a CTA at its result; FAQ; waitlist.
- **Creators** (`/creators`): hero with a live handle check (`/api/handle`) and the same email step; the deal in three cards; example posts and storefronts; a brand offer whose Accept and Pass work (with Undo); hub and embedded link; protected credit; earnings estimator with a CTA at its result; FAQ; waitlist. Handles are unique (migration 0002), so a claimed page is really claimed.
- **Phones** get a docked CTA ("Get early access" or "Claim my page") once the hero's form scrolls away. It steps aside for fields, controls and any other waitlist CTA on screen.
- **Examples section** (`src/components/examples/Showcase.astro`): shared by both pages. One example post and the storefront it opens sit in a spotlight at a time. Each storefront is that brand's own mobile page (`examples/stores/`), built from the brand style guide in `design/brands/README.md`. Hovering slows the spotlight to a quarter speed rather than stopping it. Shadows spill past the slides: the edge-fade mask's box reaches past them top and bottom. Every third slide is a "Your turn" card whose button jumps to the hero's claim field.
- Joining the waitlist (from the hero's email step or the form at the bottom, one code path in `waitlist.ts`) issues a numbered 3D pass, modeled in Blender and printed at runtime. Under it: a link to send a creator (`/creators?ref=<pass no.>`, recorded in the new signup's `utm`) and three optional questions per side, saved against the pass by `/api/profile`. The form card carries a risk line and a founder's note (the address in it is a placeholder).

## Stack

Astro 7 on Cloudflare Workers, Neon Postgres through Hyperdrive, three.js for the stage phone, coin and pass (loaded only when needed), Blender for 3D assets. Satoshi for type, Fragment Mono for labels and numbers.

## Run it locally

```sh
npm install
# a local Postgres (any will do), then:
DATABASE_URL=postgresql://user:pass@localhost:5432/comarket npm run db:migrate
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://user:pass@localhost:5432/comarket npm run dev
```

Hyperdrive requires a password in the local connection string, even if your local database doesn't check it. Without a database the site still runs; the waitlist answers "isn't connected yet".

Copy `.dev.vars.example` to `.dev.vars` for local secrets.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server in workerd. In non-interactive shells Astro runs it in the background: `npx astro dev stop` |
| `npm run build` / `npm run preview` | Production build, then serve it in workerd |
| `npm test` | Unit tests for pricing, bandit, preview parsing and estimates |
| `npm run db:migrate` | Apply `db/migrations/*.sql` to `DATABASE_URL` |
| `npm run assets:textures` | Render pass artwork to `design/pass/tex` with headless Chrome |
| `npm run assets:blender` | Blender: pass GLB, matcaps, hero renders |
| `blender -b -P design/stage/build_stage.py` | Blender: stage phone GLB and studio HDR (`STAGE_ONLY=glb` skips the HDR) |
| `python3 scripts/render-stage-stills.py <dev url> public/assets/stage` | Posters: the stage's first frame, shown until the 3D draws (needs Playwright) |
| `python3 scripts/render-stage-stills.py <dev url> design/stage og` | Phone stills for the share images |
| `node scripts/render-og.mjs` | Share images in `public/og` from the phone stills |
| `python3 scripts/render-posts.py [names \| avatars]` | Media, avatars and portraits for the example posts, into `public/assets/posts` (all, some media, or only the faces) |
| `~/.venvs/mflux/bin/python scripts/print-labels.py` | Prints brand labels onto products in Priya's and Ama's shots, in each brand's typeface |
| `sh scripts/subset-brand-fonts.sh` | Web fonts for the example brands, from `design/brands/fonts` into `public/fonts/brands` |
| `python3 scripts/render-brand-board.py` | The example brands' board, `design/brands/board.png` |
| `python3 scripts/qa/*.py` | Browser checks: transitions, viewports, clipped shadows, highlights, spotlight (see AGENTS.md) |

## Deploy to Cloudflare

1. `npx wrangler kv namespace create EXPERIMENTS` and put the id in `wrangler.jsonc`.
2. Create a Neon database, then `DATABASE_URL=<neon url> npm run db:migrate`.
3. `npx wrangler hyperdrive create comarket --connection-string="<neon url>"` and put the id in `wrangler.jsonc`.
4. Optional: `npx wrangler secret put RESEND_API_KEY` and set `EMAIL_FROM` for the confirmation email. `npx wrangler secret put TURNSTILE_SECRET_KEY` and set `PUBLIC_TURNSTILE_SITE_KEY` for the bot check.
5. `npm run deploy`.

The adapter also provisions a `SESSION` KV namespace on first deploy. The site doesn't use sessions, so it stays empty.

## How it works


**Experiments** (`src/lib/experiments.ts`, `src/lib/bandit.ts`). Pricing shown to brands is an experiment, currently with one live arm, `15-10` (our cut of the first payment, then of renewals); the `10-5` arm was retired on 2026-10-21. Add an arm to test another price. Assignment happens in middleware before render, so nothing flickers, and it sticks per visitor. It runs as an even split. Set `PRICING_MODE` to `bandit` to switch to Thompson sampling with a 10% floor per arm; it learns from everything logged during the even split. The current reward is a waitlist signup. Once real revenue exists, change the reward to first-payment revenue, or a cheaper price will win on signups alone. Brands keep the price they were shown (stored on their waitlist row).

**Consent** (`src/lib/consent.ts`). In the EU, EEA, UK and Switzerland nothing is tracked until a visitor allows it; until then they see the default arm.

**Routing** (`src/middleware.ts`). Ads link to `/?aud=brands` or `/?aud=creators` (or straight to the page). Returning visitors skip the fork; the wordmark links to `/?fork=1`.

**API** (`src/pages/api/`). `waitlist` (idempotent per side and email), `preview` (reads a brand's public homepage for name, color and icon; blocks private hosts; cached a day in KV), `profile` (the optional answers under a pass, checked against its email and number, stored as a `profile` event), `event`, `consent`. JSON columns get objects through `sql.json()`: passing a string with `::jsonb` makes postgres.js encode it twice (migration 0003 unwraps rows stored that way).

## The stage

One phone lives across page changes (`src/components/Stage.astro`, `src/scripts/stage/`). It plays an example sale on its screen: a creator's post, the storefront, the brand's own checkout, the moment the payment is confirmed (a drawn check, the amount, and a small haptic dip of the phone), and what each side sees afterwards. The split on screen uses the visitor's pricing arm. The screens are drawn to a canvas in `screens.ts` and uploaded only while something on them moves. The phone follows whichever `[data-stage-anchor]` element the page has (`PhoneSlot.astro`), so layout decides where it sits; between pages it springs from where it was. Without WebGL2, or on slow devices, the poster image in the slot stays. On touch devices three.js loads only after the page's load event and an idle moment, since the poster already covers first paint. The hero claim fields re-dress the phone with the visitor's site (logo via `/api/icon`, which only serves icons of sites we've previewed) or handle.

**The fork's device** (`src/scripts/stage/devices.ts`, `browser.ts`). Base.astro's inline script picks the device and its slot's shape before first paint (phones by width under 600px, tablets by touch or a squarish window, monitors from 1800px wide); `devices.ts` mirrors its rules, and Stage.astro carries the pick across client-side page changes. The tablet, laptop and monitor are built at load with a screen cut to the visitor's window plus browser chrome, so a page fits it exactly; each gets its own column width on the fork. A device without a poster fades up with the page's reveal.

**The trip** (`stage.ts`, Stage.astro). Picking a side: the device squares up and eases in at a constant slow speed while its browser loads the page (address, load bar, near-cut paint), then accelerates into the flight with no stall. The page in the screen is the view transition's own new-page layer at true proportions, and the device is placed from that layer's transform every frame (`miniFor`, `fromLayer`), so they can't drift. The page holds still (`html.landing`) until the device lands; then the hero's phone takes over from its poster. Going back to the fork (`astro:before-preparation`) runs the same move in reverse with the old page's layer. Without view transitions it falls back to a plain page change.

## Example posts

The posts in the examples spotlight (`src/components/examples/posts/`) are real HTML in each platform's layout, around one piece of media each. The media is composed in `design/posts/media/*.html` from locally generated source shots (`design/content`, made with mflux) and rendered by `python3 scripts/render-posts.py` into `public/assets/posts`. `scripts/cutout.py` lifts a creator out of a shot with macOS Vision, `scripts/retouch-posts.py` holds hand fixes to generated shots, and `scripts/print-labels.py` prints brand labels onto products in a shot, wrapped to each product's curve and lit by the photo. Everything in them is fictional.

## The Blender step

`design/pass/build_pass.py` models the pass (ID-1 proportions, beveled edge, separate UVs for front and back), exports `public/assets/pass/pass.glb`, renders the four ceramic matcaps the split coin uses, and renders studio shots of a brand and a creator pass. The printed faces come from `src/scripts/passArt.js`, the same code the browser uses to put each person's name and number on their pass. `design/stage/build_stage.py` models the stage phone (our own proportions, guilloche on the back only) and the softbox studio HDR the phone reflects. `design/fork/` holds the first fork concept (an intersecting-word sculpture), kept for reference.

## Before launch

- Have the privacy page reviewed, and add a real contact address.
- Run migrations 0002 and 0003 on Neon (`npm run db:migrate`), and 0003 on any local database that has signups.
- Replace the placeholder founder address (hello@comarket.si) in `Waitlist.astro` with a live inbox.
- Decide the founding-brand rate lock and the referral promise ("you both move up") before either is shown; see A-GRADE.md.
- Real domain in `astro.config.mjs` (`site`) and `public/robots.txt`.
- Turnstile and Resend keys.
- Earnings estimates use placeholder funnel rates (`src/lib/estimate.ts`); replace them with real creator data when it exists.
