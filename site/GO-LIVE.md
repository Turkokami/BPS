# Go-live readiness — blouinpest.com

Deep functional check run 29 September 2026. Every figure below was measured,
not estimated. Commands to reproduce are in brackets.

---

## Verdict

**The build is ready. Nothing in the code is blocking launch.**

Four things must happen on cutover day, none of them development work. Nine
things are waiting on Ryan; none of them blocks launch, but three of them are
the difference between a good launch and a quiet one.

---

## 1. What passes

| Check | Result | Command |
|---|---|---|
| Build harness, 10 checks | all green | `npm run build` |
| Launch preflight, 9 checks | 0 failures across 81 pages | `npm run preflight` |
| Rendered accessibility (axe-core, WCAG 2.2 AA) | 32 renders, 0 violations | `npm run audit:rendered` |
| Whole-site browser crawl | 162 loads, 4,721 links, 0 problems | `npm run crawl` |
| Lighthouse, mobile preset | 100 / 100 / 100 / 100 on every template tested | — |

All four run together as `npm run launch`.

**Lighthouse detail** — home, service, problem, town, county, library,
compliance, contact and service-area templates: performance 100, accessibility
100, best practices 100, SEO 100, CLS 0, TBT 0 ms, LCP 0.8–0.9 s on mobile,
0.2 s on desktop. No web fonts and no client JavaScript is why.

**The shape of the site**

| | |
|---|---|
| Built pages | 81 |
| Indexable | 37 — and exactly 37 URLs across the five sitemaps |
| Held back (noindex, unlinked, in no sitemap) | 44 |
| Content files | 30, about 34,000 words |
| Legacy redirects | 117, every destination built and indexable |
| Outbound links | 4, all to the Maine Board of Pesticides Control or the Linktree |

The 44 held back are 34 towns and 7 county hubs under the Part 6A demand gate,
plus `/our-guarantee/` (waiting on the written agreement), `/privacy/` (waiting
on sign-off) and `/404`.

---

## 2. What the check found and fixed today

Eight real defects, all now closed.

| Found by | Defect |
|---|---|
| preflight | `sitemap-geo.xml` was built but robots.txt never named it — the 7 town pages had no sitemap route to Google |
| Browser crawl | `/locations/cumberland/` overflowed to 471px in a 390px viewport: an unbreakable competitor token in the gated notice |
| Browser crawl | 38 navigation links were under the 24px WCAG 2.2 target size on a phone — town lists, problem lists, card headings |
| Lighthouse | **Label in Name failure**: buttons read "Call 207-740-4441" but their accessible name was "Call Blouin Pest Services at 207-740-4441". A voice-control user saying what they can see would not activate them. The labels were mine; they are gone |
| Lighthouse | The sticky bottom action bar overlapped the in-page call buttons by 38px. It was the fourth copy of the same CTA on every page — removed, and the top bar's call link promoted to a real button |
| Self-review | A CSS specificity collision flattened the padding off the nav chips. Fixed with `:where()`, which contributes no specificity |
| preflight | The site named the Maine Board of Pesticides Control as its authority on 30 pages and linked to it from none. Both Board directories are now linked from the compliance page |
| Demand map | The county gate notice told readers no job was on record in that county. False for five of the seven since 28 September |

---

## 3. Verified against the regulator

Read from the Board of Pesticides Control's own published data on 29 September,
in the browser (the cloud proxy 403s maine.gov). Archived at
`archive/bpc-verification.json`.

**Applicator record**, 1 of 2,014 rows:

> Blouin, Ryan · **CMA-6425** · **2027-12-31** · Commercial Master Applicator ·
> 7A, 7E · Blouin Pest Services

**For-hire company directory**, 1 of 403 rows:

> Blouin Pest Services · Lewiston · Androscoggin · (207) 740-4441 ·
> **7A, 7E** · ryan@blouinpest.com · flagged FH

Licence number, categories, phone and email all match `business.ts` exactly.
**The expiry date was an outstanding client item and is now sourced from the
regulator instead — Ryan does not need to supply it.** It is published on the
compliance page and carried in the schema as `validUntil`.

Two notes. The firm licence number itself is not in that dataset, so it stays
outstanding — but the FH flag confirms the firm licence is held. And the Board
publishes Ryan's street address; the site still does not, per his instruction.
That instruction stands. He may want to know the address is already public.

---

## 4. Blocking go-live — cutover day only

**1. Ryan's explicit approval to publish.** Nothing goes live without it.

**2. Vercel project, framework preset set to Astro explicitly.** If it is left on
auto-detect, every route returns 404 on a build that reports success. Deploy to
a preview URL first and check: home, a service page, a problem page,
`/sitemap.xml`, `/robots.txt`, and one gated town page — that last one must
return noindex and appear in no sitemap.

**3. DNS, with the Squarespace subscription left running for 30 days.** Rollback
is a DNS change and nothing else; nothing in this build touches the live site.

**4. Turn off the Squarespace built-in domain.** Checked again today:
`smilodon-gopher-2m26.squarespace.com` still serves the entire site at HTTP 200
with no noindex. It carries a canonical to `www.blouinpest.com`, which helps but
does not stop indexing. This is a one-minute fix and it is still the highest-value
technical item in the engagement.

The live sitemap at `www.blouinpest.com/sitemap.xml` currently lists 117 URLs,
which is exactly the redirect count — legacy coverage is complete, nothing is
orphaned at cutover.

---

## 5. Waiting on Ryan

**These three change how loud the launch is.**

- **Photography.** The site ships zero images. This is the single biggest
  remaining quality gap, and it is a phone and five minutes a job. His Google
  profile has nine owner photos and none show work, a van, an attic, a sealing
  job or Ryan himself.
- **The written service agreement.** `/our-guarantee/` is built and noindex until
  the agreement exists and matches it. That is his instruction and it is right —
  but it means a guarantee page nobody can find.
- **GBP and Search Console manager access.** Access, never passwords. Without
  Search Console there is no baseline to measure the migration against, and the
  window to capture it closes at cutover.

**These are smaller.**

- Privacy sign-off (unlocks `/privacy/`)
- GorillaDesk booking-form embed, to replace the interim call/text block
- Firm licence number
- ~~Direct Facebook, Yelp and Angi URLs~~ — found 1 Oct in Google's results
  (plus Thumbtack and the Google listing itself) and added to `sameAs`. He only
  needs to confirm each is his.
- Job examples for Greene, Leeds, Poland, Brunswick, Saco, Biddeford, Kennebunk
  and Kennebunkport, which unseal eight more towns
- Any flea job, and any cluster-fly or stink-bug job — the last two citability
  gaps, and no review in the corpus covers either
- Recurring-customer count, if he wants it published

**Before launch, re-read the Google review figure.** It is 5.0 from 100, re-read
on 1 October (99 five-star, one four-star). It moved from 98 to 100 during the
audit week.

---

## Update — 1 October 2026

- **Logo.** The client's own logo (supplied 1 Oct) is in the header, favicon,
  touch icon, share card and schema (`ImageObject`). Master in `brand/`.
- **Reviews.** `/reviews/` now quotes 22 Google reviews word for word, read off
  the live profile on 1 Oct. `src/data/reviews.ts` records what was left out and
  why (guarantee-like wording, a price, a meaning-reversing typo, a reviewer
  sharing the owner's surname — ask Ryan whether Matthew Blouin is family).
- **"Read the reviews on Google"** pointed at the Linktree. It now opens the
  Google listing.
- **Old site scraped.** Nothing else on Squarespace is usable: its photos are
  stock (Unsplash, town scenery) or Canva graphics built on stock, so the
  photography item above is unchanged.
- **Windows builds.** Every verify script now normalises path separators; two
  gates had been failing and three silently skipping checks on Windows.
- **Redirects.** All 114 now resolve; with `trailingSlash: true` the slash-less
  sources had never matched (fixed in `gen-redirects.mjs`).

---

## 6. Worth a decision, not blocking

**The seven county hubs.** Five now satisfy the Part 6A gate — confirmed jobs in
Lewiston and Auburn, Portland, Augusta and Waterville, Oxford, and Bath. The gate
is no longer what holds them back. The pages are: each is about 130 words of
links, and publishing a thin hub to satisfy a gate is exactly the behaviour the
gate exists to prevent. They need writing, and then they publish. The demand map
now records that honestly, and so does the on-page notice.

**Citability sits at 90%** — 27 of 30 pages carry all four Part 6.5 signals. The
last three are flea control, overwintering insects and the pest calendar, and
each needs a real job rather than better writing.

---

## 7. The first 30 days

Unchanged from `MIGRATION.md`, which has the full runbook. The short version:

- **Day 1** — submit the sitemap index plus all five tier sitemaps to Search
  Console. Inspect the homepage and one service page, request indexing.
- **Week 1** — watch Vercel logs and Search Console for 404s on legacy URLs
  nobody predicted. Spot-check five redirects for chains or loops.
- **Week 2** — five-run mobile Lighthouse median, recorded in `PERFORMANCE.md`.
- **Week 4** — INP field check at 28 days, first citability re-score, first look
  at branded search as the Dimension 13 baseline.
- **Ongoing** — as job history arrives, flip towns in `demand-map.csv`,
  regenerate, write the page to the four M1 substance items, and re-run
  `gen-redirects.mjs`.

---

## 8. What no script can tell you

The rendered audit and the crawl are a floor, not an audit. Still needs a person:

- A screen-reader pass. Focus order and whether the page makes sense read aloud.
- Ryan reading his own about page and the guarantee wording.
- Someone who is not us clicking through on a real phone on real mobile data.
