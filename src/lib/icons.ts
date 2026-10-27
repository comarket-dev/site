/**
 * Our own icons, drawn on a 24px grid and centred on their box, which text arrows aren't: Satoshi's arrow glyphs
 * sit off centre, and ← and → carry different side bearings, so they never look centred in a circle.
 * One family: a straight shaft and an open head, round ends, drawn to sit on Satoshi's x-height.
 */
export const ICONS = {
  'arrow-right': '<path d="M4.5 12h14.5"/><path d="M13.5 6.5 19 12l-5.5 5.5"/>',
  'arrow-left': '<path d="M19.5 12H5"/><path d="M10.5 6.5 5 12l5.5 5.5"/>',
  'arrow-up': '<path d="M12 19.5V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/>',
} as const;
export type IconName = keyof typeof ICONS;

/** The same icon as an HTML string, for text built in scripts. */
export function iconHtml(name: IconName, cls = 'icon'): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
