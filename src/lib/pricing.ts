export interface PriceArm {
  id: string;
  /** Our cut of a new customer's first payment, in percent. */
  first: number;
  /** Our cut of each later payment, in percent. */
  after: number;
}

export interface Split {
  seller: number;
  creator: number;
  comarket: number;
}

/** Split one payment. Amounts are rounded to cents and always add back to the price. */
export function splitPayment(price: number, creatorRate: number, ourRate: number): Split {
  const cents = Math.round(price * 100);
  const creator = Math.round((cents * creatorRate) / 100);
  const comarket = Math.round((cents * ourRate) / 100);
  const seller = cents - creator - comarket;
  return { seller: seller / 100, creator: creator / 100, comarket: comarket / 100 };
}

/**
 * Totals over a commission period for a monthly subscription,
 * with simple monthly churn applied to the chance the customer is still paying.
 */
export function periodTotals(
  price: number,
  creatorRate: number,
  arm: PriceArm,
  months: number,
  monthlyChurn = 0,
): Split & { gross: number } {
  let alive = 1;
  const t = { seller: 0, creator: 0, comarket: 0, gross: 0 };
  for (let m = 0; m < months; m++) {
    const s = splitPayment(price, creatorRate, m === 0 ? arm.first : arm.after);
    t.seller += s.seller * alive;
    t.creator += s.creator * alive;
    t.comarket += s.comarket * alive;
    t.gross += price * alive;
    alive *= 1 - monthlyChurn;
  }
  return {
    seller: Math.round(t.seller * 100) / 100,
    creator: Math.round(t.creator * 100) / 100,
    comarket: Math.round(t.comarket * 100) / 100,
    gross: Math.round(t.gross * 100) / 100,
  };
}

export function formatMoney(n: number, cents = true): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}
