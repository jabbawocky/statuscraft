/**
 * Audit SERVICES array for duplicate status_urls.
 * Run: node audit-dupes.mjs
 * Outputs: groups of IDs that share the same status_url, with the entry counts.
 */
import { readFileSync } from "fs";

const src = readFileSync("src/index.ts", "utf8");

// Extract id + status_url pairs
const idMatches = [...src.matchAll(/\{\s*\n?\s*id:\s*"([^"]+)"/g)];
const urlMatches = [...src.matchAll(/status_url:\s*"([^"]+)"/g)];

if (idMatches.length !== urlMatches.length) {
  console.warn(`Warning: id count (${idMatches.length}) ≠ url count (${urlMatches.length}) — results may be approximate`);
}

const pairs = idMatches.map((m, i) => ({ id: m[1], url: urlMatches[i]?.[1] ?? "" }));

const byUrl = new Map();
for (const { id, url } of pairs) {
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(id);
}

const dupes = [...byUrl.entries()]
  .filter(([, ids]) => ids.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`Total entries: ${pairs.length}`);
console.log(`Unique URLs:   ${byUrl.size}`);
console.log(`Duplicate URLs: ${dupes.length} (${pairs.length - byUrl.size} redundant entries)\n`);

for (const [url, ids] of dupes.slice(0, 30)) {
  console.log(`${ids.length}x ${url}`);
  ids.forEach((id) => console.log(`  • ${id}`));
}
if (dupes.length > 30) console.log(`\n...and ${dupes.length - 30} more duplicate groups.`);
