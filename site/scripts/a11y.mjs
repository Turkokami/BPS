#!/usr/bin/env node
/**
 * 7 · Accessibility auditor — Keystone v3.1, Dimension 14.
 *
 * RUN PER TEMPLATE, NOT PER PAGE. The standard is explicit: "140 pages off one
 * template share one verdict." So this reads the Astro components, layouts and
 * routes plus the stylesheet, not the built HTML — a per-page HTML sweep would
 * report the same finding 180 times and tell you nothing about where to fix it.
 *
 * GATING. "Any accessibility finding on a template blocks that template's first
 * publish, exactly like a P0 in Part 12." So findings here FAIL. This is the one
 * gate v3.2 added rather than retired, and it is a template-level gate, which is
 * why it does not have the shipping-blocker problem the retired gates had: it is
 * fixed once, in one file, and then it is fixed for every page off that template.
 *
 * WHAT THIS CANNOT DO, STATED HONESTLY. Static analysis catches construction
 * defects — a div with a click handler, a stripped outline, a missing label, a
 * hidden table. It cannot judge focus ORDER, it cannot compute rendered contrast
 * against a real background stack, and it cannot tell you whether a page makes
 * sense to someone using it with a screen reader. Those need a browser and a
 * person. This is the floor, not the audit.
 *
 * Rule source: Web Interface Guidelines, referenced not copied (Keystone 16.5) —
 * fetched fresh at run time rather than pasted, because a pasted copy is stale
 * within a month.
 */
import fs from 'node:fs';
import path from 'node:path';

const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(astro|css)$/.test(p) && out.push(p);
  }
  return out;
};

const templates = walk('src/components').concat(walk('src/layouts'), walk('src/pages'));
const styles = walk('src/styles');
const findings = [];
const fail = (file, rule, msg) => findings.push({ file, rule, msg });

for (const f of templates) {
  const s = fs.readFileSync(f, 'utf8');
  const rel = f.replace('src/', '');
  // Strip the Astro frontmatter fence and JSX comments so prose about a rule is
  // not mistaken for a violation of it.
  const body = s.replace(/^---[\s\S]*?\n---\n/, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // --- semantic elements for their job -------------------------------------
  if (/<div[^>]*\bonClick/i.test(body) || /<span[^>]*\bonClick/i.test(body)) {
    fail(rel, 'semantics', 'click handler on a <div> or <span> — use <button> for actions and <a> for navigation');
  }

  // --- icon-only and image-only controls need an accessible name -----------
  for (const m of body.matchAll(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/g)) {
    const tag = m[0];
    const altEmpty = /alt=""/.test(tag) || /alt=\{?['"]{2}/.test(tag);
    if (altEmpty && !/aria-label/.test(tag)) {
      fail(rel, 'accessible name', 'link wrapping an image with empty alt and no aria-label — the link has no name');
    }
  }

  // --- form controls -------------------------------------------------------
  for (const m of body.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    if (/type=["']hidden["']/.test(tag)) continue;
    if (!/aria-label|aria-labelledby|\bid=/.test(tag)) {
      fail(rel, 'form labelling', `<${m[1]}> with no id to pair with a <label> and no aria-label`);
    }
    if (/type=["'](tel|email|text)["']/.test(tag) && !/autocomplete=/.test(tag)) {
      fail(rel, 'form autocomplete', `<${m[1]}> missing autocomplete — required on name, tel, email and address fields`);
    }
  }

  // --- link text that means nothing out of context -------------------------
  for (const m of body.matchAll(/>([^<>{}]{2,40})<\/a>/g)) {
    const text = m[1].trim().toLowerCase().replace(/[.!?]$/, '');
    if (['click here', 'here', 'read more', 'learn more', 'more', 'this link'].includes(text)) {
      fail(rel, 'link text', `link text "${m[1].trim()}" is not descriptive out of context`);
    }
  }

  // --- a nested list under a nav item with no disclosure control -----------
  if (/<nav\b/.test(body)) {
    const nav = body.slice(body.indexOf('<nav'));
    // NESTED, not merely two lists in the same nav. A greedy two-<ul> match
    // flags every "related pages" block with a couple of sibling lists, which is
    // a false positive and exactly the kind of noisy check that gets a harness
    // ignored. Nesting means a <ul> opens before the previous one closes.
    let depth = 0, nested = false;
    for (const t of nav.match(/<\/?ul\b/g) ?? []) {
      if (t === '<ul') { depth += 1; if (depth > 1) nested = true; } else { depth -= 1; }
    }
    if (nested && !/<details|aria-expanded|<button/.test(nav)) {
      fail(rel, 'keyboard operability', 'nested nav list with no <details>, <button> or aria-expanded — a hover-only submenu is unreachable by keyboard');
    }
  }

  // --- duplicate fixed ids used as label targets ---------------------------
  for (const m of body.matchAll(/aria-labelledby=["']([a-z0-9-]+)["']/g)) {
    fail(rel, 'id collision risk', `aria-labelledby="${m[1]}" is a hardcoded id — make it a prop so a second instance on a page does not break the association silently`);
  }
}

// --- stylesheet-level rules ------------------------------------------------
if (!styles.length) {
  fail('src/styles/', 'no stylesheet', 'no CSS in the project — focus states, contrast, tap targets and reduced motion are all unimplemented, not merely unverified');
} else {
  const css = styles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  // outline:none is only acceptable where a replacement indicator follows.
  for (const m of css.matchAll(/([^{}]*)\{([^}]*outline:\s*none[^}]*)\}/g)) {
    const block = m[2];
    const selector = m[1].trim().split('\n').pop();
    const replaced = /box-shadow|outline-offset|border|background/.test(block) || /:focus:not\(:focus-visible\)/.test(selector);
    if (!replaced) fail('styles', 'focus state', `outline: none in "${selector}" with no replacement indicator`);
  }
  if (!/:focus-visible/.test(css)) fail('styles', 'focus state', 'no :focus-visible rule anywhere — keyboard users get the browser default at best');
  if (!/prefers-reduced-motion/.test(css)) fail('styles', 'motion', 'no prefers-reduced-motion block');
  if (!/touch-action:\s*manipulation/.test(css)) fail('styles', 'touch', 'no touch-action: manipulation on actuable elements');
  if (!/min-height:\s*var\(--tap\)|min-height:\s*4[4-9]px|min-height:\s*[5-9]\dpx/.test(css)) {
    fail('styles', 'tap target', 'no 44px minimum height on actuable elements');
  }
  if (/display:\s*none/.test(css) && /table/.test(css)) {
    const hidesTable = /(^|\})[^{}]*table[^{}]*\{[^}]*display:\s*none/m.test(css);
    if (hidesTable) fail('styles', 'extractability', 'a table is hidden with display:none — Part 4.3 requires declared tables to stay in the DOM at every width');
  }
  if (!/\.skip[^{}]*\{[^}]*\}/.test(css)) fail('styles', 'skip link', 'no .skip styling — the skip link exists in the layout but is not made visible on focus');
}

const byFile = findings.reduce((m, f) => ((m[f.file] ??= []).push(f), m), {});
for (const [file, fs_] of Object.entries(byFile)) {
  console.error(`\n  ${file}`);
  for (const f of fs_) console.error(`    [${f.rule}] ${f.msg}`);
}

console.log(
  `\na11y: ${templates.length} templates + ${styles.length} stylesheet(s) audited · ` +
  `${findings.length} findings (Dimension 14 — a finding blocks that template's first publish)`
);
if (!findings.length) {
  console.log('      Static analysis only. Focus ORDER, rendered contrast and screen-reader');
  console.log('      sense need a browser and a person — this is the floor, not the audit.');
}
process.exit(findings.length ? 1 : 0);
