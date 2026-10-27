/** Pure helpers for arm selection. No I/O, so they are easy to test. */

export interface ArmStats {
  arm: string;
  /** Visitors assigned to the arm. */
  n: number;
  /** Visitors on the arm who produced the reward event. */
  conversions: number;
}

type Rng = () => number;

function gaussian(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia and Tsang gamma sampler, shape > 0, scale 1. */
export function sampleGamma(shape: number, rng: Rng = Math.random): number {
  if (shape < 1) return sampleGamma(shape + 1, rng) * Math.pow(rng(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(a: number, b: number, rng: Rng = Math.random): number {
  const x = sampleGamma(a, rng);
  const y = sampleGamma(b, rng);
  return x / (x + y);
}

/**
 * Thompson sampling with an exploration floor: every arm keeps at least
 * `minShare` of traffic so the bandit never stops learning about it.
 */
export function thompsonPick(stats: ArmStats[], minShare = 0.1, rng: Rng = Math.random): string {
  if (stats.length === 0) throw new Error('no arms');
  const floor = Math.min(1, Math.max(0, minShare) * stats.length);
  if (rng() < floor) return stats[Math.floor(rng() * stats.length)].arm;
  let best = stats[0].arm;
  let bestDraw = -1;
  for (const s of stats) {
    const draw = sampleBeta(1 + s.conversions, 1 + Math.max(0, s.n - s.conversions), rng);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = s.arm;
    }
  }
  return best;
}

export function evenPick(arms: string[], rng: Rng = Math.random): string {
  return arms[Math.floor(rng() * arms.length)];
}
