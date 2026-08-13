import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(SCRIPT_DIR, "..");
const SOURCE_PATH = resolve(
  FRONTEND_DIR,
  "analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/exact-two-partner-contexts.ndjson"
);
const OUTPUT_PATH = resolve(
  FRONTEND_DIR,
  "public/data/lab/entry-sample-confidence/character-rising-compositions.json"
);

const ROLE_ORDER = new Map(
  ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"].map((role, index) => [
    role,
    index,
  ])
);
const MAX_CONTEXTS_PER_ROLE_COMPOSITION = 5;

function buildRoleComposition(focusRole, partnerTypes) {
  return [focusRole, ...partnerTypes.map((partner) => partner.role)]
    .sort((left, right) => (ROLE_ORDER.get(left) ?? 99) - (ROLE_ORDER.get(right) ?? 99))
    .join(" + ");
}

const source = await readFile(SOURCE_PATH, "utf8");
const profiles = {};
let positiveContextCount = 0;

for (const line of source.split("\n")) {
  if (!line.trim()) continue;

  const profile = JSON.parse(line);
  const contextsByRoleComposition = new Map();

  for (const context of profile.contexts) {
    if (!(context.adjustedResidual > 0)) continue;

    const roleComposition = buildRoleComposition(profile.role, context.partnerTypes);
    const contexts = contextsByRoleComposition.get(roleComposition) ?? [];
    contexts.push({
      roleComposition,
      partnerTypes: context.partnerTypes,
      games: context.games,
      adjustedResidual: context.adjustedResidual,
    });
    contextsByRoleComposition.set(roleComposition, contexts);
  }

  const risingContexts = [...contextsByRoleComposition.values()].flatMap((contexts) =>
    contexts
      .sort(
        (left, right) => right.adjustedResidual - left.adjustedResidual || right.games - left.games
      )
      .slice(0, MAX_CONTEXTS_PER_ROLE_COMPOSITION)
  );

  positiveContextCount += risingContexts.length;
  profiles[profile.profileKey] = risingContexts;
}

const output = {
  generatedFrom: "season10-11-exact-two-partner-affinity-v1/exact-two-partner-contexts.ndjson",
  scoreMode: "entry-fee-and-sample-confidence-adjusted-positive-rp",
  maxContextsPerRoleComposition: MAX_CONTEXTS_PER_ROLE_COMPOSITION,
  profileCount: Object.keys(profiles).length,
  contextCount: positiveContextCount,
  profiles,
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");

process.stdout.write(
  `Generated ${output.profileCount} profiles and ${output.contextCount} rising contexts at ${OUTPUT_PATH}\n`
);
