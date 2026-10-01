import { defineCollection, z } from 'astro:content';

/** Shared citability + snippet-shape frontmatter (Keystone 4.3 and 6.5).
 *  These fields are declared so they are auditable by scripts/citability.mjs
 *  rather than asserted in prose. firstPartyData is null until the client
 *  supplies a job, photo or review — a placeholder string would defeat the gate. */
const citable = {
  title: z.string(),
  description: z.string(),
  answer: z.string(),                       // the Quick Answer block, in the initial HTML
  snippetShape: z.string(),
  quantifiedFact: z.string().optional(),
  primaryAuthority: z.string().optional(),
  statedPosition: z.string().optional(),
  firstPartyData: z.string().nullable().default(null),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  updated: z.string(),
};

/** Town pages carry the M1 substance gate in frontmatter so it is auditable:
 *  three verifiable local specifics with their sources, first-party proof from
 *  that town, and a fact the top five competitors do not carry. A page without
 *  these does not exist as a document, and the route falls back to the gated
 *  scaffold. */
const cityGate = {
  town: z.string(),
  localFacts: z.array(z.string()).min(3),
  firstPartyProof: z.string(),
  uniqueFact: z.string(),
};

export const collections = {
  city: defineCollection({ type: 'content', schema: z.object({ ...citable, ...cityGate }) }),
  service: defineCollection({ type: 'content', schema: z.object({ ...citable, service: z.string() }) }),
  problem: defineCollection({ type: 'content', schema: z.object({ ...citable, service: z.string() }) }),
  library: defineCollection({ type: 'content', schema: z.object({ ...citable }) }),
  compliance: defineCollection({ type: 'content', schema: z.object({ ...citable }) }),
  sitePage: defineCollection({ type: 'content', schema: z.object({ ...citable }) }),
};
