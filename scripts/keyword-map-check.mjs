#!/usr/bin/env node
/**
 * 4 · Keyword-map checker — Keystone v2, Part 9.2 harness item 6.
 *
 * The rule it enforces is one line of Part 6A.1 step 6: "One committed file
 * mapping every cluster to exactly one URL, enforcing one hard rule: no two
 * URLs may share the same (service, geo) tuple."
 *
 * Part 12.1 calls keyword cannibalization "the #1 recurring killer," and the
 * King of Kings audit is the textbook case — Bellingham window cleaning was
 * targeted by eight URLs at once on the legacy site. v1 diagnosed that after
 * the fact. This script is the prevention: it runs between every wave, and a
 * collision fails the wave rather than showing up in a rank report six months
 * later.
 *
 * It checks three things.
 *   1. TUPLE COLLISION — two map rows claiming the same (service, geo).
 *   2. URL COLLISION — two clusters mapped to the same URL.
 *   3. UNMAPPED PAGE — a built page with no row in the map. A page that exists
 *      without a demand row is exactly the "slot in the lattice" Part 6A was
 *      written to stop, so this is a failure, not a warning.
 *
 * It deliberately does NOT check whether a mapped page has cleared the demand
 * gate. That is the demand map's own `decision` column, and it is checked by
 * rule 4 below, which fails any built page whose row says MENTION.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAP = '../architecture/demand/demand-map.csv';
const CONTENT = 'src/content';

if (!fs.existsSync(MAP)) {
  console.error(`keyword-map: no committed map at ${MAP} — Part 6A.1 step 6 requires one`);
  process.exit(1);
}

// --- parse the committed map ------------------------------------------------
const lines = fs.readFileSync(MAP, 'utf8').replace(/\r/g, '').trim().split('\n');
const header = lines[0].split(',');
const col = (name) => header.indexOf(name);
const splitCsv = (line) => {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
};
const rows = lines.slice(1).map(splitCsv).map((r) => ({
  url: r[col('url')],
  service: r[col('service')],
  geo: r[col('geo')],
  cluster: r[col('cluster')],
  decision: r[col('decision')],
  blockedBy: r[col('blocked_by')],
}));

const failures = [];

// --- 1. tuple collision -----------------------------------------------------
const byTuple = new Map();
for (const r of rows) {
  const key = `${r.service}|${r.geo}`;
  if (!byTuple.has(key)) byTuple.set(key, []);
  byTuple.get(key).push(r.url);
}
for (const [key, urls] of byTuple) {
  if (urls.length > 1) {
    failures.push(`TUPLE COLLISION  (${key.replace('|', ', ')}) is claimed by ${urls.length} URLs: ${urls.join(' , ')}`);
  }
}

// --- 2. URL collision -------------------------------------------------------
const byUrl = new Map();
for (const r of rows) {
  if (!byUrl.has(r.url)) byUrl.set(r.url, []);
  byUrl.get(r.url).push(r.cluster);
}
for (const [url, clusters] of byUrl) {
  if (clusters.length > 1) {
    failures.push(`URL COLLISION    ${url} is the target of ${clusters.length} clusters: ${clusters.join(' , ')}`);
  }
}

// --- 3 & 4. built pages against the map ------------------------------------
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(md|mdx)$/.test(p) && out.push(p);
  }
  return out;
};

// Only geo page types are governed by the demand gate. Service hubs, problem
// pages and library profiles are earned by the service tree, not by geography.
const GEO_COLLECTIONS = new Set(['city', 'cityService', 'neighborhood']);
const built = walk(CONTENT).filter((f) => GEO_COLLECTIONS.has(f.replace(`${CONTENT}/`, '').split('/')[0]));

for (const f of built) {
  const rel = f.replace(`${CONTENT}/`, '');
  const parts = rel.split('/');
  // city/<slug>.md  -> (geo=<slug>, service='')
  // cityService/<geo>/<service>.md -> (geo, service)
  const collection = parts[0];
  const geo = collection === 'city' ? parts[1].replace(/\.mdx?$/, '') : parts[1];
  const service = collection === 'city' ? '' : (parts[2] || '').replace(/\.mdx?$/, '');
  const row = rows.find((r) => r.geo === geo && r.service === service);
  if (!row) {
    failures.push(`UNMAPPED PAGE    ${rel} has no row in the demand map — Part 6A: a page is earned by evidence, not by a slot`);
  } else if (row.decision !== 'PAGE') {
    failures.push(`GATE NOT CLEARED ${rel} is built, but its demand row says ${row.decision}. ${row.blockedBy || ''}`.trim());
  }
}

failures.forEach((f) => console.error(f));
const pages = rows.filter((r) => r.decision === 'PAGE').length;
console.log(
  `\nkeyword-map: ${rows.length} clusters mapped · ${pages} cleared the Part 6A gate · ` +
  `${built.length} geo pages built · ${failures.length} failures`
);
process.exit(failures.length ? 1 : 0);
