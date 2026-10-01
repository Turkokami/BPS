#!/usr/bin/env node
/** 1 · Dead-link crawler — every internal href must resolve to a built file. */
import fs from 'node:fs'; import path from 'node:path';
const DIST = 'dist';
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : p.endsWith('.html') && out.push(p);
} return out; };
if (!fs.existsSync(DIST)) { console.error('dead-links: no dist/ — run astro build first'); process.exit(1); }
const files = walk(DIST); let bad = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const h = m[1];
    if (/^(https?:|tel:|mailto:|sms:|#|data:)/.test(h)) continue;
    let t = h.split('#')[0].split('?')[0];
    if (!t) continue;
    t = t.endsWith('/') ? path.join(t, 'index.html') : (path.extname(t) ? t : `${t}/index.html`);
    if (!fs.existsSync(path.join(DIST, t))) { console.error(`404 ${h}  ←  ${f}`); bad++; }
  }
}
console.log(bad ? `dead-links: ${bad} broken` : `dead-links: OK (${files.length} pages)`);
process.exit(bad ? 1 : 0);
