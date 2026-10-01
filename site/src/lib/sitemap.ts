import { getCollection } from 'astro:content';
import { AUTHORISED_TOWNS, AUTHORISED_COUNTIES } from '../data/authorised';
import { PROBLEMS, serviceBySlug } from '../data/services';
import { BUSINESS } from '../data/business';

/**
 * Segmented sitemaps by page type (Keystone v3.2). One tier per file plus an
 * index, so an indexation problem can be read off a single tier in Search
 * Console rather than inferred from one undifferentiated list of URLs.
 *
 * Every tier maps over the same arrays the routes enumerate, so a page cannot
 * be live and missing from the sitemap — or gated and present in it. Pages the
 * Part 6A demand gate holds back never appear here, because they are not in
 * AUTHORISED_*.
 */
export const TIERS = ['core', 'services', 'problems', 'library', 'geo'] as const;
export type Tier = (typeof TIERS)[number];

export async function urlsFor(tier: Tier): Promise<string[]> {
  if (tier === 'core') return ['/', '/services/', '/service-area/', '/about/', '/reviews/', '/contact/'];
  if (tier === 'services') {
    const docs = await getCollection('service');
    return ['/services/', ...docs.filter((d) => serviceBySlug(d.slug)?.attested).map((d) => `/services/${d.slug}/`)].slice(1);
  }
  if (tier === 'problems') {
    const docs = await getCollection('problem');
    return docs.map((d) => `/services/${PROBLEMS.find((p) => p.slug === d.slug)!.service}/${d.slug}/`);
  }
  if (tier === 'library') {
    const lib = await getCollection('library');
    const comp = await getCollection('compliance');
    return ['/library/', ...lib.map((d) => `/library/${d.slug}/`), ...comp.map((d) => `/compliance/${d.slug}/`)];
  }
  return [
    ...AUTHORISED_COUNTIES.map((c) => `/service-area/${c.slug}/`),
    ...AUTHORISED_TOWNS.map((t) => `/locations/${t.slug}/`),
  ];
}

export const xmlUrlset = (paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${BUSINESS.site}${p}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
