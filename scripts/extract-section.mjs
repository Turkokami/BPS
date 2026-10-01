#!/usr/bin/env node
/**
 * Section mover — brings v1-era pages into their Keystone v2 word band without
 * throwing away researched copy.
 *
 * The nine service hubs were written to the retired 3,000-word floor and now sit
 * ~500-800 words over the T2 band (1,200-2,500). The fix is NOT to delete the
 * overflow. v2 moves depth from "words per page" to "pages that clear the
 * substance gate", and the architecture already contains 18 problem micro pages
 * (T3, 700-1,400) and 25 library profiles (T6, 1,200-2,500) with no bodies.
 * A section that is too long for a hub is usually a problem page that has not
 * been split out yet.
 *
 * Usage:
 *   node scripts/extract-section.mjs <file> "## Heading" [...more headings]
 *
 * Prints the removed sections to stdout so they can be piped into the new page,
 * and rewrites the source file without them.
 */
import fs from 'node:fs';

const [, , file, ...headings] = process.argv;
if (!file || !headings.length) {
  console.error('usage: extract-section.mjs <file> "## Heading" ["## Heading" ...]');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const fmEnd = raw.indexOf('\n---\n', 3) + 5;
const front = raw.slice(0, fmEnd);
let body = raw.slice(fmEnd);

const removed = [];
for (const h of headings) {
  const start = body.indexOf(`\n${h}`);
  if (start === -1) {
    console.error(`  !! not found: ${h}`);
    continue;
  }
  // A section runs to the next heading at the same level or higher.
  const level = (h.match(/^#+/) || ['##'])[0].length;
  const after = body.slice(start + 1);
  const nextRe = new RegExp(`\\n#{1,${level}} `, 'm');
  const m = after.slice(h.length).match(nextRe);
  const end = m ? start + 1 + h.length + m.index : body.length;
  removed.push(body.slice(start + 1, end).trim());
  body = body.slice(0, start) + body.slice(end);
}

body = body.replace(/\n{3,}/g, '\n\n');
fs.writeFileSync(file, front + body);

const wc = (s) => (s.match(/[A-Za-z0-9'-]+/g) || []).length;
console.error(`  ${file}: removed ${removed.length} section(s), ${removed.reduce((a, s) => a + wc(s), 0)} words`);
console.log(removed.join('\n\n'));
