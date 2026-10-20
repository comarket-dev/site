import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import { evenPick, thompsonPick, type ArmStats } from './bandit';
import { openDb } from './db';
import type { PriceArm } from './pricing';

export type Mode = 'even' | 'bandit';

export interface Experiment<A extends { id: string } = { id: string }> {
  id: string;
  /** Routes where the experiment is assigned. */
  routes: string[];
  arms: A[];
  /** Arm shown when we may not track the visitor. */
  defaultArm: string;
  /** Event type that counts as a success for the bandit. */
  reward: string;
  /** Exploration floor per arm once the bandit is on. */
  minShare: number;
  mode: () => Mode;
}

/**
 * Pricing shown to brands. Runs as an even split until PRICING_MODE is set to "bandit".
 * The reward is a waitlist signup for now. Once real revenue exists, switch the reward
 * to first-payment revenue so a cheaper price can't win on signups alone.
 */
export const PRICING: Experiment<PriceArm> = {
  id: 'pricing_v1',
  routes: ['/brands'],
  arms: [
    { id: '15-10', first: 15, after: 10 },
    { id: '10-5', first: 10, after: 5 },
  ],
  defaultArm: '15-10',
  reward: 'waitlist_brand',
  minShare: 0.1,
  mode: () => (env.PRICING_MODE === 'bandit' ? 'bandit' : 'even'),
};

export const EXPERIMENTS: Experiment[] = [PRICING];

export function priceArm(arms: Record<string, string>): PriceArm {
  const id = arms[PRICING.id] ?? PRICING.defaultArm;
  return PRICING.arms.find((a) => a.id === id) ?? PRICING.arms[0];
}

const memo = new Map<string, { at: number; stats: ArmStats[] }>();
const STATS_TTL_MS = 10 * 60 * 1000;

async function loadStats(exp: Experiment, wait: (p: Promise<unknown>) => void): Promise<ArmStats[] | null> {
  const hit = memo.get(exp.id);
  if (hit && Date.now() - hit.at < STATS_TTL_MS) return hit.stats;

  const kvKey = `stats:${exp.id}`;
  const cached = await env.EXPERIMENTS?.get<{ at: number; stats: ArmStats[] }>(kvKey, 'json');
  if (cached && Date.now() - cached.at < STATS_TTL_MS) {
    memo.set(exp.id, cached);
    return cached.stats;
  }

  const sql = openDb();
  if (!sql) return cached?.stats ?? null;
  try {
    const rows = await sql<{ arm: string; n: string; conversions: string }[]>`
      select a.arm,
             count(*) as n,
             count(distinct e.visitor_id) as conversions
      from assignments a
      left join events e
        on e.visitor_id = a.visitor_id
       and e.type = ${exp.reward}
       and e.created_at >= a.assigned_at
      where a.experiment = ${exp.id}
      group by a.arm`;
    const byArm = new Map(rows.map((r) => [r.arm, r]));
    const stats = exp.arms.map((a) => ({
      arm: a.id,
      n: Number(byArm.get(a.id)?.n ?? 0),
      conversions: Number(byArm.get(a.id)?.conversions ?? 0),
    }));
    const entry = { at: Date.now(), stats };
    memo.set(exp.id, entry);
    if (env.EXPERIMENTS) wait(env.EXPERIMENTS.put(kvKey, JSON.stringify(entry), { expirationTtl: 3600 }));
    return stats;
  } catch {
    return cached?.stats ?? null;
  } finally {
    wait(sql.end({ timeout: 2 }));
  }
}

/** Assign every experiment that applies to this path. Sticky per visitor via cookie. */
export async function assignArms(
  path: string,
  visitorId: string | undefined,
  cookies: AstroCookies,
  wait: (p: Promise<unknown>) => void,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const fresh: { exp: Experiment; arm: string }[] = [];

  for (const exp of EXPERIMENTS) {
    if (!exp.routes.includes(path)) continue;
    if (!visitorId) {
      out[exp.id] = exp.defaultArm;
      continue;
    }
    const cookieName = `cm_x_${exp.id}`;
    const existing = cookies.get(cookieName)?.value;
    if (existing && exp.arms.some((a) => a.id === existing)) {
      out[exp.id] = existing;
      continue;
    }
    let arm = evenPick(exp.arms.map((a) => a.id));
    if (exp.mode() === 'bandit') {
      const stats = await loadStats(exp, wait);
      if (stats) arm = thompsonPick(stats, exp.minShare);
    }
    out[exp.id] = arm;
    cookies.set(cookieName, arm, { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax', secure: true, httpOnly: true });
    fresh.push({ exp, arm });
  }

  if (fresh.length && visitorId) {
    wait(
      (async () => {
        const sql = openDb();
        if (!sql) return;
        try {
          for (const { exp, arm } of fresh) {
            await sql`
              insert into assignments (visitor_id, experiment, arm)
              values (${visitorId}, ${exp.id}, ${arm})
              on conflict (visitor_id, experiment) do nothing`;
          }
        } catch {
          /* assignment logging is best effort */
        } finally {
          await sql.end({ timeout: 2 });
        }
      })(),
    );
  }
  return out;
}
