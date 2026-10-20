# Comarket site

The marketing site and waitlist for Comarket: creators bring buyers, sellers pay only for first-time customers.

- **Fork** (`/`): one guilloche ribbon, two loops. Choosing a side unravels the loop into that page's hero.
- **Brands** (`/brands`): agent replay, storefront builder, net-new check, split calculator, pricing, waitlist with a live storefront preview.
- **Creators** (`/creators`): hub and embedded link, protected credit, earnings estimator, rate sweet spot, waitlist.
- Joining the waitlist issues a numbered 3D pass, modeled in Blender and printed at runtime.

## Stack

Astro 7 on Cloudflare Workers, Neon Postgres through Hyperdrive, raw WebGL2 for the plate, three.js for the coin and pass (loaded only when needed), Blender for 3D assets. Satoshi for type, Fragment Mono for labels and numbers.

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
| `node scripts/render-og.mjs` | Share images in `public/og` from the Blender renders |

## Deploy to Cloudflare

1. `npx wrangler kv namespace create EXPERIMENTS` and put the id in `wrangler.jsonc`.
2. Create a Neon database, then `DATABASE_URL=<neon url> npm run db:migrate`.
3. `npx wrangler hyperdrive create comarket --connection-string="<neon url>"` and put the id in `wrangler.jsonc`.
4. Optional: `npx wrangler secret put RESEND_API_KEY` and set `EMAIL_FROM` for the confirmation email. `npx wrangler secret put TURNSTILE_SECRET_KEY` and set `PUBLIC_TURNSTILE_SITE_KEY` for the bot check.
5. `npm run deploy`.

The adapter also provisions a `SESSION` KV namespace on first deploy. The site doesn't use sessions, so it stays empty.

## How it works

**The plate** (`src/scripts/plate/`). One fixed WebGL2 canvas, persisted across page transitions with `transition:persist`. Every line is an instanced quad with real width and antialiasing, computed on the GPU from one parametric family: the fork ribbon (a lemniscate with woven lace) and the hero rosette. Choosing a side morphs one into the other, so the fork becomes the next page's hero. The words on the fork are textures that write depth, so the ribbon passes in front of and behind them. Quality drops automatically when frames run long.

**Experiments** (`src/lib/experiments.ts`, `src/lib/bandit.ts`). Pricing shown to brands is an experiment (`15-10` or `10-5`: our cut of the first payment, then of later payments). Assignment happens in middleware before render, so nothing flickers, and it sticks per visitor. It runs as an even split. Set `PRICING_MODE` to `bandit` to switch to Thompson sampling with a 10% floor per arm; it learns from everything logged during the even split. The current reward is a waitlist signup. Once real revenue exists, change the reward to first-payment revenue, or a cheaper price will win on signups alone. Brands keep the price they were shown (stored on their waitlist row).

**Consent** (`src/lib/consent.ts`). In the EU, EEA, UK and Switzerland nothing is tracked until a visitor allows it; until then they see the default arm.

**Routing** (`src/middleware.ts`). Ads link to `/?aud=brands` or `/?aud=creators` (or straight to the page). Returning visitors skip the fork; the wordmark links to `/?fork=1`.

**API** (`src/pages/api/`). `waitlist` (idempotent per side and email), `preview` (reads a brand's public homepage for name, color and icon; blocks private hosts; cached a day in KV), `event`, `consent`.

## The Blender step

`design/pass/build_pass.py` models the pass (ID-1 proportions, beveled edge, separate UVs for front and back), exports `public/assets/pass/pass.glb`, renders the four ceramic matcaps the split coin uses, and renders studio shots of a brand and a creator pass. The printed faces come from `src/scripts/passArt.js`, the same code the browser uses to put each person's name and number on their pass. `design/fork/` holds the first fork concept (an intersecting-word sculpture), kept for reference.

## Before launch

- Have the privacy page reviewed, and add a real contact address.
- Real domain in `astro.config.mjs` (`site`) and `public/robots.txt`.
- Turnstile and Resend keys.
- Earnings estimates use placeholder funnel rates (`src/lib/estimate.ts`); replace them with real creator data when it exists.
