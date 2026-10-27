/**
 * Classes for a highlight mark (mark.hl in global.css), so its box sits evenly around the letters it holds:
 * "low" when nothing rises above the x-height, "desc" when something hangs below the baseline.
 */
export function hlClasses(text: string): { low: boolean; desc: boolean } {
  return { low: !/[A-Z0-9bdfhijklt'"!?()&%$]/.test(text), desc: /[gjpqy,;]/.test(text) };
}
