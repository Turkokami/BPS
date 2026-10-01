/**
 * Generates public/og-default.png from the palette in
 * src/styles/base.css.
 *
 * These two files are the only places the brand appears outside the site
 * itself, and they are the two nobody looks at. After the 28 September rebuild
 * both were still green — left over from an iteration before the client
 * attested black and blue — so every social share and every link preview of a
 * black-and-blue site rendered a green card. Reading the tokens out of the
 * stylesheet rather than restating them here is what stops that recurring.
 *
 *   npm run gen:brand
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { BUSINESS, hasReviewProof, hasLicenceNumber } from '../src/data/business.ts';

const css = readFileSync('src/styles/base.css', 'utf8');
const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`token --${name} not found in base.css`);
  return m[1];
};

const PAGE = token('page');
const PANEL = token('panel');
const PAPER = token('paper');
const MUTED = token('muted');
const RULE = token('rule');

/* --- logo ---------------------------------------------------------------
 * The client's logo, supplied 1 Oct 2026: glowing mark on opaque black.
 * brand/logo-master.png is the master; public/brand/bps-logo-*.webp,
 * favicon-48.png and apple-touch-icon.png were cut from it. It is blended with
 * `screen` (as in the site header) so its black becomes the card's page colour.
 * The placeholder house-icon favicon.svg is retired. */
const LOGO = `data:image/png;base64,${readFileSync('brand/logo-master.png').toString('base64')}`;

/* --- open graph card ---------------------------------------------------- */
const BODY = '"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* Only proof the site itself is allowed to state goes on the card. */
const proofBits = [];
if (hasReviewProof()) proofBits.push(`<b>${BUSINESS.reviews.rating.toFixed(1)}</b> from ${BUSINESS.reviews.count} Google reviews`);
if (hasLicenceNumber()) proofBits.push(`${BUSINESS.license.type} #${BUSINESS.license.number}`);
const PROOF = proofBits.length ? `<p class="proof">${proofBits.join(' &nbsp;&middot;&nbsp; ')}</p>` : '';

const card = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${PAGE}; color: ${PAPER}; font-family: ${BODY}; }
  .card { height: 100%; display: flex; flex-direction: column; }
  .body { flex: 1; padding: 48px 80px 0 60px; position: relative; }
  .logo { display: block; width: 540px; height: auto; mix-blend-mode: screen; }
  .sub { font-size: 30px; color: ${MUTED}; margin: 18px 0 0 20px; }
  .pests { margin-left: 20px; }
  .proof { left: 80px; }
  .pests { font-size: 24px; color: ${MUTED}; margin-top: 38px; line-height: 1.55; max-width: 620px; }
  .proof { position: absolute; left: 80px; bottom: 44px; font-size: 21px; color: ${MUTED}; font-weight: 600; }
  .proof b { color: ${PAPER}; }
  .foot { background: ${PANEL}; border-top: 4px solid ${RULE}; padding: 26px 80px;
          display: flex; gap: 34px; align-items: center; font-size: 26px; font-weight: 700; letter-spacing: .01em; }
  .foot .dot { color: ${RULE}; }
</style>
<div class="card">
  <div class="body">
    <img class="logo" src="${LOGO}" alt="Blouin Pest Services">
    <p class="sub">Maine pest control, owner-operated</p>
    <p class="pests">Rodents &middot; Ants &middot; Ticks &middot; Mosquitoes<br>Cockroaches &middot; Bed bugs &middot; Exclusion and sealing</p>
    ${PROOF}
  </div>
  <div class="foot"><span>blouinpest.com</span><span class="dot">&#9670;</span><span>207-740-4441</span></div>
</div>`;

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(card, { waitUntil: 'load' });
await page.screenshot({ path: 'public/og-default.png' });
await browser.close();

console.log(`gen:brand — og-default.png written from base.css (page ${PAGE}, rule ${RULE})`);
