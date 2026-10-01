# Content brief — wave 3

Wave 1 (shipped 23 Sep) — 17 content files, 72 routes, harness green.
Wave 2 (shipped 23 Sep) — every page deepened; site content went from ~6,000 to
~19,000 words, median page 1,127 words, 12 of 17 inside their word band and the
remaining five within 120 words of it. Bands are advisory under v3.2; the five
are listed by `npm run verify` on every build.

## Priority order for wave 3

1. **More towns.** Portland, Bath and Oxford are published. Every further town
   needs the same two things: a second demand signal and a confirmed job with
   enough detail to write about. The fastest route is a keyword-volume pull,
   which would clear S1 for the larger towns in one afternoon.
2. **Pricing.** Every service page has a costing section written to receive real
   ranges the moment the client confirms pricing.
2. **First-party proof.** Every page is at 3/4 citability signals; all of them are
   missing the same one. One photo and two sentences per job — what was found,
   what was done — moves the whole site to 4/4 and unlocks town pages.
3. **Towns.** When job history or Search Console data arrives, set the town's
   `decision` to `PAGE` in `architecture/demand/demand-map.csv`, run
   `node scripts/gen-authorised.mjs`, and write the page to the four M1 substance
   items. Do not publish a town page without them.
4. **Library.** Next three: overwintering insects in Maine houses; what to do
   before a home inspection; wasps and hornets around the eaves. Each with a
   named authority in a visible sentence.
5. **Guarantee page** the moment terms exist.
6. **Reviews.** Replace the pending notice with real review text, reviewer first
   name and month, exactly as published on the GBP.

## Rules that do not bend

- No invented local detail, ever. No statistic without a source named in the
  sentence that uses it.
- No claim in `BUSINESS.unattested` returns to the site without written
  attestation, dated in GUARDRAILS.md.
- A page ships at one H1, inside 60 characters of title, with a declared snippet
  shape that the markup actually carries.
