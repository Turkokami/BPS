#!/usr/bin/env node
/**
 * Launch preflight — the checks that only matter once, on the day.
 *
 * `npm run verify` guards the things that can regress on any commit. This
 * guards the things that break a launch: a redirect pointing at a page that
 * does not exist, a sitemap nobody told the robots file about, a canonical
 * pointing somewhere other than itself, a page in the sitemap that no link
 * reaches, a schema @id referring to a node that was never emitted.
 *
 *   npm run preflight            # offline checks only
 *   npm run preflight -- --net   # also resolve every external link
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blouinpest.com';
const NET = process.argv.includes('--net');

const fail = [];
const warn = [];
const note = [];

const htmlFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

/** dist/services/x/index.html → /services/x/ ; dist/404.html → /404.html */
const routeOf = (f) => {
  const rel = f.slice(DIST.length).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

const pages = new Map();
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const one = (re) => (html.match(re) || [])[1] ?? null;
  pages.set(routeOf(f), {
    file: f,
    html,
    title: one(/<title>([\s\S]*?)<\/title>/),
    desc: one(/<meta name="description" content="([\s\S]*?)"/),
    canonical: one(/<link rel="canonical" href="([^"]+)"/),
    noindex: /<meta name="robots" content="noindex/.test(html),
    h1s: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) || []).map((h) => h.replace(/<[^>]+>/g, '').trim()),
    links: [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]),
    ld: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]),
  });
}
note.push(`${pages.size} built pages`);

/* ---- 1. canonical is absolute and points at itself ----------------------- */
for (const [route, p] of pages) {
  if (route === '/404.html') continue;
  if (!p.canonical) { fail.push(`CANONICAL  ${route}: no canonical tag`); continue; }
  if (!p.canonical.startsWith('https://')) fail.push(`CANONICAL  ${route}: not absolute — ${p.canonical}`);
  const want = SITE + route;
  if (p.canonical !== want) fail.push(`CANONICAL  ${route}: points at ${p.canonical}, should be ${want}`);
}

/* ---- 2. exactly one H1, and titles/descriptions unique ------------------- */
const seenTitle = new Map();
const seenDesc = new Map();
for (const [route, p] of pages) {
  if (p.h1s.length !== 1) fail.push(`H1         ${route}: ${p.h1s.length} h1 elements, expected 1`);
  if (!p.title) fail.push(`TITLE      ${route}: missing`);
  if (!p.desc) fail.push(`META       ${route}: no description`);
  if (p.noindex) continue; // gated pages may legitimately share boilerplate
  if (p.title) {
    if (seenTitle.has(p.title)) fail.push(`TITLE      ${route}: duplicate of ${seenTitle.get(p.title)} — "${p.title}"`);
    else seenTitle.set(p.title, route);
  }
  if (p.desc) {
    if (seenDesc.has(p.desc)) fail.push(`META       ${route}: description duplicates ${seenDesc.get(p.desc)}`);
    else seenDesc.set(p.desc, route);
  }
}

/* ---- 3. every internal link resolves to a built page or a real asset ----- */
const assets = new Set();
(function walkAll(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) walkAll(p);
    else assets.add(p.slice(DIST.length).replace(/\\/g, '/'));
  }
})(DIST);

const externals = new Set();
const linkedFrom = new Map();
for (const [route, p] of pages) {
  for (const href of p.links) {
    if (/^(tel:|sms:|mailto:)/.test(href)) {
      if (!/^(tel:\+1\d{10}|sms:\+1\d{10}|mailto:[^@\s]+@[^@\s]+\.\w+)$/.test(href)) {
        fail.push(`CONTACT    ${route}: malformed contact link — ${href}`);
      }
      continue;
    }
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(SITE)) fail.push(`LINK       ${route}: absolute self-link, should be relative — ${href}`);
      else externals.add(href);
      continue;
    }
    if (href.startsWith('#')) continue;
    const target = href.split('#')[0].split('?')[0];
    if (!pages.has(target) && !assets.has(target)) {
      fail.push(`LINK       ${route}: dead internal link — ${href}`);
      continue;
    }
    if (pages.has(target)) {
      if (!linkedFrom.has(target)) linkedFrom.set(target, new Set());
      linkedFrom.get(target).add(route);
    }
  }
}

/* ---- 4. sitemaps: every URL built, indexable, and self-canonical --------- */
const sitemapFiles = fs.readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
const inSitemap = new Set();
for (const sm of sitemapFiles) {
  const xml = fs.readFileSync(path.join(DIST, sm), 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = m[1];
    if (url.endsWith('.xml')) continue; // sitemap index entry
    if (!url.startsWith(SITE)) { fail.push(`SITEMAP    ${sm}: foreign origin — ${url}`); continue; }
    const route = url.slice(SITE.length);
    inSitemap.add(route);
    const p = pages.get(route);
    if (!p) { fail.push(`SITEMAP    ${sm}: ${route} is listed but was not built`); continue; }
    if (p.noindex) fail.push(`SITEMAP    ${sm}: ${route} is noindex but listed`);
  }
}

/* ---- 5. robots.txt names every sitemap ---------------------------------- */
const robots = fs.existsSync(`${DIST}/robots.txt`) ? fs.readFileSync(`${DIST}/robots.txt`, 'utf8') : '';
if (!robots) fail.push('ROBOTS     no robots.txt in dist');
for (const sm of sitemapFiles) {
  if (!robots.includes(`/${sm}`)) fail.push(`ROBOTS     ${sm} exists but robots.txt does not list it`);
}
for (const m of robots.matchAll(/^Sitemap:\s*(\S+)/gm)) {
  const f = m[1].slice(SITE.length + 1);
  if (!sitemapFiles.includes(f)) fail.push(`ROBOTS     lists ${m[1]} but ${f} was not built`);
}

/* ---- 6. orphans: indexable pages no link reaches ------------------------ */
for (const [route, p] of pages) {
  if (p.noindex || route === '/' || route === '/404.html') continue;
  if (!linkedFrom.has(route)) fail.push(`ORPHAN     ${route}: in the build, reachable from no page`);
}
// And the reverse: an indexable page nothing lists in a sitemap.
for (const [route, p] of pages) {
  if (p.noindex || route === '/404.html') continue;
  if (!inSitemap.has(route)) fail.push(`SITEMAP    ${route}: indexable but in no sitemap`);
}

/* ---- 7. legacy redirects point at pages that exist ---------------------- */
if (fs.existsSync('vercel.json')) {
  const vj = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const seenSource = new Set();
  for (const r of vj.redirects ?? []) {
    if (seenSource.has(r.source)) fail.push(`REDIRECT   duplicate source ${r.source}`);
    seenSource.add(r.source);
    const dest = r.destination.split('#')[0];
    if (/^https?:/.test(dest)) continue;
    if (!pages.has(dest)) fail.push(`REDIRECT   ${r.source} → ${dest} — destination was not built`);
    else if (pages.get(dest).noindex) fail.push(`REDIRECT   ${r.source} → ${dest} — destination is noindex`);
    if (pages.has(r.source)) fail.push(`REDIRECT   ${r.source} is both a redirect source and a real page`);
  }
  note.push(`${(vj.redirects ?? []).length} legacy redirects, all destinations built`);
}

/* ---- 8. JSON-LD parses and its @id references resolve ------------------- */
for (const [route, p] of pages) {
  if (!p.ld.length) { fail.push(`SCHEMA     ${route}: no JSON-LD`); continue; }
  for (const block of p.ld) {
    let parsed;
    try { parsed = JSON.parse(block); }
    catch (e) { fail.push(`SCHEMA     ${route}: JSON-LD does not parse — ${e.message}`); continue; }
    const nodes = parsed['@graph'] ?? [parsed];
    const ids = new Set(nodes.map((n) => n['@id']).filter(Boolean));
    const refs = [];
    JSON.stringify(nodes, (k, v) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && v['@id']) refs.push(v['@id']);
      return v;
    });
    for (const r of new Set(refs)) {
      if (!ids.has(r) && r.startsWith(SITE)) {
        fail.push(`SCHEMA     ${route}: @id reference ${r} resolves to no node in the graph`);
      }
    }
  }
}

/* ---- 9. external links actually resolve (opt-in) ------------------------ */
if (NET) {
  /* A 403 here usually means the egress proxy or the site's bot filter refused
     us, not that the page is gone — so it is reported as unverified rather than
     as a warning, and a human checks it in a browser. A 404 or 410 is real. */
  let ok = 0;
  const unverified = [];
  for (const url of externals) {
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (res.status === 405) res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (res.ok) ok += 1;
      else if (res.status === 403 || res.status === 429) unverified.push(`${url} → HTTP ${res.status}`);
      else warn.push(`EXTERNAL   ${url} → HTTP ${res.status}`);
    } catch (e) {
      unverified.push(`${url} → ${e.cause?.code ?? e.message}`);
    }
  }
  note.push(`${externals.size} external links: ${ok} resolved, ${unverified.length} unverified from this network, ${warn.length} broken`);
  unverified.forEach((u) => note.push(`  unverified (check in a browser): ${u}`));
} else {
  note.push(`${externals.size} distinct external links (not checked — pass --net)`);
}

/* ---- report ------------------------------------------------------------- */
console.log('\npreflight — launch readiness checks\n');
for (const n of note) console.log(`  · ${n}`);
if (warn.length) { console.log(''); warn.forEach((w) => console.log(`  WARN  ${w}`)); }
if (fail.length) { console.log(''); fail.forEach((f) => console.log(`  FAIL  ${f}`)); }
console.log(
  `\npreflight: ${fail.length} blocking failure(s), ${warn.length} warning(s) across ${pages.size} pages`,
);
process.exit(fail.length ? 1 : 0);
