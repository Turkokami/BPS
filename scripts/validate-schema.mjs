#!/usr/bin/env node
/** 5 · Schema validator — parse the RENDERED graph, confirm it is real, connected
 *  and node-complete. Catches the double-escape trap (graph rendered as visible
 *  text), duplicate emitters, and orphan @id references. */
import fs from 'node:fs'; import path from 'node:path';
const DIST = 'dist';
/*
 * ImageObject is required only once the site has real image assets. This build
 * ships with none: the client has supplied no photographs, and inventing an
 * image node (or pointing one at a stock file) would be a fabricated entity
 * claim. The rule turns itself back on automatically the moment an <img> lands
 * in a template, so it cannot be quietly forgotten.
 */
const REQUIRED = ['WebSite', 'WebPage', 'LocalBusiness', 'BreadcrumbList'];
const REQUIRED_WITH_IMAGES = 'ImageObject';

/*
 * WebPage has subtypes, and this validator was treating them as absences.
 * CollectionPage, ContactPage, AboutPage, ItemPage, ProfilePage and FAQPage are
 * all schema.org subtypes OF WebPage — a page emitting ContactPage is emitting a
 * WebPage, more precisely. The substring test said "missing WebPage node" on six
 * pages whose markup was not merely fine but BETTER than the generic type, and
 * the only way to satisfy it would have been to make the graph less accurate.
 * A checker that pushes you toward worse markup is worse than no checker.
 */
const WEBPAGE_SUBTYPES = [
  'WebPage', 'CollectionPage', 'ContactPage', 'AboutPage', 'ItemPage',
  'ProfilePage', 'FAQPage', 'QAPage', 'CheckoutPage', 'SearchResultsPage',
  'MedicalWebPage', 'RealEstateListing',
];
const satisfies = (types, required) =>
  required === 'WebPage'
    ? [...types].some((t) => WEBPAGE_SUBTYPES.includes(String(t)))
    : [...types].some((t) => String(t).includes(required));
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : p.endsWith('.html') && out.push(p);
} return out; };
const files = walk(DIST); const errs = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8'); const u = f.replace(/^dist/, '').replace(/index\.html$/, '');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0) { errs.push(`${u}: no JSON-LD`); continue; }
  if (blocks.length > 1) errs.push(`${u}: ${blocks.length} JSON-LD emitters — one emitter wins, the others are filtered`);
  const raw = blocks[0][1];
  if (/&quot;|&#34;/.test(raw)) { errs.push(`${u}: JSON-LD is HTML-escaped — the set:html injection trap`); continue; }
  let g; try { g = JSON.parse(raw); } catch (e) { errs.push(`${u}: JSON-LD does not parse — ${e.message}`); continue; }
  const nodes = g['@graph'] || [];
  const types = new Set(nodes.flatMap((n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']])));
  for (const r of REQUIRED) if (!satisfies(types, r)) errs.push(`${u}: missing ${r} node`);
  // Once a template renders a real image, the graph must describe it.
  if (/<img\s/i.test(html) && !satisfies(types, REQUIRED_WITH_IMAGES)) {
    errs.push(`${u}: page carries an <img> but the graph has no ${REQUIRED_WITH_IMAGES} node`);
  }
  const ids = new Set(nodes.map((n) => n['@id']).filter(Boolean));
  const refs = []; (function scan(o) {
    if (Array.isArray(o)) return o.forEach(scan);
    if (!o || typeof o !== 'object') return;
    if (o['@id'] && Object.keys(o).length === 1) refs.push(o['@id']);
    Object.values(o).forEach(scan);
  })(nodes);
  for (const r of refs) if (!ids.has(r)) errs.push(`${u}: @id reference with no node — ${r}`);
  const faq = nodes.filter((n) => String(n['@type']).includes('FAQPage'));
  if (faq.length > 1) errs.push(`${u}: ${faq.length} FAQPage nodes (exactly one per URL)`);
  if (/"aggregateRating"/.test(raw) && !/"ratingValue"/.test(raw)) errs.push(`${u}: aggregateRating without ratingValue`);
}
errs.forEach((e) => console.error(e));
console.log(errs.length ? `validate-schema: ${errs.length} problems` : `validate-schema: OK (${files.length} pages)`);
process.exit(errs.length ? 1 : 0);
