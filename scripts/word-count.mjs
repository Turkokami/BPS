#!/usr/bin/env node
/**
 * 3 · Word-band + substance-gate auditor — Keystone v2, mandate M1.
 *
 * WHAT CHANGED FROM v1. There is no longer a 3,000-word floor. v2 removed it as
 * "the one requirement in Keystone with no supporting evidence and material
 * evidence against it" — writing to a word count is on Google's own helpful-content
 * "avoid" list, and padding a page toward a quota moves it toward the scaled-content
 * definition rather than away from it.
 *
 * Two things replace it:
 *   1. A per-page-type WORD BAND (below). These are editorial defaults, not
 *      thresholds — v2 is explicit that "no agent may treat these numbers as a new
 *      floor." Out-of-band is a WARNING to a human, never a build failure.
 *   2. The four-item SUBSTANCE GATE, which is the real gate and IS a build
 *      failure. A page ships only when it carries:
 *         · three verifiable local specifics
 *         · one first-party proof from that geography
 *         · one fact the top five competitors don't carry
 *         · zero sentences shared with a sibling page
 *
 * Measured on the markdown SOURCE, not rendered HTML — rendered HTML inflates
 * every page by nav and footer, which is how a thin page passes a naive check.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src/content';

/** Keystone v2, Part 6.3. Editorial defaults. Out-of-band warns; it does not fail. */
const BANDS = {
  sitePage:     { min: 600,  max: 1200, label: 'T1 home / hub' },
  service:      { min: 1200, max: 2500, label: 'T2 core service spoke' },
  problem:      { min: 700,  max: 1400, label: 'T3 problem micro page' },
  city:         { min: 800,  max: 1600, label: 'T4 city page' },
  cityService:  { min: 800,  max: 1600, label: 'T4 city x service page' },
  neighborhood: { min: 400,  max: 900,  label: 'T5 neighborhood page' },
  library:      { min: 1200, max: 2500, label: 'T6 library profile' },
  compliance:   { min: 900,  max: 1800, label: 'T8 compliance page' },
  caseStudy:    { min: 500,  max: 1200, label: 'T9 case study' },
  blog:         { min: 700,  max: 1500, label: 'blog / Q&A post' },
};

const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(md|mdx)$/.test(p) && out.push(p);
  }
  return out;
};

const stripBody = (raw) =>
  raw.replace(/^---[\s\S]*?\n---\n/, '')
     .replace(/```[\s\S]*?```/g, '')
     .replace(/<!--[\s\S]*?-->/g, '')
     .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
     .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

const frontmatter = (raw) => (raw.match(/^---\n([\s\S]*?)\n---/) || [, ''])[1];

const files = walk(ROOT);
if (!files.length) {
  console.log('word-band: no content files yet — nothing to check');
  process.exit(0);
}

const warnings = [];
const failures = [];
const rows = [];

for (const f of files) {
  const rel = f.replace(`${ROOT}/`, '');
  const collection = rel.split('/')[0];
  const band = BANDS[collection];
  const raw = fs.readFileSync(f, 'utf8');
  const body = stripBody(raw);
  const fm = frontmatter(raw);
  const wc = (body.match(/[A-Za-z0-9'-]+/g) || []).length;
  rows.push({ rel, wc, collection });

  // ---- word band: advisory only (Keystone v2 — "not a new floor") -----------
  if (band) {
    if (wc > band.max) warnings.push(`OVER BAND   ${rel}: ${wc} words, ${band.label} band is ${band.min}-${band.max}`);
    else if (wc < band.min) warnings.push(`under band  ${rel}: ${wc} words, ${band.label} band is ${band.min}-${band.max}`);
  } else {
    warnings.push(`no band defined for collection "${collection}" (${rel})`);
  }

  // ---- substance gate: this IS the gate, and it fails the build -------------
  // Item 1 — three verifiable local specifics, declared in frontmatter so they
  // are auditable rather than asserted. Geo page types must carry them.
  const geoTypes = ['city', 'cityService', 'neighborhood'];
  if (geoTypes.includes(collection)) {
    const facts = (fm.match(/^\s*-\s+["']?.+$/gm) || []).length;
    const hasLocalFacts = /localFacts:/.test(fm);
    if (!hasLocalFacts) {
      failures.push(`SUBSTANCE GATE  ${rel}: no localFacts block — item 1 (three verifiable local specifics) unproven`);
    } else {
      const block = (fm.split('localFacts:')[1] || '').split(/\n[a-zA-Z]/)[0];
      const n = (block.match(/^\s+-\s/gm) || []).length;
      if (n < 3) failures.push(`SUBSTANCE GATE  ${rel}: ${n} localFacts, item 1 needs 3 verifiable local specifics`);
    }
    // Item 2 — first-party proof from THAT geography (a real job, photo or review).
    // A PENDING/TBD placeholder fails exactly like an absent field: otherwise the
    // placeholder becomes the loophole that defeats the gate.
    const placeholder = /(PENDING|TBD|TODO|FIXME|XXX)/i;
    const field = (k) => ((fm.match(new RegExp(`^${k}:\\s*["']?(.*?)["']?\\s*$`, 'm')) || [])[1] || '');
    if (!/firstPartyProof:/.test(fm)) {
      failures.push(`SUBSTANCE GATE  ${rel}: no firstPartyProof — item 2 requires proof from this geography`);
    } else if (placeholder.test(field('firstPartyProof'))) {
      failures.push(`SUBSTANCE GATE  ${rel}: firstPartyProof is a placeholder — item 2 needs a real job, photo or review`);
    }
    // Item 3 — one fact the top five competitors don't carry.
    if (!/uniqueFact:/.test(fm)) {
      failures.push(`SUBSTANCE GATE  ${rel}: no uniqueFact — item 3 requires a fact the top five don't carry`);
    } else if (placeholder.test(field('uniqueFact'))) {
      failures.push(`SUBSTANCE GATE  ${rel}: uniqueFact is a placeholder`);
    }
  }
  // Item 4 — zero sentences shared with a sibling — is enforced by dedup.mjs.
}

const wcs = rows.map((r) => r.wc).sort((a, b) => a - b);
warnings.forEach((w) => console.warn(w));
failures.forEach((e) => console.error(e));

console.log(
  `\nword-band: ${files.length} pages · median ${wcs[Math.floor(wcs.length / 2)]} words · ` +
  `${warnings.length} band warnings (advisory) · ${failures.length} substance-gate failures (blocking)`
);
process.exit(failures.length ? 1 : 0);
