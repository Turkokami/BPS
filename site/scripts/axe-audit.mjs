/**
 * Rendered accessibility audit (Dimension 14).
 *
 * scripts/a11y.mjs is static analysis and says so: it cannot see computed
 * contrast, focus order or the DOM after Astro has rendered it. This runs
 * axe-core in a real browser over one page of every template type, at desktop
 * and at 320px, and also checks for horizontal overflow — the single most
 * common phone-layout defect and one no static checker catches.
 *
 * It serves dist/ itself so it needs no running server:
 *   npm run audit:rendered
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = Number(process.env.AUDIT_PORT ?? 4399);
const ORIGIN = process.argv[2] ?? `http://127.0.0.1:${PORT}`;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain' };

/** Static server over dist/, so the audit measures the artefact that ships. */
const server = process.argv[2] ? null : createServer(async (req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
if (server) await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

/** One page per template, not per route: the templates are what can break. */
const ROUTES = [
  ['home',            '/'],
  ['services index',  '/services/'],
  ['service',         '/services/rodent-control/'],
  ['problem',         '/services/rodent-control/mice-in-the-attic/'],
  ['town',            '/locations/lewiston/'],
  ['service area',    '/service-area/'],
  ['county',          '/service-area/androscoggin-county/'],
  ['library index',   '/library/'],
  ['library',         '/library/maine-pest-calendar/'],
  ['compliance',      '/compliance/maine-pesticide-licensing/'],
  ['about',           '/about/'],
  ['contact',         '/contact/'],
  ['reviews',         '/reviews/'],
  ['guarantee',       '/our-guarantee/'],
  ['privacy',         '/privacy/'],
  ['404',             '/404.html'],
];

const VIEWPORTS = [['desktop', 1280, 900], ['phone', 320, 640]];

/* CHROME_PATH lets this run on a machine where playwright resolves its own
   browser; it is set explicitly in this build environment. */
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

let violations = 0;
let overflows = 0;
let checked = 0;

for (const [vpName, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  for (const [label, route] of ROUTES) {
    const page = await ctx.newPage();
    const res = await page.goto(ORIGIN + route, { waitUntil: 'load' });
    if (!res || res.status() >= 400) {
      console.log(`  MISSING  ${vpName}  ${route} (${res ? res.status() : 'no response'})`);
      await page.close();
      continue;
    }
    // Disclosures hide content from axe; open them so the audit sees everything.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(async () =>
      await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'] } }),
    );
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.scrollWidth;
      if (w <= window.innerWidth + 1) return null;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 3)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { scrollWidth: w, inner: window.innerWidth, wide };
    });
    checked += 1;
    for (const v of result.violations) {
      violations += 1;
      console.log(`  ${v.impact?.toUpperCase() ?? 'UNKNOWN'}  ${vpName}  ${route}`);
      console.log(`      ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`      → ${n.target.join(' ')}`);
    }
    if (overflow) {
      overflows += 1;
      console.log(`  OVERFLOW  ${vpName}  ${route} — ${overflow.scrollWidth}px in a ${overflow.inner}px viewport`);
      console.log(`      widest: ${overflow.wide.join(', ') || 'not attributable to one element'}`);
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();
if (server) server.close();

const failed = violations + overflows;
console.log(
  `axe-audit: ${checked} renders across ${ROUTES.length} templates x ${VIEWPORTS.length} viewports · ` +
  `${violations} axe violation(s) · ${overflows} horizontal-overflow failure(s)`,
);
console.log('      Rendered audit. Screen-reader sense and real focus order still need a person.');
if (failed > 0) process.exit(1);
