/**
 * One hand-built @graph, @id-anchored, emitted once per page from BaseLayout.
 * The site it replaces shipped Squarespace's default LocalBusiness with
 * address:"" and openingHours:", , , , , , " on all 117 pages — a node that
 * identifies nothing. Everything here reads from business.ts, so a field the
 * client has not attested is simply absent rather than empty or invented.
 */
import { BUSINESS, hasLicenceNumber, hasReviewProof } from '../data/business';
import type { Service } from '../data/services';

const S = BUSINESS.site;
export const ID = {
  business: `${S}/#business`,
  website: `${S}/#website`,
  owner: `${S}/#ryan-blouin`,
  logo: `${S}/#logo`,
  page: (path: string) => `${S}${path}#webpage`,
  service: (slug: string) => `${S}/services/${slug}/#service`,
};

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));

export function coreNodes() {
  const business = clean({
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': ID.business,
    name: BUSINESS.legalName ?? BUSINESS.name,
    alternateName: BUSINESS.name,
    url: `${S}/`,
    telephone: BUSINESS.phoneE164,
    email: BUSINESS.email,
    // Service-area business: no streetAddress is published, so the node carries
    // only the fields that are true rather than an empty address string.
    address: clean({ '@type': 'PostalAddress', addressLocality: BUSINESS.address.locality, addressRegion: BUSINESS.address.region, addressCountry: BUSINESS.address.country }),
    areaServed: undefined as unknown,          // filled by the caller from authorised.ts
    founder: { '@id': ID.owner },
    foundingDate: String(BUSINESS.founded),
    openingHoursSpecification: BUSINESS.hoursSchema ? { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '09:00', closes: '17:00' } : null,
    logo: { '@id': ID.logo },
    image: { '@id': ID.logo },
    sameAs: [...BUSINESS.sameAs],
    aggregateRating: hasReviewProof()
      ? { '@type': 'AggregateRating', ratingValue: BUSINESS.reviews.rating, reviewCount: BUSINESS.reviews.count, bestRating: 5 }
      : null,
  });

  const owner = clean({
    '@type': 'Person',
    '@id': ID.owner,
    name: BUSINESS.owner.name,
    jobTitle: BUSINESS.owner.role,
    worksFor: { '@id': ID.business },
    hasCredential: hasLicenceNumber()
      ? clean({
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: BUSINESS.license.type,
          identifier: BUSINESS.license.number,
          recognizedBy: {
            '@type': 'GovernmentOrganization',
            name: BUSINESS.license.authority,
            url: 'https://www.maine.gov/dacf/php/pesticides/',
          },
          /* Read from the Board's own published applicator record, not asserted. */
          validUntil: BUSINESS.license.expires,
        })
      : null,
  });

  const website = {
    '@type': 'WebSite',
    '@id': ID.website,
    url: `${S}/`,
    name: BUSINESS.name,
    publisher: { '@id': ID.business },
    inLanguage: 'en-US',
  };

  /* The client's own logo, the one image every template renders (in the header).
     Supplied by the client 1 Oct 2026 — a real brand asset, not stock. */
  const logo = {
    '@type': 'ImageObject',
    '@id': ID.logo,
    url: `${S}/brand/bps-logo-480.webp`,
    contentUrl: `${S}/brand/bps-logo-480.webp`,
    width: 480,
    height: 160,
    caption: `${BUSINESS.name} logo`,
  };

  return [business, owner, website, logo];
}

export function webPageNode(path: string, title: string, description: string, crumbs: { name: string; item: string }[]) {
  return [
    {
      '@type': 'WebPage',
      '@id': ID.page(path),
      url: `${S}${path}`,
      name: title,
      description,
      isPartOf: { '@id': ID.website },
      about: { '@id': ID.business },
      breadcrumb: { '@id': `${S}${path}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${S}${path}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${S}${c.item}` })),
    },
  ];
}

export function serviceNode(service: Service, areaServed: string[]) {
  return clean({
    '@type': 'Service',
    '@id': ID.service(service.slug),
    name: service.name,
    serviceType: service.name,
    provider: { '@id': ID.business },
    areaServed: areaServed.length ? areaServed.map((a) => ({ '@type': 'AdministrativeArea', name: a })) : null,
    url: `${S}/services/${service.slug}/`,
  });
}

export function faqNode(path: string, faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${S}${path}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export const graph = (nodes: unknown[]) => JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
