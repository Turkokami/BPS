/**
 * The service tree. One page per money service — the old site combined
 * cockroach with bed bug and tick with mosquito, which put four money services
 * on two URLs. Every service here is one Blouin already sells on the live site.
 * Nothing speculative: a service the client has not confirmed carries
 * `attested: false` and its route renders noindex until it is.
 */
export type Service = {
  slug: string;
  name: string;          // used in <h1> and the Service schema node
  short: string;         // nav label
  intent: string;        // the search this page answers
  attested: boolean;     // confirmed on the live site (true) or awaiting client confirmation (false)
  licenceCategory: string; // Maine BPC category the work sits in — shown on the compliance page
  problems: string[];    // problem micro-pages that roll up to this spoke
};

export const SERVICES: Service[] = [
  { slug: 'rodent-control', name: 'Rodent Control', short: 'Rodents', intent: 'mice and rats in the house',
    attested: true, licenceCategory: '7A Structural General Pest Control',
    problems: ['mice-in-the-attic', 'rats-in-the-basement'] },
  { slug: 'ant-control', name: 'Ant Control', short: 'Ants', intent: 'ants trailing indoors and around the foundation',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
  { slug: 'tick-control', name: 'Tick Control', short: 'Ticks', intent: 'tick pressure in the yard',
    attested: true, licenceCategory: '7E Biting Fly and Other Arthropod Vectors', problems: ['ticks-in-the-yard'] },
  { slug: 'mosquito-control', name: 'Mosquito Control', short: 'Mosquitoes', intent: 'mosquitoes on the property',
    attested: true, licenceCategory: '7E Biting Fly and Other Arthropod Vectors', problems: [] },
  { slug: 'cockroach-control', name: 'Cockroach Control', short: 'Cockroaches', intent: 'cockroaches in a home or rental',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: ['cockroaches-in-a-rental'] },
  { slug: 'bed-bug-control', name: 'Bed Bug Control', short: 'Bed bugs', intent: 'bed bugs in a home or apartment',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: ['bed-bugs-in-an-apartment'] },
  { slug: 'residential-pest-control', name: 'Residential Pest Control', short: 'Residential', intent: 'ongoing home pest program',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
  { slug: 'commercial-pest-control', name: 'Commercial Pest Control', short: 'Commercial', intent: 'business and multi-unit pest control',
    attested: true, licenceCategory: '7A Structural General Pest Control (includes food processing)', problems: [] },
  { slug: 'wasp-and-hornet-control', name: 'Wasp, Hornet and Carpenter Bee Control', short: 'Wasps and hornets', intent: 'wasp, hornet, yellowjacket and carpenter bee nests',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
  { slug: 'carpenter-ant-control', name: 'Carpenter Ant Control', short: 'Carpenter ants', intent: 'carpenter ants in framing, sills and porch structures',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: ['carpenter-ants-in-the-wall'] },
  { slug: 'rodent-exclusion', name: 'Rodent Exclusion and Entry-Point Sealing', short: 'Exclusion', intent: 'sealing the ways rodents get into a building',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
  { slug: 'attic-cleanout-and-sanitation', name: 'Attic Clean-Outs, Insulation and Sanitation', short: 'Attic clean-outs', intent: 'soiled insulation and contaminated attic spaces after rodents',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
  { slug: 'flea-control', name: 'Flea Control', short: 'Fleas', intent: 'fleas in a home, usually arriving on a pet',
    attested: true, licenceCategory: '7A Structural General Pest Control', problems: [] },
];

/** Named so the site can say plainly what it does not do, rather than leaving a
 *  caller to find out on the phone. Client's answer, 28 September 2026. */
export const NOT_OFFERED = ['Termite work', 'Wildlife removal', 'Browntail moth treatment'];

export const attestedServices = () => SERVICES.filter((s) => s.attested);
export const serviceBySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);

export type Problem = { slug: string; title: string; service: string; question: string };
export const PROBLEMS: Problem[] = [
  { slug: 'mice-in-the-attic', title: 'Mice in the attic', service: 'rodent-control', question: 'What does it mean when you hear scratching in the attic at night?' },
  { slug: 'rats-in-the-basement', title: 'Rats in the basement', service: 'rodent-control', question: 'How do rats get into a Maine basement?' },
  { slug: 'carpenter-ants-in-the-wall', title: 'Carpenter ants in the wall', service: 'ant-control', question: 'Are carpenter ants in the wall a structural problem?' },
  { slug: 'ticks-in-the-yard', title: 'Ticks in the yard', service: 'tick-control', question: 'How do you reduce tick pressure in a Maine yard?' },
  { slug: 'cockroaches-in-a-rental', title: 'Cockroaches in a rental', service: 'cockroach-control', question: 'Who is responsible for cockroaches in a Maine rental?' },
  { slug: 'bed-bugs-in-an-apartment', title: 'Bed bugs in an apartment', service: 'bed-bug-control', question: 'What happens when bed bugs spread between apartments?' },
];
