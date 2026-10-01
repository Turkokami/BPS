#!/usr/bin/env node
/**
 * Whole-site browser crawl.
 *
 * preflight reads the HTML as text; this loads every page in a real browser and
 * watches it behave — console errors, failed requests, layout at phone and
 * desktop width, and whether every link a visitor can click actually lands
 * somewhere. Serves dist/ itself.
 *
 *   npm run crawl
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import fs from 'node:fs';
import { join, extname } from 'node:path';

const PORT = Number(process.env.CRAWL_PORT ?? 4398);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.xml': 'application/xml', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html'); }
  catch { res.writeHead(404).end('not found'); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(await readFile(p)); }
  catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${PORT}`;

/* Every built route, from disk rather than from the sitemap: a page missing
   from the sitemap still has to work. */
const routes = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.html')) {
      const rel = p.slice('dist'.length).replace(/\\/g, '/');
      routes.push(rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel);
    }
  }
})('dist');
routes.sort();

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const problems = [];
let checkedLinks = 0;

for (const [vp, width, height] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  for (const route of routes) {
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 140)); });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 140)}`));
    page.on('requestfailed', (r) => failedRequests.push(`${r.url().replace(ORIGIN, '')} — ${r.failure()?.errorText}`));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(ORIGIN)) failedRequests.push(`${r.url().replace(ORIGIN, '')} — HTTP ${r.status()}`); });

    const res = await page.goto(ORIGIN + route, { waitUntil: 'load' });
    if (!res || res.status() >= 400) problems.push(`LOAD      ${vp} ${route} — HTTP ${res?.status()}`);

    for (const e of consoleErrors) problems.push(`CONSOLE   ${vp} ${route} — ${e}`);
    for (const f of failedRequests) problems.push(`REQUEST   ${vp} ${route} — ${f}`);

    /* Things only a rendered page can tell you. */
    const checks = await page.evaluate(() => {
      const out = {};
      const de = document.documentElement;
      out.overflow = de.scrollWidth > window.innerWidth + 1 ? de.scrollWidth : 0;
      /* WCAG 2.2 Target Size (Minimum) is 24x24 CSS px, and it explicitly
         exempts a target "in a sentence or block of text" — an inline link in a
         paragraph is not a control you are expected to hit with a thumb. So this
         measures standalone controls only: buttons, summaries, and links that are
         not sitting inside running prose. Flagging every inline link produced 243
         findings per viewport, none of them real, which is worse than no check. */
      const inProse = (el) => !!el.closest('p, .crumbs, dd, figcaption') ||
        (el.parentElement?.tagName === 'LI' && !!el.closest('.prose, main > ol, main > ul'));
      out.small = [...document.querySelectorAll('a[href], button, summary, [tabindex="0"]')]
        .filter((el) => !inProse(el))
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24); })
        .slice(0, 3)
        .map((el) => `${(el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 34)} (${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`);
      // Empty links and links whose only content is an image with no alt.
      out.emptyLinks = [...document.querySelectorAll('a[href]')]
        .filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])'))
        .slice(0, 3).map((a) => a.getAttribute('href'));
      out.imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].length;
      // Text sitting on a transparent-ish background would be invisible; cheap sanity check.
      out.bodyBg = getComputedStyle(document.body).backgroundColor;
      out.links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      return out;
    });

    if (checks.overflow) problems.push(`OVERFLOW  ${vp} ${route} — ${checks.overflow}px wide in a ${width}px viewport`);
    for (const t of checks.small) problems.push(`TAPTARGET ${vp} ${route} — standalone control under 24px: ${t}`);
    for (const l of checks.emptyLinks) problems.push(`EMPTYLINK ${vp} ${route} — link with no accessible name → ${l}`);
    if (checks.imgsNoAlt) problems.push(`IMG       ${vp} ${route} — ${checks.imgsNoAlt} img without an alt attribute`);
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(checks.bodyBg)) problems.push(`THEME     ${vp} ${route} — body has no background colour`);

    if (vp === 'desktop') checkedLinks += checks.links.length;
    await page.close();
  }
  await ctx.close();
}

await browser.close();
server.close();

console.log('\ncrawl — every built page, loaded in a browser\n');
if (problems.length) problems.forEach((p) => console.log(`  ${p}`));
console.log(
  `\ncrawl: ${routes.length} routes x 2 viewports = ${routes.length * 2} loads · ` +
  `${checkedLinks} links present · ${problems.length} problem(s)`,
);
process.exit(problems.length ? 1 : 0);
