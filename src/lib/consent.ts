/**
 * Countries where we ask before setting tracking cookies: EU and EEA members,
 * the UK and Switzerland. Unknown country (local dev, some proxies) counts as "ask".
 */
const ASK = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
]);

export function requiresConsent(country: string | undefined): boolean {
  if (!country || country === 'XX' || country === 'T1') return true;
  return ASK.has(country.toUpperCase());
}
