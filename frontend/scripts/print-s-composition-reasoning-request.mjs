import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

// Run from frontend/: node scripts/print-s-composition-reasoning-request.mjs
//   YYYY-MM-DD MEMBER+MEMBER+MEMBER [--output path]
const [date, key, ...args] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d+:\d+\+\d+:\d+\+\d+:\d+$/.test(key ?? "")) {
  throw new Error(
    "Usage: node scripts/print-s-composition-reasoning-request.mjs YYYY-MM-DD MEMBER+MEMBER+MEMBER [--output path]"
  );
}
if (args.length && (args.length !== 2 || args[0] !== "--output")) {
  throw new Error("Optional argument: --output path");
}
const input = createInterface({
  input: createReadStream(
    `analysis-snapshots/composition-affinity/s-reasoning-${date}-model.ndjson.gz`
  ).pipe(createGunzip()),
  crlfDelay: Infinity,
});
let packet = null;
for await (const line of input) {
  if (!line) continue;
  const item = JSON.parse(line);
  if (item.key === key) packet = item;
}
if (!packet) throw new Error(`S model input not found: ${key}`);
const request = {
  promptVersion: 1,
  key,
  review: packet.review,
  messages: [
    {
      role: "system",
      content: readFileSync("data/composition-explanations/prompt.v1.txt", "utf8"),
    },
    { role: "user", content: JSON.stringify(packet) },
  ],
};
const output = `${JSON.stringify(request, null, 2)}\n`;
if (args.length) {
  writeFileSync(args[1], output);
  process.stdout.write(`${JSON.stringify({ key, path: args[1], review: packet.review })}\n`);
} else {
  process.stdout.write(output);
}
