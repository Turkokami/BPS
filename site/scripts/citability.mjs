#!/usr/bin/env node
/**
 * 6 · Citability and snippet-shape auditor — Keystone v3.2, Parts 6.5 and 4.3.
 *
 * TWO CHECKS, TWO DIFFERENT SEVERITIES, DELIBERATELY.
 *
 * SNIPPET SHAPE (4.3) is a per-page contract and it FAILS. A page declaring a
 * list shape has to carry a real ordered or unordered list; one declaring a table
 * has to carry a real table with a header row. The standard is explicit that a
 * styled stack of divs is not a list and a flex grid is not a table, and names
 * this as "the single most common way a page-builder site loses a shape it
 * otherwise deserves." A declared-but-absent shape is a broken promise in the
 * data, so it fails.
 *
 * CITABILITY (6.5) is SCORED, not gated. Dimension 13 asks for "the share of
 * indexable pages carrying all four Part 6.5 signals" — a proportion. So this
 * reports the share and names the gaps, and does not block. v3.2 spent its entire
 * changelog retiring gates that blocked shipping without catching anything; this
 * is not the place to add a new one.
 *
 * Shape is measured on the markdown source. Rendered HTML would let nav and
 * footer markup satisfy a shape the page body does not actually carry.
 *
 * firstPartyData is the exception, and it gets its own check below. It lives
 * only in frontmatter and reaches the page through a component, so source alone
 * cannot tell whether a reader ever sees it — and Part 6.5 counts a signal only
 * where a reader can. On 29 September the library and compliance templates were
 * not rendering it at all while this script happily counted five pages as
 * complete. A signal counted but not rendered is a false score, so unlike the
 * rest of 6.5 that one FAILS.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src/content';
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.md$/.test(p) && out.push(p);
  }
  return out;
};

const files = walk(ROOT);
if (!files.length) { console.log('citability: no content yet'); process.exit(0); }

const failures = [];
const rows = [];

for (const f of files) {
  const rel = f.replace(`${ROOT}/`, '');
  const raw = fs.readFileSync(f, 'utf8');
  const fm = (raw.match(/^---\n([\s\S]*?)\n---/) || [, ''])[1];
  const body = raw.replace(/^---[\s\S]*?\n---\n/, '');

  // ---- 4.3 snippet shape, against real markup --------------------------------
  const shape = (fm.match(/^snippetShape:\s*["']?([a-z+]+)["']?/m) || [])[1];
  if (!shape) {
    failures.push(`SNIPPET SHAPE  ${rel}: no snippetShape declared (Part 4.3)`);
  } else {
    // Markdown list: two or more item markers at line start. Counted rather than
    // matched as a consecutive run, because a real list item wraps onto indented
    // continuation lines and a run-based regex misses every well-formatted list.
    const listItems = (body.match(/^[ \t]*([-*+]|\d+\.)[ \t]+\S/gm) || []).length;
    const hasList = listItems >= 2 || /<[ou]l\b/.test(body);
    // Markdown table: a header row followed by a delimiter row.
    const hasTable = /^\|.+\|\s*\n\s*\|[\s:|-]+\|\s*$/m.test(body) || /<table\b[\s\S]*<th\b/.test(body);
    if (shape.includes('list') && !hasList) {
      failures.push(`SNIPPET SHAPE  ${rel}: declares "${shape}" but carries no real list — a styled stack is not a list`);
    }
    if (shape.includes('table') && !hasTable) {
      failures.push(`SNIPPET SHAPE  ${rel}: declares "${shape}" but carries no real table with a header row`);
    }
  }

  // ---- 6.5 citability, four signals -----------------------------------------
  /* Town pages carry the same signal under the M1 gate's name, firstPartyProof
     — item 2 of the substance gate IS first-party data from that geography.
     Reading both here is what lets a city file hold the fact once instead of
     twice; two fields saying the same thing is how they drift apart, which is
     exactly what had happened before 29 September. */
  const proofField = rel.startsWith('city/') ? 'firstPartyProof' : 'firstPartyData';
  const signals = {
    quantifiedFact: /^quantifiedFact:/m.test(fm),
    primaryAuthority: /^primaryAuthority:/m.test(fm),
    statedPosition: /^statedPosition:/m.test(fm),
    firstPartyData: new RegExp(`^${proofField}:\\s*(?!null\\s*$)\\S`, 'm').test(fm),
  };
  // Anti-pattern from 6.5: a sources block at the foot that no sentence points to.
  const footerSourcesOnly = /\n#+\s*Sources?\b/i.test(body) && !/\b(says|puts|documents|states|reports|according to)\b/i.test(body);
  if (footerSourcesOnly) {
    failures.push(`CITABILITY     ${rel}: has a Sources block but no sentence names an authority in the visible text (6.5 anti-pattern)`);
  }
  const proof = (fm.match(new RegExp(`^${proofField}:\\s*"([\\s\\S]*?)"\\s*$`, 'm')) || [])[1] ?? null;
  rows.push({ rel, shape, signals, fm, proof, n: Object.values(signals).filter(Boolean).length });
}

// ---- firstPartyData must actually reach the page --------------------------
// Frontmatter presence is not publication. Checked against dist/, skipped when
// there is no build to check (so the script still runs on its own).
if (fs.existsSync('dist')) {
  const routeFor = (rel, fm) => {
    const slug = path.basename(rel, '.md');
    const one = (k) => (fm.match(new RegExp(`^${k}:\\s*["']?([^"'\n]+)`, 'm')) || [])[1];
    if (rel.startsWith('service/')) return `services/${slug}`;
    if (rel.startsWith('problem/')) return one('service') ? `services/${one('service')}/${slug}` : null;
    if (rel.startsWith('library/')) return `library/${slug}`;
    if (rel.startsWith('compliance/')) return `compliance/${slug}`;
    if (rel.startsWith('city/')) return one('town') ? `locations/${one('town')}` : null;
    return null;
  };
  /* Compare on words rather than characters. The renderer turns apostrophes and
     dashes into entities, so a byte-for-byte match fails on prose that is in
     fact on the page — and stripping entities AFTER dropping punctuation leaves
     their digits behind ("customer&#39;s" becomes "customer 39 s"), which is the
     false positive this check produced on its first run. Entities go first. */
  const words = (t) => t.replace(/&[#a-z0-9]+;/gi, ' ').replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const fingerprint = (t) => words(t).split(' ').slice(0, 10).join(' ');
  for (const r of rows) {
    if (!r.signals.firstPartyData || !r.proof) continue;
    const route = routeFor(r.rel, r.fm);
    if (!route) continue;
    const file = path.join('dist', route, 'index.html');
    if (!fs.existsSync(file)) continue; // gated route, not built — nothing to check
    const html = words(fs.readFileSync(file, 'utf8'));
    if (!html.includes(fingerprint(r.proof))) {
      failures.push(
        `FIRST-PARTY    ${r.rel}: firstPartyData is set but does not appear in dist/${route}/index.html — ` +
        `the template is not rendering it, so Part 6.5 does not count it`,
      );
    }
  }
}

const complete = rows.filter((r) => r.n === 4).length;
const withThree = rows.filter((r) => r.n >= 3).length;

failures.forEach((f) => console.error(f));

console.log('\ncitability — Dimension 13 input sub-score (Keystone v3.2, 6.5):');
for (const r of rows.filter((r) => r.n < 4).sort((a, b) => a.n - b.n)) {
  const missing = Object.entries(r.signals).filter(([, v]) => !v).map(([k]) => k);
  console.log(`  ${r.n}/4  ${r.rel}  — missing: ${missing.join(', ')}`);
}
console.log(
  `\ncitability: ${complete}/${rows.length} pages carry all four signals ` +
  `(${Math.round((100 * complete) / rows.length)}%) · ${withThree} carry three or more · ` +
  `${failures.length} blocking failure(s)`
);
process.exit(failures.length ? 1 : 0);
