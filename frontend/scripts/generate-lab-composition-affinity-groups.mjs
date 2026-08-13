import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = path.resolve(
  HERE,
  "../public/data/lab/entry-sample-confidence"
);
const INPUT_PATH = path.join(LAB_DIR, "composition-types.json");
const EXACT_CONTEXTS_PATH = path.join(
  LAB_DIR,
  "exact-two-partner-character-contexts.ndjson"
);
const OUTPUT_PATH = path.join(
  LAB_DIR,
  "composition-affinity-character-groups.json"
);

const ROLE_ORDER = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const DIRECTION_WEIGHT = 0.4;
const MAGNITUDE_WEIGHT = 0.35;
const OVERLAP_WEIGHT = 0.25;
const ROLE_THRESHOLD_PERCENTILE = 0.85;
const MERGE_AVERAGE_MARGIN = 0.02;
const RELOCATION_MARGIN = 0.015;
const MAX_REFINEMENT_ITERATIONS = 20;
const AUXILIARY_RATIO = 0.85;
const MAX_AUXILIARY_GROUPS = 2;
const MIN_THRESHOLD = 0.52;
const MAX_THRESHOLD = 0.72;
const SEASON_MIN_GAMES = 100;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function average(values) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function percentile(values, ratio) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  );
  return sorted[index];
}

function roleMultisetKey(roles) {
  return [...roles]
    .sort(
      (left, right) =>
        ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right)
    )
    .join(" + ");
}

function comparePartnerTypes(left, right) {
  return (
    ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role) ||
    left.fitRole.localeCompare(right.fitRole, "ko")
  );
}

function partnerPairLabel(partnerTypes) {
  return [...partnerTypes]
    .sort(comparePartnerTypes)
    .map((partner) => `${partner.role} ${partner.fitRole}`)
    .join(" × ");
}

function pairKey(left, right) {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function minimumSharedContexts(profileCount) {
  if (profileCount > 15) return 12;
  if (profileCount > 4) return 8;
  return 4;
}

function buildProfiles() {
  const profiles = new Map();
  const lines = fs
    .readFileSync(EXACT_CONTEXTS_PATH, "utf8")
    .split("\n")
    .filter(Boolean);
  for (const line of lines) {
    const source = JSON.parse(line);
    const profile = {
      profileKey: source.profileKey,
      characterCode: source.characterCode,
      characterName: source.characterName,
      weapon: source.weapon,
      weaponName: source.weaponName,
      role: source.role,
      firstOrderType: source.firstOrderType,
      vector: new Map(),
    };
    for (const context of source.contexts ?? []) {
      const roleComposition = roleMultisetKey([
        source.role,
        ...context.partnerTypes.map((partner) => partner.role),
      ]);
      const partnerTypes = [...context.partnerTypes].sort(comparePartnerTypes);
      const key = `${roleComposition} / ${source.role} 관점 / ${partnerPairLabel(partnerTypes)}`;
      profile.vector.set(key, {
        key,
        roleComposition,
        partnerTypes,
        games: context.games,
        adjustedResidual: context.adjustedResidual,
        seasonSignals: context.seasonSignals ?? [],
      });
    }
    profiles.set(profile.profileKey, profile);
  }
  return profiles;
}

function inverseDocumentFrequency(profiles) {
  const documentFrequency = new Map();
  for (const profile of profiles) {
    for (const key of profile.vector.keys()) {
      documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
    }
  }
  return new Map(
    [...documentFrequency].map(([key, count]) => [
      key,
      Math.log((profiles.length + 1) / (count + 1)) + 1,
    ])
  );
}

function compareProfiles(left, right, idf, minShared) {
  const leftKeys = new Set(left.vector.keys());
  const rightKeys = new Set(right.vector.keys());
  const sharedKeys = [...leftKeys].filter((key) => rightKeys.has(key));
  if (sharedKeys.length < minShared) return null;

  let directionNumerator = 0;
  let directionDenominator = 0;
  let magnitudeNumerator = 0;
  let magnitudeDenominator = 0;
  for (const key of sharedKeys) {
    const leftValue = left.vector.get(key).adjustedResidual;
    const rightValue = right.vector.get(key).adjustedResidual;
    const weight =
      (idf.get(key) ?? 1) *
      Math.sqrt(
        Math.min(Math.abs(leftValue), 5) *
          Math.min(Math.abs(rightValue), 5) +
          0.25
      );
    directionDenominator += weight;
    if (
      Math.sign(leftValue) === Math.sign(rightValue) ||
      (leftValue === 0 && rightValue === 0)
    ) {
      directionNumerator += weight;
    }

    const magnitudeSimilarity = Math.max(
      0,
      1 -
        Math.abs(Math.abs(leftValue) - Math.abs(rightValue)) /
          Math.max(Math.abs(leftValue), Math.abs(rightValue), 0.25)
    );
    magnitudeNumerator += magnitudeSimilarity * weight;
    magnitudeDenominator += weight;
  }

  const unionKeys = new Set([...leftKeys, ...rightKeys]);
  const sharedWeight = sharedKeys.reduce(
    (sum, key) => sum + (idf.get(key) ?? 1),
    0
  );
  const unionWeight = [...unionKeys].reduce(
    (sum, key) => sum + (idf.get(key) ?? 1),
    0
  );
  const direction =
    directionDenominator > 0
      ? directionNumerator / directionDenominator
      : 0;
  const magnitude =
    magnitudeDenominator > 0
      ? magnitudeNumerator / magnitudeDenominator
      : 0;
  const overlap = unionWeight > 0 ? sharedWeight / unionWeight : 0;
  return {
    score:
      DIRECTION_WEIGHT * direction +
      MAGNITUDE_WEIGHT * magnitude +
      OVERLAP_WEIGHT * overlap,
    sharedContexts: sharedKeys.length,
    direction,
    magnitude,
    overlap,
  };
}

function pairStatsForRole(profiles, minShared) {
  const idf = inverseDocumentFrequency(profiles);
  const pairStats = new Map();
  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < profiles.length;
      rightIndex += 1
    ) {
      const stats = compareProfiles(
        profiles[leftIndex],
        profiles[rightIndex],
        idf,
        minShared
      );
      if (stats) {
        pairStats.set(
          pairKey(profiles[leftIndex].profileKey, profiles[rightIndex].profileKey),
          stats
        );
      }
    }
  }
  return pairStats;
}

function crossClusterStats(leftCluster, rightCluster, pairStats) {
  const pairs = [];
  for (const left of leftCluster) {
    for (const right of rightCluster) {
      const stats = pairStats.get(pairKey(left, right));
      if (!stats) return null;
      pairs.push(stats);
    }
  }
  return {
    average: average(pairs.map((pair) => pair.score)),
    minimum: Math.min(...pairs.map((pair) => pair.score)),
    sharedContexts: Math.min(...pairs.map((pair) => pair.sharedContexts)),
  };
}

function completeLinkClusters(profiles, pairStats, threshold) {
  const clusters = profiles.map((profile) => [profile.profileKey]);
  while (true) {
    let best = null;
    for (let leftIndex = 0; leftIndex < clusters.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < clusters.length;
        rightIndex += 1
      ) {
        const stats = crossClusterStats(
          clusters[leftIndex],
          clusters[rightIndex],
          pairStats
        );
        if (
          !stats ||
          stats.minimum < threshold ||
          stats.average < threshold + MERGE_AVERAGE_MARGIN
        ) {
          continue;
        }
        if (
          !best ||
          stats.average > best.stats.average ||
          (stats.average === best.stats.average &&
            clusters[leftIndex].length + clusters[rightIndex].length >
              clusters[best.leftIndex].length +
                clusters[best.rightIndex].length)
        ) {
          best = { leftIndex, rightIndex, stats };
        }
      }
    }
    if (!best) break;
    clusters[best.leftIndex] = [
      ...clusters[best.leftIndex],
      ...clusters[best.rightIndex],
    ];
    clusters.splice(best.rightIndex, 1);
  }
  return clusters;
}

function memberStats(profileKeyValue, cluster, pairStats, fallback) {
  const peers = cluster.filter((key) => key !== profileKeyValue);
  if (peers.length === 0) {
    return {
      similarity: null,
      minimumSimilarity: null,
      sharedContexts: 0,
      comparisonFloor: fallback,
    };
  }
  const stats = peers
    .map((peer) => pairStats.get(pairKey(profileKeyValue, peer)))
    .filter(Boolean);
  return {
    similarity: average(stats.map((item) => item.score)),
    minimumSimilarity: Math.min(...stats.map((item) => item.score)),
    sharedContexts: Math.min(...stats.map((item) => item.sharedContexts)),
    comparisonFloor: average(stats.map((item) => item.score)) ?? fallback,
  };
}

function clusterStateKey(clusters) {
  return clusters
    .map((cluster) => [...cluster].sort().join(","))
    .sort()
    .join("|");
}

function refineClustersIteratively(initialClusters, pairStats, threshold) {
  let clusters = initialClusters.map((cluster) => [...cluster]);
  const seenStates = new Set([clusterStateKey(clusters)]);
  let isolatedProfiles = 0;
  let relocatedProfiles = 0;
  let iterations = 0;
  let converged = false;
  let cycleDetected = false;
  let stablePasses = 0;

  while (iterations < MAX_REFINEMENT_ITERATIONS) {
    iterations += 1;
    let changed = false;

    // 현재 그룹의 다른 모든 구성원과 다시 비교합니다. 최초 병합 때 경계를
    // 넘었더라도 그룹 전체 경향과 평균적으로 어긋나면 먼저 독립형으로 격리합니다.
    const isolated = [];
    const retainedClusters = [];
    for (const cluster of clusters) {
      if (cluster.length < 2) {
        retainedClusters.push(cluster);
        continue;
      }
      const failures = cluster.filter((profileKeyValue) => {
        const stats = memberStats(
          profileKeyValue,
          cluster,
          pairStats,
          threshold
        );
        return (
          stats.similarity == null ||
          stats.minimumSimilarity == null ||
          stats.similarity < threshold + MERGE_AVERAGE_MARGIN ||
          stats.minimumSimilarity < threshold
        );
      });
      if (failures.length === 0) {
        retainedClusters.push(cluster);
        continue;
      }
      const failureSet = new Set(failures);
      const retained = cluster.filter((key) => !failureSet.has(key));
      if (retained.length > 0) retainedClusters.push(retained);
      for (const key of failures) isolated.push([key]);
      isolatedProfiles += failures.length;
      changed = true;
    }
    clusters = [...retainedClusters, ...isolated];

    // 격리된 프로필뿐 아니라 기존 구성원도 다른 그룹과 전부 재비교합니다.
    // 완전 연결 경계를 유지하면서 현재 그룹보다 확실히 더 가까울 때만 이동합니다.
    const profileKeys = clusters.flat().sort();
    for (const profileKeyValue of profileKeys) {
      const ownIndex = clusters.findIndex((cluster) =>
        cluster.includes(profileKeyValue)
      );
      if (ownIndex < 0) continue;
      const ownCluster = clusters[ownIndex];
      const ownStats = memberStats(
        profileKeyValue,
        ownCluster,
        pairStats,
        threshold
      );
      const ownScore =
        ownCluster.length > 1
          ? (ownStats.similarity ?? threshold)
          : null;
      let best = null;
      for (let candidateIndex = 0; candidateIndex < clusters.length; candidateIndex += 1) {
        if (candidateIndex === ownIndex) continue;
        const candidateCluster = clusters[candidateIndex];
        const stats = crossClusterStats(
          [profileKeyValue],
          candidateCluster,
          pairStats
        );
        if (
          !stats ||
          stats.minimum < threshold ||
          stats.average < threshold + MERGE_AVERAGE_MARGIN ||
          (ownScore != null && stats.average < ownScore + RELOCATION_MARGIN)
        ) {
          continue;
        }
        if (!best || stats.average > best.stats.average) {
          best = { candidateIndex, stats };
        }
      }
      if (!best) continue;

      const sourceIndex = clusters.findIndex((cluster) =>
        cluster.includes(profileKeyValue)
      );
      if (sourceIndex < 0) continue;
      const destinationCluster = clusters[best.candidateIndex];
      clusters[sourceIndex] = clusters[sourceIndex].filter(
        (key) => key !== profileKeyValue
      );
      destinationCluster.push(profileKeyValue);
      clusters = clusters.filter((cluster) => cluster.length > 0);
      relocatedProfiles += 1;
      changed = true;
    }

    const state = clusterStateKey(clusters);
    if (!changed) {
      stablePasses += 1;
      if (stablePasses >= 2) {
        converged = true;
        break;
      }
      continue;
    }
    stablePasses = 0;
    if (state === clusterStateKey(initialClusters)) {
      cycleDetected = true;
      break;
    }
    if (seenStates.has(state)) {
      cycleDetected = true;
      break;
    }
    seenStates.add(state);
  }

  if (!cycleDetected && iterations >= MAX_REFINEMENT_ITERATIONS) {
    converged = false;
  }
  return {
    clusters,
    iterations,
    converged,
    cycleDetected,
    isolatedProfiles,
    relocatedProfiles,
  };
}

function seasonSummary(entries, season) {
  const signals = entries
    .map((entry) =>
      entry?.seasonSignals?.find(
        (signal) =>
          Number(signal.season) === Number(season) &&
          signal.games >= SEASON_MIN_GAMES
      )
    )
    .filter(Boolean);
  const positive = signals.filter(
    (signal) => signal.direction === "positive"
  ).length;
  return {
    season: Number(season),
    games: signals.reduce((sum, signal) => sum + signal.games, 0),
    positiveMembers: positive,
    observedMembers: signals.length,
    positiveRate: signals.length > 0 ? round(positive / signals.length) : null,
  };
}

function signatureContexts(cluster, profileByKey, idf, seasons) {
  const candidateKeys = new Set(
    cluster.flatMap((key) => [...profileByKey.get(key).vector.keys()])
  );
  const signatures = [];
  for (const key of candidateKeys) {
    const entries = cluster.map(
      (profileKeyValue) => profileByKey.get(profileKeyValue).vector.get(key) ?? null
    );
    const positiveEntries = entries.filter(
      (entry) => entry && entry.adjustedResidual > 0
    );
    const positiveMembers = positiveEntries.length;
    const coverage = positiveMembers / cluster.length;
    if (positiveMembers === 0 || coverage < 0.6) continue;
    const games = positiveEntries.reduce((sum, entry) => sum + entry.games, 0);
    const adjustedResidual =
      positiveEntries.reduce(
        (sum, entry) => sum + entry.adjustedResidual * entry.games,
        0
      ) / Math.max(games, 1);
    const seasonSignals = seasons.map((season) =>
      seasonSummary(positiveEntries, season)
    );
    const requiredObservedMembers = Math.ceil(cluster.length * 0.6);
    const sufficient = seasonSignals.every(
      (signal) => signal.observedMembers >= requiredObservedMembers
    );
    const bothPositive =
      sufficient &&
      seasonSignals.every(
        (signal) => (signal.positiveRate ?? 0) >= 0.6
      );
    const seasonConsistency = !sufficient
      ? "insufficient"
      : bothPositive
        ? "both-positive"
        : "mixed";
    const seasonFactor =
      seasonConsistency === "both-positive"
        ? 1
        : seasonConsistency === "mixed"
          ? 0.65
          : 0.8;
    signatures.push({
      key,
      roleComposition: positiveEntries[0].roleComposition,
      partnerTypes: positiveEntries[0].partnerTypes,
      positiveMembers,
      memberCount: cluster.length,
      coverage: round(coverage),
      games,
      adjustedResidual: round(adjustedResidual),
      seasonSignals,
      seasonConsistency,
      score:
        coverage *
        adjustedResidual *
        Math.log1p(games) *
        (idf.get(key) ?? 1) *
        seasonFactor,
    });
  }
  return signatures
    .sort((left, right) => right.score - left.score || right.games - left.games)
    .slice(0, 5)
    .map(({ score: _, ...signature }) => signature);
}

function baseLabelForGroup(group, profileByKey) {
  const signatures = group.signatureContexts;
  if (signatures.length === 0) {
    const fallback = profileByKey.get(group.cluster[0]).firstOrderType;
    return `${group.role} · ${fallback} · 검증 근거 부족`;
  }
  const top = signatures[0];
  // 서로 다른 역할 조합의 내부 역할군을 합쳐 새 이름을 만들지 않습니다.
  // 실제로 검증한 최상위 조합 키를 그대로 그룹 제목으로 사용합니다.
  return `${top.roleComposition} · ${partnerPairLabel(top.partnerTypes)}`;
}

function membership(profile, membership, stats) {
  return {
    profileKey: profile.profileKey,
    characterCode: profile.characterCode,
    characterName: profile.characterName,
    weapon: profile.weapon,
    weaponName: profile.weaponName,
    role: profile.role,
    firstOrderType: profile.firstOrderType,
    membership,
    similarity: stats.similarity == null ? null : round(stats.similarity),
    minimumSimilarity:
      stats.minimumSimilarity == null ? null : round(stats.minimumSimilarity),
    sharedContexts: stats.sharedContexts,
  };
}

function buildRoleGroups(role, profiles, seasons) {
  const minShared = minimumSharedContexts(profiles.length);
  const pairStats = pairStatsForRole(profiles, minShared);
  const scoreValues = [...pairStats.values()].map((stats) => stats.score);
  const observedThreshold = percentile(scoreValues, ROLE_THRESHOLD_PERCENTILE);
  const threshold = round(
    Math.min(
      MAX_THRESHOLD,
      Math.max(MIN_THRESHOLD, observedThreshold ?? MIN_THRESHOLD)
    )
  );
  const initialClusters = completeLinkClusters(profiles, pairStats, threshold);
  const refinement = refineClustersIteratively(
    initialClusters,
    pairStats,
    threshold
  );
  const clusters = refinement.clusters;
  const profileByKey = new Map(
    profiles.map((profile) => [profile.profileKey, profile])
  );
  const idf = inverseDocumentFrequency(profiles);
  const draftGroups = clusters.map((cluster, index) => {
    const pairValues = [];
    for (let leftIndex = 0; leftIndex < cluster.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < cluster.length;
        rightIndex += 1
      ) {
        const stats = pairStats.get(
          pairKey(cluster[leftIndex], cluster[rightIndex])
        );
        if (stats) pairValues.push(stats.score);
      }
    }
    const signatures = signatureContexts(cluster, profileByKey, idf, seasons);
    return {
      id: `${role}-${index + 1}`,
      role,
      cluster,
      kind: cluster.length > 1 ? "core" : "independent",
      threshold,
      cohesion: average(pairValues),
      minimumSimilarity:
        pairValues.length > 0 ? Math.min(...pairValues) : null,
      signatureContexts: signatures,
      seasonConsistency:
        signatures.length === 0 ||
        signatures
          .slice(0, 3)
          .some(
            (signature) => signature.seasonConsistency === "insufficient"
          )
          ? "insufficient"
          : signatures
                .slice(0, 3)
                .every(
                  (signature) =>
                    signature.seasonConsistency === "both-positive"
                )
            ? "both-positive"
            : "mixed",
      primaryMembers: cluster.map((profileKeyValue) => {
        const stats = memberStats(
          profileKeyValue,
          cluster,
          pairStats,
          threshold
        );
        return membership(profileByKey.get(profileKeyValue), "primary", stats);
      }),
      auxiliaryMembers: [],
    };
  });

  for (const profile of profiles) {
    const primaryGroup = draftGroups.find((group) =>
      group.cluster.includes(profile.profileKey)
    );
    const ownStats = memberStats(
      profile.profileKey,
      primaryGroup.cluster,
      pairStats,
      threshold
    );
    const ownScore = ownStats.comparisonFloor;
    const candidates = draftGroups
      .filter((group) => group !== primaryGroup)
      .map((group) => {
        const stats = group.cluster
          .map((other) => pairStats.get(pairKey(profile.profileKey, other)))
          .filter(Boolean);
        if (stats.length !== group.cluster.length || stats.length === 0) {
          return null;
        }
        return {
          group,
          similarity: average(stats.map((item) => item.score)),
          minimumSimilarity: Math.min(...stats.map((item) => item.score)),
          sharedContexts: Math.min(...stats.map((item) => item.sharedContexts)),
        };
      })
      .filter(
        (candidate) =>
          candidate &&
          candidate.similarity >= threshold &&
          candidate.minimumSimilarity >= threshold - 0.04 &&
          candidate.similarity >= ownScore * AUXILIARY_RATIO
      )
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, MAX_AUXILIARY_GROUPS);
    for (const candidate of candidates) {
      candidate.group.auxiliaryMembers.push(
        membership(profile, "auxiliary", candidate)
      );
    }
  }

  const labelCounts = new Map();
  for (const group of draftGroups) {
    const baseLabel = baseLabelForGroup(group, profileByKey);
    const index = (labelCounts.get(baseLabel) ?? 0) + 1;
    labelCounts.set(baseLabel, index);
    group.baseLabel = baseLabel;
    group.labelIndex = index;
  }
  const totalLabelCounts = new Map();
  for (const group of draftGroups) {
    totalLabelCounts.set(
      group.baseLabel,
      (totalLabelCounts.get(group.baseLabel) ?? 0) + 1
    );
  }

  const groups = draftGroups
    .map(({ cluster: _cluster, baseLabel, labelIndex, ...group }) => ({
      ...group,
      label:
        totalLabelCounts.get(baseLabel) > 1
          ? `${baseLabel} · 그룹 ${String.fromCharCode(64 + labelIndex)}`
          : baseLabel,
      cohesion: group.cohesion == null ? null : round(group.cohesion),
      minimumSimilarity:
        group.minimumSimilarity == null
          ? null
          : round(group.minimumSimilarity),
      primaryMembers: group.primaryMembers.sort((left, right) =>
        `${left.characterName}:${left.weaponName}`.localeCompare(
          `${right.characterName}:${right.weaponName}`,
          "ko"
        )
      ),
      auxiliaryMembers: group.auxiliaryMembers.sort((left, right) =>
        `${left.characterName}:${left.weaponName}`.localeCompare(
          `${right.characterName}:${right.weaponName}`,
          "ko"
        )
      ),
    }))
    .sort(
      (left, right) =>
        right.primaryMembers.length - left.primaryMembers.length ||
        left.label.localeCompare(right.label, "ko")
    );

  return {
    groups,
    summary: {
      role,
      profiles: profiles.length,
      observedThreshold:
        observedThreshold == null ? null : round(observedThreshold),
      threshold,
      minimumSharedContexts: minShared,
      coreGroups: groups.filter((group) => group.kind === "core").length,
      independentProfiles: groups.filter((group) => group.kind === "independent")
        .length,
      initialGroups: initialClusters.length,
      iterations: refinement.iterations,
      converged: refinement.converged,
      cycleDetected: refinement.cycleDetected,
      isolatedProfiles: refinement.isolatedProfiles,
      relocatedProfiles: refinement.relocatedProfiles,
    },
  };
}

function main() {
  const compositionData = readJson(INPUT_PATH);
  const profileMap = buildProfiles();
  const roleOutputs = ROLE_ORDER.map((role) =>
    buildRoleGroups(
      role,
      [...profileMap.values()].filter((profile) => profile.role === role),
      compositionData.seasons ?? [10, 11]
    )
  );
  const output = {
    method:
      "global-role-exact-two-partner-composition-affinity-iterative-refinement-v3-direction40-magnitude35-overlap25",
    contextUnit: "exact-two-partner-first-order-types",
    contextMinGames: 100,
    sourceMetric: "entry-sample-confidence",
    seasons: compositionData.seasons ?? [10, 11],
    generatedAt: new Date().toISOString(),
    similarity: {
      directionWeight: DIRECTION_WEIGHT,
      magnitudeWeight: MAGNITUDE_WEIGHT,
      overlapWeight: OVERLAP_WEIGHT,
      rolePercentile: ROLE_THRESHOLD_PERCENTILE,
      mergeAverageMargin: MERGE_AVERAGE_MARGIN,
      relocationMargin: RELOCATION_MARGIN,
      maxRefinementIterations: MAX_REFINEMENT_ITERATIONS,
      auxiliaryRatio: AUXILIARY_RATIO,
    },
    roles: roleOutputs.map((outputForRole) => outputForRole.summary),
    groups: roleOutputs.flatMap((outputForRole) => outputForRole.groups),
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  for (const role of output.roles) {
    console.log(
      `${role.role}: ${role.profiles} profiles, threshold ${role.threshold}, ` +
        `observed p85 ${role.observedThreshold ?? "—"}, ` +
        `${role.coreGroups} core groups, ${role.independentProfiles} independent, ` +
        `${role.iterations} iterations, isolated ${role.isolatedProfiles}, ` +
        `relocated ${role.relocatedProfiles}, ${role.converged ? "converged" : role.cycleDetected ? "cycle" : "limit"}`
    );
  }
}

main();
