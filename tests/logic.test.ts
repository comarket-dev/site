import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenPick, sampleBeta, thompsonPick } from '../src/lib/bandit.ts';
import { periodTotals, splitPayment } from '../src/lib/pricing.ts';
import { cleanColor, cleanName, decodeEntities, normalizeSiteUrl } from '../src/lib/preview.ts';
import { brandsMatching, estimate, payoutAtAsk } from '../src/lib/estimate.ts';

function seeded(seed = 42) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('split always adds back to the price', () => {
  for (const price of [9, 49, 99.99, 299]) {
    for (const [c, o] of [[20, 15], [30, 10], [10, 5]]) {
      const s = splitPayment(price, c, o);
      assert.equal(Math.round((s.seller + s.creator + s.comarket) * 100), Math.round(price * 100));
    }
  }
  assert.deepEqual(splitPayment(100, 20, 15), { seller: 65, creator: 20, comarket: 15 });
});

test('period totals use the first-payment rate once, then the later rate', () => {
  const t = periodTotals(20, 20, { id: 'x', first: 15, after: 10 }, 24, 0);
  assert.equal(t.creator, 96);
  assert.equal(t.comarket, 3 + 2 * 23);
  assert.equal(t.seller, 480 - 96 - 49);
});

test('beta samples stay in range and center on the mean', () => {
  const rng = seeded(1);
  let sum = 0;
  for (let i = 0; i < 4000; i++) {
    const x = sampleBeta(30, 70, rng);
    assert.ok(x > 0 && x < 1);
    sum += x;
  }
  assert.ok(Math.abs(sum / 4000 - 0.3) < 0.01);
});

test('thompson sampling favors the better arm but keeps exploring', () => {
  const rng = seeded(7);
  const stats = [
    { arm: 'a', n: 1000, conversions: 50 },
    { arm: 'b', n: 1000, conversions: 120 },
  ];
  const picks = { a: 0, b: 0 } as Record<string, number>;
  for (let i = 0; i < 3000; i++) picks[thompsonPick(stats, 0.1, rng)]++;
  assert.ok(picks.b > picks.a * 4, JSON.stringify(picks));
  assert.ok(picks.a > 3000 * 0.05, 'the floor keeps the weaker arm alive');
});

test('even pick covers every arm', () => {
  const rng = seeded(3);
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(evenPick(['x', 'y', 'z'], rng));
  assert.equal(seen.size, 3);
});

test('site urls: public hosts only', () => {
  assert.equal(normalizeSiteUrl('fernwood.app')?.origin, 'https://fernwood.app');
  assert.equal(normalizeSiteUrl('https://www.Example.com/pricing?x=1#top')?.hostname, 'www.example.com');
  for (const bad of ['localhost', 'http://127.0.0.1', 'intranet', 'https://a.local', 'ftp://x.com', 'https://x.com:8443', '']) {
    assert.equal(normalizeSiteUrl(bad), null, bad);
  }
});

test('brand names and colors are cleaned', () => {
  assert.equal(cleanName('Fernwood | Onboarding analytics', 'fernwood.app'), 'Fernwood');
  assert.equal(cleanName('Ledgerly – Close faster', 'ledgerly.io'), 'Ledgerly');
  assert.equal(cleanName(null, 'www.northpeak.com'), 'Northpeak');
  assert.equal(cleanColor('#0af'), '#00AAFF');
  assert.equal(cleanColor('rgb(30, 107, 71)'), '#1E6B47');
  assert.equal(cleanColor('var(--brand)'), null);
  assert.equal(decodeEntities('Tom &amp; Jerry&#39;s &#x2014; app'), 'Tom & Jerry\'s — app');
});

test('earnings estimates grow month over month and low stays under high', () => {
  const e = estimate({ viewsPerPost: 6000, postsPerMonth: 4, price: 49, rate: 20 });
  assert.equal(e.low.length, 12);
  for (let m = 1; m < 12; m++) assert.ok(e.mid[m] > e.mid[m - 1]);
  for (let m = 0; m < 12; m++) assert.ok(e.low[m] <= e.mid[m] && e.mid[m] <= e.high[m]);
});

test('asking more matches fewer brands, and payout peaks in the middle', () => {
  assert.ok(brandsMatching(10) >= brandsMatching(25));
  const xs = Array.from({ length: 36 }, (_, k) => 5 + k);
  const ys = xs.map((a) => payoutAtAsk(a, 10));
  const best = xs[ys.indexOf(Math.max(...ys))];
  assert.ok(best > 10 && best < 35, `peak at ${best}`);
  assert.ok(payoutAtAsk(40, 10) < payoutAtAsk(best, 10));
});
