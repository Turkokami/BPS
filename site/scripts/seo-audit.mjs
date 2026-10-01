#!/usr/bin/env node
/** 2 · Per-page SEO audit — M5, M6, M7 and the one-H1 rule. */
import fs from 'node:fs'; import path from 'node:path';
const DIST = 'dist', TITLE_MAX = 60, D_MIN = 110, D_MAX = 165;
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name).replace(/\\/g, '/'); e.isDirectory() ? walk(p, out) : p.endsWith('.html') && out.push(p);
} return out; };
if (!fs.existsSync(DIST)) {
  console.log(`seo-audit: no ${DIST}/ yet — this check runs on built HTML, after \`astro build\``);
  process.exit(0);
}
const files = walk(DIST); const errs = []; const warns = [];
const titles = new Map(), descs = new Map();

/* CTR discipline. Antipatterns fail the build; a title carrying no reason to be
 * clicked warns. Ported from the Keystone harness and retuned for Maine: the
 * place-token list is the geography this site actually claims, and pages the
 * demand gate has held back (noindex) are exempt, because a page that is not
 * published is not competing for a click. */
const CTR_ANTI = [
  ['bare service + brand', /^[A-Za-z ]+\s*\|\s*Blouin Pest(?: Services)?$/],
  ['unsubstantiated superlative', /\b(best|#1|number one|top rated)\b/i],
  ['filler stacking', /\b(services?|solutions?|company|professional)\b[^|]*\b(services?|solutions?|company|professional)\b/i],
];
/*
 * The place token was too narrow in the first version: it required "in X" or
 * "near X", so "Window Cleaning — Whatcom & Skagit" scored as having no place at
 * all. A region name IS a place token however the title is punctuated.
 */
const CTR_TOKEN = [
  ['place', /\b(in|near|across)\s+[A-Z]|\b(Maine|ME|Androscoggin|Cumberland|Kennebec|Franklin|Oxford|Sagadahoc|York|Lewiston|Auburn|Portland|Augusta|Brunswick|Topsham|Bath|Waterville|Farmington|Windham|Gorham|Scarborough)\b/],
  ['proof', /\b(\d+(\.\d+)?★|\d{2,}\s*reviews?|5\.0|since\s*\d{4}|\d+\s*years?)\b/i],
  ['specificity', /\b(attic|basement|apartment|rental|yard|wall|exclusion|inspection|free\s*(quote|inspection)|insured|licen[cs]ed|calendar|explained)\b/i],
];
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8'); const u = f.replace(/\\/g, '/').replace(/^dist/, '').replace(/index\.html$/, '');
  /*
   * Page class decides how hard the CTR rules bite, and this is a judgement the
   * standard forces rather than one worth arguing with. A commercial page at
   * position nine competes for the click. A privacy page does not, and a surface
   * library profile titled "Vinyl Siding" is CORRECT — bolting "in Whatcom
   * County" onto a material definition is the filler stacking this same check
   * bans two rules down. So: utility and informational pages are exempt from the
   * token expectation and from the bare-title antipattern. Everything else is not.
   */
  // A page the Part 6A gate is holding back carries noindex; it is not in the
  // sitemap and is not linked, so CTR expectations do not apply to it.
  const gated = /<meta name="robots" content="noindex/.test(h);
  const utility = gated
    || /^\/(privacy|about|reviews|contact|our-guarantee|case-studies|team|services|service-area|locations|library|compliance|financing|gallery)\/?$/.test(u)
    || /^\/(surface-library|compliance|team)\//.test(u)
    // 404 is noindex and has no query to compete for. It was the last thing in
    // the audit and it is not a real finding.
    || u === '/404.html';
  /*
   * Decode entities before measuring. The audit was counting "&amp;" as five
   * characters against an M5 limit Google applies to the rendered string, which
   * put three geo titles over the line at 63-64 when they render at 59-60.
   */
  // Astro escapes "&" as the NUMERIC entity &#38;, not &amp;, so a named-entity
  // map alone still over-counted by four characters per ampersand. Decode numeric
  // references generally rather than enumerating them.
  const decode = (t) => (t ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
  const title = decode((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1])?.trim() || undefined;
  const desc = decode((h.match(/<meta name="description" content="([^"]*)"/) || [])[1]) || undefined;
  const h1s = [...h.matchAll(/<h1[^>]*>/g)].length;
  if (!title) errs.push(`${u}: missing title`);
  else {
    if (title.length > TITLE_MAX) errs.push(`${u}: title ${title.length} chars`);
    /*
     * Order matters, and the first version got it wrong. "Window Cleaning in
     * Bellingham WA | King of Kings" matched the bare-service-plus-brand
     * antipattern even though it carries exactly the place token the rule wants.
     * The antipattern is about a title with nothing to choose it for — so a title
     * carrying a CTR token cannot be "bare" by definition, and the check now runs
     * in that order. Superlatives and filler stacking still fail regardless.
     */
    const hasToken = CTR_TOKEN.some(([, re]) => re.test(title));
    for (const [name, re] of CTR_ANTI) {
      if (name === 'bare service + brand' && (hasToken || utility)) continue;
      if (re.test(title)) errs.push(`${u}: title antipattern (${name}) — "${title}"`);
    }
    if (!hasToken && !utility) warns.push(`${u}: title carries no place, proof or specificity token — "${title}"`);
    titles.set(title, [...(titles.get(title) || []), u]);
  }
  if (!desc) errs.push(`${u}: missing meta description`);
  else {
    if (desc.length < D_MIN || desc.length > D_MAX) errs.push(`${u}: description ${desc.length} chars`);
    if (!/[.!?]$/.test(desc.trim())) errs.push(`${u}: description dangling ending`);
    if (title && desc.toLowerCase().startsWith(title.toLowerCase().split('|')[0].trim().slice(0, 24).toLowerCase())) {
      warns.push(`${u}: description opens by restating the title — wastes the one line Google shows`);
    }
    descs.set(desc, [...(descs.get(desc) || []), u]);
  }
  if (h1s !== 1) errs.push(`${u}: ${h1s} H1 elements (must be exactly 1)`);
  if (!/rel="canonical"/.test(h)) errs.push(`${u}: missing canonical`);
  // Keystone v3.2 changelog item 4 — social tags named explicitly instead of
  // inherited from M7's shared-image rule. Two portfolio audits found these
  // missing sitewide only incidentally; the harness fails on them now.
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
    if (!new RegExp(`property="${tag}"`).test(h)) errs.push(`${u}: missing ${tag} (M5 social tags)`);
  }
  if (!/name="twitter:card"/.test(h)) errs.push(`${u}: missing twitter:card (M5 social tags)`);
  for (const img of h.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) errs.push(`${u}: <img> without alt — ${img[0].slice(0, 80)}`);
  /*
   * M6 vs Dimension 14 — these two rules collided and M6 was wrong.
   * v3.2's accessibility dimension requires "decorative images with alt=''", and
   * the header logo sits inside a link that already carries an accessible name,
   * so an empty alt is the CORRECT markup there. Flagging it produced 79 false
   * positives, one per page, the moment the a11y fix shipped.
   * An empty alt is now a defect only on an image that is NOT inside a named
   * link — i.e. where nothing else supplies the name.
   */
  for (const img of h.matchAll(/<a\b(?![^>]*aria-label)[^>]*>\s*<img[^>]*\balt=""[^>]*>/g)) {
    errs.push(`${u}: <img> with empty alt inside a link with no aria-label — the link has no accessible name — ${img[0].slice(0, 80)}`);
  }
  if (/PHASE 1 BLOCKER/.test(h)) errs.push(`${u}: named-expert block unfilled (business.ts expert.*)`);
}
for (const [t, u] of titles) if (u.length > 1) errs.push(`duplicate title (${u.length}): "${t}"`);
for (const [, u] of descs) if (u.length > 1) errs.push(`duplicate description (${u.length}): ${u.slice(0, 4).join(', ')}`);
errs.forEach((e) => console.error(e));
warns.forEach((w) => console.warn(w));
console.log(
  errs.length
    ? `seo-audit: ${errs.length} problems, ${warns.length} CTR warnings`
    : `seo-audit: OK (${files.length} pages) · ${warns.length} CTR warnings (advisory)`
);
process.exit(errs.length ? 1 : 0);
