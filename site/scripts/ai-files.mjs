#!/usr/bin/env node
/**
 * ai-files.mjs — AI / LLM compatibility layer, generated from the built site.
 *
 * Runs AFTER the site's own build. It reads the pages the build produced (the
 * same HTML visitors and search engines get), keeps only indexable pages, and
 * writes:
 *
 *   /llms.txt        llmstxt.org index: the business facts from the site's own
 *                    JSON-LD, then every indexable page grouped by section,
 *                    with its title and meta description.
 *   /llms-full.txt   the full text of every indexable page, as Markdown, in one
 *                    file, headed by the same business facts.
 *   /<page>.md       a Markdown copy of every indexable page (home = /index.md).
 *   /robots.txt      (static output only, --robots) the site's own rules, with
 *                    the AI crawlers named explicitly under the same rules.
 *
 * Nothing is written by hand and nothing is invented: every line comes from a
 * page the site already serves or the schema already on those pages. A page
 * marked noindex, or left out of the sitemap, is left out here too.
 *
 * If the site already builds its own /llms.txt, that file is kept as written
 * and only extended with any indexable pages it does not already link.
 *
 * Zero dependencies. A failure here never fails the site's build: it logs and
 * exits 0, because the site matters more than its AI files.
 *
 * Usage:
 *   node scripts/ai-files.mjs --mode static --out dist [--robots]
 *   node scripts/ai-files.mjs --mode next   --out public
 *   options: --site https://example.com  (else read from the home page canonical)
 */
import fs from 'node:fs';
import path from 'node:path';

const VERSION = '1.0';

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const MODE = arg('mode', 'static');
const OUT = path.resolve(arg('out', MODE === 'next' ? 'public' : 'dist'));
const HTML_DIRS = MODE === 'next'
  ? [path.resolve('.next/server/app'), path.resolve('.next/server/pages')]
  : [path.resolve(arg('html', OUT))];
const DO_ROBOTS = Boolean(arg('robots', false));
let SITEMAP_NAME = 'sitemap.xml';
let SITE = typeof arg('site') === 'string' ? String(arg('site')).replace(/\/+$/, '') : '';

/** The AI crawlers and agents named in robots.txt. Each gets the same rules as `*`. */
export const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'GoogleOther', 'Googlebot',
  'Applebot', 'Applebot-Extended',
  'Bingbot', 'DuckAssistBot', 'Amazonbot',
  'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'MistralAI-User', 'cohere-ai', 'YouBot', 'CCBot', 'Bytespider',
];

const log = (...a) => console.log('[ai-files]', ...a);

// ---------------------------------------------------------------- HTML parsing
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const RAW = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'xmp', 'template']);
const AUTO_CLOSE = { p: ['p'], li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'], option: ['option'] };
const BLOCK_CLOSES_P = new Set('address article aside blockquote details div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul'.split(' '));

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™', middot: '·',
  bull: '•', times: '×', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', eacute: 'é', ntilde: 'ñ',
  aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Ntilde: 'Ñ',
  laquo: '«', raquo: '»', rarr: '→', larr: '←', check: '✓', minus: '−', plusmn: '±', sect: '§', para: '¶',
  cent: '¢', pound: '£', euro: '€', iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª', thinsp: ' ', ensp: ' ', emsp: ' ', zwj: '', zwnj: '', shy: '',
};
export function decode(s) {
  if (!s || s.indexOf('&') === -1) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m;
  });
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s))) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

/** Lenient HTML -> tree. Good enough for framework-built pages. */
export function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  const text = (t) => { if (t) cur.children.push({ tag: '#text', text: decode(t), parent: cur }); };
  while ((m = re.exec(html))) {
    if (m.index > last) text(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) { // end tag
      const name = m[1].toLowerCase();
      let n = cur;
      while (n && n.tag !== name && n !== root) n = n.parent;
      if (n && n !== root) cur = n.parent;
      continue;
    }
    if (!m[2]) continue; // comment / doctype
    const name = m[2].toLowerCase();
    if (AUTO_CLOSE[name] && AUTO_CLOSE[name].includes(cur.tag)) cur = cur.parent;
    else if (BLOCK_CLOSES_P.has(name) && cur.tag === 'p') cur = cur.parent;
    const node = { tag: name, attrs: parseAttrs(m[3] || ''), children: [], parent: cur };
    cur.children.push(node);
    if (RAW.has(name)) {
      const end = html.toLowerCase().indexOf(`</${name}`, last);
      const stop = end === -1 ? html.length : end;
      node.raw = html.slice(last, stop);
      const close = html.indexOf('>', stop);
      last = re.lastIndex = close === -1 ? html.length : close + 1;
      continue;
    }
    if (!VOID.has(name) && !m[4]) cur = node;
  }
  if (last < html.length) text(html.slice(last));
  return root;
}

function* walk(n) { yield n; for (const c of n.children || []) yield* walk(c); }
const find = (n, pred) => { for (const x of walk(n)) if (pred(x)) return x; return null; };
const findAll = (n, pred) => { const r = []; for (const x of walk(n)) if (pred(x)) r.push(x); return r; };
const textOf = (n) => n.tag === '#text' ? n.text : (n.raw && n.tag === 'title') ? decode(n.raw) : (n.children || []).map(textOf).join('');
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- HTML -> Markdown
const SKIP = new Set('script style noscript template svg canvas iframe object embed video audio img picture source button input select textarea form nav dialog link meta map area'.split(' '));
const BLOCK = new Set('address article aside blockquote details div dl dt dd fieldset figcaption figure footer h1 h2 h3 h4 h5 h6 header hr li main ol p pre section summary table ul tr thead tbody tfoot caption center'.split(' '));

function isHidden(n) {
  const a = n.attrs || {};
  if ('hidden' in a) return true;
  if (a['aria-hidden'] === 'true') return true;
  if (/(^|;)\s*display\s*:\s*none/i.test(a.style || '')) return true;
  const cls = ` ${a.class || ''} `;
  if (/\s(sr-only|visually-hidden|skip-link|skip-to-content)\s/.test(cls)) return true;
  return false;
}

function makeMd(base) {
  const abs = (href) => {
    if (!href) return '';
    if (/^(mailto:|tel:|sms:)/i.test(href)) return href.replace(/\s/g, '');
    if (/^(#|javascript:|data:)/i.test(href)) return '';
    try { return new URL(href, base + '/').href; } catch { return ''; }
  };
  const esc = (s) => s.replace(/([\\`*_\[\]])/g, '\\$1');

  function inline(n) {
    if (n.tag === '#text') return esc(n.text.replace(/\s+/g, ' '));
    if (SKIP.has(n.tag) || isHidden(n)) return '';
    const inner = () => n.children.map(inline).join('');
    switch (n.tag) {
      case 'br': return '\n';
      case 'strong': case 'b': { const t = inner(); return t.trim() ? `**${t.trim()}** `.replace(/ $/, t.endsWith(' ') ? ' ' : '') : t; }
      case 'em': case 'i': case 'cite': { const t = inner(); return t.trim() ? `*${t.trim()}*` + (t.endsWith(' ') ? ' ' : '') : t; }
      case 'code': case 'kbd': case 'samp': return '`' + textOf(n).replace(/`/g, "'") + '`';
      case 'a': {
        const t = inner().replace(/\s+/g, ' ').trim();
        const href = abs(n.attrs.href);
        if (!t) return '';
        return href ? `[${t}](${href})` : t;
      }
      case 'sup': return '^' + inner();
      default: return BLOCK.has(n.tag) ? ' ' + blocks(n).join(' ') + ' ' : inner();
    }
  }

  function tidyInline(s) {
    return s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{2,}/g, '\n').trim();
  }

  function table(n) {
    const rows = findAll(n, (x) => x.tag === 'tr');
    if (!rows.length) return [];
    const cells = rows.map((r) => r.children.filter((c) => c.tag === 'td' || c.tag === 'th')
      .map((c) => tidyInline(c.children.map(inline).join('')).replace(/\n/g, ' ').replace(/\|/g, '\\|') || ' '));
    const width = Math.max(...cells.map((r) => r.length));
    if (!width) return [];
    const pad = (r) => [...r, ...Array(width - r.length).fill(' ')];
    const out = [`| ${pad(cells[0]).join(' | ')} |`, `| ${Array(width).fill('---').join(' | ')} |`];
    for (const r of cells.slice(1)) out.push(`| ${pad(r).join(' | ')} |`);
    const cap = find(n, (x) => x.tag === 'caption');
    return [(cap ? `*${clean(textOf(cap))}*\n\n` : '') + out.join('\n')];
  }

  function list(n, ordered) {
    let i = Number(n.attrs.start) || 1;
    const items = [];
    for (const li of n.children) {
      if (li.tag !== 'li' || isHidden(li)) continue;
      const body = blocks(li).join('\n\n');
      if (!body.trim()) continue;
      const marker = ordered ? `${i++}. ` : '- ';
      const indent = ' '.repeat(marker.length);
      items.push(marker + body.split('\n').map((l, k) => (k === 0 || !l ? l : indent + l)).join('\n'));
    }
    return items.length ? [items.join('\n')] : [];
  }

  /** Returns an array of Markdown blocks for a node's children. */
  function blocks(n) {
    const out = [];
    let buf = '';
    const flush = () => { const t = tidyInline(buf); if (t) out.push(t); buf = ''; };
    let cards = [];
    const flushCards = () => { if (cards.length) out.push(cards.join('\n')); cards = []; };
    for (const c of n.children || []) {
      if (c.tag === '#text') { if (c.text.trim()) flushCards(); buf += inline(c); continue; }
      if (SKIP.has(c.tag) || isHidden(c)) continue;
      // A link wrapping block content (a card) becomes its own list line.
      if (c.tag === 'a' && find(c, (x) => x !== c && BLOCK.has(x.tag))) {
        flush();
        const t = tidyInline(inline(c)).replace(/\n/g, ' ');
        if (t) cards.push('- ' + t);
        continue;
      }
      flushCards();
      if (!BLOCK.has(c.tag)) { buf += inline(c); continue; }
      flush();
      out.push(...block(c));
    }
    flush();
    flushCards();
    return out;
  }

  function block(c) {
    switch (c.tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const t = tidyInline(c.children.map(inline).join('')).replace(/\n/g, ' ');
        return t ? [`${'#'.repeat(Number(c.tag[1]))} ${t}`] : [];
      }
      case 'ul': return list(c, false);
      case 'ol': return list(c, true);
      case 'table': return table(c);
      case 'hr': return ['---'];
      case 'pre': { const t = textOf(c).replace(/\n+$/, ''); return t.trim() ? ['```\n' + t + '\n```'] : []; }
      case 'blockquote': { const b = blocks(c); return b.length ? [b.join('\n\n').split('\n').map((l) => (l ? '> ' + l : '>')).join('\n')] : []; }
      case 'details': {
        const sum = c.children.find((x) => x.tag === 'summary');
        const q = sum ? tidyInline(sum.children.map(inline).join('')).replace(/\n/g, ' ') : '';
        const rest = blocks({ children: c.children.filter((x) => x !== sum) });
        return [...(q ? [`**${q.replace(/\*\*/g, '')}**`] : []), ...rest];
      }
      case 'dt': { const t = tidyInline(c.children.map(inline).join('')); return t ? [`**${t.replace(/\*\*/g, '')}**`] : []; }
      default: return blocks(c);
    }
  }

  return (node) => blocks(node).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- page reading
function listHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const rec = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!['_next', 'node_modules', '.git'].includes(e.name)) rec(p); }
      else if (e.name.endsWith('.html')) out.push(p);
    }
  };
  rec(dir);
  return out;
}

function routeFromFile(file, dir) {
  let r = '/' + path.relative(dir, file).split(path.sep).join('/');
  r = r.replace(/\.html$/, '');
  if (r.endsWith('/index')) r = r.slice(0, -'index'.length);
  if (r === '/index') r = '/';
  return r;
}

const SKIP_ROUTES = /^\/(404|500|_not-found|_global-error|_error|_app|_document)(\/|$)|\/404\/?$/;

function readPage(file, dir) {
  const route = routeFromFile(file, dir);
  if (SKIP_ROUTES.test(route)) return null;
  const html = fs.readFileSync(file, 'utf8');
  if (!/<html[\s>]/i.test(html) && !/<body[\s>]/i.test(html) && !/<main[\s>]/i.test(html)) return null;
  const doc = parse(html);
  const metas = findAll(doc, (n) => n.tag === 'meta');
  const meta = (key) => {
    const m = metas.find((x) => (x.attrs.name || x.attrs.property || '').toLowerCase() === key);
    return m ? clean(m.attrs.content) : '';
  };
  const robots = (meta('robots') + ' ' + meta('googlebot')).toLowerCase();
  if (/noindex/.test(robots)) return { route, skip: 'noindex' };
  if (metas.some((x) => (x.attrs['http-equiv'] || '').toLowerCase() === 'refresh')) return { route, skip: 'redirect' };
  const canonEl = find(doc, (n) => n.tag === 'link' && /(^|\s)canonical(\s|$)/i.test(n.attrs.rel || ''));
  const titleEl = find(doc, (n) => n.tag === 'title');
  const h1 = find(doc, (n) => n.tag === 'h1' && !isHidden(n));
  const jsonld = [];
  for (const s of findAll(doc, (n) => n.tag === 'script' && /ld\+json/i.test(n.attrs.type || ''))) {
    try { jsonld.push(JSON.parse(s.raw)); } catch { /* ignore a malformed block */ }
  }
  const htmlEl = find(doc, (n) => n.tag === 'html');
  let main = find(doc, (n) => n.tag === 'main') || find(doc, (n) => n.attrs && n.attrs.role === 'main');
  if (!main) {
    const body = find(doc, (n) => n.tag === 'body') || doc;
    main = { ...body, children: body.children.filter((c) => !['header', 'footer', 'nav'].includes(c.tag)) };
  }
  const topTypes = jsonld.flatMap((j) => (Array.isArray(j) ? j : j && j['@graph'] ? j['@graph'] : [j])).flatMap((n) => typesOf(n));
  const kind = topTypes.some((t) => /^(BlogPosting|Article|NewsArticle|TechArticle|ScholarlyArticle|Report)$/.test(t)) ? 'Articles'
    : topTypes.includes('Person') && !topTypes.some((t) => BUSINESS.test(t)) ? '' : '';
  return {
    route,
    kind,
    canonical: canonEl ? canonEl.attrs.href : '',
    title: clean(titleEl ? decode(titleEl.raw || '') : '') || meta('og:title'),
    h1: h1 ? clean(textOf(h1)) : '',
    description: meta('description') || meta('og:description'),
    modified: meta('article:modified_time') || '',
    lang: htmlEl?.attrs?.lang || '',
    jsonld,
    main,
  };
}

// ---------------------------------------------------------------- sitemap
function sitemapUrls() {
  const files = [];
  const look = (dir, depth = 0) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 1 && /sitemap/i.test(e.name)) look(p, depth + 1);
      else if (/sitemap[^/]*\.xml(\.body)?$/i.test(e.name)) files.push(p);
    }
  };
  if (MODE === 'next') { look(path.resolve('.next/server/app')); look(OUT); } else look(OUT);
  const urls = [];
  for (const f of files) {
    const xml = fs.readFileSync(f, 'utf8');
    if (/<sitemapindex/i.test(xml)) continue;
    for (const m of xml.matchAll(/<url>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/gi)) urls.push(decode(m[1]));
  }
  return [...new Set(urls)];
}

// ---------------------------------------------------------------- JSON-LD facts
const asArr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const typesOf = (n) => asArr(n && n['@type']).map(String);
function flatNodes(j, out = []) {
  if (Array.isArray(j)) { j.forEach((x) => flatNodes(x, out)); return out; }
  if (!j || typeof j !== 'object') return out;
  if (j['@type']) out.push(j);
  for (const [k, v] of Object.entries(j)) if (k !== '@context' && typeof v === 'object') flatNodes(v, out);
  return out;
}
const nameOf = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return clean(v.name || v.alternateName || v.headline || v['@id'] || '');
  return String(v);
};
const BUSINESS = /LocalBusiness|Organization|Corporation|ProfessionalService|HomeAndConstructionBusiness|PestControl|Service$|Store|Plumber|Electrician|HVACBusiness|HairSalon|BarberShop|BeautySalon|HealthAndBeautyBusiness|AutoRepair|AutomotiveBusiness|EducationalOrganization|School|CollegeOrUniversity|NGO|LegalService|Contractor|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany|CleaningService|EmergencyService/;

function businessFacts(pages) {
  const all = pages.flatMap((p) => p.jsonld.flatMap((j) => flatNodes(j)));
  const byId = new Map();
  for (const n of all) if (n['@id'] && Object.keys(n).length > 2) byId.set(n['@id'], { ...(byId.get(n['@id']) || {}), ...n });
  const resolve = (v) => (v && typeof v === 'object' && v['@id'] && Object.keys(v).length === 1 && byId.has(v['@id']) ? byId.get(v['@id']) : v);
  const home = pages.find((p) => p.route === '/') || pages[0];
  const homeNodes = home ? home.jsonld.flatMap((j) => flatNodes(j)).map((n) => (n['@id'] && byId.has(n['@id']) ? byId.get(n['@id']) : n)) : [];
  const score = (n) => ['telephone', 'address', 'openingHoursSpecification', 'openingHours', 'areaServed', 'email', 'url', 'logo', 'sameAs'].filter((k) => n[k]).length;
  const cands = [...homeNodes, ...byId.values()].filter((n) => typesOf(n).some((t) => BUSINESS.test(t)) && !typesOf(n).includes('WebSite') && !typesOf(n).includes('Service'));
  cands.sort((a, b) => score(b) - score(a));
  const biz = cands[0];
  const facts = [];
  const add = (label, v) => { v = clean(Array.isArray(v) ? v.filter(Boolean).join('; ') : v); if (v) facts.push(`- ${label}: ${v}`); };
  if (!biz) return { name: '', facts, sections: [] };

  add('Business name', biz.name);
  if (biz.legalName && biz.legalName !== biz.name) add('Legal name', biz.legalName);
  add('Also known as', asArr(biz.alternateName).map(nameOf));
  add('Type', typesOf(biz).filter((t) => t !== 'Thing').join(', '));
  add('Website', biz.url);
  add('Phone', asArr(biz.telephone).join(', '));
  add('Email', asArr(biz.email).map((e) => String(e).replace(/^mailto:/, '')).join(', '));
  const addr = asArr(biz.address).map(resolve).filter((a) => a && typeof a === 'object').map((a) =>
    [a.streetAddress, a.addressLocality, [a.addressRegion, a.postalCode].filter(Boolean).join(' '), a.addressCountry && typeof a.addressCountry === 'string' && a.addressCountry.length > 3 ? a.addressCountry : '']
      .filter(Boolean).join(', '));
  add('Address', addr);
  const geo = resolve(biz.geo);
  if (geo && geo.latitude && geo.longitude) add('Coordinates', `${geo.latitude}, ${geo.longitude}`);
  const ohs = asArr(biz.openingHoursSpecification).map(resolve).filter(Boolean).map((h) => {
    const days = asArr(h.dayOfWeek).map((d) => String(d).replace(/^https?:\/\/schema\.org\//, '')).join(', ');
    const span = h.opens && h.closes ? `${h.opens}–${h.closes}` : '';
    return [days, span].filter(Boolean).join(' ') + (h.validFrom ? ` (from ${h.validFrom})` : '');
  });
  add('Hours', ohs.length ? ohs : asArr(biz.openingHours));
  add('Price range', biz.priceRange);
  add('Payment accepted', asArr(biz.paymentAccepted));
  add('Founded', biz.foundingDate);
  const founders = asArr(biz.founder).map(resolve).map(nameOf).filter(Boolean);
  add('Founder', founders);
  const rating = resolve(biz.aggregateRating);
  if (rating && rating.ratingValue) add('Rating', `${rating.ratingValue}${rating.bestRating ? ` out of ${rating.bestRating}` : ' out of 5'}${rating.reviewCount || rating.ratingCount ? ` from ${rating.reviewCount || rating.ratingCount} reviews` : ''}`);
  add('Languages', asArr(biz.knowsLanguage).map(nameOf));
  add('Slogan', biz.slogan);

  const sections = [];
  const listSection = (title, items) => { items = [...new Set(items.map(clean).filter(Boolean))]; if (items.length) sections.push({ title, lines: items.map((i) => `- ${i}`) }); };

  // Areas served
  const areas = asArr(biz.areaServed).map(resolve).map((a) => {
    const nm = nameOf(a);
    const parent = a && typeof a === 'object' ? nameOf(resolve(a.containedInPlace)) : '';
    return parent && nm && !nm.includes(parent) ? `${nm} (${parent})` : nm;
  });
  listSection('Areas served', areas);

  // Services: from the business offer catalog, makesOffer, and every Service node on the site.
  const services = new Map();
  const addSvc = (s) => {
    s = resolve(s);
    if (!s || typeof s !== 'object') return;
    const item = resolve(s.itemOffered) || s;
    const nm = nameOf(item);
    if (!nm || /^https?:/.test(nm)) return;
    const url = item.url || s.url || '';
    const desc = clean(item.description || s.description || '');
    if (!services.has(nm)) services.set(nm, { url, desc });
  };
  const walkCatalog = (c) => { c = resolve(c); if (!c) return; for (const el of asArr(c.itemListElement)) { const e = resolve(el); if (e && (e.itemListElement)) walkCatalog(e); else addSvc(e?.item ? e.item : e); } };
  walkCatalog(biz.hasOfferCatalog);
  asArr(biz.makesOffer).forEach(addSvc);
  for (const n of byId.values()) if (typesOf(n).some((t) => t === 'Service')) addSvc(n);
  for (const n of all) if (!n['@id'] && typesOf(n).includes('Service')) addSvc(n);
  if (services.size) sections.push({ title: 'Services (from the site\'s structured data)', lines: [...services].map(([nm, { url, desc }]) => `- ${url ? `[${nm}](${url})` : nm}${desc ? `: ${desc.length > 220 ? desc.slice(0, 217).replace(/\s+\S*$/, '') + '…' : desc}` : ''}`) });

  // Credentials, licenses, memberships, awards
  const creds = [];
  for (const c of asArr(biz.hasCredential).map(resolve)) {
    if (!c) continue;
    const nm = nameOf(c);
    const by = nameOf(resolve(c.recognizedBy));
    const id = c.identifier ? (typeof c.identifier === 'object' ? c.identifier.value || '' : c.identifier) : '';
    creds.push([nm, id && !nm.includes(id) ? `#${id}` : '', by ? `(${by})` : ''].filter(Boolean).join(' '));
  }
  creds.push(...asArr(biz.memberOf).map(resolve).map((m) => (nameOf(m) ? `Member: ${nameOf(m)}` : '')));
  creds.push(...asArr(biz.award).map((a) => (a ? `Award: ${nameOf(a)}` : '')));
  creds.push(...asArr(biz.hasCertification).map(resolve).map((c) => nameOf(c)));
  listSection('Credentials, licenses, memberships and awards', creds);

  // People named in the schema (employees, founders, authors, reviewers)
  const people = new Map();
  for (const n of [...byId.values(), ...all]) {
    if (!typesOf(n).includes('Person') || !n.name) continue;
    const prev = people.get(n.name) || {};
    people.set(n.name, { ...prev, ...n });
  }
  if (people.size) {
    sections.push({
      title: 'People',
      lines: [...people.values()].map((p) => {
        const bits = [];
        const role = asArr(p.jobTitle).map(nameOf).join(', ');
        if (role) bits.push(role);
        const cr = asArr(p.hasCredential).map(resolve).map(nameOf).filter(Boolean);
        if (cr.length) bits.push(`credentials: ${cr.join('; ')}`);
        const ka = asArr(p.knowsAbout).map(nameOf).filter(Boolean);
        if (ka.length) bits.push(`knows about: ${ka.slice(0, 12).join(', ')}`);
        const desc = clean(p.description || '');
        const link = p.url && typeof p.url === 'string' ? `[${p.name}](${p.url})` : p.name;
        return `- ${link}${bits.length ? ` — ${bits.join('; ')}` : ''}${desc ? `. ${desc.length > 240 ? desc.slice(0, 237).replace(/\s+\S*$/, '') + '…' : desc}` : ''}`;
      }),
    });
  }

  // Topics the business states it knows about
  listSection('Topics of expertise', asArr(biz.knowsAbout).map(nameOf));
  // Profiles elsewhere
  listSection('Official profiles', asArr(biz.sameAs).filter((u) => typeof u === 'string'));

  return { name: clean(biz.name || ''), description: clean(biz.description || ''), facts, sections };
}

// ---------------------------------------------------------------- grouping
const LEGAL = /^\/(privacy|privacy-policy|terms|terms-of-service|terms-and-conditions|terms-of-use|accessibility|cookie|cookies|cookie-policy|disclaimer|legal|sitemap|site-map|do-not-sell|sms-terms)(\/|$)/i;
const LANG = { es: 'En español (Spanish)', fr: 'En français (French)', de: 'Deutsch (German)', pt: 'Em português (Portuguese)', vi: 'Tiếng Việt (Vietnamese)', zh: '中文 (Chinese)' };
const humanize = (seg) => LANG[seg] || seg.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bFaq\b/, 'FAQ').replace(/\bK9\b/i, 'K9');

function brandStrip(title, brand) {
  let t = title;
  if (brand) for (const sep of [' | ', ' – ', ' — ', ' - ', ' · ']) { const i = t.lastIndexOf(sep); if (i > 0 && t.slice(i + sep.length).toLowerCase().includes(brand.toLowerCase().slice(0, 8))) t = t.slice(0, i); }
  return t.trim();
}

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

// ---------------------------------------------------------------- robots
function patchRobots(file, site) {
  if (!fs.existsSync(file)) return 'none';
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  // Parse groups: consecutive User-agent lines, then rules until the next User-agent after a rule.
  const groups = [];
  let g = null;
  for (const raw of lines) {
    const l = raw.replace(/#.*$/, '').trim();
    if (!l) continue;
    const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!g || g.rules.length) { g = { agents: [], rules: [] }; groups.push(g); } g.agents.push(v); }
    else if (g && ['allow', 'disallow', 'crawl-delay', 'content-signal'].includes(k)) g.rules.push(`${m[1]}: ${v}`);
  }
  const star = groups.find((x) => x.agents.includes('*'));
  if (!star) return 'no * group';
  if (star.rules.some((r) => /^disallow:\s*\/\s*$/i.test(r)) && !star.rules.some((r) => /^allow:\s*\/\s*$/i.test(r))) return 'site blocks all crawlers here (preview), left alone';
  const named = new Set(groups.flatMap((x) => x.agents.map((a) => a.toLowerCase())));
  const missing = AI_BOTS.filter((b) => !named.has(b.toLowerCase()));
  if (!missing.length && /llms\.txt/.test(src)) return 'already complete';
  const rules = star.rules.length ? star.rules : ['Allow: /'];
  const block = [
    '',
    '# AI assistants and AI search: named explicitly and allowed under the same rules as everyone else.',
    `# Site guide for language models: ${site}/llms.txt  (full text: ${site}/llms-full.txt)`,
    ...missing.map((b) => `User-agent: ${b}`),
    ...(missing.length ? rules : []),
    '',
  ];
  // Insert before the first Sitemap line so sitemaps stay at the end.
  const si = lines.findIndex((l) => /^\s*sitemap\s*:/i.test(l));
  const out = si === -1 ? [...lines, ...block] : [...lines.slice(0, si), ...block, ...lines.slice(si)];
  fs.writeFileSync(file, out.join('\n').replace(/\n{3,}/g, '\n\n'));
  return `added ${missing.length} AI crawlers`;
}

// ---------------------------------------------------------------- main
function main() {
  const t0 = Date.now();
  // 1. Read every built page.
  const pages = [];
  const skipped = { noindex: 0, redirect: 0 };
  for (const dir of HTML_DIRS) {
    for (const f of listHtml(dir)) {
      try {
        const p = readPage(f, dir);
        if (!p) continue;
        if (p.skip) { skipped[p.skip]++; continue; }
        pages.push(p);
      } catch (e) { log('could not read', f, e.message); }
    }
  }
  if (!pages.length) { log('no built pages found in', HTML_DIRS.join(', '), '- nothing written'); return; }

  // 2. Site origin.
  const home = pages.find((p) => p.route === '/');
  if (!SITE) {
    const c = (home && home.canonical) || pages.find((p) => /^https?:/.test(p.canonical))?.canonical || '';
    try { SITE = new URL(c).origin; } catch { /* below */ }
  }
  if (!SITE) { log('no canonical origin found; pass --site. Nothing written.'); return; }
  const origin = new URL(SITE).origin;
  const hostKey = (h) => h.replace(/^www\./, '');

  // 3. Resolve each page's public URL (its canonical, when it points at this site).
  const norm = (u) => { try { const x = new URL(u, origin); return hostKey(x.host) + x.pathname.replace(/\/+$/, '') ; } catch { return u; } };
  const byUrl = new Map();
  for (const p of pages) {
    let url = '';
    if (p.canonical) { try { const c = new URL(p.canonical, origin); if (hostKey(c.host) === hostKey(new URL(origin).host)) url = origin + c.pathname; } catch { /* ignore */ } }
    if (!url) url = origin + p.route;
    // A page whose canonical names another page is a duplicate of it: keep only the canonical one.
    if (p.canonical && norm(url) !== norm(origin + p.route) && MODE === 'static') {
      const target = pages.find((q) => norm(origin + q.route) === norm(url));
      if (target && target !== p) continue;
    }
    p.url = url;
    p.path = new URL(url).pathname;
    if (!byUrl.has(norm(url))) byUrl.set(norm(url), p);
  }
  let list = [...byUrl.values()];

  // 4. Respect the sitemap: it is the site's own statement of what should be found.
  const sm = sitemapUrls();
  SITEMAP_NAME = ['sitemap-index.xml', 'sitemap_index.xml', 'sitemap.xml'].find((f) => fs.existsSync(path.join(OUT, f))) || 'sitemap.xml';
  let order = null;
  if (sm.length) {
    const inSm = new Map(sm.map((u, i) => [norm(u), i]));
    const kept = list.filter((p) => inSm.has(norm(p.url)));
    if (kept.length >= Math.min(3, list.length)) {
      const dropped = list.length - kept.length;
      list = kept;
      order = inSm;
      if (dropped) log(`${dropped} built page(s) not in the sitemap left out`);
    }
    const missing = sm.filter((u) => !byUrl.has(norm(u)));
    if (missing.length) log(`${missing.length} sitemap URL(s) have no prerendered HTML (server-rendered); listed without full text`);
    for (const u of missing) {
      try { if (hostKey(new URL(u).host) !== hostKey(new URL(origin).host)) continue; } catch { continue; }
      list.push({ url: u, path: new URL(u).pathname, title: '', h1: '', description: '', jsonld: [], main: null, stub: true });
    }
  }
  const pathKey = (p) => p.path;
  list.sort((a, b) => {
    if (a.path === '/') return -1; if (b.path === '/') return 1;
    if (order) return (order.get(norm(a.url)) ?? 1e9) - (order.get(norm(b.url)) ?? 1e9);
    return pathKey(a).localeCompare(pathKey(b));
  });

  // 5. Business facts from the site's own JSON-LD.
  const biz = businessFacts(list.filter((p) => !p.stub));
  const brand = biz.name || (home ? brandStrip(home.title, '') : new URL(origin).host);
  const siteDesc = (home && home.description) || biz.description || '';

  const label = (p) => {
    if (p.stub) { const seg = p.path.replace(/\/+$/, '').split('/').pop(); return seg ? humanize(seg) : brand; }
    const t = brandStrip(p.title || '', brand);
    if (p.h1 && p.h1.length <= 90) return p.h1;
    return t || p.h1 || p.path;
  };

  // 6. Group into sections by first path segment.
  const sections = new Map();
  const put = (k, p) => { if (!sections.has(k)) sections.set(k, []); sections.get(k).push(p); };
  const segCount = new Map();
  for (const p of list) { const s = p.path.split('/').filter(Boolean)[0]; if (s) segCount.set(s, (segCount.get(s) || 0) + 1); }
  for (const p of list) {
    const segs = p.path.split('/').filter(Boolean);
    if (LEGAL.test(p.path)) put('Optional', p);
    else if (!segs.length) put('Main pages', p);
    else if (segs.length === 1 && (segCount.get(segs[0]) || 0) === 1) put(p.kind || 'Main pages', p);
    else put(humanize(segs[0]), p);
  }
  // Name each section after its own index page's heading when it has one.
  const named = new Map();
  for (const [k, ps] of sections) {
    if (k === 'Main pages' || k === 'Optional' || k === 'Articles') { named.set(k, ps); continue; }
    const idx = ps.find((p) => p.path.split('/').filter(Boolean).length === 1);
    let title = k;
    if (idx && !idx.stub && !LANG[idx.path.split('/').filter(Boolean)[0]]) { const l = label(idx); if (l && l.length <= 60) title = l; }
    if (named.has(title)) title = `${title} (${k})`;
    named.set(title, ps);
  }
  const rank = (k) => (k === 'Main pages' ? 0 : k === 'Optional' ? 3 : k === 'Articles' ? 2 : 1);
  const ordered = [...named.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));

  const mdPath = (p) => (p.path === '/' ? '/index.md' : p.path.replace(/\/+$/, '') + '.md');
  const entry = (p) => `- [${label(p).replace(/[\[\]]/g, '')}](${p.url})${p.description ? `: ${truncate(p.description, 200)}` : ''}`;

  const factsBlock = [
    ...(biz.facts.length ? [...biz.facts, ''] : []),
    ...biz.sections.flatMap((s) => [`### ${s.title}`, '', ...s.lines, '']),
  ];
  const howTo = [
    `This file is the guide to ${origin.replace(/^https?:\/\//, '')} for AI assistants and language models (llmstxt.org format). It is generated from the live site on every deploy; every fact in it is stated on the site itself or in the site's structured data.`,
    '',
    `- Full text of every page, in one file: ${origin}/llms-full.txt`,
    `- Any page as Markdown: add .md to its address, e.g. ${origin}/index.md for the home page${list.find((p) => p.path !== '/' && !p.stub) ? ` or ${origin}${mdPath(list.find((p) => p.path !== '/' && !p.stub))}` : ''}`,
    `- Sitemap: ${origin}/${SITEMAP_NAME}`,
    '',
  ];

  // 7. llms.txt — keep a site-built one, extend it with anything it misses.
  const llmsFile = path.join(OUT, 'llms.txt');
  const generatedBy = `<!-- generated by ai-files.mjs v${VERSION} -->`;
  let llms;
  const existing = fs.existsSync(llmsFile) ? fs.readFileSync(llmsFile, 'utf8') : '';
  if (existing && !existing.includes('generated by ai-files.mjs')) {  // the site's own file (fresh each build)
    const linked = new Set([...existing.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((m) => norm(m[1])));
    const extra = list.filter((p) => !linked.has(norm(p.url)));
    llms = existing.replace(/\s+$/, '') + '\n\n## Full text for AI\n\n' + howTo.slice(2).join('\n') +
      (extra.length ? `\n## More pages\n\n${extra.map(entry).join('\n')}\n` : '') + `\n${generatedBy}\n`;
    log(`kept the site's own llms.txt; appended ${extra.length} page(s) it did not list`);
  } else {
    llms = [
      `# ${brand}`,
      '',
      ...(siteDesc ? [`> ${siteDesc}`, ''] : []),
      ...howTo,
      ...(factsBlock.length ? ['## Business facts', '', ...factsBlock] : []),
      ...ordered.flatMap(([title, ps]) => [`## ${title}`, '', ...ps.map(entry), '']),
      generatedBy,
    ].join('\n');
  }

  // 8. Per-page Markdown + llms-full.txt.
  const md = makeMd(origin);
  let written = 0;
  const full = [
    `# ${brand} — full site text`,
    '',
    ...(siteDesc ? [`> ${siteDesc}`, ''] : []),
    `Every indexable page of ${origin}, converted to Markdown, generated from the live site on every deploy. Index of pages: ${origin}/llms.txt`,
    '',
    ...(factsBlock.length ? ['## Business facts', '', ...factsBlock] : []),
  ];
  for (const [, ps] of ordered) {
    for (const p of ps) {
      if (p.stub || !p.main) continue;
      let body = '';
      try { body = md(p.main); } catch (e) { log('markdown failed for', p.url, e.message); continue; }
      const heading = label(p);
      // Drop a leading H1 identical to the heading we print ourselves.
      {
        const parts = body.split('\n\n');
        const i = parts.slice(0, 4).findIndex((b) => /^# /.test(b) && clean(b.slice(2).replace(/[*_`\\]/g, '')) === clean(heading));
        if (i !== -1) parts.splice(0, i + 1); // drop the duplicate H1 and any eyebrow text above it
        body = parts.join('\n\n');
      }
      const head = [
        `# ${heading}`,
        '',
        `URL: ${p.url}`,
        ...(p.description ? [`Summary: ${p.description}`] : []),
        ...(p.modified ? [`Last updated: ${p.modified}`] : []),
        ...(p.lang && !/^en/i.test(p.lang) ? [`Language: ${p.lang}`] : []),
        '',
      ];
      const page = head.join('\n') + '\n' + body + '\n';
      const target = path.join(OUT, mdPath(p));
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').includes('URL: ')) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, page);
        written++;
      }
      full.push('---', '', page.replace(/^# /, '## ').replace(/\n(#{1,5}) /g, '\n#$1 '), '');
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(llmsFile, llms.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  fs.writeFileSync(path.join(OUT, 'llms-full.txt'), full.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');

  // 9. robots.txt (static output only).
  let rb = 'not touched';
  if (DO_ROBOTS) rb = patchRobots(path.join(OUT, 'robots.txt'), origin);

  const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
  log(`${origin}: ${list.length} pages (${skipped.noindex} noindex, ${skipped.redirect} redirect stubs skipped); ` +
      `llms.txt ${kb('llms.txt')}, llms-full.txt ${kb('llms-full.txt')}, ${written} .md pages; robots: ${rb}; ${Date.now() - t0} ms`);
}

try { main(); } catch (e) { console.warn('[ai-files] skipped after an error (the site build is unaffected):', e && e.stack || e); }
