#!/usr/bin/env node
/**
 * Generates vercel.json redirects from the legacy Squarespace URL set.
 *
 * Rule, and it is a deliberate one: a legacy URL only ever points at an
 * INDEXABLE page. A legacy town goes to its own /locations/<town>/ page once the
 * town clears the Part 6A gate; otherwise to its county hub if that hub is
 * published; otherwise to /service-area/. Sending inbound equity to a noindex
 * page wastes it. Regenerate after any demand-map change.
 *
 * Single hop (13 Oct 2026, post-cutover GSC handoff): vercel.json used to set
 * trailingSlash: true, which made Vercel 308 /foo -> /foo/ BEFORE redirects were
 * matched, so every legacy URL took two hops (three from the apex). Now every
 * source matches with or without the slash ({/}?), and a single catch-all rule
 * at the END adds the trailing slash for everything else — so the site's URL
 * style is unchanged and a legacy URL reaches its page in one redirect.
 */
import fs from 'node:fs';

const LEGACY_TOWNS = fs.readFileSync('../architecture/demand/legacy-urls.txt', 'utf8')
  .trim().split('\n').map((l) => l.trim()).filter(Boolean);

const SERVICE_MAP = {
  '/residential-pest-control-maine': '/services/residential-pest-control/',
  '/commercial-pest-control-maine': '/services/commercial-pest-control/',
  '/rodent-control-maine': '/services/rodent-control/',
  '/ant-control-maine': '/services/ant-control/',
  '/tick-and-mosquito-control-maine': '/services/tick-control/',
  '/cockroach-and-bed-bug-control-maine': '/services/bed-bug-control/',
  '/about': '/about/',
  '/contact': '/contact/',
  '/reviews': '/reviews/',
  '/home': '/',
};

/* Old Squarespace pages Google still showed after the cutover but which were
   never in the sitemap the build was given (GSC, 13 Oct 2026). */
const LEGACY_EXTRA = {
  '/about-us': '/about/',
  '/tick-and-mosquito-control': '/services/mosquito-control/',
  '/rodent-control': '/services/rodent-control/',
  '/bed-bug-control': '/services/bed-bug-control/',
  '/ant-control': '/services/ant-control/',
  '/roach-control': '/services/cockroach-control/',
  '/pest-control-lewiston': '/locations/lewiston/',
  '/pest-control-lewiston-1': '/locations/lewiston/',
  // Retired 13 Oct 2026 at the owner's request: licensing stays generic.
  '/compliance/maine-pesticide-licensing': '/about/',
};
/* Old town URLs missing from the sitemap list. /pest-control-industry is the
   town of Industry (Franklin County) — the old site's pest-control-<town>
   pattern, with /pest-control-industry-maine as its twin — not "commercial
   industry", so it follows the town rule like every other town. */
const LEGACY_TOWNS_EXTRA = ['/pest-control-industry'];

const authorised = JSON.parse(fs.readFileSync('../architecture/demand/authorised-towns.json', 'utf8'));
const slugOf = (legacy) => legacy
  .replace(/^\/pest-control-/, '').replace(/-maine(-\d+)?$/, '')
  .replace(/^\//, '').replace(/-me-pest-control$/, '');

/* Quote-aware split, as in gate-integrity.mjs: evidence cells contain commas. */
const splitRow = (line) => {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
};
const demand = fs.readFileSync('../architecture/demand/demand-map.csv', 'utf8').replace(/\r/g, '').trim().split('\n').map(splitRow);
const dHead = demand[0];
const iU = dHead.indexOf('url'), iG = dHead.indexOf('geo'), iC = dHead.indexOf('county'), iD = dHead.indexOf('decision');
const publishedCounties = new Set(demand.slice(1).filter((r) => r[iU].startsWith('/service-area/') && r[iD] === 'PAGE').map((r) => r[iC]));
const townCounty = new Map(demand.slice(1).filter((r) => r[iU].startsWith('/locations/')).map((r) => [r[iG], r[iC]]));
/* County legacy URLs (/pest-control-oxford-county-maine, /york-county-pest-control). */
const countyOf = (legacy) => (legacy.match(/(androscoggin|cumberland|franklin|kennebec|oxford|sagadahoc|york)-county/) || [])[1];
const countyHub = (c) => (c && publishedCounties.has(c) ? `/service-area/${c}-county/` : '/service-area/');

// Match the old path with or without its trailing slash, in one rule.
const bothForms = (s) => `${s.replace(/\/$/, '')}{/}?`;

const legacy = [
  ...Object.entries(SERVICE_MAP).map(([source, destination]) => ({ source, destination })),
  ...Object.entries(LEGACY_EXTRA).map(([source, destination]) => ({ source, destination })),
  ...[...LEGACY_TOWNS, ...LEGACY_TOWNS_EXTRA].map((source) => {
    const county = countyOf(source);
    if (county) return { source, destination: countyHub(county) };
    const slug = slugOf(source);
    return { source, destination: authorised.includes(slug) ? `/locations/${slug}/` : countyHub(townCounty.get(slug)) };
  }),
]
  // /about -> /about/ is just the slash rule below; don't duplicate it.
  .filter((r) => `${r.source.replace(/\/$/, '')}/` !== r.destination)
  .map((r) => ({ source: bothForms(r.source), destination: r.destination, permanent: true }));

/* Everything else without a trailing slash gets one, in one hop. Last, so the
   legacy rules above win. A last segment containing a dot is a file
   (/sitemap.xml, /favicon.ico, /_astro/x.css, /brand/x.webp) and is untouched. */
const SLASH_RULE = { source: '/:path((?:[^/]+/)*[^/.]+)', destination: '/:path/', permanent: true };
const redirects = [...legacy, SLASH_RULE];

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'astro',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  cleanUrls: false,
  redirects,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        /* Anti-framing and capability lockdown. Deliberately not a full CSP yet:
           the GorillaDesk booking embed (BUSINESS.forms) is still to come, and a
           script/frame allowlist written now would silently break it. */
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      ],
    },
    /* Brand and button images are not content-hashed, so a week rather than
       immutable: a replaced logo reaches everyone within seven days. */
    {
      source: '/brand/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
    },
    {
      source: '/(favicon.ico|favicon-48.png|apple-touch-icon.png|og-default.png)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
    },
  ],
};
fs.writeFileSync('vercel.json', `${JSON.stringify(config, null, 2)}\n`);
const count = (fn) => legacy.filter(fn).length;
console.log(`gen-redirects: ${legacy.length} legacy redirects + slash rule — ` +
  `${count((r) => r.destination.startsWith('/locations/'))} to town pages, ` +
  `${count((r) => /^\/service-area\/.+-county\/$/.test(r.destination))} to county hubs, ` +
  `${count((r) => r.destination === '/service-area/')} on /service-area/, ` +
  `${count((r) => !r.destination.startsWith('/locations/') && !r.destination.startsWith('/service-area/'))} to service/other pages`);
