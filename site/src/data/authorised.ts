// GENERATED FILE — do not edit. Source: architecture/demand/demand-map.csv
// Regenerate with: node scripts/gen-authorised.mjs
// Part 6A gate. PAGE = 2+ signals, indexable. PENDING = 1 signal, built but
// noindex and unlinked. DECLINED = no route.
export type GeoRow = { slug: string; county: string; signals: number; s4: string };

export const AUTHORISED_TOWNS: GeoRow[] = [
  { slug: "auburn", county: "androscoggin", signals: 2, s4: "Y (GreenShield+PineState+BigBlueBug)" },
  { slug: "lewiston", county: "androscoggin", signals: 2, s4: "Y (GreenShield+PineState+BigBlueBug)" },
  { slug: "portland", county: "cumberland", signals: 2, s4: "Y (GreenShield+PineState+BigBlueBug+ModernPest)" },
  { slug: "augusta", county: "kennebec", signals: 2, s4: "Y (GreenShield+PineState+BigBlueBug+ModernPest)" },
  { slug: "waterville", county: "kennebec", signals: 2, s4: "Y (GreenShield+PineState)" },
  { slug: "oxford", county: "oxford", signals: 2, s4: "Y (GreenShield+PineState)" },
  { slug: "bath", county: "sagadahoc", signals: 2, s4: "Y (GreenShield+PineState)" }
];

export const PENDING_TOWNS: GeoRow[] = [
  { slug: "durham", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "lisbon", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "mechanic-falls", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "minot", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "poland", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "sabattus", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "turner", county: "androscoggin", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "cape-elizabeth", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "casco", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "cumberland", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState+BigBlueBug+ModernPest)" },
  { slug: "falmouth", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "gorham", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState+BigBlueBug)" },
  { slug: "gray", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState+ModernPest)" },
  { slug: "naples", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "new-gloucester", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "north-yarmouth", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "scarborough", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "south-portland", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState+BigBlueBug)" },
  { slug: "standish", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "westbrook", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "windham", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState+BigBlueBug)" },
  { slug: "yarmouth", county: "cumberland", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "farmington", county: "franklin", signals: 1, s4: "Y (GreenShield+ModernPest)" },
  { slug: "belgrade", county: "kennebec", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "chelsea", county: "kennebec", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "gardiner", county: "kennebec", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "hallowell", county: "kennebec", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "litchfield", county: "kennebec", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "bethel", county: "oxford", signals: 1, s4: "N (none)" },
  { slug: "norway", county: "oxford", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "bowdoin", county: "sagadahoc", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "bowdoinham", county: "sagadahoc", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "topsham", county: "sagadahoc", signals: 1, s4: "Y (GreenShield+PineState)" },
  { slug: "woolwich", county: "sagadahoc", signals: 1, s4: "Y (GreenShield+PineState)" }
];

export const DECLINED_TOWNS: string[] = [
  "greene",
  "lisbon-falls",
  "baldwin",
  "harpswell",
  "raymond",
  "avon",
  "chesterville",
  "industry",
  "jay",
  "livermore-falls",
  "new-sharon",
  "temple",
  "wilton",
  "farmingdale",
  "manchester",
  "monmouth",
  "mount-vernon",
  "randolph",
  "readfield",
  "sidney",
  "vassalboro",
  "west-gardiner",
  "winthrop",
  "winslow",
  "andover",
  "dixfield",
  "fryeburg",
  "greenwood",
  "hartford",
  "mexico",
  "paris",
  "south-paris",
  "peru",
  "rumford",
  "sumner",
  "waterford",
  "west-paris",
  "woodstock",
  "arrowsic",
  "phippsburg",
  "west-bath",
  "alfred",
  "arundel",
  "berwick",
  "biddeford",
  "kennebunk",
  "kennebunkport",
  "kittery",
  "lebanon",
  "lyman",
  "north-berwick",
  "ogunquit",
  "saco",
  "sanford",
  "shapleigh",
  "south-berwick",
  "waterboro",
  "wells",
  "york",
  "leeds"
];

export const AUTHORISED_COUNTIES: GeoRow[] = [
  { slug: "androscoggin-county", county: "androscoggin", signals: 2, s4: "Y (county-level coverage by GreenShield + PineState)" },
  { slug: "cumberland-county", county: "cumberland", signals: 2, s4: "Y (county-level coverage by GreenShield + PineState)" },
  { slug: "kennebec-county", county: "kennebec", signals: 2, s4: "Y (county-level coverage by GreenShield + PineState)" },
  { slug: "oxford-county", county: "oxford", signals: 2, s4: "Y (county-level coverage by GreenShield + PineState)" },
  { slug: "sagadahoc-county", county: "sagadahoc", signals: 2, s4: "Y (county-level coverage by GreenShield + PineState)" }
];

export const PENDING_COUNTIES: GeoRow[] = [
  { slug: "franklin-county", county: "franklin", signals: 1, s4: "Y (county-level coverage by GreenShield + PineState)" },
  { slug: "york-county", county: "york", signals: 1, s4: "Y (county-level coverage by GreenShield + PineState)" }
];

/** Every town with a route, in either state. Routes enumerate this. */
export const ROUTED_TOWNS: GeoRow[] = [...AUTHORISED_TOWNS, ...PENDING_TOWNS];
export const ROUTED_COUNTIES: GeoRow[] = [...AUTHORISED_COUNTIES, ...PENDING_COUNTIES];

export const isIndexableTown = (slug: string) => AUTHORISED_TOWNS.some((t) => t.slug === slug);
export const isIndexableCounty = (slug: string) => AUTHORISED_COUNTIES.some((c) => c.slug === slug);
/** Link helper: templates may only link to indexable geography. */
export const linkableTowns = () => AUTHORISED_TOWNS;
