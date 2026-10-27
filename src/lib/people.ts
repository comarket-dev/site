/* The licensed photos of real people (design/people/people.json, built by scripts/people.py). They're models under the
   Kaboompics Standard License: they illustrate a side of the market and are never named, quoted, given a handle or a
   result, or put inside our product UI, since the license forbids implying they endorse or use anything. */
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
}

const byId = new Map(
  spec.people.map((p) => {
    const m = (manifest as Record<string, { w: number; h: number }>)[p.id];
    return [p.id, { id: p.id, alt: p.alt, focal: p.focal as [number, number], w: m?.w ?? 3, h: m?.h ?? 2 }];
  }),
);

export function person(id: PersonId): Person {
  const p = byId.get(id);
  if (!p) throw new Error(`No photo for ${id}`);
  return p;
}

export const PHOTO_WIDTHS = [480, 960, 1600];
export const FACE_WIDTHS = [96, 192, 384];
