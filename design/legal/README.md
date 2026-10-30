# Comarket legal pages

Second pass, 2026-10-30: cut to what applies to Comarket at launch. Pages: `/terms`, `/privacy`, `/cookies`,
`/brand-terms`, `/creator-terms`, `/dpa` (`src/pages/`). The shared frame is `src/components/legal/Doc.astro`, and
the footer links are in `src/components/Footer.astro`. The acceptable use policy is folded into the Creator Agreement
(section 8, the rules) and the Brand Agreement (8.1, products not allowed), and `acceptable-use.astro` is deleted.

Every page sets `const draft = true`, which shows a draft note and adds `noindex`. Fill the four placeholders, have a
lawyer read the pages, then set it to `false` and add the pages to `src/pages/sitemap.xml.ts`.

## Assumptions

- **Company:** a US company, formed in the state named in `[[STATE OF FORMATION]]`.
- **Users:** mainly US brands and creators, paid in USD through Stripe Connect. Checkouts are Stripe web checkouts only.
- **Model:** the brand owes the creator the Creator Rate. Comarket collects it as the creator's limited payment agent
  (Brand 7.3, Creator 5.4), so a brand's payment to Comarket settles its debt to the creator.
- **The 12-month promise:** our fee and the creator rate stop 12 months after a customer's first payment. Creators never
  pay (Comarket covers Stripe payout fees). Both match the site.

## Placeholders (the only four)

| Placeholder | Fill in |
|---|---|
| `[[LEGAL ENTITY NAME]]` | The company's legal name, e.g. "Comarket, Inc." |
| `[[STATE OF FORMATION]]` | e.g. Delaware. This also sets the governing law and the courts |
| `[[REGISTERED ADDRESS]]` | The company's address (terms, privacy) |
| `[[CONTACT EMAIL]]` | One address for legal, privacy, security and payout questions |

Find them with `grep -rhoE '\[\[[^]]+\]\]' src/pages | sort -u`.

## Defaults chosen (change any of them)

| Topic | Default | Where |
|---|---|---|
| Governing law | The state of formation, plus US federal law | Terms 7.6 |
| Disputes | Courts in the state of formation, with small claims court allowed, after 30 days of trying to settle. Why courts over arbitration: for a small company, arbitration fees for many creator claims (mass arbitration) can cost more than the claims; courts are cheaper and simpler | Terms 7.6 |
| Liability cap, brands | Fees the brand paid in the prior 12 months, both ways. Excludes fees owed, indemnities, fraud. Note: at launch this cap is near zero for both sides; consider a floor such as $10,000 | Brand 11.3 |
| Liability cap, creators | What we paid the creator in the prior 12 months | Creator 12.2 |
| Liability cap, site and waitlist | $100 (it's free) | Terms 6.2 |
| Refund window | Set by each brand on each Offer; no maximum | Brand 2 |
| Attribution window | 30 days from the buyer's last storefront visit to the first payment | Brand 4.1 |
| New customer | No match on email, phone or card fingerprint with any Stripe customer from before the checkout; if no identifier is available, the sale counts unless the brand shows otherwise | Brand 4.2 |
| Renewals | Later payments for the Offer's product, including its plans, upgrades and add-ons | Brand 2 |
| Chargebacks | A lost chargeback within 120 days of the payment reverses fees and earnings | Brand 6.2, Creator 5.5 |
| Billing | Monthly, only for payments whose refund window has closed; auto-charged through Stripe; storefronts paused 14 days after a failed charge and a reminder | Brand 7 |
| Invoice disputes | Within 30 days; a person replies within 30 days | Brand 7.4 |
| Payouts | By the 15th of each month, $25 minimum (smaller amounts carry over), paid after the brand pays us | Creator 5.3, 5.4 |
| Creator disputes | Within 60 days | Creator 5.6 |
| Notice periods | 15 days for changes to terms, 30 for fee changes, 30 days to end an agreement | Terms 7.3, Brand 12, Creator 11 |
| Tail after ending | Fees and creator earnings on sales made before the end run to the end of each 12 months; creators lose it for fraud or serious breach | Brand 12.3, Creator 11.2 |
| Waitlist rates | A brand keeps rates shown at signup for its first 12 months if ours rise | Terms 3.4 |
| Age | 18+ for the waitlist and accounts; no data knowingly collected from under-13s | Terms 3.1, Privacy |
| Retention | Waitlist 24 months without an account; analytics 13 months; emails 24 months; billing, payout and tax records 7 years | Privacy |
| Breach notice to brands | 72 hours after confirming | DPA 3.1 |
| Processors | Cloudflare, Neon, Resend and Stripe, all listed as in the US. If the Neon project is not in a US region, change the privacy page | Privacy, DPA |

## What was cut and why

- VAT, GST, DAC7, W-8 detail, self-billing and EU tax language. US creators file a W-9; non-US creators "provide the tax form
  Stripe requests".
- SCC annexes, sub-processor annex, international transfer machinery, EU/UK representatives, the DPO and supervisory
  authority. One sentence each in privacy and the DPA.
- EU platform rules: P2B complaint handling, mediators and matching parameters; DSA notice-and-action. Not needed for a US
  company serving US users.
- Non-circumvention fee, separate data protection cap, audit rights, sale exclusion lists, App Store and Shopify text.
- The acceptable use page, folded in as above.

## Code gaps the pages work around (the lead's files, not edited)

1. **Opt-out outside the EU, EEA, UK and Switzerland.** `src/middleware.ts` sets `tracking = !ask || consent === '1'`, so
   choosing "off" doesn't stick there. The cookie page therefore shows its switch only in ask regions, and tells everyone
   else to block cookies in their browser. A one-line fix would allow an opt-out everywhere and honor Global Privacy
   Control (then say so on the cookie page):
   `const tracking = consent === '1' || (!ask && consent !== '0' && ctx.request.headers.get('sec-gpc') !== '1');`
2. **Retention isn't enforced.** Nothing deletes analytics events after 13 months or waitlist entries after 24 months. Add a
   scheduled job, or change the periods on the privacy page.
3. **Declining analytics leaves `cm_x_pricing_v1`.** It's ignored while analytics are off, but `api/consent.ts` could
   delete it too.
4. **Sitemap:** add the legal pages once `draft` is false.
5. **Platform promises.** The DPA commits to deleting buyer identifiers after each check, never copying the customer list,
   MFA, and the narrowest Stripe permissions. Build the platform that way.
6. **GDPR Article 27.** Analytics on EU visitors may mean a non-EU company needs an EU representative. Ask counsel whether
   the occasional-processing exemption covers it.
7. **Example posts** on the site carry no "Ad" or "Paid link" label, while the Creator Agreement requires one. Showing
   undisclosed posts as the model is a small FTC risk.

## Competitor sources

CJ: https://www.cj.com/psa-us and https://www.cj.com/legal/privacy. impact.com: https://impact.com/terms-of-use/.
PartnerStack: https://partnerstack.com/legal/partner-agreement and https://partnerstack.com/legal/client. Superfiliate:
https://www.superfiliate.com/legal/supercollabs/creator-terms. Rewardful: https://www.rewardful.com/terms. Shopify
Collabs: https://collabs.shopify.com/terms. Cloudflare Turnstile: https://www.cloudflare.com/turnstile-privacy-policy/.

What they have in common: commission reversals for refunds, chargebacks and fraud; "paid when the brand pays"; W-9 and
1099; FTC disclosure duties; caps tied to fees from the prior 6 to 12 months.
