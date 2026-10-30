/**
 * Example brands and creators, and which creator's post opens which storefront. Each brand's look is in
 * design/brands/README.md. Every name here is invented. Nothing on the site presents these as real customers or real
 * results.
 */
import type { BrandId } from './marks';

export interface ExampleBrand {
  id: BrandId;
  name: string;
  /** the category, in plain words (design/brands/README.md) */
  what: string;
  kind: 'saas' | 'shop';
  /** the brand's main color */
  color: string;
  price: string;
  /** what a creator's audience gets */
  offer: string;
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
  { id: 'fernwood', name: 'Fernwood', what: 'Onboarding analytics for SaaS teams', kind: 'saas', color: '#1E6B47', price: '$49/mo', offer: '30 days free' },
  { id: 'tallyhawk', name: 'Tallyhawk', what: 'Invoicing for freelancers', kind: 'saas', color: '#E4572E', price: '$12/mo', offer: '2 months free' },
  { id: 'pagewell', name: 'Pagewell', what: 'Landing page builder', kind: 'saas', color: '#7A3EF0', price: '$29/mo', offer: 'First page free' },
  { id: 'orbitly', name: 'Orbitly', what: 'Team scheduling', kind: 'saas', color: '#F2B134', price: '$8 per seat a month', offer: '45 days free' },
  { id: 'kindred', name: 'Kindred Skin', what: 'Barrier-repair skincare', kind: 'shop', color: '#B8664F', price: '$86 for the routine', offer: 'Free travel kit' },
  { id: 'hollow', name: 'Hollow Tea', what: 'Loose-leaf tea, one a month', kind: 'shop', color: '#5E7F64', price: '$22 a box', offer: 'First box half off' },
  { id: 'pingfield', name: 'Pingfield', what: 'API uptime monitoring', kind: 'saas', color: '#0E151B', price: '$19/mo', offer: '3 months at $9' },
  { id: 'quietly', name: 'Quietly', what: 'Focus app for Mac', kind: 'saas', color: '#0F4C5C', price: '$4/mo or $60 for life', offer: 'Lifetime 40% off' },
];

export const CREATORS: ExampleCreator[] = [
  { id: 'sarah', name: 'Sarah K.', handle: '@sarah.builds', platform: 'Substack', audience: '8.2k readers', topic: 'trial-to-paid', tone: '#F6C9A8' },
  { id: 'devon', name: 'Devon A.', handle: '@devonbuilds', platform: 'YouTube', audience: '12k subscribers', topic: 'onboarding teardowns', tone: '#9FC2E8' },
  { id: 'lena', name: 'Lena O.', handle: '@lena.codes', platform: 'TikTok', audience: '19k followers', topic: 'dev tools', tone: '#C9B8F2' },
  { id: 'mika', name: 'Mika R.', handle: 'u/mika_ships', platform: 'Reddit', audience: '3.1k karma in r/SaaS', topic: 'indie SaaS', tone: '#B8E2C8' },
  { id: 'imani', name: 'Imani N.', handle: '@imanimakes', platform: 'Instagram', audience: '24k followers', topic: 'skincare and getting ready with hearing aids', tone: '#F2B8C6' },
  { id: 'odessa', name: 'Odessa M.', handle: '@odessa.reads', platform: 'X', audience: '6.4k followers', topic: 'tarot readings and freelance money', tone: '#FFE08A' },
  { id: 'june', name: 'June P.', handle: '@june.draws', platform: 'YouTube', audience: '31k subscribers', topic: 'drawing routines and focus', tone: '#A8D8D0' },
  { id: 'alma', name: 'Alma B.', handle: '@alma.steeps', platform: 'TikTok', audience: '41k followers', topic: 'tea and slow mornings', tone: '#E8C9A0' },
];

/** Which creator promotes which brand: each pair is one post and the storefront it opens. */
export const PAIRS: Array<{ brand: BrandId; creator: string }> = [
  { brand: 'fernwood', creator: 'sarah' },
  { brand: 'tallyhawk', creator: 'odessa' },
  { brand: 'pagewell', creator: 'lena' },
  { brand: 'kindred', creator: 'imani' },
  { brand: 'orbitly', creator: 'devon' },
  { brand: 'hollow', creator: 'alma' },
  { brand: 'pingfield', creator: 'mika' },
  { brand: 'quietly', creator: 'june' },
];

export function brand(id: BrandId): ExampleBrand {
  return BRANDS.find((b) => b.id === id)!;
}
export function creator(id: string): ExampleCreator {
  return CREATORS.find((c) => c.id === id)!;
}
