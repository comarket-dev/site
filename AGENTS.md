# Working on the Comarket site

Read this, then [README.md](README.md), before changing anything. This file is the handoff: what the site is, the
owner's standing rules, where things stand, how to check your work, and what's next. Keep it current: when you
finish a piece of work or the owner decides something, update "Where things stand" and "Next".

## What this is

The marketing site and waitlist for Comarket (comarket.si). Comarket matches brands with micro-creators (about 1,000
to 50,000 followers) and gives each creator a co-branded storefront in the brand's look. Brands pay nothing upfront:
only when a sale completes, the creator rate they set plus 15% of a new customer's first payment and 10% of renewals,
for 12 months. Creators never pay. A sale only counts if the buyer is new to the brand.

The product itself is a separate repo (`../platform`, seeded from `platform-seed.zip` next to this one). This repo
is only the site.

Stack: Astro 7 (server output) on Cloudflare Workers, Neon Postgres through Hyperdrive, three.js for the 3D device,
Blender for 3D assets, local image generation (mflux) for example imagery. Nothing is deployed yet.

## The owner's standing rules

These come from the owner's direct feedback. Breaking one gets the work sent back.

**Copy**
- No em dashes anywhere: UI, docs, commit messages, chat. Use a comma, colon, period or parentheses.
- Lead with the outcome: brands pay only for completed sales. "New customers only" is a supporting detail.
- Show, don't tell. Text must earn its place. Be ruthless with small labels (eyebrows, step numbers, chip rows).
- Sell with action and first-person CTAs ("Show me my storefront", "Claim my page", "Get early access").
- Creators "claim" a page, never "reserve". The two sides are "Brands" and "Creators". The domain is comarket.si.
- Pricing shown: 15% of the first payment and 10% of renewals for 12 months. Never model churn in examples.

**Visuals**
- Satoshi for everything (self-hosted); Fragment Mono only for labels and numbers. The one exception: the example
  brands' own screens use each brand's typeface from `design/brands/` (OFL, subset into `public/fonts/brands/`). Palette Wada No. 295, tokens in
  `src/styles/global.css`. Yellow marks the outcome moment (a sale landing), not decoration.
- No stamps or stickers for states like "sold". Show completion with UI: a drawn check, the amount, a receipt line.
- Demo numbers flatter Comarket and are labeled as examples. Phone mockups vary their clock and battery.
- No clipped text or shadows at any width. Shadows may spill past their box; containers clip sideways only.
- No icon libraries. **Do not use Lucide.** Icons are our own, in `src/lib/icons.ts` (`<Icon name="..." />`).
- Example posts must read as real posts on their platform, in each creator's own voice (lowercase on X and TikTok,
  PSA tone on Reddit, chapters on YouTube), with no affiliate or disclosure wording. All text, UI and product labels
  are drawn in code or printed into photos (`scripts/print-labels.py`), never generated. Zoom into hands, faces,
  edges and labels before showing anything: the owner catches small AI tells. Fix a bad generated shot by editing it
  (`scripts/retouch-posts.py`) before regenerating it.

**Working with the owner**
- Show visual and motion work live and early. They judge motion by feel, not stills or descriptions.
- Never commit or push unless asked. Nothing is committed past the first "v1" commit.
- The `COMFY_API_KEY` in `.dev.vars` (gitignored) was shared in chat; never print it. Comfy Cloud's free tier
  blocks its API, so it's unused (`scripts/comfy.py`). Suggest the owner rotates it.

## Where things stand (2026-10-24)

**Pages:** `/` (the fork), `/brands`, `/creators`, `/privacy`, 404. Built, tested, not deployed. `npm run build` and
`npm test` (10 tests) pass.

**The fork** (`src/pages/index.astro`): headline "More sales for brands. More money for creators. One co-branded
storefront." over a 3D device chosen to match the visitor's own (phone, tablet, laptop, monitor), resting on a
completed $49 sale. Pointing at a side's card (within 40px) previews that side's view; everywhere else shows the
shared sale. Picking a side is one continuous move: the device squares up and eases in while its browser loads the
page (address, load bar, near-cut paint), then flies through its screen into the real page. Going back runs it in
reverse. Code: `src/scripts/stage/` (`stage.ts` the trip, `devices.ts` the device models, `browser.ts` the screens
and browser chrome, `screens.ts` the phone app screens), `src/components/Stage.astro` (view-transition layers),
and the inline device pick in `src/layouts/Base.astro`.

**Heroes:** a claim field (brand website or creator handle) that re-dresses the 3D phone. Highlight boxes
(`mark.hl`) are measured to sit evenly around their letters (`src/lib/hl.ts`).

**Examples spotlight** (`src/components/examples/Showcase.astro`): eight example posts, each beside the storefront
it opens, with a "Your turn" card every third slide. Posts are real HTML per platform
(`src/components/examples/posts/`), media rendered by `scripts/render-posts.py`. Storefronts are real mobile pages
per brand (`src/components/examples/stores/`, drawn at 390 x 846 and scaled by `StorePhone.astro`, which adds the
status bar and Safari's bar; `StoreFoot.astro` is the shared disclosure and footer). All eight are built from the
style guide; the owner approved Fernwood's (the second pass) and the guide, and the other seven follow it.

**Example brand style guide:** `design/brands/README.md` (the storefront standard, then each brand's category,
audience, logo, color, type, signature element, voice and storefront direction, with two Awwwards references each)
and `design/brands/board.html` (render with `scripts/render-brand-board.py`). Every screen that shows a brand
follows it. Storefronts are still pages, like screenshots: no motion. Logo marks live once in `src/lib/marks.ts`
(`BrandMark.astro` in pages, `drawMark` on the stage canvas); brand fonts load from `src/styles/brand-fonts.css`.
Kindred's and Hollow's product labels are printed in their guide typefaces by `scripts/print-labels.py`.

**Fernwood everywhere:** the hero phone (`screens.ts`) draws Sarah's newsletter, Fernwood's storefront and its own
checkout exactly as the guide shows them, with Sarah's portrait. Because Sarah's offer is a 30-day trial, the
checkout starts the trial at $0 and the sale confirms on the first $49 payment on Nov 22 (the step reads "Buyer
checks out"). A visitor's own brand, typed into the hero, gets the same storefront standard and pays at checkout.
The brand-match card, creator hub, coupon checkout, brands waitlist preview and Sarah's dashboard screenshot all
match. Posters and share images are re-rendered (the fork's at phone width, the only size that shows its poster).

**Creators and brands** (fictional): `src/lib/examples.ts` (Fernwood, Tallyhawk, Pagewell, Orbitly, Kindred Skin,
Hollow Tea, Pingfield, Quietly; Sarah, Devon, Lena, Mika, Priya, Theo, Jonah, Ama). Portraits in
`design/content/creators/` are approved; keep each person consistent with theirs.

**Removed on request:** Pricing and Verify sections, the "Fernwood's first 90 days" stats card, the lab pages, the
creators' rate sweet-spot section ("Ask for more, match with fewer brands."; its helpers in `estimate.ts` remain,
tested but unused).

## How to check your work

The dev server runs at http://localhost:4321 (`npm run dev`). Browser checks use Playwright for Python with
Google Chrome (`channel="chrome"`; the bundled Chromium isn't installed).

| Tool | What it checks |
|---|---|
| `scripts/qa/record.py` | Records a transition and lays out timed frames (fork trip, return, first load) |
| `scripts/qa/viewports.py` | The fork at 15 viewports, for device choice and size |
| `scripts/qa/shadows.py` | Shadows clipped by overflow on every page |
| `scripts/qa/highlights.py` | Highlight box spacing around its text |
| `scripts/qa/spotlight.py` | Every spotlight slide at a given width |

Before calling UI done: check desktop (1440x900) and phone (390x844), run `shadows.py`, look at your own
screenshots at full size, and grep for em dashes.

Image tooling (macOS): mflux in `~/.venvs/mflux` (Z-Image Turbo, FLUX.2 klein edit; about 3 minutes an image on
this M1 Pro). `scripts/gen-creators.py` and `scripts/gen-posts.py` render from `design/content/*.json` (they won't
overwrite unless you pass ids or `--force`). `scripts/cutout.py` lifts a person out of a shot with macOS Vision.

## Next

1. **Owner review** of the seven new storefronts (Tallyhawk, Pagewell, Orbitly, Kindred, Hollow, Pingfield, Quietly)
   and of Fernwood's new hero phone story (trial at checkout, sale on the first payment).
2. Smaller placeholders left: the creators waitlist preview ("@yourname", a gradient initial: it's the visitor's own
   page, so a portrait doesn't fit) and the stage hub's rate chips, which a public page wouldn't show.
3. Not yet checked: the trip in and back on a 3440-wide monitor, and the plain fallback where a browser has no view
   transitions.
4. Offered, not answered: a crawlable section under the fork for SEO, keyworded titles, JSON-LD.
5. Before deploy: run migration 0002 on Neon; KV and Hyperdrive ids in `wrangler.jsonc`; Turnstile and Resend keys;
   a legal review of the privacy page and a real contact address.
6. Owner policy calls still open (the site already states the first three): our cut stops after 12 months; brands
   approve creators; monthly payouts after the refund window; the refund window's length.
