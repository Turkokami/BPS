#!/usr/bin/env node
/**
 * Generates vercel.json redirects from the legacy Squarespace URL set.
 *
 * Rule, and it is a deliberate one: a legacy town URL does NOT redirect to its
 * new /locations/<town>/ route, because those routes are held back by the Part
 * 6A gate (noindex, not in the sitemap). Sending inbound equity and users to a
 * noindex page wastes both. Legacy town and county URLs therefore land on the
 * indexed service-area hub until their town clears the gate, at which point the
 * map is regenerated and they point at the real page.
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

/*
 * A legacy town URL points at its new town page once that town clears the Part
 * 6A gate, and at the service-area hub until then. Regenerate this file whenever
 * the demand map changes — that is the whole reason it is generated rather than
 * hand-maintained.
 */
const authorised = JSON.parse(fs.readFileSync('../architecture/demand/authorised-towns.json', 'utf8'));
const slugOf = (legacy) => legacy
  .replace(/^\/pest-control-/, '').replace(/-maine(-\d+)?$/, '')
  .replace(/^\//, '').replace(/-me-pest-control$/, '');
const redirects = [
  ...Object.entries(SERVICE_MAP).map(([source, destination]) => ({ source, destination, permanent: true })),
  ...LEGACY_TOWNS.map((source) => {
    const slug = slugOf(source);
    const destination = authorised.includes(slug) ? `/locations/${slug}/` : '/service-area/';
    return { source, destination, permanent: true };
  }),
];

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'astro',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  trailingSlash: true,
  cleanUrls: false,
  redirects,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};
fs.writeFileSync('vercel.json', `${JSON.stringify(config, null, 2)}\n`);
const toTown = redirects.filter((r) => r.destination.startsWith('/locations/')).length;
console.log(`gen-redirects: ${redirects.length} redirects written — ${Object.keys(SERVICE_MAP).length} mapped, ${toTown} legacy URLs now pointing at published town pages, ${LEGACY_TOWNS.length - toTown} still parked on /service-area/`);
