#!/usr/bin/env node
/** 4 · Duplicate-sentence scanner — no 10+ word sentence on 3+ pages.
 *  On one prior build this cut cross-page duplicates from 74 to 39; the survivors
 *  were legitimate (NAP line, legal statement, headings). Read the survivors, do
 *  not chase them to zero. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = 'src/content', MIN_WORDS = 10, MAX_PAGES = 2;
const walk = (d, out = []) => { if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : /\.(md|mdx)$/.test(p) && out.push(p);
  } return out; };
const map = new Map();
for (const f of walk(ROOT)) {
  const body = fs.readFileSync(f, 'utf8').replace(/^---[\s\S]*?\n---\n/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s.*$/gm, '');
  for (const s of body.split(/(?<=[.!?])\s+/)) {
    const t = s.replace(/\s+/g, ' ').trim();
    if ((t.match(/\S+/g) || []).length < MIN_WORDS) continue;
    map.set(t, new Set([...(map.get(t) || []), f]));
  }
}
let bad = 0;
for (const [s, files] of map) if (files.size > MAX_PAGES) {
  console.error(`dup on ${files.size} pages: "${s.slice(0, 90)}…"`); bad++;
}
console.log(bad ? `dedup: ${bad} repeated sentences` : 'dedup: OK');
process.exit(bad ? 1 : 0);
