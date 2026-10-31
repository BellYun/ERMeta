import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Verify the effective TTL after a production build, including nested caches.
const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
const routes = Object.entries(manifest.routes).filter(([route]) =>
  /^\/(?:[^/]+\/)?character\/\d+$/.test(route)
);
assert(
  routes.some(([route]) => route.startsWith("/character/")),
  "Missing default character routes"
);
assert(
  routes.some(([route]) => /^\/[^/]+\/character\//.test(route)),
  "Missing localized character routes"
);
for (const [route, config] of routes) {
  assert.equal(config.initialRevalidateSeconds, 21600, `${route}: unexpected effective TTL`);
}
console.log(`Verified ${routes.length} character routes: effective ISR TTL is 6 hours.`);
