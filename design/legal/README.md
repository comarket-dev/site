# Comarket legal pages: drafts for review

Drafted 2026-10-29 for a lawyer to review. Nothing here is in force. Each page sets `const draft = true`, which shows a
draft note and passes `noindex` to Base. Flip it to `false` only after counsel signs off and every placeholder below is
filled.

| Page | File | What it is |
|---|---|---|
| /terms | `src/pages/terms.astro` | Part A: site and waitlist terms. Part B: general terms under every agreement (changes, notices, complaints, mediation, law, courts) |
| /privacy | `src/pages/privacy.astro` | Privacy policy: GDPR, UK GDPR, US state law (CCPA/CPRA) |
| /cookies | `src/pages/cookies.astro` | Cookie policy, with an on/off switch that posts to `/api/consent` |
| /brand-terms | `src/pages/brand-terms.astro` | Brand Agreement |
| /creator-terms | `src/pages/creator-terms.astro` | Creator Agreement |
| /dpa | `src/pages/dpa.astro` | Data processing addendum (Comarket as processor of the brand's Stripe customer data), SCCs by reference |
| /acceptable-use | `src/pages/acceptable-use.astro` | Prohibited conduct, banned products, reporting content (DSA), enforcement |

Shared frame: `src/components/legal/Doc.astro` (title, date, contents list, draft note, links between the pages). It
highlights `[[PLACEHOLDERS]]` in text, turns straight quotes into curly ones, and stacks tables as cards on phones.
Footer links: `src/components/Footer.astro`.

## Placeholders

Find them with `grep -rhoE '\[\[[^]]+\]\]' src/pages | sort -u`. Proposed defaults are suggestions only.

| Placeholder | Pages | What to fill in | Proposed default |
|---|---|---|---|
| `[[LEGAL ENTITY NAME]]` | all | The operating company's full legal name | |
| `[[ENTITY TYPE AND JURISDICTION]]` | privacy, terms | e.g. "limited liability company (d.o.o.) incorporated in Slovenia" | |
| `[[COMPANY NUMBER]]` | privacy, terms | Company registration number | |
| `[[REGISTERED ADDRESS]]` | privacy, terms, dpa | Registered office | |
| `[[VAT NUMBER]]` | terms | VAT ID, or remove if not registered | |
| `[[CONTACT EMAIL]]` | all but cookies | Legal, complaints, security and DSA contact | legal@comarket.si |
| `[[PRIVACY EMAIL]]` | privacy, cookies, dpa | Privacy requests | privacy@comarket.si |
| `[[DPO CONTACT]]` | privacy | DPO contact, or "not appointed" (likely not required at this size) | not appointed |
| `[[EU REPRESENTATIVE]]` | privacy | Art. 27 representative, only if the entity is outside the EU | |
| `[[UK REPRESENTATIVE]]` | privacy | UK GDPR Art. 27 representative, if outside the UK | |
| `[[LEAD SUPERVISORY AUTHORITY]]` | privacy | e.g. Slovenia's Information Commissioner (Informacijski pooblaščenec) | |
| `[[GOVERNING LAW]]` | terms | Law of the contracts | the entity's home country |
| `[[COURTS]]` | terms | Courts with jurisdiction | courts of the registered seat |
| `[[MEDIATORS]]` | terms | Two or more mediators (EU P2B Regulation Art. 12) | |
| `[[SITE LIABILITY CAP]]` | terms | Cap for the free site and waitlist | EUR 100 |
| `[[FOUNDING RATE PERIOD]]` | terms | How long a waitlist brand keeps lower rates it was shown | 12 months from signing |
| `[[BILLING CURRENCY]]` | brand, creator | Invoice and payout currency | USD or EUR |
| `[[MAXIMUM REFUND WINDOW]]` | brand | Longest refund window a brand may set (default when unset is written as 14 days) | 30 days |
| `[[ATTRIBUTION WINDOW]]` | brand | Days from the last storefront visit to the first payment | 30 days |
| `[[CHARGEBACK PERIOD]]` | brand, creator | How long after a payment a lost chargeback still reverses fees | 120 days |
| `[[PAYMENT TERMS DAYS]]` | brand | Due date when a brand is invoiced, not auto-charged | 14 days |
| `[[SALE DISPUTE PERIOD]]` | brand | Days a brand has to dispute a Statement line | 30 days |
| `[[NON-CIRCUMVENTION FEE]]` | brand | What a brand pays for hiring an introduced creator off-platform | e.g. 20% of what it pays the creator in that 12 months, or delete clause 21 |
| `[[BRAND LIABILITY FLOOR]]` | brand | Minimum liability cap | EUR 10,000 |
| `[[DATA PROTECTION CAP]]` | brand, dpa | Separate cap for data protection | 2x the general cap, or EUR 50,000 |
| `[[PAYOUT DAY]]` | creator | Day of the month payouts go out | 15 |
| `[[MINIMUM PAYOUT]]` | creator | Smallest payout | USD/EUR 25 |
| `[[CREATOR LIABILITY FLOOR]]` | creator | Minimum cap on Comarket's liability to creators | EUR 500 |
| `[[ACCOUNT RETENTION]]` | privacy | How long account data lasts after closure | 24 months |
| `[[TAX RECORD RETENTION]]` | privacy | Statutory period for invoices and tax records | Slovenia: 10 years for invoices (ZDDV-1); check |
| `[[NEON REGION]]` | privacy, dpa | Neon project region | e.g. AWS eu-central-1 |
| `[[NEON TRANSFER SAFEGUARD]]` | dpa | "None needed (EU region)" or SCCs/DPF | |
| `[[RESEND REGION]]` | privacy | Resend sending region | |
| `[[SUPPORT EMAIL PROVIDER]]`, `[[SUPPORT EMAIL REGION]]` | privacy | Who hosts the inbox, and where | |
| `[[SECURITY LOG RETENTION]]` | dpa | Access-log retention | 12 months |
| `[[SCC MEMBER STATE]]` | dpa | Law and courts for SCC Clauses 17 and 18 (must be an EU member state) | Slovenia or Ireland |
| `[[ADDITIONAL SUB-PROCESSORS]]` | dpa | Platform providers added at launch | |
| `[[CONTACT LANGUAGES]]` | acceptable-use | Languages for the DSA contact point besides English | Slovenian |

## Assumptions I made

1. **Marketplace (agency) model.** The creator supplies the promotion to the brand. Comarket is the creator's limited
   payment collection agent: when the brand pays Comarket, its debt to the creator is settled (Brand 10.1, Creator 5.3).
   The other model has Comarket buy from creators and resell to brands as principal. That changes VAT, invoicing, payment
   licensing and liability. Ask a payments and tax lawyer to confirm the choice.
2. **"Paid when paid".** Creators are paid after the brand pays Comarket (Creator 5.5). That puts the brand's credit risk
   on creators.
3. **Billing after the refund window.** Brands are invoiced only for payments whose refund window has closed (Brand 9.1).
   So refunds inside the window never need a credit note.
4. **The creator rate runs for the same 12 months** as Comarket's fee, unless the Offer says first payment only. This
   matches the /creators copy ("every renewal pays you again for 12 months").
5. **What counts as new.** A match on email, phone or card fingerprint against any Stripe customer created before the
   attributed checkout makes the buyer an existing customer (Brand 6.2). When none of the three is available, the sale
   counts unless the brand shows otherwise (6.3).
6. **"Renewal"** covers later payments for the Offer's product, including plans, upgrades and add-ons. It does not cover
   every product the brand sells.
7. **Net Amount** excludes taxes and refunds, and Stripe fees are not deducted.
8. **A tail after termination.** Fees and creator earnings on sales made before the end keep running to the end of each
   12-month period, for both sides. A creator ended for fraud or a serious breach loses the tail (Creator 12.3).
9. **Data roles.** Comarket is the brand's processor for the new-customer check. It is an independent controller for its
   own sale records (pseudonymous IDs and amounts) and for analytics on how storefronts are used. Stripe is the brand's
   processor, not a sub-processor of ours.
10. **Card fingerprint** means Stripe's `card.fingerprint`, never card numbers. That keeps Comarket out of PCI scope.
11. **Ages.** Waitlist members and creators must be 18 or older; the site is not for under-16s.
12. **The EU P2B Regulation applies** (brands and creators are business users), and so does the DSA as a hosting service
    and online platform (creator hubs). So the drafts include 15-day change notice, statements of reasons, 30-day
    termination notice, matching parameters, internal complaints, mediators, notice-and-action and a contact point.
13. **US state laws** may not apply yet, given their thresholds, but the policy grants the rights to everyone.
14. Every brand asks permission before naming itself as a customer, and every creator before being featured in
    Comarket's marketing.

## Choices for the owner or lawyer to confirm

- The jurisdiction and entity, which drive governing law, courts, supervisory authority, representatives, and VAT and
  invoicing rules. If the entity is Slovenian, consumer-facing text may need a Slovenian version.
- Courts or arbitration. The drafts use courts. US-style arbitration with a class waiver (as at impact.com and
  Superfiliate) is unenforceable against EU and UK consumers, and P2B expects mediation.
- The liability caps and floors, and the separate data protection cap.
- The refund window: a brand-set window, the 14-day default and the maximum.
- Whether "our cut stops after 12 months" holds. The site already says it, and Brand 7.2 states it.
- That brands approve each creator (Brand 5). The site already says it.
- Monthly payouts after the refund window, the minimum payout, and whether Comarket pays creators even when a brand is
  late.
- The tail after termination, and whether a brand can buy it out.
- The non-circumvention clause (Brand 21): keep it, set the fee, or delete it.
- Who absorbs Stripe payout fees. The draft says Comarket, to keep "creators never pay" true.
- The banned product list (Acceptable use 5.2), especially alcohol, supplements and financial products.
- The DAC7 position: whether creators' promotion services count as reportable "personal services" (likely yes).

## Gaps between the code and these documents (fix before publishing)

These pages describe intended behavior. Each item must be true in the code before a page goes live.

1. **Opt-out outside the EU doesn't work.** In `src/middleware.ts`, `tracking = !ask || consent === '1'`, so `cm_consent=0`
   is ignored outside ask countries. The cookie page's switch and the privacy policy promise it works. Suggested fix:
   `const gpc = ctx.request.headers.get('sec-gpc') === '1'; const tracking = consent === '1' || (!ask && consent !== '0' && !gpc);`
2. **Global Privacy Control isn't read.** The policy says we honor it. The fix in item 1 covers this.
3. **Declining leaves the experiment cookie.** `src/pages/api/consent.ts` deletes `cm_vid` and `cm_side` but not
   `cm_x_pricing_v1`. Add `cookies.delete('cm_x_pricing_v1', { path: '/' })`.
4. **No retention is enforced.** Nothing deletes old events or assignments (promised: 13 months) or stale waitlist
   entries (promised: 24 months). Add a scheduled Worker (cron trigger) to purge them, or change the promised periods.
5. **No deletion tooling.** Requests are by email; a small script that deletes by email across `waitlist` and `events`
   (profile rows are matched through `props->>'passNo'`) would make the one-month promise easy to keep.
6. **There is no server-side record of consent**, only the cookie. GDPR Art. 7(1) asks controllers to be able to show
   consent. Consider logging (anonymous ID, choice, time, banner version).
7. **The consent banner** (`Consent.astro`) links only to /privacy, and its "No thanks" is styled as a ghost button.
   Some EU regulators expect refusing to be as easy and as visible as accepting. Link /cookies too. I didn't edit it
   (shared component).
8. **Reserved handles.** `src/lib/handle.ts` doesn't reserve `cookies`, `dpa`, `legal` or `acceptable`, so a creator could
   claim comarket.si/cookies. Hyphenated paths are safe, because handles can't contain hyphens.
9. **The sitemap** (`src/pages/sitemap.xml.ts`) doesn't list the new pages. Add them once `draft` is false.
10. **Logging.** `console.error('waitlist insert failed', e)` may write query details to Workers Logs; check that no email
    is logged.
11. **Example posts.** The owner's rule keeps disclosure wording out of example posts. The Creator Agreement requires it in
    every real post, and the FTC holds advertisers responsible for endorsers' disclosures. Marketing that shows
    undisclosed posts as the model is a real, if small, regulatory risk. Consider a small "Ad" or "Paid link" in the
    example posts.
12. **Platform commitments.** The DPA's minimisation (4.2) and security measures (Annex 2) must be built into the platform
    as written: delete identifiers after the check, use the narrowest Stripe scopes, use MFA, log access.
13. Check the current legal names and DPF status of Cloudflare, Neon (now part of Databricks) and Resend, and Cloudflare's
    current Turnstile cookie list.

## Competitor sources (read 2026-10-29)

- CJ Publisher Service Agreement (US and UK/EU versions): https://www.cj.com/psa-us. CJ is a controller for tracking
  data, requires publishers to collect visitor consent, can apply charge-backs "at any time, including previous payment
  cycles", caps liability at a year's payouts, sets Texas law and courts with a jury waiver, and doesn't pay
  publishers until the advertiser has paid.
- CJ privacy hub: https://www.cj.com/legal/privacy (separate Services and Website & B2B policies, with UK/EU versions).
- impact.com Terms of Use: https://impact.com/terms-of-use/ (2018: California law, JAMS arbitration, USD 1,000 cap),
  and its privacy policy: https://impact.com/privacy-policy/ (calls itself a service provider or processor).
- PartnerStack Partner Agreement: https://partnerstack.com/legal/partner-agreement (USD 1,000 cap, 30-day termination,
  New York or Ontario courts, a 15% fee for circumvention, no payment until the client pays).
- PartnerStack client terms: https://partnerstack.com/legal/client (monthly reward invoices due in 7 days, invoice
  disputes within 5 days, service provider under the CCPA, DPA on request, 6-month fee cap).
- Superfiliate SuperCollabs Creator Terms: https://www.superfiliate.com/legal/supercollabs/creator-terms (reversal for
  refund, return or chargeback; W-9/W-8 before payout; FTC disclosure "at or near the beginning"; a perpetual content
  licence; AAA arbitration with a class waiver; a cap of USD 100 or 6 months' pay). Privacy notice:
  https://superfiliate.com/legal/supercollabs-privacy-policy
- Rewardful: https://www.rewardful.com/terms, https://www.rewardful.com/merchant-terms-of-service and
  https://www.rewardful.com/affiliate-terms-of-service (not a party to merchant and affiliate deals; Alberta law; a cap
  of CAD 50 or 6 months' fees).
- Shopify Collabs Terms: https://collabs.shopify.com/terms (merchant pays creators; creators handle their own taxes;
  perpetual, irrevocable content licence to Shopify; no FTC clause in the terms).
- CreatorCommerce: no public creator terms found. The Shopify listing is https://apps.shopify.com/creatorcommerce
- Cloudflare Turnstile privacy addendum: https://www.cloudflare.com/turnstile-privacy-policy/

What we took and what we left. We kept the common core: reversals for refunds, chargebacks and fraud; W-9/W-8 and
1099; FTC disclosure duties; a non-circumvention clause; and monthly invoicing. We left out what fails in the EU or UK or
reads as hostile to small creators: perpetual content licences, liquidated damages, dormant-account and
unclaimed-balance fees, US-only arbitration, and caps as low as USD 50 to 100.
