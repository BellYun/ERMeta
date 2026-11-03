import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Run from frontend/: node scripts/build-pooled-composition-tendencies.mjs YYYY-MM-DD
// Groups every observed third-member contrast by the existing character-type
// annotations. These are descriptive search leads, not causal explanations.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: node scripts/build-pooled-composition-tendencies.mjs YYYY-MM-DD");
}

const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const typeSource = "public/data/lab/character-composition-types.json";
const types = JSON.parse(readFileSync(typeSource, "utf8"));
const typeByMember = new Map();
for (const group of types.groups) {
  for (const type of group.types) {
    for (const character of type.characters) {
      const member = `${character.characterCode}:${character.weapon}`;
      if (typeByMember.has(member)) throw new Error(`Duplicate type member: ${member}`);
      typeByMember.set(member, {
        role: group.role,
        base: group.baseFitRole,
        label: type.label,
        confidence: type.confidence,
      });
    }
  }
}

const rows = gunzipSync(readFileSync(seed.sourceSnapshot))
  .toString("utf8")
  .trimEnd()
  .split("\n")
  .map(JSON.parse);
const memberTotals = new Map();
const pairOptions = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  if (members.length !== 3 || row.games <= 0) throw new Error(`Invalid trio: ${row.key}`);
  for (const member of members) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0, rp: 0 };
    total.games += row.games;
    total.wins += row.wins;
    total.rankSum += row.rankSum;
    total.rp += row.rp;
    memberTotals.set(member, total);
  }
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const options = pairOptions.get(pair) ?? [];
    options.push({ ...row, third: members[index] });
    pairOptions.set(pair, options);
  }
}

function metric(total) {
  return {
    win: total.wins / total.games,
    rank: total.rankSum / total.games,
    rp: total.rp / total.games,
  };
}

function roleOf(member) {
  return typeByMember.get(member)?.role ?? "유형 미등록";
}

function typeOf(member) {
  const type = typeByMember.get(member);
  return type ? `${type.role} · ${type.base}` : "유형 미등록";
}

const groups = new Map();
let comparedOptions = 0;
for (const [pair, options] of pairOptions) {
  if (options.length === 1) continue;
  const pairMembers = pair.split("+");
  const pairRoles = pairMembers.map(roleOf).sort().join(" + ");
  const total = {
    games: 0,
    wins: 0,
    rankSum: 0,
    rp: 0,
    expectedWins: 0,
    expectedRank: 0,
    expectedRP: 0,
  };
  for (const option of options) {
    const baseline = metric(memberTotals.get(option.third));
    total.games += option.games;
    total.wins += option.wins;
    total.rankSum += option.rankSum;
    total.rp += option.rp;
    total.expectedWins += option.games * baseline.win;
    total.expectedRank += option.games * baseline.rank;
    total.expectedRP += option.games * baseline.rp;
  }
  for (const option of options) {
    const otherGames = total.games - option.games;
    const baseline = metric(memberTotals.get(option.third));
    const residual = {
      win: option.wins / option.games - baseline.win,
      rank: option.rankSum / option.games - baseline.rank,
      rp: option.rp / option.games - baseline.rp,
    };
    const others = {
      win:
        (total.wins - option.wins - total.expectedWins + option.games * baseline.win) / otherGames,
      rank:
        (total.rankSum - option.rankSum - total.expectedRank + option.games * baseline.rank) /
        otherGames,
      rp: (total.rp - option.rp - total.expectedRP + option.games * baseline.rp) / otherGames,
    };
    const contrast = {
      winPercentagePoints: 100 * (residual.win - others.win),
      rankAdvantage: others.rank - residual.rank,
      rpAdvantage: residual.rp - others.rp,
    };
    const weight = (option.games * otherGames) / total.games;
    const thirdType = typeOf(option.third);
    const key = `${pairRoles} | ${thirdType}`;
    const group = groups.get(key) ?? {
      pairRoles,
      thirdType,
      contexts: 0,
      games: 0,
      effectiveGames: 0,
      weightedWin: 0,
      weightedRank: 0,
      weightedRP: 0,
      aheadAllThree: 0,
      behindAllThree: 0,
      mixed: 0,
      pairKeys: new Set(),
      thirdMembers: new Set(),
      positiveExamples: [],
      negativeExamples: [],
    };
    group.contexts++;
    group.games += option.games;
    group.effectiveGames += weight;
    group.weightedWin += weight * contrast.winPercentagePoints;
    group.weightedRank += weight * contrast.rankAdvantage;
    group.weightedRP += weight * contrast.rpAdvantage;
    group.pairKeys.add(pair);
    group.thirdMembers.add(option.third);
    const direction =
      contrast.winPercentagePoints > 0 && contrast.rankAdvantage > 0 && contrast.rpAdvantage > 0
        ? "aheadAllThree"
        : contrast.winPercentagePoints < 0 && contrast.rankAdvantage < 0 && contrast.rpAdvantage < 0
          ? "behindAllThree"
          : "mixed";
    group[direction]++;
    const example = {
      key: option.key,
      fixedPair: pair,
      third: option.third,
      games: option.games,
      wins: option.wins,
      averageRank: option.rankSum / option.games,
      averageRP: option.rp / option.games,
      contrast,
      effectiveGames: weight,
    };
    const examples =
      direction === "aheadAllThree"
        ? group.positiveExamples
        : direction === "behindAllThree"
          ? group.negativeExamples
          : null;
    if (examples) {
      examples.push(example);
      examples.sort((first, second) => second.effectiveGames - first.effectiveGames);
      examples.length = Math.min(examples.length, 3);
    }
    groups.set(key, group);
    comparedOptions++;
  }
}

const tendencies = [...groups.values()]
  .map((group) => ({
    pairRoles: group.pairRoles,
    thirdType: group.thirdType,
    contexts: group.contexts,
    fixedPairs: group.pairKeys.size,
    thirdMembers: group.thirdMembers.size,
    thirdMemberKeys: [...group.thirdMembers].sort(),
    games: group.games,
    effectiveGames: group.effectiveGames,
    memberAdjustedWinDifferencePercentagePoints: group.weightedWin / group.effectiveGames,
    memberAdjustedRankAdvantage: group.weightedRank / group.effectiveGames,
    memberAdjustedRPAdvantage: group.weightedRP / group.effectiveGames,
    directions: {
      aheadAllThree: group.aheadAllThree,
      behindAllThree: group.behindAllThree,
      mixed: group.mixed,
    },
    positiveExamples: group.positiveExamples,
    negativeExamples: group.negativeExamples,
  }))
  .sort(
    (first, second) =>
      first.pairRoles.localeCompare(second.pairRoles, "ko") ||
      first.thirdType.localeCompare(second.thirdType, "ko")
  );

const allThreePositive = tendencies
  .filter(
    (row) =>
      row.memberAdjustedWinDifferencePercentagePoints > 0 &&
      row.memberAdjustedRankAdvantage > 0 &&
      row.memberAdjustedRPAdvantage > 0
  )
  .sort((first, second) => second.effectiveGames - first.effectiveGames)
  .slice(0, 30)
  .map((row) => ({ pairRoles: row.pairRoles, thirdType: row.thirdType }));
const allThreeNegative = tendencies
  .filter(
    (row) =>
      row.memberAdjustedWinDifferencePercentagePoints < 0 &&
      row.memberAdjustedRankAdvantage < 0 &&
      row.memberAdjustedRPAdvantage < 0
  )
  .sort((first, second) => second.effectiveGames - first.effectiveGames)
  .slice(0, 30)
  .map((row) => ({ pairRoles: row.pairRoles, thirdType: row.thirdType }));

const output = {
  source: seed.sourceSnapshot,
  sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
  typeSource,
  typeSourceSeasons: types.seasons,
  method:
    "For every observed fixed exact pair, compare each exact third with every other observed third. Subtract each third member's pooled overall mean before comparing win rate, average rank, and raw team RP. Aggregate those contrasts by the two historical type roles and the third member's historical base type, weighted by effective games. No season, patch, tier, or game-count rows are excluded. Types are exploration labels, not proof of a role, causal effect, or a current-patch classification. Each trio contributes to three correlated fixed-pair contexts; contexts are not independent trials. Raw RP definitions changed across seasons.",
  counts: {
    exactTrios: rows.length,
    exactMembers: memberTotals.size,
    historicalTypeMembers: typeByMember.size,
    missingHistoricalTypeMembers: [...memberTotals.keys()].filter(
      (member) => !typeByMember.has(member)
    ),
    fixedPairs: pairOptions.size,
    comparedOptions,
    tendencyGroups: tendencies.length,
  },
  reviewOrder: { allThreePositive, allThreeNegative },
  tendencies,
};
const path = `analysis-snapshots/composition-affinity/pooled-type-tendencies-${date}.json`;
writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({ path, counts: output.counts, reviewOrder: { positive: allThreePositive.length, negative: allThreeNegative.length } })}\n`
);
