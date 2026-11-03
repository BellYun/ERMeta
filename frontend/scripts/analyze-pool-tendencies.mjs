import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import {
  analyzePoolTendencies,
  indexPoolObservations,
  validatePoolTendencyReview,
} from "./lib/pool-tendency-analysis.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--pool", "--output", "--source", "--review"].includes(args[i]) ||
    !args[i + 1] ||
    flags.has(args[i])
  )
    throw new Error(
      "Usage: node scripts/analyze-pool-tendencies.mjs --pool CHAR:WEAPON,CHAR:WEAPON --output FILE [--source FILE] [--review FILE]"
    );
  flags.set(args[i], args[i + 1]);
}
if (!flags.has("--pool") || !flags.has("--output"))
  throw new Error("--pool and --output are required");
const source = flags.get("--source") ?? "data/pool-recommendations/exact-trios.v1.json.gz";
const loaded = new Map();
const read = (path) => {
  const bytes = readFileSync(resolve(root, path));
  loaded.set(path, createHash("sha256").update(bytes).digest("hex"));
  return bytes;
};
const artifact = JSON.parse(gunzipSync(read(source)).toString("utf8"));
if (
  artifact.version !== 1 ||
  JSON.stringify(artifact.columns) !== JSON.stringify(["key", "games", "wins", "rankSum", "rp"])
)
  throw new Error("Unsupported source format");
const rows = artifact.rows.map(([key, games, wins, rankSum, rp]) => ({
  key,
  games,
  wins,
  rankSum,
  rp,
}));
const annotations = new Map();
for (const slug of ["tanks", "warriors", "assassins", "skilldealers", "rangers", "supports"]) {
  const data = JSON.parse(read(`public/data/lab/${slug}.json`));
  for (const c of data.characters) {
    const key = `${c.characterCode}:${c.weapon}`;
    if (annotations.has(key)) throw new Error(`Duplicate exact profile annotation: ${key}`);
    annotations.set(key, {
      member: key,
      name: c.characterName,
      weapon: c.weaponName,
      role: data.role,
      fitRole: c.classification?.fitRole ?? "유형 미등록",
      archetype: c.classification?.archetype,
      traits: c.classification?.traits ?? [],
      historicalFitReason: c.classification?.fitReason ?? null,
      annotationSeasons: data.seasons,
    });
  }
}
const l10n = JSON.parse(read("public/l10n/Korean.json"));
const weaponSource = read("src/lib/weaponMap.ts").toString("utf8");
const weaponBlock = weaponSource
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
if (!weaponBlock) throw new Error("Weapon map format changed");
const weapons = Object.fromEntries(
  [...weaponBlock.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);
const skillKeys = Object.keys(l10n).filter((k) => /^Skill\/LobbyDesc\/10\d{5}$/.test(k));
function memberEvidence(member) {
  const [code, weapon] = member.split(":");
  return {
    ...(annotations.get(member) ?? {
      member,
      name: l10n[`Character/Name/${code}`] ?? member,
      weapon: null,
      role: "유형 미등록",
      fitRole: "유형 미등록",
      traits: [],
    }),
    skillDescriptions: skillKeys
      .filter((k) => Number(k.split("/").at(-1).slice(2, 4)) === Number(code))
      .map((key) => ({ sourceKey: key, text: l10n[key] })),
    weaponGuide: l10n[`CharacterGuide/${code}/${weapons[weapon]}`]
      ? {
          sourceKey: `CharacterGuide/${code}/${weapons[weapon]}`,
          text: l10n[`CharacterGuide/${code}/${weapons[weapon]}`],
        }
      : null,
  };
}
const pool = flags.get("--pool").split(",");
const pairs = indexPoolObservations(rows);
const analysis = analyzePoolTendencies({ pairs, pool, annotations });
const inspectedMembers = new Set([
  ...pool,
  ...analysis.candidates.slice(0, 10).map((c) => c.member),
]);
for (const group of analysis.groups) {
  for (const e of [...group.evidence, ...group.counterevidence])
    e.pair.split("+").forEach((m) => inspectedMembers.add(m));
  for (const c of [...group.candidates, ...group.sameRoleCandidates])
    inspectedMembers.add(c.member);
}
read("scripts/analyze-pool-tendencies.mjs");
read("scripts/lib/pool-tendency-analysis.mjs");
const report = {
  provenance: {
    generatedAt: new Date().toISOString(),
    source,
    sourceRefreshedAt: artifact.sourceRefreshedAt,
    sourceRows: rows.length,
    exactPairs: pairs.size,
    inputSha256: Object.fromEntries(loaded),
  },
  interpretation: [
    "Historical role/fitRole labels annotate trends, never filter exact characters, weapons, seasons, tiers or sample sizes.",
    "Each comparison fixes both allies. Adverse means an observed alternative beats every available pool pick in win rate, mean rank and raw mean RP (at least one strictly). Covered means at least one pool pick beats the alternative by the same rule. Other outcomes are mixed/tied.",
    "Type-group rates average exact-pair rates with soft sample support; they are not win probabilities or independent trials. Large samples are not allowed to turn one pair into many contexts. Overlapping group levels must not be added together.",
    "A candidate repair matches or beats previously superior alternatives on all three metrics. Specificity compares its repair share inside a group against its own share across all comparable pairs; it does not establish a causal skill interaction.",
    "No binary weakness cutoff or fixed gameplay archetype is imposed. Every group, unknown observation and counterexample is retained. Groups are ordered by excess adverse support relative to the whole pool.",
    "Raw RP mixes net RP through 12.3 and in-match earned RP from 12.4. Annotation seasons are not the scope of the pooled observations. Small samples remain uncertain despite weighting.",
    "This report automates observations and evidence collection. Tactical interpretations and patch validity remain to be checked against the attached skill sources. Existing page ranking is unchanged.",
  ],
  ...analysis,
  members: [...inspectedMembers].sort().map(memberEvidence),
};
if (flags.has("--review")) {
  const review = JSON.parse(readFileSync(resolve(root, flags.get("--review")), "utf8"));
  const validity = validatePoolTendencyReview(review, report);
  report.reviewValidity = validity;
  if (validity.current) report.reviewProposal = review;
}
const output = resolve(root, flags.get("--output"));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({
    output,
    rows: rows.length,
    pairs: pairs.size,
    known: analysis.total.known,
    unknown: analysis.total.unknown,
    groups: analysis.groups.length,
    candidates: analysis.candidates.length,
    overallAdverseRate: analysis.total.adverseRate,
    topFitGroups: analysis.groups
      .filter((g) => g.level === "fitRoles")
      .slice(0, 5)
      .map((g) => ({
        label: g.label,
        pairs: g.known,
        adverseRate: g.adverseRate,
        excess: g.excessAdverseRate,
      })),
  }) + "\n"
);
