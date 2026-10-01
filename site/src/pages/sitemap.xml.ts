import type { APIRoute } from 'astro';
import { TIERS, urlsFor } from '../lib/sitemap';
import { BUSINESS } from '../data/business';

/** Sitemap index. A tier with no authorised URLs is omitted rather than
 *  submitted empty — today that is the geo tier, which stays out until the
 *  demand gate publishes its first town. */
export const GET: APIRoute = async () => {
  const live: string[] = [];
  for (const tier of TIERS) if ((await urlsFor(tier)).length) live.push(tier);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${live.map((t) => `  <sitemap><loc>${BUSINESS.site}/sitemap-${t}.xml</loc></sitemap>`).join('\n')}
</sitemapindex>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
