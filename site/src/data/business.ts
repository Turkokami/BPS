/**
 * Single source of truth for every NAP, credential and proof string on the site.
 * Keystone 7A pattern: one edit here changes every page, and anything the client
 * still owes is `null` with a guard at the render site, so an unattested claim
 * cannot reach the page by accident.
 *
 * ATTESTATION RULE (Dimension 11, v3.2): credentials and counts are published
 * exactly as the client attests them, dated in GUARDRAILS.md. Nothing here is
 * invented, inferred, or carried over from the old site without attestation.
 */
export const BUSINESS = {
  name: 'Blouin Pest Services',
  legalName: 'Blouin Pest Services LLC',       // attested 28 Sep 2026
  owner: {
    name: 'Ryan Blouin',
    role: 'Owner and Commercial Master Applicator',
    experienceYears: 7,                        // attested 28 Sep 2026
    mentor: 'Anthony Ciriello',                // attested: trained and mentored by
    bio: 'supplied',                           // rendered from src/content/sitePage/about-ryan.md
    photo: null as string | null,              // PENDING: working photo
  },
  founded: 2025,                               // "In 2025, I started this company" — live /about
  phone: '207-740-4441',
  phoneE164: '+12077404441',
  email: 'ryan@blouinpest.com',
  /** Service-area business: no public street address. Decision recorded once, applied everywhere. */
  address: { streetAddress: null, locality: 'Lewiston', region: 'ME', postalCode: null, country: 'US' },
  addressVisibility: 'hidden' as const,
  hours: '9:00 AM – 5:00 PM, seven days a week', // attested 28 Sep 2026
  hoursSchema: 'Mo-Su 09:00-17:00',
  /** Maine Board of Pesticides Control. Published only when attested. */
  license: {
    authority: 'Maine Board of Pesticides Control',
    type: 'Commercial Master Applicator',
    number: 'CMA-6425',                        // attested 28 Sep; verified against the Board's own record 29 Sep
    categories: ['7A Structural General Pest Control', '7E Biting Fly and Other Arthropod Vectors'],
    firmLicense: 'held',                       // listed FH in the Board's for-hire directory; the number itself is not in that dataset
    insured: true,                             // $2m liability. Insurer deliberately not named on the site.
    liability: '$2 million',
    renewal: 'every three years',
    /* Read from the Board of Pesticides Control's published applicator record on
       29 September 2026, not supplied by the client — see archive/bpc-verification.json.
       The record reads: Blouin, Ryan · CMA-6425 · 2027-12-31 · Commercial Master
       Applicator · 7A, 7E · Blouin Pest Services. */
    expires: '2027-12-31',
    verified: '2026-09-29',
  },
  /** Reviews: only ever from the verified Google Business Profile, with the date observed. */
  reviews: {
    source: 'Google Business Profile',
    rating: 5.0,
    count: 100,
    observed: '2026-10-01',                    // re-read 1 Oct 2026 (100 reviews, 99 five-star, one four-star); re-check before launch
    // The Google listing itself (CID from the profile's review dialog, 1 Oct 2026).
    // It was the Linktree, which made "Read the reviews on Google" a dead end.
    profileUrl: 'https://maps.google.com/?cid=2009510692584227543',
  },
  /** Service warranty, attested 28 Sep 2026. It stays OFF the indexable site until
   *  the written service agreement exists and the page language matches it —
   *  the client's own instruction, and the right one. */
  guarantee: {
    name: 'Service warranty',
    terms: 'A free reapplication if the same pest problem returns at the same property between scheduled paid visits, while the plan and payments are current. A one-time nest removal includes one free follow-up within 30 days, covering renewed activity at the treated nest rather than a new nest elsewhere. The customer follows the preparation and access instructions, and any essential repairs are explained in writing.',
    agreementSigned: false,                    // blocks publication until the written agreement exists
  },
  /** Attested 28 Sep 2026, and what each old claim was replaced with. */
  customers: 'over 350 combined customers as of September 2026',
  greenOption: 'EcoVIA MT',                    // a named product option, not a blanket environmental claim
  payment: ['Cash', 'Check', 'Credit and debit cards', 'Apple Pay', 'Venmo', 'Cash App', 'Cryptocurrency'],
  emergency: 'Same-day emergency service is available; call or text for the next opening.',
  radius: 'Up to about 1.5 hours from Lewiston for routine work, further for larger or commercial jobs.',
  retired: {
    superlative: "Maine's Best Pest Control — replaced with the verified review figure",
    guaranteeClaim: "'Guaranteed effective treatments' — replaced with the written service warranty",
    customerSplit: 'the old 200 residential / 100 commercial split — replaced with the attested combined figure',
    ecoClaim: "'eco-friendly pest management' — replaced with the named EcoVIA MT option",
    regulator: "'I work closely with the Maine Board of Pesticides' — removed; the business follows the rules, it does not partner with the regulator",
  },
  /* Direct profile URLs found 1 Oct 2026 in Google's results for the business,
     each showing his name and 207-740-4441. Confirm with the client; remove any
     that is not his. Facebook and Thumbtack fetched 200; Yelp and Angi 403 bots. */
  sameAs: [
    'https://www.linktr.ee/blouinpest',
    'https://maps.google.com/?cid=2009510692584227543',
    'https://www.facebook.com/blouinpest/',
    'https://www.yelp.com/biz/blouin-pest-services-lewiston',
    'https://www.angi.com/companylist/us/me/lewiston/blouin-pest-services-llc-reviews-1.htm',
    'https://www.thumbtack.com/me/lewiston/exterminators/blouin-pest-services/service/573446559150800902',
  ],
  /** Lead capture. A static site cannot email, so the form is the client's own
   *  CRM embed. Until the embed code arrives the contact page renders call and
   *  text, which is what he asked for in the meantime. */
  forms: { gorilladeskEmbed: null as string | null },
  site: 'https://www.blouinpest.com',
} as const;

export const hasLicenceNumber = () => Boolean(BUSINESS.license.number);
/** Terms exist, but the page publishes only once the written agreement does. */
export const hasGuarantee = () => Boolean(BUSINESS.guarantee.name && BUSINESS.guarantee.terms);
export const guaranteePublishable = () => hasGuarantee() && BUSINESS.guarantee.agreementSigned;
export const hasForm = () => Boolean(BUSINESS.forms.gorilladeskEmbed);
export const hasReviewProof = () => Boolean(BUSINESS.reviews.count && BUSINESS.reviews.observed);
