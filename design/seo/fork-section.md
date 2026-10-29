# Fork section: keywords and rewrite

For the `.about` section of `src/pages/index.astro` (now "Brands pay per sale. Creators never pay."), plus titles,
meta descriptions and JSON-LD. Researched 2026-10-29.

## How this was ranked

There is no search-volume tool here, so nothing below has a volume number. Keywords are ranked by **intent** (is the
searcher ready to pick a tool, or just learning?) and **fit** (can Comarket honestly answer the query?). The free signals
used were:

- **Google autocomplete** (US English, fetched 2026-10-29). A phrase that autocompletes is searched often enough to
  appear. The hits are marked in the table. Two searches returned nothing: *pay per sale influencer* and *pay
  influencers per sale*. People don't type "pay per sale", so it works as our phrase but can't be the only one.
- **Competitor headings** (fetched 2026-10-29): Rewardful's H1 is "All-in-One Affiliate Management Software for SaaS";
  CreatorCommerce's is "Turn any affiliate link into a co-branded storefront", with an H3 "Co-branded Landing Pages";
  impact.com's H2 is "Partner with anyone. Track everything. Pay for results."; GRIN's title is "Creator Marketing
  Platform for Brands"; Aspire's is "Influencer Marketing Platform for E-commerce Brands"; Stan's is "Your Creator Store".
- **Long-tail questions** that roundups and guides are written to answer (Later, Mavely, Collabstr, PartnerStack).

**Findings.** (1) Head terms like *influencer marketing platform* and *affiliate marketing* belong to Aspire, GRIN and
impact.com, so don't fight for them. (2) *Creator storefront* mostly means Amazon or Facebook in search, so use it in
body text only. (3) *Commission-only* is a real search on the brand side, but guides warn that creators turn
commission-only offers down ([Collabstr](https://collabstr.com/blog/influencer-affiliate-marketing)). That makes it a
good place for us to answer: matching, a pitch that shows the rate and a storefront are exactly what such offers
lack. (4) Nobody owns the gap between *SaaS affiliate software* (Rewardful, PartnerStack: tracking, but no creators) and
*co-branded storefronts* (CreatorCommerce: Shopify only, no matching).

**Keyword map.** The fork ranks for the broad phrase and the brand name, and passes the money terms on to the side pages
so they don't compete with each other: `/` gets *pay-per-sale creator marketing*; `/brands` gets *performance-based
influencer marketing for SaaS* and *commission-based micro-influencers*; `/creators` gets *brand deals for small
creators* and *affiliate programs for small creators*.

| Keyword or phrase (AC = autocompletes) | Side | Intent | Priority | Where |
|---|---|---|---|---|
| pay-per-sale creator marketing | Brand | Commercial | P1 | H2, `/` title |
| performance-based creator / influencer marketing (platform) (AC) | Brand | Commercial | P1 | H3, `/brands` title |
| influencer marketing for SaaS / affiliate marketing for SaaS (AC) | Brand | Commercial | P1 | H3, FAQ, `/brands` title |
| micro-influencer marketing, micro influencer platform (AC) | Brand | Commercial | P1 | H4, body |
| commission-only influencers, how to find commission-only influencers (AC) | Brand | Commercial, informational | P1 | FAQ, body |
| brand deals for small creators (AC) | Creator | Commercial | P1 | H3, `/creators` title |
| affiliate programs for small creators / content creators (AC) | Creator | Commercial | P1 | FAQ, body, `/creators` meta |
| co-branded landing page (AC) | Brand | Commercial | P2 | H4 |
| influencer landing page (AC) | Brand | Commercial | P2 | Body |
| affiliate software for Stripe, Stripe affiliate tracking (AC) | Brand | Commercial | P2 | H4, body |
| how to pay micro influencers (AC) | Brand | Informational | P2 | FAQ |
| no retainer, no fee per post | Brand | Supporting | P2 | Body, meta |
| recurring commission (affiliate programs) (AC) | Creator | Commercial | P2 | H4 |
| how to get paid by brands (on Instagram, TikTok) (AC) | Creator | Informational | P2 | FAQ |
| how to make money as a micro influencer (AC) | Creator | Informational | P3 | FAQ wording |
| creator storefront, link in bio store | Creator | Mixed (Amazon, Facebook own it) | P3 | Body only |
| new customers only, net-new customers | Brand | Supporting | P3 | Body (supporting detail, per the copy rules) |

## The rewrite

Paste-ready. Every claim is already stated somewhere on `/brands` or `/creators`. The H3s are now full lines rather than
the small "For brands" labels, so `.who-s` may need restyling (they must stay visible: hidden keyword text gets
penalized). The brand prices are fixed text here; if a second pricing arm ever returns, render them from `priceArm()`
as `brands.astro` does.

**H2**

> Creator marketing that pays per sale, not per post.

(Alternative: "Pay-per-sale creator marketing, with a storefront for every creator.")

### Brands column

**H3:** Brands: performance-based influencer marketing for SaaS and subscriptions

**h4:** Pay only when a new customer pays.
**p:** No retainer, no fee per post, no monthly plan. On each sale you pay the creator rate you set plus 15% of the
first payment and 10% of renewals, for 12 months.

**h4:** Micro-influencers your buyers already follow.
**p:** We find creators with 1,000 to 100,000 followers who already post about the problem you solve, and pitch them your
offer. You approve each one before they go live.

**h4:** A co-branded landing page for every creator.
**p:** Each creator gets a storefront in your logo, colors and type, with their name and your offer on top. Nothing to
design or build.

**h4:** Built on your Stripe checkout.
**p:** Buyers still pay through your own Stripe, and each sale is checked against your existing customers before it
counts. Shopify stores are next.

**Link:** Get creator sales for my brand

### Creators column

**H3:** Creators: brand deals from 1,000 followers

**h4:** Brands that fit, with the rate up front.
**p:** We match you with brands your audience already wants, and every pitch shows your commission before you say yes.
Turn down any brand you like.

**h4:** Recurring commission, not a one-off fee.
**p:** When a buyer subscribes, every renewal pays you again for 12 months. Payouts land monthly through Stripe, after
the brand’s refund window.

**h4:** A storefront with your name on it.
**p:** Claim comarket.si/yourname: the brand’s page, in its look, with you on top. Keep your link in bio and add it
inside.

**h4:** Your rate stays yours.
**p:** Brands pay our fee on top of the rate they offer you. You never pay Comarket anything.

**Link:** Claim my page

(This replaces "Creators never pay" as a heading with the useful version of the fact: the fee is the brand’s, so the
quoted rate is the creator’s.)

### Questions (optional, below the columns)

Each answers a long-tail query from the table and doesn't repeat the side-page FAQs.

**What is pay-per-sale influencer marketing?**
You pay creators a commission on completed sales instead of a fee per post. On Comarket a sale counts only when
someone new to your brand completes a payment, and nothing is due upfront.

**How do I find micro-influencers who work on commission?**
Most creators turn down commission-only offers because a plain affiliate link rarely pays: the clicks land on a homepage
that wasn’t made for their audience, and a sale pays once. Comarket fixes both. Each creator gets a storefront in your
brand with their name and their offer on it, so more of their clicks become sales, and every renewal pays them again for
12 months. We find creators who already post about the problem you solve and pitch your offer with their rate up front,
so the ones who say yes want to sell it.

**Does it work for SaaS and subscription businesses?**
Yes. Comarket tracks sales through Stripe web checkouts today, and renewals keep paying the creator for 12 months.
Shopify stores are next; App Store purchases aren’t supported yet.

**Can small creators get paid brand deals?**
Yes. Brands pay only when you sell, so there’s no follower minimum: Comarket works with creators from about 1,000
followers, and every renewal pays you again for 12 months.

**FAQPage JSON-LD: optional, low value.** Since August 2023 Google shows FAQ rich results only for well-known government
and health sites ([Google](https://developers.google.com/search/blog/2023/08/howto-faq-changes)), so Comarket won't get
the expandable snippet. The visible Q&As do the ranking work. The markup is still valid, cheap, and gives other engines
a clean question-and-answer version of the page. Add it only if the text matches the visible Q&As word for word:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is pay-per-sale influencer marketing?",
      "acceptedAnswer": { "@type": "Answer", "text": "You pay creators a commission on completed sales instead of a fee per post. On Comarket a sale counts only when someone new to your brand completes a payment, and nothing is due upfront." }
    },
    {
      "@type": "Question",
      "name": "How do I find micro-influencers who work on commission?",
      "acceptedAnswer": { "@type": "Answer", "text": "Most creators turn down commission-only offers because a plain affiliate link rarely pays: the clicks land on a homepage that wasn’t made for their audience, and a sale pays once. Comarket fixes both. Each creator gets a storefront in your brand with their name and their offer on it, so more of their clicks become sales, and every renewal pays them again for 12 months. We find creators who already post about the problem you solve and pitch your offer with their rate up front, so the ones who say yes want to sell it." }
    },
    {
      "@type": "Question",
      "name": "Does it work for SaaS and subscription businesses?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Comarket tracks sales through Stripe web checkouts today, and renewals keep paying the creator for 12 months. Shopify stores are next; App Store purchases aren’t supported yet." }
    },
    {
      "@type": "Question",
      "name": "Can small creators get paid brand deals?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Brands pay only when you sell, so there’s no follower minimum: Comarket works with creators from about 1,000 followers, and every renewal pays you again for 12 months." }
    }
  ]
}
```

## Titles and meta descriptions

Lengths are in characters; Google truncates titles at about 60.

| Page | Current | Suggested |
|---|---|---|
| `/` title | Comarket · Creator marketing, paid per sale | **Comarket · Pay-per-sale creator marketing and brand deals** (57) |
| `/` meta | Brands pay creators only for completed sales. Creators get a co-branded storefront and earn on every sale and renewal. Free for creators. | **Brands pay only for completed sales from new customers. Creators from 1,000 followers get brand deals, a co-branded storefront and recurring commission.** (150) |
| `/brands` title | Pay-per-sale creator marketing for brands · Comarket | **Performance-based influencer marketing for SaaS · Comarket** (58). It stops competing with `/` and takes the autocompleted SaaS phrase. |
| `/brands` meta | (keep the idea, tighten) | **Micro-influencers your buyers already follow send them to a storefront in your brand. No retainer, no fee per post: pay only for sales from new customers.** (154) |
| `/creators` title | Get paid by brands on every sale · Comarket for creators | **Brand deals for small creators, paid per sale · Comarket** (56) |
| `/creators` meta | From about 1,000 followers. Brands pitch you... Free, always. | **Brand deals from about 1,000 followers. Claim a storefront with your name on it, see the rate before you say yes, and earn again on every renewal.** (146) |

## Organization and WebSite JSON-LD (fork only)

`Base.astro` has no head slot, but JSON-LD works in the body. In `index.astro`, inside `<Base>`:
`<script type="application/ld+json" is:inline set:html={JSON.stringify(ld)} />`. There's no `sameAs` until real social
profiles exist, no `contactPoint` until the real contact address is set (AGENTS.md, Next 5), and no `SearchAction`
because the site has no search and Google has retired the sitelinks search box. Swap `logo` for a square PNG of at least
112 px once one exists.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://comarket.si/#organization",
      "name": "Comarket",
      "url": "https://comarket.si/",
      "logo": "https://comarket.si/favicon.svg",
      "description": "Pay-per-sale creator marketing. Brands pay only for completed sales from new customers, and each creator gets a co-branded storefront in the brand’s look."
    },
    {
      "@type": "WebSite",
      "@id": "https://comarket.si/#website",
      "name": "Comarket",
      "url": "https://comarket.si/",
      "inLanguage": "en",
      "publisher": { "@id": "https://comarket.si/#organization" }
    }
  ]
}
```

## Sources

- Competitor pages fetched 2026-10-29: [Rewardful](https://www.rewardful.com/), [PartnerStack](https://partnerstack.com/),
  [Refersion](https://www.refersion.com/), [CreatorCommerce](https://www.creatorcommerce.shop/),
  [impact.com](https://impact.com/), [Superfiliate](https://www.superfiliate.com/), [Aspire](https://www.aspire.io/),
  [GRIN](https://grin.co/), [Shopify Collabs](https://www.shopify.com/collabs), [Stan](https://stan.store/).
  Beacons blocked fetching; its positioning (link in bio, store, brand deals) comes from
  [Influencer Marketing Hub](https://influencermarketinghub.com/beacons/).
- [CreatorCommerce on the Shopify App Store](https://apps.shopify.com/creatorcommerce) (Shopify only).
- Long-tail and creator-side phrasing: [Later](https://later.com/blog/affiliate-programs-for-micro-influencers/),
  [Mavely](https://www.joinmavely.com/blog/affiliate-programs-for-micro-influencers/),
  [PartnerStack on micro-influencers](https://partnerstack.com/articles/micro-influencers-saas-affiliate-programs),
  [FirstPromoter](https://firstpromoter.com/solutions/influencer-marketing-software),
  [Collabstr on commission-only](https://collabstr.com/blog/influencer-affiliate-marketing),
  [Collabstr on performance-based](https://collabstr.com/blog/performance-based-influencer-marketing),
  [Hubfluence](https://www.hubfluence.io/blog/brand-deals-for-small-influencers).
- Google autocomplete: `suggestqueries.google.com`, `hl=en&gl=us`, 2026-10-29.
- [Google: changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes).
