#!/usr/bin/env node
/**
 * Generates src/data/authorised.ts from architecture/demand/demand-map.csv.
 *
 * Three states, and the difference between them is the whole point of the file:
 *   PAGE     — two of the five Part 6A signals are on record. Route renders, is
 *              indexable, appears in the sitemap and may be linked.
 *   PENDING  — one signal (today: S4 competitor coverage). Route renders with
 *              noindex, stays out of the sitemap, and is NOT linked from any
 *              template. It flips to PAGE by editing one CSV cell once the
 *              client supplies job history or we pull keyword volume.
 *   DECLINE  — no evidence. No route at all; the geography lives in areaServed
 *              prose only.
 *
 * Routes read this file, never the CSV, so a template cannot disagree with the
 * evidence. A page that is not authorised cannot be linked by accident because
 * the link helpers filter on the same arrays the routes enumerate.
 */
import fs from 'node:fs';

const csv = fs.readFileSync('../architecture/demand/demand-map.csv', 'utf8').replace(/\r/g, '').trim().split('\n');
const head = csv[0].split(',');
const idx = (n) => head.indexOf(n);
const split = (line) => {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
};
const rows = csv.slice(1).map(split);
const iGeo = idx('geo'), iCounty = idx('county'), iDec = idx('decision'), iUrl = idx('url'), iS4 = idx('s4_competitors'), iSig = idx('signals');

const townRows = rows.filter((r) => r[iUrl].startsWith('/locations/'));
const countyRows = rows.filter((r) => r[iUrl].startsWith('/service-area/'));
const pick = (arr, d) => arr.filter((r) => r[iDec] === d);

const fmt = (r) => `  { slug: ${JSON.stringify(r[iGeo])}, county: ${JSON.stringify(r[iCounty])}, signals: ${Number(r[iSig])}, s4: ${JSON.stringify(r[iS4])} }`;

const out = `// GENERATED FILE — do not edit. Source: architecture/demand/demand-map.csv
// Regenerate with: node scripts/gen-authorised.mjs
// Part 6A gate. PAGE = 2+ signals, indexable. PENDING = 1 signal, built but
// noindex and unlinked. DECLINED = no route.
export type GeoRow = { slug: string; county: string; signals: number; s4: string };

export const AUTHORISED_TOWNS: GeoRow[] = [
${pick(townRows, 'PAGE').map(fmt).join(',\n')}
];

export const PENDING_TOWNS: GeoRow[] = [
${pick(townRows, 'PENDING').map(fmt).join(',\n')}
];

export const DECLINED_TOWNS: string[] = [
${pick(townRows, 'DECLINE').map((r) => `  ${JSON.stringify(r[iGeo])}`).join(',\n')}
];

export const AUTHORISED_COUNTIES: GeoRow[] = [
${pick(countyRows, 'PAGE').map(fmt).join(',\n')}
];

export const PENDING_COUNTIES: GeoRow[] = [
${pick(countyRows, 'PENDING').map(fmt).join(',\n')}
];

/** Every town with a route, in either state. Routes enumerate this. */
export const ROUTED_TOWNS: GeoRow[] = [...AUTHORISED_TOWNS, ...PENDING_TOWNS];
export const ROUTED_COUNTIES: GeoRow[] = [...AUTHORISED_COUNTIES, ...PENDING_COUNTIES];

export const isIndexableTown = (slug: string) => AUTHORISED_TOWNS.some((t) => t.slug === slug);
export const isIndexableCounty = (slug: string) => AUTHORISED_COUNTIES.some((c) => c.slug === slug);
/** Link helper: templates may only link to indexable geography. */
export const linkableTowns = () => AUTHORISED_TOWNS;
`;
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/authorised.ts', out);
// Published alongside the TS module so scripts/gen-redirects.mjs points legacy
// URLs at real pages the moment a town clears the gate.
fs.writeFileSync('../architecture/demand/authorised-towns.json', JSON.stringify(pick(townRows, 'PAGE').map((r) => r[iGeo]), null, 2));
console.log(`gen-authorised: ${pick(townRows, 'PAGE').length} indexable towns, ${pick(townRows, 'PENDING').length} pending, ${pick(townRows, 'DECLINE').length} declined, ${pick(countyRows, 'PAGE').length}/${countyRows.length} counties indexable`);
