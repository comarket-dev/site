/* The licensed photos of real people (design/people/people.json, built by scripts/people.py), under the Kaboompics and
   Pexels licenses: they illustrate a side of the market and are never named, quoted, given a handle or a result, or put
   inside our product UI, since the licenses forbid implying they endorse or use anything. */
import spec from '../../design/people/people.json';
import manifest from '../../public/assets/people/manifest.json';

export type PersonId = (typeof spec.people)[number]['id'];

export interface Person {
  id: PersonId;
  alt: string;
  /** where the subject sits, 0 to 1 across and down: use as object-position */
  focal: [number, number];
  w: number;
  h: number;
  /** where the people in it are looking, so the phone or the sign-up card can sit there (Scene.astro) */
  spots: Partial<Record<SpotName, Spot & { m: Spot }>>;
}

export type SpotName = 'phone' | 'form';
/** Fractions of the whole photo (see `_spots` in people.json). */
export interface Spot {
  z: number;
  x: number;
  tx: number;
  y0: number;
  y1: number;
  top: number;
  h?: number;
  w?: number;
}

const byId = new Map(
  spec.people.map((p) => {
    const m = (manifest as Record<string, { w: number; h: number }>)[p.id];
    const spots = ('spots' in p ? p.spots : {}) as Person['spots'];
    return [p.id, { id: p.id, alt: p.alt, focal: p.focal as [number, number], w: m?.w ?? 3, h: m?.h ?? 2, spots }];
  }),
);

export function person(id: PersonId): Person {
  const p = byId.get(id);
  if (!p) throw new Error(`No photo for ${id}`);
  return p;
}

export const PHOTO_WIDTHS = [480, 960, 1600, 2400, 3200];
export const FACE_WIDTHS = [96, 192, 384];

/** Owner review only: `?hero=band` and `?photo=<id>` try another hero look or photo on a live page. */
export function heroPreview(url: URL, photo: PersonId, look: 'split' | 'band' = 'band') {
  const h = url.searchParams.get('hero');
  const ph = url.searchParams.get('photo');
  return {
    look: h === 'band' || h === 'split' ? h : look,
    photo: ph && byId.has(ph as PersonId) ? (ph as PersonId) : photo,
  };
}
