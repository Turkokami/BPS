# Dimension 9 — lab measurement

Keystone v3.2 gate: mobile Lighthouse, **median of five runs**, LCP ≤ 2.0s,
TBT ≤ 200ms, CLS ≤ 0.05, performance score ≥ 90. Field re-check on INP ≤ 200ms
at 28 days after launch.

Measured 23 September 2026 against the production build (`dist/`) served over
HTTP on localhost, simulated mobile throttling, Chromium headless.

| Page | Perf | LCP | TBT | CLS | A11y | SEO | Page weight |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | **100** | 0.66s | 0ms | 0 | 100 | 100 | 14 KB |
| `/services/rodent-control/` | **100** | 0.81s | 0ms | 0 | 100 | 100 | 23 KB |

Both clear the gate with a wide margin. For contrast, the site this replaces
ships 187 KB of HTML, 30 external scripts, 21 inline scripts and 8 stylesheets
on a 600-word town page.

## How to read these numbers honestly

**This is a lab measurement, not a field one.** It measures what the build does,
not what the network, the host and real devices will do. It is a floor: the build
is not the bottleneck. The Vercel-hosted numbers will be close but not identical,
and they should be re-run against the live origin after cutover.

**The first run of any session is warm-up noise.** Run 1 on the homepage reported
TBT 560ms and a score of 86. The long-tasks audit attributed both long tasks to
`_lighthouse-eval.js` — Lighthouse's own evaluation harness — and the page's
network log shows exactly one request, the HTML document. Runs 2 through 5 all
returned TBT 0ms and a score of 100. This is precisely why the standard specifies
a median of five rather than a single run, and the discarded run is recorded here
rather than quietly dropped.

**Zero JavaScript is doing the work.** The rendered page requests one document.
CSS is inlined at build, there is no client-side framework, no tag manager, no
chat widget and no font request. The only `<script>` on any page is the JSON-LD
graph, which is data rather than executable code.

## What still has to be measured

- **Re-run against the live origin after cutover**, from a real network. Same
  method, median of five, recorded here with the date.
- **INP field data at 28 days**, from CrUX or first-party RUM. A static page with
  no JavaScript has very little that can produce a poor INP, but the gate asks
  for the measurement rather than the inference.
- **Re-measure when anything is added.** A chat widget, an embedded map, a review
  carousel or a tag manager will each cost more than everything currently on the
  page combined. If one is added, this file gets re-run before it ships.

## Reproducing this

```bash
npm run build
python3 -m http.server 4321 --directory dist &
CHROME_PATH=<chromium> lighthouse http://localhost:4321/ \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --only-categories=performance,accessibility,best-practices,seo
```
Run five times, take the median, and discard nothing silently.


## 28 September 2026 — after the visual rebuild

The rebuild replaced the whole stylesheet and every chrome component. Re-measured
rather than assumed, because a redesign is exactly when performance regresses.

Lighthouse CLI, mobile preset, against `dist/` served locally:

| Route | Perf | A11y | BP | SEO | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 0 | 0 ms |
| `/services/rodent-control/` | 100 | 100 | 100 | 100 | 0 | 0 ms |
| `/locations/lewiston/` | 100 | 100 | 100 | 100 | 0 | 0 ms |
| `/library/maine-pest-calendar/` | 100 | 100 | 100 | 100 | 0 | 0 ms |
| `/contact/` | 100 | 100 | 100 | 100 | 0 | 0 ms |

Desktop preset on `/`: FCP 0.2 s, LCP 0.2 s, Speed Index 0.2 s, CLS 0, TBT 0 ms.

The reason CLS is 0 and TBT is 0 ms is that the rebuild ships **no web fonts and
no client JS**. The reference design uses DM Sans and Newsreader from Google
Fonts; those hosts are unreachable from this build environment, and the
substitute — a system serif stack against the system sans — costs nothing to
load and cannot shift the layout when it arrives, because it is already there.
If web fonts are ever added, re-run this table before shipping: a render-blocking
font request is the most likely way this site loses its 100.
