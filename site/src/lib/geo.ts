import { AUTHORISED_TOWNS, ROUTED_TOWNS, DECLINED_TOWNS } from '../data/authorised';
import { COUNTY_NAMES, townName } from '../data/geo';

/** Templates may only link to indexable geography — see authorised.ts. */
export const linkableTowns = () => AUTHORISED_TOWNS.map((t) => ({ ...t, name: townName(t.slug) }));

/** areaServed for the entity graph: counties always, towns only where evidenced. */
export const areaServed = () => {
  const counties = [...new Set(ROUTED_TOWNS.map((t) => t.county))].map((c) => COUNTY_NAMES[c]);
  const towns = AUTHORISED_TOWNS.map((t) => `${townName(t.slug)}, Maine`);
  return [...towns, ...counties];
};

/** Prose coverage. Naming a town in prose is not the same as claiming a page for it. */
export const coverageSentence = () => {
  const counties = [...new Set(ROUTED_TOWNS.map((t) => t.county))].map((c) => COUNTY_NAMES[c]);
  return `Blouin Pest Services works across ${counties.slice(0, -1).join(', ')} and ${counties.slice(-1)}.`;
};

export const declinedCount = () => DECLINED_TOWNS.length;
