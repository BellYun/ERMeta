import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = path.resolve(HERE, "../public/data/lab");
const ADJUSTED_DIR = path.join(LAB_DIR, "entry-adjusted");
const OUTPUT_PATH = path.join(LAB_DIR, "metric-comparison.json");
const ROLE_FILES = [
  ["탱커", "tanks.json"],
  ["전사", "warriors.json"],
  ["암살자", "assassins.json"],
  ["스킬딜러", "skilldealers.json"],
  ["원거리 딜러", "rangers.json"],
  ["지원가", "supports.json"],
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function characterKey(character) {
  return `${character.characterCode}_${character.weapon ?? "null"}`;
}

function consensusIndex(filePath) {
  const data = readJson(filePath);
  const index = new Map();
  for (const group of data.groups) {
    for (const type of group.types) {
      const peers = type.characters.map(characterKey).sort();
      for (const character of type.characters) {
        index.set(characterKey(character), {
          label: type.label,
          confidence: type.confidence,
          cohesion: type.cohesion,
          peers,
          contexts: type.contexts,
        });
      }
    }
  }
  return index;
}

function metricSnapshot(data, character, consensus) {
  return {
    compositionGroup: data.groups.find((group) => group.id === character.groupId)?.label ?? null,
    partnerRoles: character.classification.partnerRoles,
    fitRole: character.classification.fitRole,
    metricRole: character.classification.metricRole,
    ownMeanRp: character.ownMeanRP,
    partnerDelta: character.classification.partnerDelta,
    partnerGames: character.classification.partnerGames,
    partnerGameShare: character.classification.partnerGameShare,
    consensusType: consensus?.label ?? character.classification.fitRole,
    consensusConfidence: consensus?.confidence ?? "low",
    consensusCohesion: consensus?.cohesion ?? null,
    consensusPeers: consensus?.peers ?? [characterKey(character)],
    topContexts: consensus?.contexts ?? [],
  };
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function classifyChange(observed, adjusted) {
  if (!sameList(observed.partnerRoles, adjusted.partnerRoles)) {
    return {
      status: "partner-shift",
      reason:
        `대표 상승 조합이 ${observed.partnerRoles.join("+")}에서 ` +
        `${adjusted.partnerRoles.join("+")}로 변경되었습니다.`,
    };
  }
  if (!sameList(observed.consensusPeers, adjusted.consensusPeers)) {
    return {
      status: "internal-role-shift",
      reason: "같은 역할명 안에서 실제 조합 방향이 일치하는 동료군이 달라졌습니다.",
    };
  }
  if (observed.metricRole !== adjusted.metricRole) {
    return {
      status: "metric-subgroup-shift",
      reason: "대표 파트너는 같지만 판수와 상승폭을 함께 본 내부 지표군이 달라졌습니다.",
    };
  }
  return {
    status: "stable",
    reason: "입장료 보정 후에도 대표 파트너와 내부 역할군이 유지되었습니다.",
  };
}

function main() {
  const observedConsensus = consensusIndex(path.join(LAB_DIR, "character-composition-types.json"));
  const adjustedConsensus = consensusIndex(
    path.join(ADJUSTED_DIR, "character-composition-types.json")
  );
  const characters = [];

  for (const [role, fileName] of ROLE_FILES) {
    const observedData = readJson(path.join(LAB_DIR, fileName));
    const adjustedData = readJson(path.join(ADJUSTED_DIR, fileName));
    const adjustedCharacters = new Map(
      adjustedData.characters.map((character) => [characterKey(character), character])
    );

    for (const observedCharacter of observedData.characters) {
      const key = characterKey(observedCharacter);
      const adjustedCharacter = adjustedCharacters.get(key);
      if (!adjustedCharacter) {
        throw new Error(`입장료 보정 결과에서 ${key}를 찾지 못했습니다.`);
      }
      const observed = metricSnapshot(observedData, observedCharacter, observedConsensus.get(key));
      const adjusted = metricSnapshot(adjustedData, adjustedCharacter, adjustedConsensus.get(key));
      const change = classifyChange(observed, adjusted);
      characters.push({
        key,
        role,
        characterCode: observedCharacter.characterCode,
        characterName: observedCharacter.characterName,
        weapon: observedCharacter.weapon,
        weaponName: observedCharacter.weaponName,
        status: change.status,
        reason: change.reason,
        observed,
        entryAdjusted: adjusted,
      });
    }
  }

  const statusCounts = characters.reduce((counts, character) => {
    counts[character.status] = (counts[character.status] ?? 0) + 1;
    return counts;
  }, {});
  const output = {
    generatedAt: new Date().toISOString(),
    seasons: [10, 11],
    metrics: {
      observed: "기존 관측 RP 기반 분류",
      entryAdjusted: "다이아 +48, 메테오 +54.5, 미스릴 +60 RP 복원 후 별도 분류",
    },
    summary: {
      characters: characters.length,
      statusCounts,
    },
    characters,
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `✓ metric-comparison characters=${characters.length} ${JSON.stringify(statusCounts)}`
  );
}

main();
