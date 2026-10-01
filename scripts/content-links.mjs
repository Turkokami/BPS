#!/usr/bin/env node
/**
 * 8 · Internal content-link checker.
 *
 * WHY THIS EXISTS AS A SEPARATE SCRIPT. dead-links.mjs runs on built HTML and
 * catches everything — but only after a build, and it reports the rendered page
 * as the source, not the markdown file a writer has to open. When eight links in
 * two service bodies pointed at problem pages that had not been written yet, the
 * crawler said "dist/services/window-cleaning/index.html" when the answer was
 * "line 180 of window-cleaning.md".
 *
 * So this one runs on the SOURCE, before a build, and names the file and the
 * line. Cheap, fast, and it fails for the same reason the crawler would.
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
const slugs = (c) => new Set(
  (fs.existsSync(`${ROOT}/${c}`) ? fs.readdirSync(`${ROOT}/${c}`) : [])
    .filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
);
const problems = slugs('problem');
const library = slugs('library');
const compliance = slugs('compliance');
const services = slugs('service');

// Geo targets come from the committed demand map, not from a guess.
const map = fs.readFileSync('../architecture/demand/demand-map.csv', 'utf8').replace(/\r/g, '').trim().split('\n');
const iUrl = map[0].split(',').indexOf('url');
const iDec = map[0].split(',').indexOf('decision');
const authorised = new Set(map.slice(1).map((l) => l.split(',')).filter((r) => r[iDec] === 'PAGE').map((r) => r[iUrl]));

// Static routes that exist as files rather than as content entries.
const STATIC = new Set([
  '/', '/services/', '/locations/', '/surface-library/', '/compliance/',
  '/case-studies/', '/reviews/', '/about/', '/contact/', '/privacy/',
  '/our-guarantee/', '/financing/', '/gallery/', '/team/randy-fee/',
]);

const failures = [];
for (const f of files) {
  const rel = f.replace(`${ROOT}/`, '');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      const href = m[1].split('#')[0];
      if (!href.startsWith('/')) continue;
      let ok = STATIC.has(href) || authorised.has(href);
      let p;
      if (!ok && (p = href.match(/^\/services\/([a-z-]+)\/$/))) ok = services.has(p[1]);
      if (!ok && (p = href.match(/^\/services\/[a-z-]+\/([a-z-]+)\/$/))) ok = problems.has(p[1]);
      if (!ok && (p = href.match(/^\/surface-library\/([a-z-]+)\/$/))) ok = library.has(p[1]);
      if (!ok && (p = href.match(/^\/compliance\/([a-z-]+)\/$/))) ok = compliance.has(p[1]);
      if (!ok) failures.push(`${rel}:${i + 1}  →  ${href}`);
    }
  });
}

failures.forEach((f) => console.error(`CONTENT LINK  ${f}`));
console.log(`\ncontent-links: ${files.length} pages scanned · ${failures.length} links to pages that do not exist`);
process.exit(failures.length ? 1 : 0);
