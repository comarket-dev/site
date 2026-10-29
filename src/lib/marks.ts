/**
 * The example brands' logo marks (design/brands/README.md), on a 24px grid. One source for every place a brand
 * shows up: SVG in pages (BrandMark.astro) and Path2D on the stage's canvas (drawMark in screens.ts).
 * Invented shapes, not anyone's real logo.
 */

export type BrandId = 'fernwood' | 'tallyhawk' | 'pagewell' | 'orbitly' | 'kindred' | 'hollow' | 'pingfield' | 'quietly';

export interface MarkPart {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  evenodd?: boolean;
  /** keeps its own color when the mark is tinted (a moon, a fold) */
  fixed?: boolean;
}

export const MARKS: Record<BrandId, MarkPart[]> = {
  // a filled leaf, its midrib cut through it and rising like a line on a chart
  fernwood: [{ d: 'M3.5 20.5C3.5 10.8 10.3 4 20.5 3.5 20 13.7 13.2 20.5 3.5 20.5ZM4.6 18.2 14 8.8 15.2 10 5.8 19.4Z', fill: '#1E6B47', evenodd: true }],
  // a hawk's head in profile, hooked beak, the eye cut out
  tallyhawk: [{ d: 'M2.5 6.5h11.2c4.2 0 7.3 3 7.8 6.9l-3.9-1.4 1 3.8-3.1-1.2V21H8.2a5.7 5.7 0 0 1-5.7-5.7ZM12.9 9.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z', fill: '#E4572E', evenodd: true }],
  // a page with its corner folded down
  pagewell: [
    { d: 'M5 2.5h9.5L20 8v13.5H5Z', fill: '#7A3EF0' },
    { d: 'M14.5 2.5V8H20Z', fill: '#B79BF7', fixed: true },
  ],
  // a planet, a tilted orbit and one small moon
  orbitly: [
    { d: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', fill: '#2B1B00' },
    { d: 'M21.59 7.73A10.5 4 -24 1 0 2.41 16.27 10.5 4 -24 1 0 21.59 7.73Z', stroke: '#2B1B00', width: 1.8 },
    { d: 'M20.6 5.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z', fill: '#F2B134', stroke: '#2B1B00', width: 1.2, fixed: true },
  ],
  // the drop, as on the serum
  kindred: [{ d: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z', stroke: '#B8664F', width: 1.8 }],
  // the cup, as on the tin
  hollow: [{ d: 'M3.5 10.5h13M3.5 10.5a6.5 6.5 0 0 0 13 0M16.5 11.5h1.8a2.4 2.4 0 0 1 0 4.8h-2.4M9 7.5c0-1.6 1.6-2.4 2.4-4', stroke: '#5E7F64', width: 1.8 }],
  // a dot, and its ping rippling out
  pingfield: [
    { d: 'M6 15.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z', fill: '#C8F560' },
    { d: 'M6 11.5a6.5 6.5 0 0 1 6.5 6.5M6 5a13 13 0 0 1 13 13', stroke: '#C8F560', width: 2 },
  ],
  // a crescent moon
  quietly: [{ d: 'M19.5 14.5A8.5 8.5 0 1 1 9.5 4.5a6.6 6.6 0 0 0 10 10Z', fill: '#F4C77B' }],
};

/** A mark's parts with one color in place of its own (fixed parts keep theirs). */
export function tinted(id: BrandId, tint?: string): MarkPart[] {
  return MARKS[id].map((p) =>
    !tint || p.fixed ? p : { ...p, fill: p.fill ? tint : undefined, stroke: p.stroke ? tint : undefined },
  );
}
