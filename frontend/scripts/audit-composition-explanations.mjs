import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip, gzipSync } from "node:zlib";

// Run from frontend/: node scripts/audit-composition-explanations.mjs YYYY-MM-DD
// Every observed exact trio receives an explicit reviewed/pending status.
const auditDate = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(auditDate ?? "")) {
  throw new Error("Usage: node scripts/audit-composition-explanations.mjs YYYY-MM-DD");
}
const root = process.cwd();
const seedPath = join(root, "data/composition-explanations/seed.v1.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));
if (!existsSync(join(root, "..", seed.learningNote))) {
  throw new Error(`Missing learning note: ${seed.learningNote}`);
}
const skillTextBytes = readFileSync(join(root, seed.skillTextSource));
const l10n = JSON.parse(skillTextBytes.toString("utf8"));
const resultPath = join(
  root,
  `analysis-snapshots/composition-affinity/explanation-coverage-${auditDate}.json`
);
const manifestPath = resultPath.replace(/\.json$/, ".ndjson.gz");
const sourceCatalogPath = resultPath.replace(
  "explanation-coverage",
  "composition-skill-source-catalog"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function membersOf(key) {
  return key.split("+");
}

function overlapCount(first, second) {
  const secondMembers = new Set(membersOf(second));
  return membersOf(first).filter((member) => secondMembers.has(member)).length;
}

function metrics(row) {
  return {
    games: row.games,
    wins: row.wins,
    winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games,
    averageRP: row.rp / row.games,
  };
}

function compareMetrics(first, second) {
  return {
    winRatePercentagePoints: 100 * (first.winRate - second.winRate),
    averageRank: first.averageRank - second.averageRank,
    averageRP: first.averageRP - second.averageRP,
    firstAheadOnAllThree:
      first.winRate > second.winRate &&
      first.averageRank < second.averageRank &&
      first.averageRP > second.averageRP,
  };
}

const weaponMapSource = readFileSync(join(root, "src/lib/weaponMap.ts"), "utf8");
const weaponEnumBlock = weaponMapSource
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
assert(weaponEnumBlock, "Weapon enum map format changed");
const weaponEnums = Object.fromEntries(
  [...weaponEnumBlock.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);

const factById = new Map();
for (const fact of seed.facts) {
  assert(!factById.has(fact.id), `Duplicate skill fact: ${fact.id}`);
  assert(/^\d+:\d+$/.test(fact.member), `Invalid fact member: ${fact.id}`);
  assert(typeof fact.action === "string" && fact.action.length > 0, `Missing action: ${fact.id}`);
  const source = l10n[fact.sourceKey];
  assert(typeof source === "string", `Missing skill source: ${fact.id} ${fact.sourceKey}`);
  assert(
    source.includes(fact.sourceExcerpt),
    `Skill text changed; review ${fact.id} at ${fact.sourceKey}`
  );
  if (fact.sourceKey.startsWith("Skill/LobbyDesc/")) {
    const character = Number(fact.member.split(":")[0]);
    const skillPrefix = `10${String(character).padStart(2, "0")}`;
    assert(
      fact.sourceKey.split("/").at(-1).startsWith(skillPrefix),
      `Skill belongs to another character: ${fact.id}`
    );
  }
  factById.set(fact.id, fact);
}
const skillFactSourceSha256 = createHash("sha256")
  .update(
    JSON.stringify(
      seed.facts.map((fact) => ({
        id: fact.id,
        sourceKey: fact.sourceKey,
        text: l10n[fact.sourceKey],
      }))
    )
  )
  .digest("hex");
assert(
  skillFactSourceSha256 === seed.skillFactSourceSha256,
  "A cited skill or weapon-guide description changed; review the affected mechanics before updating the source hash"
);

const rowByKey = new Map();
const observedMembers = new Set();
const observedPairs = new Set();
let trioAppearances = 0;
const lines = createInterface({
  input: createReadStream(join(root, seed.sourceSnapshot)).pipe(createGunzip()),
  crlfDelay: Infinity,
});
for await (const line of lines) {
  if (!line) continue;
  const row = JSON.parse(line);
  assert(!rowByKey.has(row.key), `Duplicate snapshot trio: ${row.key}`);
  assert(row.games > 0, `Nonpositive games: ${row.key}`);
  const members = membersOf(row.key);
  assert(members.length === 3 && new Set(members).size === 3, `Invalid trio: ${row.key}`);
  rowByKey.set(row.key, row);
  trioAppearances += row.games;
  members.forEach((member) => observedMembers.add(member));
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      observedPairs.add([members[i], members[j]].sort().join("+"));
    }
  }
}

const explanationByKey = new Map();
const explanationAudits = [];
for (const explanation of seed.explanations) {
  assert(!explanationByKey.has(explanation.key), `Duplicate explanation: ${explanation.key}`);
  const row = rowByKey.get(explanation.key);
  assert(row, `Explanation has no exact-trio source row: ${explanation.key}`);
  assert(
    [
      "skill-checked-hypothesis",
      "assistant-reviewed-combat-plan",
      "user-reviewed-combat-plan",
    ].includes(explanation.reviewStatus),
    `Unsupported review status: ${explanation.key}`
  );
  if (explanation.reviewStatus === "assistant-reviewed-combat-plan") {
    assert(
      explanation.assistantReview?.reviewedAtKst &&
        explanation.assistantReview?.verdict === "mechanically-plausible" &&
        explanation.assistantReview?.summary,
      `Missing assistant review provenance: ${explanation.key}`
    );
  }
  if (explanation.assistantReview?.verdict === "needs-mechanic-evidence") {
    assert(
      explanation.reviewStatus === "skill-checked-hypothesis" &&
        explanation.assistantReview.reviewedAtKst &&
        explanation.assistantReview.summary,
      `Unresolved mechanic cannot be marked reviewed: ${explanation.key}`
    );
  }
  if (explanation.reviewStatus === "user-reviewed-combat-plan") {
    assert(
      explanation.userReview?.reviewedAtKst && explanation.userReview?.summary,
      `Missing user review provenance: ${explanation.key}`
    );
  }
  assert(explanation.oneLine && explanation.enablingLink, `Missing why: ${explanation.key}`);
  assert(
    explanation.conditions?.length && explanation.breaksWhen?.length,
    `Missing boundaries: ${explanation.key}`
  );
  assert(explanation.reviewNote, `Missing review note: ${explanation.key}`);
  assert(explanation.stages?.length >= 3, `Missing combat sequence: ${explanation.key}`);
  const trioMembers = new Set(membersOf(explanation.key));
  const actors = new Set();
  const usedFactIds = new Set();
  for (const stage of explanation.stages) {
    assert(trioMembers.has(stage.actor), `Stage actor is not in trio: ${explanation.key}`);
    assert(stage.text && stage.factIds?.length, `Stage has no source: ${explanation.key}`);
    actors.add(stage.actor);
    for (const factId of stage.factIds) {
      const fact = factById.get(factId);
      assert(fact, `Unknown fact ${factId} in ${explanation.key}`);
      assert(fact.member === stage.actor, `Fact ${factId} belongs to another actor`);
      usedFactIds.add(factId);
    }
  }
  assert(
    actors.size === 3,
    `Not all trio members have a supported combat step: ${explanation.key}`
  );
  assert(
    explanation.comparisonKeys?.length,
    `Missing exact-context comparison: ${explanation.key}`
  );
  if (explanation.reviewStatus !== "skill-checked-hypothesis") {
    assert(
      explanation.comparisonKeys.length >= 2 && explanation.counterexampleKeys?.length >= 2,
      `Reviewed plan needs multiple comparisons and a counterexample: ${explanation.key}`
    );
  }
  const comparisons = explanation.comparisonKeys.map((key) => {
    const comparison = rowByKey.get(key);
    assert(comparison, `Missing comparison row: ${key}`);
    assert(
      overlapCount(key, explanation.key) === 2,
      `Comparison changes more than one member: ${key}`
    );
    const comparisonMetrics = metrics(comparison);
    return {
      key,
      metrics: comparisonMetrics,
      difference: compareMetrics(metrics(row), comparisonMetrics),
    };
  });
  assert(
    explanation.counterexampleKeys.length % 2 === 0,
    `Counterexamples must be pairs: ${explanation.key}`
  );
  const counterexamples = [];
  for (let i = 0; i < explanation.counterexampleKeys.length; i += 2) {
    const firstKey = explanation.counterexampleKeys[i];
    const secondKey = explanation.counterexampleKeys[i + 1];
    const first = rowByKey.get(firstKey);
    const second = rowByKey.get(secondKey);
    assert(first && second, `Missing counterexample source: ${explanation.key}`);
    assert(
      overlapCount(firstKey, secondKey) === 2,
      `Invalid counterexample pair: ${explanation.key}`
    );
    const firstMetrics = metrics(first);
    const secondMetrics = metrics(second);
    counterexamples.push({
      first: { key: firstKey, metrics: firstMetrics },
      second: { key: secondKey, metrics: secondMetrics },
      difference: compareMetrics(firstMetrics, secondMetrics),
    });
  }
  explanationByKey.set(explanation.key, explanation);
  explanationAudits.push({
    key: explanation.key,
    mechanismId: explanation.mechanismId,
    reviewStatus: explanation.reviewStatus,
    oneLine: explanation.oneLine,
    enablingLink: explanation.enablingLink,
    assistantReview: explanation.assistantReview ?? null,
    userReview: explanation.userReview ?? null,
    sourceMetrics: metrics(row),
    skillFactIds: [...usedFactIds],
    comparisons,
    counterexamples,
  });
}

const manifest = [...rowByKey.keys()].map((key) => {
  const explanation = explanationByKey.get(key);
  return JSON.stringify({
    key,
    status: explanation?.reviewStatus ?? "pending-mechanics-review",
    ...(explanation ? { mechanismId: explanation.mechanismId } : {}),
  });
});
writeFileSync(manifestPath, gzipSync(`${manifest.join("\n")}\n`));

const factMembers = new Set(seed.facts.map((fact) => fact.member));
const pendingMembers = [...observedMembers].filter((member) => !factMembers.has(member));
const skillDescriptionsByCharacter = new Map();
for (const [key, text] of Object.entries(l10n)) {
  const skillId = key.match(/^Skill\/LobbyDesc\/(\d+)$/)?.[1];
  if (!skillId) continue;
  const characterCode = Number(skillId.slice(2, 4));
  const skills = skillDescriptionsByCharacter.get(characterCode) ?? [];
  skills.push({
    sourceKey: key,
    name: l10n[`Skill/Group/Name/${skillId}`] ?? null,
    text,
  });
  skillDescriptionsByCharacter.set(characterCode, skills);
}
const sourceCatalog = [...observedMembers]
  .sort((first, second) => {
    const [firstCharacter, firstWeapon] = first.split(":").map(Number);
    const [secondCharacter, secondWeapon] = second.split(":").map(Number);
    return firstCharacter - secondCharacter || firstWeapon - secondWeapon;
  })
  .map((member) => {
    const [characterCode, weaponCode] = member.split(":").map(Number);
    const weaponEnum = weaponEnums[weaponCode];
    const guideKey = weaponEnum ? `CharacterGuide/${characterCode}/${weaponEnum}` : null;
    const weaponDescriptionKey = weaponEnum ? `WeaponType/Desc/${weaponEnum}` : null;
    return {
      member,
      characterName: l10n[`Character/Name/${characterCode}`] ?? null,
      weaponName: weaponEnum ? (l10n[`WeaponType/${weaponEnum}`] ?? null) : null,
      skills: skillDescriptionsByCharacter.get(characterCode) ?? [],
      weaponGuide:
        guideKey && l10n[guideKey] ? { sourceKey: guideKey, text: l10n[guideKey] } : null,
      weaponDescription:
        weaponDescriptionKey && l10n[weaponDescriptionKey]
          ? { sourceKey: weaponDescriptionKey, text: l10n[weaponDescriptionKey] }
          : null,
    };
  });
writeFileSync(
  sourceCatalogPath,
  `${JSON.stringify({ skillTextSource: seed.skillTextSource, members: sourceCatalog }, null, 2)}\n`
);
const report = {
  sourceSnapshot: seed.sourceSnapshot,
  sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
  skillTextSource: seed.skillTextSource,
  skillTextSha256: createHash("sha256").update(skillTextBytes).digest("hex"),
  skillFactSourceSha256,
  totalExactTrios: rowByKey.size,
  trioAppearances,
  observedCharacterWeapons: observedMembers.size,
  observedExactPairs: observedPairs.size,
  sourceCatalogPath: `analysis-snapshots/composition-affinity/composition-skill-source-catalog-${auditDate}.json`,
  learningNote: seed.learningNote,
  membersWithoutSkillDescriptions: sourceCatalog
    .filter((member) => member.skills.length === 0)
    .map((member) => member.member),
  membersWithoutWeaponGuide: sourceCatalog
    .filter((member) => !member.weaponGuide)
    .map((member) => member.member),
  membersWithoutWeaponDescription: sourceCatalog
    .filter((member) => !member.weaponDescription)
    .map((member) => member.member),
  skillFactCount: seed.facts.length,
  skillFactMembers: factMembers.size,
  pendingSkillFactMembers: pendingMembers.length,
  pendingSkillFactMemberKeys: pendingMembers,
  explainedTrios: explanationByKey.size,
  pendingTrios: rowByKey.size - explanationByKey.size,
  reviewStatusCounts: Object.fromEntries(
    [...new Set(seed.explanations.map((explanation) => explanation.reviewStatus))].map((status) => [
      status,
      seed.explanations.filter((explanation) => explanation.reviewStatus === status).length,
    ])
  ),
  explanationAudits,
};
writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    totalExactTrios: report.totalExactTrios,
    explainedTrios: report.explainedTrios,
    pendingTrios: report.pendingTrios,
    skillFactMembers: report.skillFactMembers,
    pendingSkillFactMembers: report.pendingSkillFactMembers,
    membersWithoutSkillDescriptions: report.membersWithoutSkillDescriptions.length,
    membersWithoutWeaponGuide: report.membersWithoutWeaponGuide.length,
    membersWithoutWeaponDescription: report.membersWithoutWeaponDescription.length,
    reportPath: resultPath,
    manifestPath,
    sourceCatalogPath,
  })}\n`
);
