/**
 * api/inquiry.js — the endpoint behind the contact form on /contact/.
 *
 * Adapted from the Graduate Pest Control endpoint (same design, different
 * client). The site is a static Astro build with no adapter; Vercel deploys any
 * file in the project's top-level /api directory (the Root Directory is site/)
 * as a function, independently of the framework build. Web Handler signature:
 * a standard Request in, a standard Response out. Plain ESM, no dependencies.
 *
 * TRAILING SLASHES: vercel.json's trailing-slash catch-all deliberately skips
 * /api/, so a POST to /api/inquiry reaches this function directly.
 *
 * NO SILENT FAILURES: a visitor is never told their message was sent unless
 * Resend accepted it. Missing configuration, a provider error, anything at all
 * returns an error that says nothing was delivered and gives the phone number.
 *
 * PRIVACY: nothing here logs a name, phone, email or message — not on success,
 * not on failure. Only which failure occurred and, where relevant, a status code.
 *
 * CONFIGURATION (Vercel → Project → Settings → Environment Variables, Production;
 * env changes only take effect on a NEW deployment):
 *   RESEND_API_KEY  — required
 *   INQUIRY_TO      — required, where inquiries go (e.g. ryan@blouinpest.com)
 *   INQUIRY_FROM    — optional, defaults to inquiries@blouinpest.com; the domain
 *                     must be verified in Resend
 */

const PHONE = '(207) 740-4441';
const PHONE_E164 = '+12077404441';
const EMAIL = 'ryan@blouinpest.com';
const HOURS = '9:00 AM to 5:00 PM, seven days a week';
const THANK_YOU = '/contact/thank-you/';
const CONTACT = '/contact/';

/** Minimum time between the page rendering and the form arriving, in ms. */
const MIN_FILL_MS = 3000;

/** Ryan's list (4 Nov 2026), plus the services the site already offers. Anything
    not on this list is ignored rather than echoed into the email. */
const SERVICES = [
  'Ticks and mosquitoes', 'Ants', 'Spiders', 'Beetles', 'Rodents', 'Exclusion (sealing entry points)',
  'Inspection', 'Bed bugs', 'Cockroaches', 'Wasps and hornets', 'Fleas', 'Something else',
];

const FIELDS = [
  { name: 'name', label: 'Full name', required: true, max: 200 },
  { name: 'email', label: 'Email', required: true, max: 254 },
  { name: 'phone', label: 'Phone', required: true, max: 60 },
  { name: 'town', label: 'Town', required: false, max: 120 },
  { name: 'message', label: 'Anything else we should know', required: false, max: 4000 },
];

const NOT_DELIVERED = `Your message was not delivered. Nothing reached us, so please call or text ${PHONE} or email ${EMAIL} instead.`;

const wantsJson = (request) => (request.headers.get('accept') || '').includes('application/json');
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The no-JavaScript failure page: self-contained, says exactly what happened. */
function errorPage(status, heading, detail, problems) {
  const items = (problems || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const body = `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Your message was not sent | Blouin Pest Services</title>
<style>
  body { margin: 0; background: #0b0e13; color: #eef2f7; line-height: 1.7;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 62ch; margin: 0 auto; padding: 2.4rem 20px 3rem; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(1.8rem, 5vw, 2.4rem); line-height: 1.15; margin: 0 0 1rem; }
  .call { border-left: 3px solid #2f81f7; background: #141922; padding: 1.1rem 1.3rem; margin: 1.6rem 0; }
  .call p { margin: 0 0 .5em; } .call p:last-child { margin: 0; }
  a { color: #7fc0ff; } a:focus-visible { outline: 3px solid #ffb457; outline-offset: 2px; }
</style>
</head>
<body>
  <main>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(detail)}</p>
    ${items ? `<ul>${items}</ul>` : ''}
    <div class="call">
      <p><strong>Nothing was sent, so nothing is waiting on our end.</strong></p>
      <p>Call or text <a href="tel:${PHONE_E164}">${PHONE}</a>, ${HOURS}.</p>
      <p>Or email <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    </div>
    <p><a href="${CONTACT}">Back to the contact page</a></p>
  </main>
</body>
</html>`;
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

const fail = (request, status, detail, problems) =>
  wantsJson(request)
    ? json(status, { ok: false, ...(problems ? { errors: problems } : {}), message: problems ? 'Nothing was sent. Fix the items above and try again.' : `${detail} ${NOT_DELIVERED}` })
    : errorPage(status, 'Your message was not sent', detail, problems);

/** Nothing is served here. A visitor who lands on it belongs on /contact/. */
export function GET() {
  return new Response(null, { status: 303, headers: { location: CONTACT, 'cache-control': 'no-store' } });
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    console.error('[inquiry] unreadable request body');
    return fail(request, 400, 'The form data could not be read, so nothing was delivered.');
  }
  const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };

  // Spam gate 1: honeypot. Deliberately meaningless name so autofill leaves it
  // alone (a field named "website" was filled by Android autofill on another
  // client's site and lost real inquiries). The script also blanks it on submit.
  if (get('secondary_ref')) {
    console.error('[inquiry] rejected: honeypot filled');
    return fail(request, 400, 'This submission was blocked as automated. If that is wrong, a browser filled in a hidden field; calling or texting is the fastest fix.');
  }

  // Spam gate 2: time on form, only when the script stamped it (no JS = not judged).
  const stamp = Number(get('rendered_at'));
  if (Number.isFinite(stamp) && stamp > 0 && Date.now() - stamp < MIN_FILL_MS) {
    console.error('[inquiry] rejected: submitted faster than a person fills a form');
    return fail(request, 400, 'That form was submitted faster than it can be filled in, so it was treated as automated.');
  }

  const values = {}; const problems = [];
  for (const f of FIELDS) {
    const v = get(f.name);
    if (f.required && !v) { problems.push(`${f.label} is needed before this can be sent.`); continue; }
    if (v.length > f.max) { problems.push(`${f.label} is longer than this form accepts.`); continue; }
    values[f.name] = v;
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) problems.push('That email address does not look complete.');
  if (values.phone && (values.phone.match(/\d/g) || []).length < 10) problems.push('That phone number is short by a digit or two. Check it and try again.');
  const services = form.getAll('services').filter((s) => typeof s === 'string' && SERVICES.includes(s));
  if (problems.length) return fail(request, 422, 'Some of the form still needs filling in:', problems);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO;
  const from = process.env.INQUIRY_FROM || 'inquiries@blouinpest.com';
  if (!apiKey || !to) {
    const missing = [!apiKey && 'RESEND_API_KEY', !to && 'INQUIRY_TO'].filter(Boolean).join(', ');
    console.error(`[inquiry] not configured: missing ${missing} — nothing was sent`);
    return fail(request, 503, 'The form on this site cannot deliver messages at the moment, so yours has not reached anybody. This is our fault, not yours.');
  }

  const sourcePath = (get('source_page') || '').replace(/[^\w\-/.]/g, '').slice(0, 120);
  const row = (label, v) => (v ? `${label}: ${v}` : null);
  const lines = [
    'New request from the blouinpest.com contact form.',
    sourcePath ? `Sent from: ${sourcePath}` : null,
    '',
    row('Name', values.name),
    row('Phone', values.phone),
    row('Email', values.email),
    row('Town', values.town),
    '',
    `Interested in: ${services.length ? services.join(', ') : 'not specified'}`,
    values.message ? '' : null,
    values.message ? 'THEIR NOTE' : null,
    values.message || null,
    '',
    'Reply to this email to respond directly.',
  ].filter((l) => l !== null);
  const subject = `Website request${services.length ? `: ${services.slice(0, 3).join(', ')}` : ''}${values.town ? ` in ${values.town}` : ''}`;

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `Blouin Pest Services website <${from}>`, to: [to], reply_to: values.email, subject, text: lines.join('\n') }),
    });
  } catch {
    console.error('[inquiry] delivery failed: provider unreachable');
    return fail(request, 502, 'The mail provider could not be reached, so nothing was delivered.');
  }
  if (!response.ok) {
    console.error(`[inquiry] delivery failed: provider returned ${response.status}`);
    return fail(request, 502, 'The mail provider rejected the message, so nothing was delivered.');
  }

  return wantsJson(request)
    ? json(200, { ok: true, redirect: THANK_YOU })
    : new Response(null, { status: 303, headers: { location: THANK_YOU, 'cache-control': 'no-store' } });
}
