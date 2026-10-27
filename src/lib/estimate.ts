/**
 * Creator earnings estimates. These rates are placeholders until real conversion data exists.
 * Every number on the page that comes from here is labeled as an estimate.
 */

export interface Funnel {
  click: number;
  trial: number;
  paid: number;
}

export const LOW: Funnel = { click: 0.008, trial: 0.08, paid: 0.25 };
export const HIGH: Funnel = { click: 0.015, trial: 0.15, paid: 0.4 };
export const MONTHLY_CHURN = 0.04;

export interface EstimateInput {
  viewsPerPost: number;
  postsPerMonth: number;
  price: number;
  rate: number; // percent
  months?: number;
}

/** Monthly commission for months 1..n, with new customers stacking and some cancelling. */
export function monthlyCurve(i: EstimateInput, f: Funnel): number[] {
  const months = i.months ?? 12;
  const newPerMonth = i.viewsPerPost * i.postsPerMonth * f.click * f.trial * f.paid;
  const perCustomer = i.price * (i.rate / 100);
  const out: number[] = [];
  let active = 0;
  for (let m = 0; m < months; m++) {
    active = active * (1 - MONTHLY_CHURN) + newPerMonth;
    out.push(active * perCustomer);
  }
  return out;
}

export function estimate(i: EstimateInput) {
  const low = monthlyCurve(i, LOW);
  const high = monthlyCurve(i, HIGH);
  const mid = low.map((v, k) => Math.sqrt(v * high[k]));
  return { low, mid, high };
}

/**
 * Example brand ceilings for the rate curve. Illustrative only: a spread of maximum
 * commissions centered on 22%, the way a real marketplace might look.
 */
export const EXAMPLE_CEILINGS: number[] = (() => {
  const out: number[] = [];
  let seed = 11;
  const r = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let k = 0; k < 40; k++) {
    // Box-Muller around 22% with a 6-point spread, kept to 10..35
    const g = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    out.push(Math.round(Math.min(35, Math.max(10, 22 + g * 6))));
  }
  return out.sort((a, b) => a - b);
})();

export function brandsMatching(ask: number, ceilings = EXAMPLE_CEILINGS): number {
  return ceilings.filter((c) => c >= ask).length;
}

/**
 * Expected monthly payout at a given ask: you earn more per customer as the ask rises,
 * but fewer brands accept it, and you can only promote so many at once.
 */
export function payoutAtAsk(ask: number, perBrandAtOnePercent: number, ceilings = EXAMPLE_CEILINGS): number {
  const share = brandsMatching(ask, ceilings) / ceilings.length;
  const capacity = 3; // brands a creator can promote well at once
  const brands = Math.min(capacity, share * ceilings.length * 0.15);
  return brands * perBrandAtOnePercent * ask;
}
