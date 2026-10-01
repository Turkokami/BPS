import type { APIRoute } from 'astro';
import { TIERS, urlsFor, xmlUrlset, type Tier } from '../lib/sitemap';

export const getStaticPaths = () => TIERS.map((tier) => ({ params: { tier } }));

export const GET: APIRoute = async ({ params }) => {
  const paths = await urlsFor(params.tier as Tier);
  return new Response(xmlUrlset(paths), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
