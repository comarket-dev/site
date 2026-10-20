import { formatMoney, periodTotals, splitPayment } from './pricing';

/** Browser-safe pricing helpers (no Cloudflare imports). */
export const PRICING = {
  split: splitPayment,
  totals: periodTotals,
  money: formatMoney,
};
