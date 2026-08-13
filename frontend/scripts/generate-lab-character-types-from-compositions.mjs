import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_ADJUSTED = process.argv.includes("--entry-adjusted");
const SAMPLE_CONFIDENCE = process.argv.includes("--sample-confidence");
const COMBINED_CONFIDENCE = process.argv.includes("--entry-sample-confidence");
const LAB_ROOT_DIR = path.resolve(HERE, "../public/data/lab");
const LAB_DIR = COMBINED_CONFIDENCE
  ? path.join(LAB_ROOT_DIR, "entry-sample-confidence")
  : ENTRY_ADJUSTED
    ? path.join(LAB_ROOT_DIR, "entry-adjusted")
    : SAMPLE_CONFIDENCE
      ? path.join(LAB_ROOT_DIR, "sample-confidence")
      : LAB_ROOT_DIR;
const COMPOSITIONS_PATH = path.join(LAB_DIR, "composition-types.json");
const OUTPUT_PATH = path.join(LAB_DIR, "character-composition-types.json");

const ROLE_FILES = [
  ["탱커", "tanks.json"],
  ["전사", "warriors.json"],
  ["암살자", "assassins.json"],
  ["스킬딜러", "skilldealers.json"],
  ["원거리 딜러", "rangers.json"],
  ["지원가", "supports.json"],
];

const MIN_SHARED_COMPOSITIONS = 3;
const CONFLICT_THRESHOLD = 0.45;
const MAX_CONSENSUS_GROUPS = 3;

const CONSENSUS_ROLE_LABELS = {
  observed: {
    "스킬딜러::포킹 장악": ["지속 구역 압박", "고정 구역 포착"],
    "스킬딜러::포킹 점사": ["장거리 포착", "연속 포격"],
    "전사::교전 개시": ["광역 진입", "근거리 포착"],
    "전사::전열 유지": ["정면 압박", "진입 교란", "단독 돌파"],
    "전사::진입 마무리": ["추격 진입", "후열 침투"],
    "전사::추격 지속전": ["연속 추격", "측면 처형"],
    "탱커::선봉 보호": ["전열 고정", "진형 붕괴"],
  },
  adjusted: {
    "스킬딜러::포킹 점사": ["연속 포격", "장거리 포착"],
    "전사::교전 개시": ["광역 진입", "반격 포착"],
    "전사::전열 유지": ["추격 압박", "난전 지속"],
    "전사::진입 마무리": ["추격 처형", "측면 침투"],
    "전사::추격 지속전": ["연속 추격", "측면 교란"],
    "탱커::선봉 보호": ["진형 붕괴", "강제 진입"],
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function characterKey(character) {
  return `${character.characterCode}:${character.weapon}`;
}

function pairKey(left, right) {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function average(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function reliableSimilarity(pairStats, left, right) {
  const stats = pairStats.get(pairKey(left, right));
  if (!stats || stats.shared < MIN_SHARED_COMPOSITIONS) return null;
  return stats.together / stats.shared;
}

function crossClusterStats(pairStats, leftCluster, rightCluster) {
  const similarities = [];
  for (const left of leftCluster) {
    for (const right of rightCluster) {
      const similarity = reliableSimilarity(pairStats, left, right);
      if (similarity !== null) similarities.push(similarity);
    }
  }
  return {
    knownPairs: similarities.length,
    average: average(similarities),
    minimum: similarities.length > 0 ? Math.min(...similarities) : null,
  };
}

function clusterMembers(members, pairStats) {
  const keys = members.map(characterKey);
  const reliablePairs = [];
  const conflictGraph = new Map(keys.map((key) => [key, new Set()]));

  for (let leftIndex = 0; leftIndex < keys.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < keys.length; rightIndex += 1) {
      const similarity = reliableSimilarity(pairStats, keys[leftIndex], keys[rightIndex]);
      if (similarity === null) continue;
      reliablePairs.push(similarity);
      if (similarity < CONFLICT_THRESHOLD) {
        conflictGraph.get(keys[leftIndex]).add(keys[rightIndex]);
        conflictGraph.get(keys[rightIndex]).add(keys[leftIndex]);
      }
    }
  }

  const conflictPairs = reliablePairs.filter(
    (similarity) => similarity < CONFLICT_THRESHOLD
  ).length;
  if (conflictPairs === 0 || members.length < 2) {
    return { clusters: [keys], conflictPairs, reliablePairCount: reliablePairs.length };
  }

  const memberGames = new Map(members.map((member) => [characterKey(member), member.totalGames]));
  const informativeKeys = keys
    .filter((key) => conflictGraph.get(key).size > 0)
    .sort((left, right) => {
      const degreeDelta = conflictGraph.get(right).size - conflictGraph.get(left).size;
      return degreeDelta || (memberGames.get(right) ?? 0) - (memberGames.get(left) ?? 0);
    });
  const colors = new Map();

  for (const key of informativeKeys) {
    let assignedColor = -1;
    for (let color = 0; color < MAX_CONSENSUS_GROUPS; color += 1) {
      const conflictsWithColor = [...conflictGraph.get(key)].some(
        (other) => colors.get(other) === color
      );
      if (!conflictsWithColor) {
        assignedColor = color;
        break;
      }
    }
    if (assignedColor < 0) {
      assignedColor = [...Array(MAX_CONSENSUS_GROUPS).keys()].sort((left, right) => {
        const leftConflicts = [...conflictGraph.get(key)].filter(
          (other) => colors.get(other) === left
        ).length;
        const rightConflicts = [...conflictGraph.get(key)].filter(
          (other) => colors.get(other) === right
        ).length;
        return leftConflicts - rightConflicts;
      })[0];
    }
    colors.set(key, assignedColor);
  }

  const colorCount = Math.max(...colors.values()) + 1;
  const clusters = Array.from({ length: colorCount }, () => []);
  for (const [key, color] of colors) clusters[color].push(key);

  for (const key of keys.filter((candidate) => !colors.has(candidate))) {
    let bestIndex = 0;
    let bestSimilarity = -1;
    for (let index = 0; index < clusters.length; index += 1) {
      const stats = crossClusterStats(pairStats, [key], clusters[index]);
      const score = stats.average ?? -1;
      if (
        score > bestSimilarity ||
        (score === bestSimilarity && clusters[index].length > clusters[bestIndex].length)
      ) {
        bestSimilarity = score;
        bestIndex = index;
      }
    }
    clusters[bestIndex].push(key);
  }

  clusters.sort((left, right) => {
    const leftGames = left.reduce((sum, key) => sum + (memberGames.get(key) ?? 0), 0);
    const rightGames = right.reduce((sum, key) => sum + (memberGames.get(key) ?? 0), 0);
    return rightGames - leftGames;
  });

  return { clusters, conflictPairs, reliablePairCount: reliablePairs.length };
}

function groupCohesion(pairStats, keys) {
  const similarities = [];
  for (let leftIndex = 0; leftIndex < keys.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < keys.length; rightIndex += 1) {
      const similarity = reliableSimilarity(pairStats, keys[leftIndex], keys[rightIndex]);
      if (similarity !== null) similarities.push(similarity);
    }
  }
  const value = average(similarities);
  return value === null ? null : round(value);
}

function groupSeparation(pairStats, keys, allKeys) {
  const own = new Set(keys);
  const similarities = [];
  for (const key of keys) {
    for (const other of allKeys) {
      if (own.has(other)) continue;
      const similarity = reliableSimilarity(pairStats, key, other);
      if (similarity !== null) similarities.push(similarity);
    }
  }
  const value = average(similarities);
  return value === null ? null : round(value);
}

function aggregateContexts(catalogRows, clusterKeys) {
  const own = new Set(clusterKeys);
  const contexts = new Map();

  for (const row of catalogRows) {
    const overlap = row.characters.filter((character) => own.has(characterKey(character)));
    if (overlap.length === 0 || !row.bestPartnerTypes?.length) continue;
    const contextKey = row.bestPartnerTypes
      .map((partner) => `${partner.role} ${partner.fitRole}`)
      .sort((left, right) => left.localeCompare(right, "ko"))
      .join(" + ");
    const games = row.bestPartnerGames ?? 0;
    const residual = row.bestPartnerResidual ?? 0;
    const overlapShare = overlap.length / row.characters.length;
    const score = residual * Math.sqrt(Math.max(games, 1)) * overlapShare;
    const previous = contexts.get(contextKey) ?? {
      label: contextKey,
      score: 0,
      occurrences: 0,
      games: 0,
      weightedResidual: 0,
      residualWeight: 0,
    };
    previous.score += score;
    previous.occurrences += 1;
    previous.games += games;
    previous.weightedResidual += residual * Math.max(games, 1);
    previous.residualWeight += Math.max(games, 1);
    contexts.set(contextKey, previous);
  }

  return [...contexts.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((context) => ({
      label: context.label,
      occurrences: context.occurrences,
      games: context.games,
      avgResidual: round(context.weightedResidual / context.residualWeight),
    }));
}

function buildGlobalSecondOrderOutput(compositionData) {
  const catalog = compositionData.globalSecondOrderTypeCatalog ?? [];
  const isCompositionAffinity =
    compositionData.combinationGroupingBasis ===
    "fixed-first-order-composition-contexts";
  const grouped = new Map();
  for (const type of catalog) {
    const key = `${type.role}::${type.baseFitRole}`;
    const group = grouped.get(key) ?? {
      role: type.role,
      baseFitRole: type.baseFitRole,
      relevantCompositions: compositionData.roleCompositions.filter((composition) =>
        composition.roleComposition.split(" + ").includes(type.role)
      ).length,
      types: [],
    };
    const positiveContextCount = (
      type.affinityGroups ?? type.trendContexts ?? []
    ).filter((context) =>
      context.positiveCharacterCount === undefined
        ? context.direction === "positive"
        : context.positiveCharacterCount > 0
    ).length;
    const evidenceCount = isCompositionAffinity
      ? positiveContextCount
      : (type.trendRefinedSharedPairs ?? 0);
    group.types.push({
      id: `${type.role}-${type.fitRole}`,
      label: type.fitRole,
      // 화면 유사도는 기존 역할군 기준축을 섞지 않은 최종 2차 역할군 문맥만 사용합니다.
      cohesion: type.trendRefinedCohesion ?? null,
      separation: null,
      classificationBasis: type.classificationBasis,
      roleIsolated: type.roleIsolated ?? false,
      roleIsolationReason: type.roleIsolationReason,
      trendSharedPairs: evidenceCount,
      confidence:
        evidenceCount >= 10
          ? "high"
          : evidenceCount >= 3
            ? "medium"
            : "low",
      // 전체 경향은 composition-types의 전역 카탈로그에만 보관하고 화면에서 참조합니다.
      contexts: [],
      characters: type.characters.map((character) => ({
        characterCode: character.characterCode,
        characterName: character.characterName,
        weapon: character.weapon,
        weaponName: character.weaponName,
        totalGames: character.games,
        compositionAppearances: group.relevantCompositions,
        groupAgreement: null,
        trendOwnSimilarity: character.trendRefinedOwnSimilarity ?? null,
        trendOwnSharedPairs: character.trendRefinedOwnSharedPairs ?? 0,
        trendAlternativeSimilarity:
          character.trendRefinedAlternativeSimilarity ?? null,
        trendAlternativeMinimum: character.trendRefinedAlternativeMinimum ?? null,
        trendAlternativeSharedPairs:
          character.trendRefinedAlternativeSharedPairs ?? 0,
        trendAssignmentMargin: character.trendRefinedAssignmentMargin ?? null,
        trendAmbiguous: character.trendRefinedAmbiguous ?? false,
        trendAlternativeCharacters:
          character.trendRefinedAlternativeCharacters ?? [],
      })),
    });
    grouped.set(key, group);
  }

  const groups = [...grouped.values()]
    .map((group) => ({
      ...group,
      reliablePairCount: group.types.reduce(
        (sum, type) => sum + (type.trendSharedPairs ?? 0),
        0
      ),
      conflictPairCount: 0,
      split: isCompositionAffinity
        ? group.types.reduce(
            (sum, type) => sum + (type.trendSharedPairs ?? 0),
            0
          ) > 1
        : group.types.length > 1,
      types: group.types.sort((left, right) => left.label.localeCompare(right.label, "ko")),
    }))
    .sort((left, right) =>
      `${left.role}:${left.baseFitRole}`.localeCompare(
        `${right.role}:${right.baseFitRole}`,
        "ko"
      )
    );
  const splitBaseTypes = groups.filter((group) => group.split).length;
  return {
    generatedAt: new Date().toISOString(),
    seasons: compositionData.seasons,
    sourceMethod: compositionData.method,
    method: "global-second-order-catalog-v1",
    roleCompositionCount: compositionData.roleCompositionCount,
    minSharedCompositions: 0,
    summary: {
      baseTypeCount: groups.length,
      splitBaseTypes,
      consensusTypeCount: isCompositionAffinity
        ? groups.reduce((sum, group) => sum + group.reliablePairCount, 0)
        : catalog.length,
      characterProfiles: catalog.reduce((sum, type) => sum + type.characters.length, 0),
    },
    groups,
  };
}

function main() {
  const compositionData = readJson(COMPOSITIONS_PATH);
  if (
    compositionData.secondOrderScope === "global" &&
    Array.isArray(compositionData.globalSecondOrderTypeCatalog)
  ) {
    const output = buildGlobalSecondOrderOutput(compositionData);
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
    console.log(
      `✓ character-composition-types global types=${output.summary.consensusTypeCount} ` +
        `profiles=${output.summary.characterProfiles}`
    );
    return;
  }
  const baseGroups = new Map();

  for (const [role, fileName] of ROLE_FILES) {
    const roleData = readJson(path.join(LAB_DIR, fileName));
    for (const character of roleData.characters) {
      const baseFitRole = character.classification.fitRole;
      const key = `${role}::${baseFitRole}`;
      const group = baseGroups.get(key) ?? { role, baseFitRole, members: [] };
      group.members.push(character);
      baseGroups.set(key, group);
    }
  }

  const results = [];
  let splitBaseTypes = 0;
  let consensusTypeCount = 0;

  for (const baseGroup of [...baseGroups.values()].sort((left, right) =>
    `${left.role}:${left.baseFitRole}`.localeCompare(`${right.role}:${right.baseFitRole}`, "ko")
  )) {
    const pairStats = new Map();
    const appearances = new Map();
    const catalogRows = [];
    let relevantCompositions = 0;

    for (const composition of compositionData.roleCompositions) {
      const matchingRows = composition.typeCatalog.filter(
        (row) => row.role === baseGroup.role && row.baseFitRole === baseGroup.baseFitRole
      );
      if (matchingRows.length === 0) continue;
      relevantCompositions += 1;
      catalogRows.push(...matchingRows);

      const assignments = new Map();
      for (const row of matchingRows) {
        for (const character of row.characters) {
          const key = characterKey(character);
          assignments.set(key, row.fitRole);
          appearances.set(key, (appearances.get(key) ?? 0) + 1);
        }
      }

      const assignedKeys = [...assignments.keys()];
      for (let leftIndex = 0; leftIndex < assignedKeys.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < assignedKeys.length; rightIndex += 1) {
          const key = pairKey(assignedKeys[leftIndex], assignedKeys[rightIndex]);
          const stats = pairStats.get(key) ?? { shared: 0, together: 0 };
          stats.shared += 1;
          if (
            assignments.get(assignedKeys[leftIndex]) === assignments.get(assignedKeys[rightIndex])
          ) {
            stats.together += 1;
          }
          pairStats.set(key, stats);
        }
      }
    }

    const clustering = clusterMembers(baseGroup.members, pairStats);
    const didSplit = clustering.clusters.length > 1;
    if (didSplit) splitBaseTypes += 1;
    consensusTypeCount += clustering.clusters.length;
    const memberByKey = new Map(baseGroup.members.map((member) => [characterKey(member), member]));
    const allKeys = baseGroup.members.map(characterKey);

    const types = clustering.clusters.map((keys, index) => {
      const mode = ENTRY_ADJUSTED ? "adjusted" : "observed";
      const semanticLabel = CONSENSUS_ROLE_LABELS[mode][
        `${baseGroup.role}::${baseGroup.baseFitRole}`
      ]?.[index];
      const label =
        didSplit && semanticLabel
          ? `${baseGroup.baseFitRole} · ${semanticLabel}`
          : baseGroup.baseFitRole;
      const cohesion = groupCohesion(pairStats, keys);
      const separation = groupSeparation(pairStats, keys, allKeys);
      const contexts = aggregateContexts(catalogRows, keys);
      const members = keys
        .map((key) => memberByKey.get(key))
        .filter(Boolean)
        .sort((left, right) => right.totalGames - left.totalGames)
        .map((member) => {
          const peerSimilarities = keys
            .filter((key) => key !== characterKey(member))
            .map((key) => reliableSimilarity(pairStats, characterKey(member), key))
            .filter((value) => value !== null);
          const agreement = average(peerSimilarities);
          return {
            characterCode: member.characterCode,
            characterName: member.characterName,
            weapon: member.weapon,
            weaponName: member.weaponName,
            totalGames: member.totalGames,
            compositionAppearances: appearances.get(characterKey(member)) ?? 0,
            groupAgreement: agreement === null ? null : round(agreement),
          };
        });

      return {
        id: `${baseGroup.role}-${baseGroup.baseFitRole}-${index + 1}`,
        label,
        cohesion,
        separation,
        confidence:
          clustering.reliablePairCount >= 10 && cohesion !== null
            ? "high"
            : clustering.reliablePairCount >= 3
              ? "medium"
              : "low",
        contexts,
        characters: members,
      };
    });

    results.push({
      role: baseGroup.role,
      baseFitRole: baseGroup.baseFitRole,
      relevantCompositions,
      reliablePairCount: clustering.reliablePairCount,
      conflictPairCount: clustering.conflictPairs,
      split: didSplit,
      types,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    seasons: compositionData.seasons,
    sourceMethod: compositionData.method,
    method:
      "cross-composition-consensus-conflict-graph-v1; conflict<0.45, shared-compositions>=3, max-groups=3",
    roleCompositionCount: compositionData.roleCompositionCount,
    minSharedCompositions: MIN_SHARED_COMPOSITIONS,
    summary: {
      baseTypeCount: results.length,
      splitBaseTypes,
      consensusTypeCount,
      characterProfiles: results.reduce(
        (sum, result) =>
          sum + result.types.reduce((inner, type) => inner + type.characters.length, 0),
        0
      ),
    },
    groups: results,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `✓ character-composition-types base=${output.summary.baseTypeCount} split=${splitBaseTypes} types=${consensusTypeCount} profiles=${output.summary.characterProfiles}`
  );
}

main();
