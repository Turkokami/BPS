/**
 * Title and description construction. Two rules the old site broke on every URL:
 * the brand appears once, and the title stays inside 60 characters. `trim` cuts
 * on a word boundary and re-checks, because an off-by-one here shipped a
 * 166-character description on a previous build.
 */
export const BRAND = 'Blouin Pest Services';

export function title(main: string, { brand = true } = {}) {
  const t = brand ? `${main} | ${BRAND}` : main;
  return t.length <= 60 ? t : (brand ? `${main} | Blouin Pest` : main).slice(0, 60).replace(/[\s|–-]+$/, '');
}

export function description(text: string, max = 158) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // Cut at the last sentence boundary inside the limit, so a truncated
  // description still reads as a finished sentence. Falling back to a word
  // boundary with a full stop appended, never a dangling clause.
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastStop > 60) return cut.slice(0, lastStop + 1).trim();
  const words = cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '');
  return `${words}.`.length <= max ? `${words}.` : `${words.slice(0, max - 1)}.`;
}
