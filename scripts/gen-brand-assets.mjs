/**
 * Generates public/favicon.svg and public/og-default.png from the palette in
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
import { readFileSync, writeFileSync } from 'node:fs';
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

/* --- favicon ----------------------------------------------------------- */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Blouin Pest Services">
  <rect width="64" height="64" rx="12" fill="${PAGE}"/>
  <path d="M32 12 L44 24 L44 46 L20 46 L20 24 Z" fill="none" stroke="${RULE}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="32" cy="35" r="5" fill="${PAPER}"/>
</svg>
`;
writeFileSync('public/favicon.svg', favicon);

/* --- open graph card ---------------------------------------------------- */
const DISPLAY = 'Newsreader, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
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
  .body { flex: 1; padding: 74px 80px 0; position: relative; }
  .rule { width: 84px; height: 4px; background: ${RULE}; margin-bottom: 34px; }
  h1 { font-family: ${DISPLAY}; font-size: 76px; font-weight: 600; letter-spacing: -.015em; line-height: 1.05; }
  .sub { font-size: 30px; color: ${MUTED}; margin-top: 18px; }
  .pests { font-size: 24px; color: ${MUTED}; margin-top: 38px; line-height: 1.55; max-width: 620px; }
  .proof { position: absolute; left: 80px; bottom: 44px; font-size: 21px; color: ${MUTED}; font-weight: 600; }
  .proof b { color: ${PAPER}; }
  .mark { position: absolute; right: 80px; top: 150px; }
  .foot { background: ${PANEL}; border-top: 4px solid ${RULE}; padding: 26px 80px;
          display: flex; gap: 34px; align-items: center; font-size: 26px; font-weight: 700; letter-spacing: .01em; }
  .foot .dot { color: ${RULE}; }
</style>
<div class="card">
  <div class="body">
    <div class="rule"></div>
    <h1>Blouin Pest Services</h1>
    <p class="sub">Maine pest control, owner-operated</p>
    <p class="pests">Rodents &middot; Ants &middot; Ticks &middot; Mosquitoes<br>Cockroaches &middot; Bed bugs &middot; Exclusion and sealing</p>
    ${PROOF}
    <svg class="mark" width="190" height="190" viewBox="0 0 64 64">
      <path d="M32 12 L44 24 L44 46 L20 46 L20 24 Z" fill="none" stroke="${RULE}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="32" cy="35" r="5" fill="${PAPER}"/>
    </svg>
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

console.log(`gen:brand — favicon.svg and og-default.png written from base.css (page ${PAGE}, rule ${RULE})`);
