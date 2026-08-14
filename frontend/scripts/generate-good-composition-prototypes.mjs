import { createReadStream, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");
const snapshotDir = resolve(
  frontendDir,
  "analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1"
);
const inputPath = resolve(snapshotDir, "exact-two-partner-contexts.ndjson");
const outputPath = resolve(snapshotDir, "good-composition-prototypes.json");

const MIN_SUPPORTING_PROFILES = 3;
const REQUIRED_SEASONS = [10, 11];

function memberKey(member) {
  return `${member.role}:${member.type}`;
}

function sortedMembers(members) {
  return [...members].sort((left, right) =>
    memberKey(left).localeCompare(memberKey(right), "ko")
  );
}

function prototypeKey(members) {
  return sortedMembers(members).map(memberKey).join("|");
}

function roleCompositionKey(members) {
  return members
    .map((member) => member.role)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join(" + ");
}

function isStablePositiveContext(context) {
  if (!(context.adjustedResidual > 0)) return false;
  return REQUIRED_SEASONS.every((season) =>
    context.seasonSignals.some(
      (signal) => signal.season === season && signal.direction === "positive"
    )
  );
}

const aggregateByKey = new Map();
const input = createInterface({
  input: createReadStream(inputPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let sourceProfiles = 0;
let stablePositiveObservations = 0;

for await (const line of input) {
  if (!line.trim()) continue;
  const profile = JSON.parse(line);
  sourceProfiles += 1;

  for (const context of profile.contexts) {
    if (!isStablePositiveContext(context)) continue;
    stablePositiveObservations += 1;

    const members = sortedMembers([
      { role: profile.role, type: profile.firstOrderType },
      ...context.partnerTypes.map((partner) => ({
        role: partner.role,
        type: partner.fitRole,
      })),
    ]);
    const key = prototypeKey(members);
    const aggregate = aggregateByKey.get(key) ?? {
      key,
      roleComposition: roleCompositionKey(members),
      members,
      observations: 0,
      supportingProfiles: new Set(),
      reliableObservations: 0,
      contextGames: 0,
      weightedResidualTotal: 0,
    };

    aggregate.observations += 1;
    aggregate.supportingProfiles.add(profile.profileKey);
    aggregate.contextGames += context.games;
    aggregate.weightedResidualTotal += context.adjustedResidual * context.games;
    if (
      REQUIRED_SEASONS.every((season) =>
        context.seasonSignals.some(
          (signal) =>
            signal.season === season && signal.direction === "positive" && signal.reliable
        )
      )
    ) {
      aggregate.reliableObservations += 1;
    }
    aggregateByKey.set(key, aggregate);
  }
}

const prototypes = [...aggregateByKey.values()]
  .filter((prototype) => prototype.supportingProfiles.size >= MIN_SUPPORTING_PROFILES)
  .map((prototype) => ({
    key: prototype.key,
    roleComposition: prototype.roleComposition,
    members: prototype.members,
    observations: prototype.observations,
    supportingProfiles: prototype.supportingProfiles.size,
    reliableObservations: prototype.reliableObservations,
    reliableRate:
      prototype.observations > 0
        ? Number((prototype.reliableObservations / prototype.observations).toFixed(4))
        : 0,
    contextGames: prototype.contextGames,
    adjustedResidual: Number(
      (prototype.weightedResidualTotal / prototype.contextGames).toFixed(3)
    ),
  }))
  .sort(
    (left, right) =>
      right.supportingProfiles - left.supportingProfiles ||
      right.reliableRate - left.reliableRate ||
      right.contextGames - left.contextGames ||
      left.key.localeCompare(right.key, "ko")
  );

const output = {
  snapshotId: "season10-11-good-composition-prototypes-v1",
  generatedFrom: "season10-11-exact-two-partner-affinity-v1",
  criteria: {
    adjustedResidual: "positive",
    seasonDirections: "season-10-and-11-positive",
    minimumSupportingProfiles: MIN_SUPPORTING_PROFILES,
    note: "contextGames is a summed context observation count and may overlap between focal profiles.",
  },
  summary: {
    sourceProfiles,
    stablePositiveObservations,
    candidatePatterns: aggregateByKey.size,
    retainedPrototypes: prototypes.length,
  },
  prototypes,
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${prototypes.length} good-composition prototypes from ${stablePositiveObservations} stable positive observations to ${outputPath}`
);
