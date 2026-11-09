import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePoolActions, buildActionCatalogue } from "./lib/pool-action-analysis.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Map();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--pool", "--output", "--scenarios", "--allies"].includes(args[i]) ||
    !args[i + 1] ||
    flags.has(args[i])
  )
    throw new Error(
      "Usage: node scripts/analyze-pool-actions.mjs --pool CHAR:WEAPON,CHAR:WEAPON --output FILE [--scenarios FILE] [--allies CHAR:WEAPON,CHAR:WEAPON]"
    );
  flags.set(args[i], args[i + 1]);
}
if (!flags.has("--pool") || !flags.has("--output"))
  throw new Error("--pool and --output are required");
const inputs = new Map();
function read(path) {
  const data = readFileSync(resolve(root, path));
  inputs.set(path, createHash("sha256").update(data).digest("hex"));
  return data;
}
const l10n = JSON.parse(read("public/l10n/Korean.json"));
const model = JSON.parse(read("data/pool-recommendations/action-model.v1.json"));
const scenarioData = JSON.parse(
  read(flags.get("--scenarios") ?? "data/pool-recommendations/action-scenarios.v1.json")
);
if (scenarioData.version !== 1) throw new Error("Unsupported scenario format");
const weaponChoices = JSON.parse(read("const/characterBestWeapons.json"));
const profileKeys = Object.entries(weaponChoices).flatMap(([character, weapons]) =>
  weapons.map((w) => `${character}:${w.weaponCode}`)
);
const historicalTypes = new Map();
for (const slug of ["tanks", "warriors", "assassins", "skilldealers", "rangers", "supports"]) {
  const data = JSON.parse(read(`public/data/lab/${slug}.json`));
  for (const c of data.characters)
    historicalTypes.set(`${c.characterCode}:${c.weapon}`, {
      role: data.role,
      fitRole: c.classification?.fitRole ?? null,
      traits: c.classification?.traits ?? [],
      annotationSeasons: data.seasons,
      status: "exploratory-annotation",
    });
}
const catalogue = buildActionCatalogue({ profileKeys, l10n, model }).map((profile) => ({
  ...profile,
  historicalType: historicalTypes.get(profile.member) ?? null,
}));
const result = analyzePoolActions({
  pool: flags.get("--pool").split(","),
  catalogue,
  scenarios: scenarioData.scenarios,
  allies: flags.has("--allies") ? flags.get("--allies").split(",") : [],
});
read("scripts/analyze-pool-actions.mjs");
read("scripts/lib/pool-action-analysis.mjs");
const report = {
  provenance: { generatedAt: new Date().toISOString(), inputSha256: Object.fromEntries(inputs) },
  ...result,
  scope: {
    charactersInSkillCatalogue: Object.keys(weaponChoices).length,
    weaponProfiles: catalogue.length,
    scopedSourceAudits: catalogue.filter((c) => c.auditedScopes.length).map((c) => c.member),
    scenarioStatus: scenarioData.status,
    note: scenarioData.note,
  },
  catalogue: catalogue.map((p) => ({
    ...p,
    weapon:
      weaponChoices[p.member.split(":")[0]].find(
        (w) => w.weaponCode === Number(p.member.split(":")[1])
      )?.label ?? null,
  })),
  limitations: [
    "저장된 스킬 문구에 근거한 조건부 대응 비교이며, 실제 교전이나 승리 원인을 관찰한 자료가 아니다.",
    "The four pilot scenarios are conditional questions, not mandatory team archetypes or verified demands in every observed ally pair. A scenario gap alone is not a confirmed general pool weakness.",
    "Only source-audited character and weapon scopes can establish a missing action. Unreviewed or changed source families remain unknown; automatically extracted effects are proposals.",
    "All goals within a scenario must be fulfilled by one existing pick. Resources cannot be spent twice in the same time window; explicit contradictory conditions are not merged.",
    "A feasible route does not assert an optimal skill sequence. Actual geometry, cooldowns, damage/shield magnitude and opponent behavior remain conditions or unmodeled factors.",
    "No performance statistics or previous candidate rankings select the action-based additions. Existing recommendation page behavior is unchanged.",
  ],
};
const output = resolve(root, flags.get("--output"));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({
    output,
    profiles: catalogue.length,
    auditedProfiles: report.scope.scopedSourceAudits.length,
    assessments: result.assessments.map((a) => ({
      id: a.id,
      status: a.status,
      weaknessStatus: a.weaknessStatus,
      allyCoverage: a.allyCoverage,
      picks: a.picks.map((p) => ({
        member: p.member,
        status: p.status,
        actions: p.routes.map((r) => r.action),
      })),
    })),
    candidates: result.candidates.map((c) => ({
      name: c.name,
      members: c.members,
      additions: c.additions.map((a) => a.scenario),
    })),
  }) + "\n"
);
