/** Display names and county metadata. Routing comes from authorised.ts; this file only names things. */
export const COUNTY_NAMES: Record<string, string> = {
  // keys match the demand map; county rows are slugged '<name>-county' so a town
  // named Cumberland and Cumberland County cannot collide in the keyword map.
  'androscoggin-county': 'Androscoggin County',
  'cumberland-county': 'Cumberland County',
  'franklin-county': 'Franklin County',
  'kennebec-county': 'Kennebec County',
  'oxford-county': 'Oxford County',
  'sagadahoc-county': 'Sagadahoc County',
  'york-county': 'York County',
  androscoggin: 'Androscoggin County',
  cumberland: 'Cumberland County',
  franklin: 'Franklin County',
  kennebec: 'Kennebec County',
  oxford: 'Oxford County',
  sagadahoc: 'Sagadahoc County',
  york: 'York County',
};

/** Slug → town name. Multi-word slugs are title-cased, with the exceptions listed. */
const EXCEPTIONS: Record<string, string> = {
  'lisbon-falls': 'Lisbon Falls', 'mechanic-falls': 'Mechanic Falls', 'cape-elizabeth': 'Cape Elizabeth',
  'new-gloucester': 'New Gloucester', 'north-yarmouth': 'North Yarmouth', 'south-portland': 'South Portland',
  'livermore-falls': 'Livermore Falls', 'new-sharon': 'New Sharon', 'mount-vernon': 'Mount Vernon',
  'west-gardiner': 'West Gardiner', 'west-paris': 'West Paris', 'south-paris': 'South Paris',
  'west-bath': 'West Bath', 'north-berwick': 'North Berwick', 'south-berwick': 'South Berwick',
};
export const townName = (slug: string) =>
  EXCEPTIONS[slug] ?? slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
