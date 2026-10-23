/**
 * Example brands, creators and campaigns for placeholder screens.
 * Every name here is invented. Nothing on the site presents these as real customers or real results.
 */

export interface ExampleBrand {
  id: string;
  name: string;
  what: string;
  kind: 'saas' | 'shop';
  color: string;
  ink: string;
  price: string;
  offer: string;
  mark: 'leaf' | 'hawk' | 'page' | 'orbit' | 'drop' | 'leafcup' | 'stack' | 'moon';
}

export interface ExampleCreator {
  id: string;
  name: string;
  handle: string;
  platform: 'Substack' | 'YouTube' | 'TikTok' | 'Reddit' | 'Instagram' | 'X' | 'Podcast';
  audience: string;
  topic: string;
  tone: string;
}

export const BRANDS: ExampleBrand[] = [
  { id: 'fernwood', name: 'Fernwood', what: 'Onboarding analytics', kind: 'saas', color: '#1E6B47', ink: '#FFFFFF', price: '$49/mo', offer: '30-day trial', mark: 'leaf' },
  { id: 'tallyhawk', name: 'Tallyhawk', what: 'Invoicing for freelancers', kind: 'saas', color: '#E4572E', ink: '#FFFFFF', price: '$12/mo', offer: '2 months free', mark: 'hawk' },
  { id: 'pagewell', name: 'Pagewell', what: 'Landing pages in an hour', kind: 'saas', color: '#7A3EF0', ink: '#FFFFFF', price: '$29/mo', offer: 'Free first page', mark: 'page' },
  { id: 'orbitly', name: 'Orbitly', what: 'Scheduling for small teams', kind: 'saas', color: '#F2B134', ink: '#2B1B00', price: '$8/seat', offer: '45-day trial', mark: 'orbit' },
  { id: 'kindred', name: 'Kindred Skin', what: 'Barrier-repair skincare', kind: 'shop', color: '#C7826F', ink: '#FFFFFF', price: '$38', offer: 'Free travel kit', mark: 'drop' },
  { id: 'hollow', name: 'Hollow Tea', what: 'Loose-leaf by subscription', kind: 'shop', color: '#5E7F64', ink: '#FFFFFF', price: '$22/mo', offer: 'First box half off', mark: 'leafcup' },
  { id: 'pingfield', name: 'Pingfield', what: 'API uptime monitoring', kind: 'saas', color: '#101820', ink: '#C8F560', price: '$19/mo', offer: '3 months at $9', mark: 'stack' },
  { id: 'quietly', name: 'Quietly', what: 'Focus timer and blocker', kind: 'saas', color: '#0F4C5C', ink: '#FFFFFF', price: '$4/mo', offer: 'Lifetime 40% off', mark: 'moon' },
];

export const CREATORS: ExampleCreator[] = [
  { id: 'sarah', name: 'Sarah K.', handle: '@sarah.builds', platform: 'Substack', audience: '8.2k readers', topic: 'trial-to-paid', tone: '#F6C9A8' },
  { id: 'devon', name: 'Devon A.', handle: '@devonbuilds', platform: 'YouTube', audience: '12k subscribers', topic: 'onboarding teardowns', tone: '#9FC2E8' },
  { id: 'lena', name: 'Lena O.', handle: '@lena.codes', platform: 'TikTok', audience: '19k followers', topic: 'dev tools', tone: '#C9B8F2' },
  { id: 'mika', name: 'Mika R.', handle: 'u/mika_ships', platform: 'Reddit', audience: '3.1k karma in r/SaaS', topic: 'indie SaaS', tone: '#B8E2C8' },
  { id: 'priya', name: 'Priya N.', handle: '@priyamakes', platform: 'Instagram', audience: '24k followers', topic: 'skincare routines', tone: '#F2B8C6' },
  { id: 'theo', name: 'Theo M.', handle: '@theo.ships', platform: 'X', audience: '6.4k followers', topic: 'freelance money', tone: '#FFE08A' },
  { id: 'jonah', name: 'Jonah P.', handle: '@jonah.desk', platform: 'YouTube', audience: '31k subscribers', topic: 'desk setups and focus', tone: '#A8D8D0' },
  { id: 'ama', name: 'Ama B.', handle: '@ama.steeps', platform: 'TikTok', audience: '41k followers', topic: 'tea and slow mornings', tone: '#E8C9A0' },
];

/** Which creator promotes which brand on the example storefronts. */
export const PAIRS: Array<{ brand: string; creator: string; headline: string; quote: string }> = [
  { brand: 'fernwood', creator: 'sarah', headline: 'Sarah’s trial-to-paid kit', quote: 'The first tool I open when a trial goes quiet.' },
  { brand: 'tallyhawk', creator: 'theo', headline: 'Theo’s get-paid-on-time stack', quote: 'Invoices out in two minutes. Paid in four days, not forty.' },
  { brand: 'pagewell', creator: 'lena', headline: 'Lena’s launch page template', quote: 'I shipped my waitlist page before my coffee got cold.' },
  { brand: 'kindred', creator: 'priya', headline: 'Priya’s barrier reset routine', quote: 'Three steps. My skin stopped fighting back in a week.' },
  { brand: 'orbitly', creator: 'devon', headline: 'Devon’s no-more-email-tag setup', quote: 'Booking calls stopped being a group project.' },
  { brand: 'hollow', creator: 'ama', headline: 'Ama’s slow-morning box', quote: 'The one I actually finish every month.' },
  { brand: 'pingfield', creator: 'mika', headline: 'Mika’s 3am alert fix', quote: 'Found the flaky endpoint before my customers did.' },
  { brand: 'quietly', creator: 'jonah', headline: 'Jonah’s deep-work setup', quote: 'Four focused hours a day, most days.' },
];

export function brand(id: string): ExampleBrand {
  return BRANDS.find((b) => b.id === id)!;
}
export function creator(id: string): ExampleCreator {
  return CREATORS.find((c) => c.id === id)!;
}
