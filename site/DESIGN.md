# Design system — Blouin Pest Services

Rebuilt 28 September 2026. The structure, rhythm and interaction pattern follow
the reference the client chose, **sasquatchpestcontrol.com**. The palette is
Blouin's own: black and blue, per his questionnaire answer of 28 September 2026.

## What was taken from the reference

| Pattern | How it is implemented here |
|---|---|
| Sticky utility bar above the header | `TopBar.astro` — tagline left, call/text right, 2px accent rule beneath |
| Boxed nav chips, current page filled | `nav.site` — bordered chips, `aria-current="page"` gets the fill |
| Secondary link row under the primary nav | `nav.site.secondary` — reviews, guarantee, licensing |
| Direct answer in an accent-bordered panel | `.answer` — 3px left rule, raised panel |
| Contact actions immediately under the answer | `ActionRow.astro`, on home, service and town templates |
| Collapsed indexes with live counts | `QuickMenu.astro` — "What we handle 13", "Where we work 7"; counts render from the arrays, never typed |
| Prose-led sections, not card walls | Homepage card grid removed; services are reachable from the chips, the prose and the footer |
| FAQ as hairline-separated disclosures | `Faq.astro` — `<details>` with top/bottom rules, no box |
| Closing CTA band with an accent top rule | `.ctaband` in `CallToAction.astro` |
| Footer columns + colophon, accent top rule | `Footer.astro` |
| Mobile-only sticky action bar | `.actionbar` in `BaseLayout.astro`, hidden at ≥720px |

## Deliberate divergences

- **No web fonts.** The reference loads DM Sans and Newsreader from Google Fonts.
  Those hosts are unreachable from this build environment, and a third-party font
  request is render-blocking. The serif/sans contrast is carried by a system
  stack instead (`Newsreader, "Iowan Old Style", Palatino, Georgia, serif` over
  the system sans). Result: CLS 0, TBT 0 ms, LCP 0.2 s desktop / 0.9 s mobile.
- **No hero photograph.** The reference opens on a full-bleed forest image.
  Blouin has supplied no photography yet (wave 4, outstanding). Adding stock
  imagery would be a fabricated first-party signal. The H1 leads instead.
- **No inline lead form.** The reference embeds one mid-page. Blouin's form
  depends on the GorillaDesk embed, still outstanding — `BUSINESS.forms.gorilladeskEmbed`
  is `null` and `hasForm()` gates it.

## Tokens and measured contrast

Dimension 14 is a scored dimension, so every ratio below was computed from WCAG
relative luminance, not estimated. Full table in `src/styles/base.css`.

| Token | Value | On `--page` | On `--panel` | Used for |
|---|---|---|---|---|
| `--page` | `#0b0e13` | — | — | page background |
| `--panel` | `#141922` | 1.10:1 | — | raised surfaces |
| `--paper` | `#eef2f7` | 17.19:1 | 15.67:1 | body text |
| `--muted` | `#b3bdcb` | 10.18:1 | 9.28:1 | secondary text |
| `--faint` | `#8d97a6` | 6.54:1 | 5.97:1 | captions, colophon |
| `--blue` | `#7fc0ff` | 10.02:1 | 9.13:1 | links |
| `--blue-lift` | `#9ccdff` | 11.59:1 | 9.05:1 on `--chip` | chip and nav text |
| `--rule` | `#2f81f7` | 5.16:1 | 4.70:1 | rules and borders only, never body text |
| `--fill` | `#175fbd` | white on fill 6.16:1 | — | primary button |
| `--amber` | `#ffb457` | 10.97:1 | 10.00:1 | gated/pending notices, focus ring |

The lowest text ratio on the site is 5.97:1 (`--faint` on `--panel`), against a
4.5:1 AA requirement. `--rule` is never used for body-size text.

## Rendered audit

`npm run verify` includes `scripts/a11y.mjs`, which is static analysis and says
so. `npm run audit:rendered` runs axe-core in a real browser over one page of
every template at 1280px and 320px, and checks for horizontal overflow. It
serves `dist/` itself, so it needs no running server.

It caught two defects the static checker passed on this rebuild:

1. **Content outside a landmark, every page, both viewports.** The sticky
   utility bar and the breadcrumb trail sat outside any landmark. The bar is now
   a labelled region; breadcrumbs are a `nav[aria-label="Breadcrumb"]`, which is
   what they should always have been.
2. **Horizontal overflow at 320px on four pages.** Markdown tables carry a 30rem
   minimum width and were not wrapped in the scroll container the hand-built
   tables use. A rehype plugin in `astro.config.mjs` now wraps every markdown
   table at build time. It wraps rather than setting `display:block` on the
   table, because `display:block` strips the table role from the accessibility
   tree and the Part 4.3 snippet-shape contract needs a real table. The wrapper
   is focusable with a group label so a keyboard user can scroll it, and carries
   the classic local/scroll background pair so an edge shadow appears only while
   there is more table in that direction.

Current state: 32 renders, 0 axe violations, 0 overflow failures.

## Verification at rebuild

All ten checks green (`npm run verify`), and the rendered audit clean.

Lighthouse, mobile preset, on `/`, `/services/rodent-control/`,
`/locations/lewiston/`, `/library/maine-pest-calendar/` and `/contact/`:
**100 performance / 100 accessibility / 100 best practices / 100 SEO**, CLS 0,
TBT 0 ms on every one. Desktop preset on `/` the same, LCP 0.2 s.

Three real defects were found and fixed during the rebuild, all by measurement
rather than by looking:

| Found by | Defect | Fix |
|---|---|---|
| Lighthouse SEO | `/locations/lewiston/` linked to Auburn as "here" — cost the page 8 points | Now reads "pest control in Auburn" |
| axe-core, rendered | Utility bar and breadcrumbs outside any landmark, every page | Labelled region; `nav[aria-label="Breadcrumb"]` |
| Overflow check at 320px | Markdown tables overflowed the viewport on four pages | Rehype plugin wraps every table in the scroll container |
