import { defineConfig } from 'astro/config';
import { visit } from 'unist-util-visit';

/**
 * Markdown tables are authored bare, and a Part 4.3 table has to stay a real
 * <table> for the snippet-shape contract to hold — so it cannot be given
 * display:block to make it scroll, which strips the table role from the
 * accessibility tree. Wrapping each one in a scroll container instead keeps the
 * semantics and stops the 480px minimum width overflowing a 320px phone, which
 * the rendered audit (scripts/axe-audit.mjs) caught on four pages.
 */
function wrapTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === null) return;
      if (parent.type === 'element' && parent.properties?.className?.includes?.('tablewrap')) return;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['tablewrap'], tabindex: 0, role: 'group', 'aria-label': 'Table, scrollable' },
        children: [node],
      };
    });
  };
}

// Keystone 7A deployment checklist: the canonical https origin lives here and
// every absolute @id in the schema graph reads from it. Vercel's Framework
// Preset must be set to Astro explicitly or every route 404s on a "successful"
// build.
export default defineConfig({
  site: 'https://www.blouinpest.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  markdown: { rehypePlugins: [wrapTables] },
  // A self-growing sitemap that maps over the same data arrays the routes do,
  // so a new market cannot be live and missing from the sitemap.
  // (@astrojs/sitemap added in Phase 1 once the route set is final.)
});
