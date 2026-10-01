#!/usr/bin/env node
/** Research backlog — which markets still owe facts before they can ship.
 *  Run this before planning a content wave, not after. */
import { MARKETS, isBuildable, TIER_SERVICES } from '../src/data/markets.ts';
const rows = MARKETS.map((m) => ({ m, g: isBuildable(m) }));
const blocked = rows.filter((r) => !r.g.ok);
const ready = rows.filter((r) => r.g.ok);
console.log(`READY  ${ready.length}/${MARKETS.length} markets`);
ready.forEach((r) => console.log(`  ✓ ${r.m.name} (T${r.m.tier}, ${TIER_SERVICES[r.m.tier].length} pages)`));
console.log(`\nBLOCKED ON RESEARCH  ${blocked.length}`);
blocked.forEach((r) => console.log(`  · ${r.g.reason}${r.m.legacy ? '  [LEGACY — page is live today, research owed]' : ''}`));
const pages = ready.reduce((a, r) => a + TIER_SERVICES[r.m.tier].length + 1, 0);
console.log(`\nBuildable now: ${pages} geo pages. Remaining: ${MARKETS.length - ready.length} markets of research.`);
