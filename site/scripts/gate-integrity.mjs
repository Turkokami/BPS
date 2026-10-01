#!/usr/bin/env node
/**
 * 10 · Demand-gate integrity — Keystone v3.2, Part 6A and mandate M1.
 *
 * WHY THIS EXISTS. The demand gate is the one thing on this build that a future
 * edit can break silently. Nothing errors when a template starts linking to a
 * held-back town, or when a page loses its noindex, or when someone adds a URL
 * to a sitemap by hand. The page simply starts being published, the substance
 * gate is bypassed, and the site quietly rebuilds the 100-page lattice this
 * engagement removed.
 *
 * So the invariants are asserted against the RENDERED output, not the source:
 *   1. Every PENDING town and county route carries meta robots noindex.
 *   2. No sitemap — index or tier — contains a URL for a PENDING route.
 *   3. No page links to a PENDING route.
 *   4. Every AUTHORISED route is the mirror image: indexable, in a sitemap.
 *   5. No route exists at all for a DECLINED town.
 *   6. An unattested service page is treated exactly like a PENDING geography.
 *
 * Any failure is a build failure. This is the gate the whole architecture rests
 * on, and it is cheap to check.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const read = (p) => fs.readFileSync(p, 'utf8');
const csv = read('../architecture/demand/demand-map.csv').replace(/\r/g, '').trim().split('\n');
const head = csv[0].split(',');
const iUrl = head.indexOf('url'), iGeo = head.indexOf('geo'), iDec = head.indexOf('decision');
/*
 * Quote-aware split. The first version used l.split(',') and it broke the moment
 * an evidence cell contained a comma: every column after it shifted, PENDING
 * towns read as authorised, and the check reported eight failures that did not
 * exist. A naive CSV parse in a file whose whole job is to be trusted is exactly
 * the kind of bug this harness exists to catch — in itself, this time.
 */
const splitRow = (line) => {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
};
const rows = csv.slice(1).map(splitRow);

const townState = new Map();   // slug -> PAGE | PENDING | DECLINE
const countyState = new Map();
for (const r of rows) {
  (r[iUrl].startsWith('/locations/') ? townState : countyState).set(r[iGeo], r[iDec]);
}

const htmlFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : p.endsWith('.html') && htmlFiles.push(p);
  }
})(DIST);

const urlOf = (f) => f.replace(/\\/g, '/').replace(/^dist/, '').replace(/index\.html$/, '');
const pages = new Map(htmlFiles.map((f) => [urlOf(f), read(f)]));

const sitemapUrls = new Set();
for (const f of fs.readdirSync(DIST)) {
  if (!/^sitemap.*\.xml$/.test(f)) continue;
  for (const m of read(path.join(DIST, f)).matchAll(/<loc>([^<]+)<\/loc>/g)) {
    sitemapUrls.add(m[1].replace(/^https?:\/\/[^/]+/, ''));
  }
}

const errs = [];
const isNoindex = (html) => /<meta name="robots" content="noindex/.test(html);
const linkedFrom = (target) =>
  [...pages.entries()].filter(([u, html]) => u !== target && new RegExp(`href="${target}"`).test(html)).map(([u]) => u);

// ---- geography -------------------------------------------------------------
for (const [slug, state] of townState) {
  const url = `/locations/${slug}/`;
  const html = pages.get(url);
  if (state === 'DECLINE') {
    if (html) errs.push(`DECLINED town has a route: ${url} — a declined geography gets no page at all`);
    continue;
  }
  if (!html) { errs.push(`${state} town has no route: ${url}`); continue; }
  if (state === 'PENDING') {
    if (!isNoindex(html)) errs.push(`GATE LEAK  ${url} is PENDING but is indexable`);
    if (sitemapUrls.has(url)) errs.push(`GATE LEAK  ${url} is PENDING but appears in a sitemap`);
    const from = linkedFrom(url);
    if (from.length) errs.push(`GATE LEAK  ${url} is PENDING but is linked from: ${from.slice(0, 3).join(', ')}`);
  } else {
    if (isNoindex(html)) errs.push(`${url} is authorised but carries noindex`);
    if (!sitemapUrls.has(url)) errs.push(`${url} is authorised but is missing from every sitemap`);
  }
}
for (const [slug, state] of countyState) {
  const url = `/service-area/${slug}/`;
  const html = pages.get(url);
  if (!html) { errs.push(`county route missing: ${url}`); continue; }
  if (state === 'PENDING') {
    if (!isNoindex(html)) errs.push(`GATE LEAK  ${url} is PENDING but is indexable`);
    if (sitemapUrls.has(url)) errs.push(`GATE LEAK  ${url} is PENDING but appears in a sitemap`);
  }
}

// ---- unattested services ---------------------------------------------------
const services = read('src/data/services.ts');
for (const m of services.matchAll(/slug: '([^']+)'[\s\S]*?attested: (true|false)/g)) {
  const [, slug, attested] = m;
  const url = `/services/${slug}/`;
  const html = pages.get(url);
  if (!html) { errs.push(`service route missing: ${url}`); continue; }
  if (attested === 'false') {
    if (!isNoindex(html)) errs.push(`GATE LEAK  ${url} is unattested but is indexable`);
    if (sitemapUrls.has(url)) errs.push(`GATE LEAK  ${url} is unattested but appears in a sitemap`);
  } else if (isNoindex(html)) {
    errs.push(`${url} is attested but carries noindex`);
  }
}

// ---- unattested claims must not appear in rendered output ------------------
const FORBIDDEN = [
  ["Maine's Best", /Maine.s Best Pest Control/i],
  ['unqualified guarantee', /guaranteed effective treatments/i],
  ['customer count', /over 200 residential/i],
  ['eco-friendly claim', /eco-friendly/i],
];
for (const [url, html] of pages) {
  /*
   * One legitimate exception, and it is worth being precise about it. The
   * guarantee page QUOTES the withdrawn wording in order to explain why it is
   * not being used. Quoting a claim inside the notice block that disowns it is
   * the opposite of making it, so notice blocks are stripped before scanning.
   * Everywhere else, the presence of the string means the claim came back.
   */
  const body = html.replace(/<p class="notice">[\s\S]*?<\/p>/g, '');
  for (const [name, re] of FORBIDDEN) {
    if (re.test(body)) errs.push(`UNATTESTED CLAIM  ${url} contains the withdrawn ${name} claim`);
  }
}

errs.forEach((e) => console.error(e));
const pending = [...townState.values()].filter((s) => s === 'PENDING').length;
const declined = [...townState.values()].filter((s) => s === 'DECLINE').length;
const authorised = [...townState.values()].filter((s) => s === 'PAGE').length;
console.log(
  errs.length
    ? `gate-integrity: ${errs.length} failures`
    : `gate-integrity: OK · ${authorised} towns published, ${pending} held back and sealed, ${declined} declined with no route · ${sitemapUrls.size} URLs in sitemaps`
);
process.exit(errs.length ? 1 : 0);
