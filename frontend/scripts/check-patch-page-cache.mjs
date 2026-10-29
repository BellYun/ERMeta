import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Run from frontend after a production build. Assert the effective route TTL,
// including all nested data-cache dependencies, not just the page's export.
const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
const policySource = readFileSync("src/lib/homeMetaShared.ts", "utf8");
const currentPatch = policySource.match(/HOME_META_TARGET_PATCH = "([^"]+)"/)[1];
const rows = [];
for (const [route, config] of Object.entries(manifest.routes)) {
  const match = route.match(/^\/([^/]+)\/(patch-analysis|patch-forecast)\/([^/]+)$/);
  if (!match) continue;
  const [, locale, kind, version] = match;
  const expected = version === currentPatch ? 3600 : false;
  assert.equal(config.initialRevalidateSeconds, expected, `${route}: unexpected effective TTL`);
  const base = join(".next/server/app", route);
  rows.push({
    route,
    revalidate: expected,
    htmlBytes: statSync(`${base}.html`).size,
    rscBytes: statSync(`${base}.rsc`).size,
  });
}
assert(
  rows.some((row) => row.revalidate === 3600),
  "Missing current patch routes"
);
assert(
  rows.some((row) => row.revalidate === false),
  "Missing archived patch routes"
);
console.table(rows);
console.log(`Verified ${rows.length} patch routes; current patch ${currentPatch}.`);
