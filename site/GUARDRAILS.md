# Blouin Pest Services — build guardrails

Keystone v3.2, track 7A (greenfield static). Written 23 September 2026.
Read this before changing anything that looks wrong. Several things in this build
look like defects and are decisions.

## Things that look like bugs and are not

**The site is dark.** Black is one of the two brand colours the client attested
on 28 September 2026, and the structure follows the reference he chose
(sasquatchpestcontrol.com). It is not a stylesheet that failed to load. See
`DESIGN.md`.

**Markdown tables are wrapped in a `div.tablewrap` you did not write.** A rehype
plugin in `astro.config.mjs` does it at build time. Do not remove it: the tables
carry a 30rem minimum width and overflowed a 320px viewport on four pages before
it existed. It wraps rather than setting `display:block` on the table, because
`display:block` strips the table role from the accessibility tree and the Part
4.3 snippet-shape contract requires a real table.

**Three town pages are live; thirty-eight are still sealed.** `gen-authorised`
reports `3 indexable towns, 38 pending, 59 declined`. Portland, Bath and Oxford
cleared Part 6A on 24 September with two signals each — S4 competitor coverage
plus S5 job history, confirmed by the client — and each page carries the full M1
substance gate: three verifiable local specifics with their sources, first-party
proof from that town, a fact the top five do not carry, and no sentence shared
with a sibling. Bethel has confirmed job history but no competitor coverage, so
it sits at one signal and stays sealed. The other 37 pending towns have S4 only.
The sealed routes render, carry `noindex`, appear in no sitemap and are linked
from nowhere — `scripts/gate-integrity.mjs` asserts all of that on every build.

**Five county hubs are published, two are not.** Androscoggin, Cumberland, Kennebec, Oxford and Sagadahoc were written on 2 October 2026 to the same substance gate as the towns (`src/content/county/`, schema in `config.ts`) and flipped to PAGE in the demand map. Franklin and York have no job on record and stay sealed. A hub with no document renders the old link-list scaffold, so flipping a county to PAGE without writing it first would publish a thin page — write, then flip.

**No license number anywhere.** `BUSINESS.license.number` is `null`, so the
credential is absent from the page and from the `Person` node rather than being
approximated. The About page says so in plain language instead of implying a
credential. Fill `business.ts` and it appears everywhere at once.

**The About page has no owner biography.** Pending. The site will not write a
personal history on Ryan's behalf.

**The reviews page has no review text.** The rating and count are published
(5.0 from 98, read from the Google Business Profile on 22 September 2026) because
they were observed. The review text is not, because reproducing customer words
requires the real words. The page says that plainly.

**No images, and no `ImageObject` in the graph.** The client has supplied no
photographs. `scripts/validate-schema.mjs` re-enables the `ImageObject`
requirement automatically as soon as any template renders an `<img>`.

**Five word-band warnings.** Advisory under v3.2 — bands are editorial defaults,
not floors. After wave 2 the site carries ~19,000 words, median page 1,127, and
the five flagged pages sit within about 120 words of their band. See
CONTENT_BRIEF.md.

**Citability is 15/23 pages at four signals (65%), up from 0%.** The client
confirmed the jobs mined from his Google reviews on 24 September, so real work is
now named on the service, problem and town pages it belongs to — rendered on the
page by `FieldProof.astro`, not parked in frontmatter, because a signal a reader
cannot see is not a signal. The eight pages still at three are the ones where no
confirmed job maps: the library and compliance pages, browntail and wasps
(unattested services), cockroaches and rats. Those stay honest rather than being
padded with a job that did not happen.

**Most legacy town URLs redirect to /service-area/, three do not.** Portland,
Bath and Oxford now point at their own published pages; the other 104 stay parked
on the service-area hub because their destinations are noindex, and sending
inbound equity into a noindex page wastes it. `gen-authorised.mjs` writes
`authorised-towns.json` and `gen-redirects.mjs` reads it, so the map repoints
itself as towns clear the gate. Regenerate both after any demand-map edit.

## Dimension 9 is measured, and where

Lab numbers are in PERFORMANCE.md: median of five mobile runs, 100/100/100 with
LCP 0.66s and TBT 0ms on the homepage. Measured against `dist/` served locally,
so it is a build measurement rather than a production one — re-run against the
live origin after cutover, and take the INP field reading at 28 days.

## Dimension 7 has a provisional score now

Rendered pages were captured at 390 and 1280 and reviewed by eye on 24 September:
**3, provisional.** Clean, legible, mobile-first, AA contrast, fast — held at 3 by
the absence of a logo, photography and a distinctive palette, which are client
assets rather than build work. Three mobile issues were found and fixed in the
same pass (header height, sticky-bar wrapping, card heading breaks); details in
`archive/design-review.json`.

## Attestations — received 28 September 2026

| Item | Status |
| --- | --- |
| Registered name | Blouin Pest Services LLC — attested |
| Commercial Master Applicator licence | CMA-6425, categories 7A and 7E — attested, published, in the schema |
| Firm licence | Held by the LLC; the number itself is still TO PROVIDE |
| Insurance | $2m liability in force — attested. The insurer is deliberately not named on the site, at the client's request |
| Hours | 9am–5pm, seven days — attested, published, in the schema |
| Owner biography | Supplied in Ryan's own words and published on /about/; he wants to approve the final wording |
| Service warranty | Terms attested and written into /our-guarantee/, which stays **noindex** until the written service agreement exists and matches it — his instruction, and the right one |
| Customer count | "Over 350 combined customers as of September 2026" — attested and published |
| Green option | EcoVIA MT, named as a product rather than a blanket environmental claim |
| Services | Confirmed list published. Browntail, termite and wildlife work are declined and named as such on /services/ |
| Jobs for town pages | Lewiston, Auburn, Waterville, Augusta, Portland, Bath, Oxford — confirmed and published |
| Review figure | 5.0 from 100, read from the profile on 24 September. Re-check before launch |

## Two proof fields became one

City pages used to carry both `firstPartyData` (the 6.5 citability signal) and
`firstPartyProof` (item 2 of the M1 substance gate). They held the same fact in
different words, and had already drifted — Lewiston said "the customer reported
the ants eliminated" in one and "the ants gone" in the other. The town template
rendered only `firstPartyProof`, so the citability score was counting a field
no reader ever saw.

`firstPartyData` is now removed from every city file. `scripts/citability.mjs`
reads `firstPartyProof` for the `city/` collection and `firstPartyData`
everywhere else, so the fact lives in exactly one place per page. Do not add
`firstPartyData` back to a city file.

## Citability is 90%, and the last three are left open on purpose

`firstPartyData` was closed on five more pages on 29 September, entirely from
the 100 reviews mined on 24 September — counted themes and de-identified job
detail, never a name, never a town that was not stated by the customer.
Citability went 65% → 73% → 90%.

Three pages are still `null`, and each one should stay that way until real
evidence exists. Do not close them by writing something plausible:

| Page | Why it cannot be closed |
|---|---|
| `service/flea-control.md` | Zero of the 100 reviews mention fleas. There is no job to describe. "We have no flea calls on record" is true but is not what belongs on a flea service page |
| `library/overwintering-insects-in-maine-houses.md` | Zero mentions of cluster flies, stink bugs, ladybugs or boxelder bugs in the review corpus |
| `library/maine-pest-calendar.md` | The review recency data is bucketed by relative age ("4 months ago"), not by calendar month, so it cannot support a seasonality claim. A seasonal claim needs job dates, which is one of the outstanding client items |

Each of these closes the moment Ryan supplies a real job. None of them closes by
writing around the gap.

**The score is now checked against rendered output.** `firstPartyData` reaches a
page through a component, so frontmatter presence proved nothing — and on
29 September the library and compliance templates were not rendering it at all
while the script counted five pages as complete. `scripts/citability.mjs` now
FAILS the build when a set `firstPartyData` does not appear in that page's
`dist/.../index.html`. Everything else in 6.5 stays scored rather than gated;
this one is gated because a signal counted but not rendered is a false score,
which is the one thing this harness exists to prevent. Verified by removing
`<FieldProof>` from the library template and watching it fail.

## Still outstanding from the client

- Working photograph of Ryan; job, van and logo files. **The site ships no photography at all**, which is the single biggest remaining quality gap
- Rough dates for the five job examples, so town pages can say when rather than "recently" — and so `library/maine-pest-calendar.md` can carry real seasonality
- Any flea job, and any cluster-fly or stink-bug job: those two pages are the last `firstPartyData` gaps and no review covers either
- Job examples for the other eight priority towns: Greene, Leeds, Poland, Brunswick, Saco, Biddeford, Kennebunk, Kennebunkport. He asked that unsubstantiated town claims not be published — they are not, and those towns stay sealed
- Firm licence number and the next renewal date
- Direct Facebook, Yelp and Angi URLs (only the Linktree is published)
- GorillaDesk booking-form embed code, to replace the interim call/text block on /contact/
- Written service agreement (unlocks /our-guarantee/) and sign-off on the privacy draft
- Manager access to Google Business Profile and Search Console — access, never passwords
- Recurring-customer count, if he wants it published

## Claims carried over from the old site

All five are resolved, and `BUSINESS.retired` records what replaced each:

- "Maine's Best Pest Control" → the verified review figure, 5.0 from 100.
- "Guaranteed effective treatments" → the written service warranty, held back until the agreement exists.
- "Over 200 residential and 100 commercial customers" → "over 350 combined customers as of September 2026".
- "Eco-friendly pest management" → EcoVIA MT, named.
- "Over 5 years of experience" → seven years, attested, sitting alongside the 2025 founding date for the business. The two no longer contradict each other.
- "I work closely with the Maine Board of Pesticides" → removed. The business follows the rules; it does not partner with its own regulator.

`scripts/gate-integrity.mjs` fails the build if any retired phrasing reappears in rendered output — it caught one on 28 September, in a sentence on /about/ that was explaining why the phrase is not used.

## Facts used on the site, and where they came from

Every quantified fact on this site comes from the Maine Board of Pesticides
Control licensing pages (read 22 September 2026) or the Maine Forest Service /
Maine CDC browntail moth pages. Licence fees, recertification credits, category
numbers and the firm-licence rule are quoted from those pages. No figure on this
site was estimated, and no local detail was invented for a town page — which is
precisely why the town pages are empty of local detail.

## The rendered audit, and what the static one cannot see

`scripts/a11y.mjs` says so itself: it is static analysis, and cannot see
computed contrast, focus order, or the DOM after Astro has rendered it.
`npm run audit:rendered` closes that gap — axe-core in a real browser over one
page of every template at 1280px and at 320px, plus a horizontal-overflow check.

It found two things on the 28 September rebuild that the static checker passed:
every page had content outside a landmark (the utility bar and the breadcrumbs),
and four pages overflowed a 320px viewport on their tables. Both are fixed —
the utility bar is a labelled region, breadcrumbs are a `nav[aria-label]`, and
tables are wrapped. Current state: 32 renders, 0 violations, 0 overflow.

Neither audit replaces a person. Screen-reader sense and real focus order still
need someone with a screen reader.

## The gate has a guard now

`scripts/gate-integrity.mjs` runs on every build and asserts, against the
rendered output rather than the source: every PENDING route carries noindex,
appears in no sitemap and is linked from nowhere; every authorised route is the
mirror image; a DECLINED town has no route at all; an unattested service is
treated exactly like a held-back geography; and none of the four withdrawn
claims has reappeared in a rendered page. It was tested by deliberately removing
the noindex from the town template — it failed the build with 40 named leaks —
and then restored.

That check is the difference between a gate and an intention.

## Site separation

This build shares a verification harness with other Keystone builds and nothing
else. No content, data, schema @id, phone number or link is shared with any other
client site.
