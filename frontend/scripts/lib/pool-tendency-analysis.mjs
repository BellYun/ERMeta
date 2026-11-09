// Full-period observations only. Type labels annotate results; they never filter options.
export const POOL_TENDENCY_METHOD = {
  version: "pool-tendencies-v1",
  supportHalfWeightGames: 30,
  comparison: "same-exact-allies-three-raw-metrics-pareto",
  grouping: ["roles", "fitRoles", "allyFitRole"],
};
const support = (games) => games / (games + POOL_TENDENCY_METHOD.supportHalfWeightGames);
const character = (member) => Number(member.split(":")[0]);
const metrics = (row) => ({
  games: row.games,
  wins: row.wins,
  winRate: row.wins / row.games,
  averageRank: row.rankSum / row.games,
  averageRP: row.rp / row.games,
});
const dominates = (a, b) =>
  a.winRate >= b.winRate &&
  a.averageRank <= b.averageRank &&
  a.averageRP >= b.averageRP &&
  (a.winRate > b.winRate || a.averageRank < b.averageRank || a.averageRP > b.averageRP);
const ratio = (n, d) => (d ? n / d : null);
function sortMembers(members) {
  return [...members].sort(
    (a, b) => character(a) - character(b) || Number(a.split(":")[1]) - Number(b.split(":")[1])
  );
}
export function indexPoolObservations(rows) {
  const pairs = new Map();
  const keys = new Set();
  for (const row of rows) {
    const members = sortMembers(row.key.split("+"));
    const key = members.join("+");
    if (
      members.length !== 3 ||
      members.some((m) => !/^\d+:\d+$/.test(m)) ||
      new Set(members.map(character)).size !== 3 ||
      keys.has(key) ||
      !Number.isInteger(row.games) ||
      row.games <= 0 ||
      !Number.isInteger(row.wins) ||
      row.wins < 0 ||
      row.wins > row.games ||
      !Number.isFinite(row.rp) ||
      !Number.isFinite(row.rankSum)
    )
      throw new Error(`Invalid or duplicate observation: ${row.key}`);
    keys.add(key);
    members.forEach((member, i) => {
      const pair = members.filter((_, j) => i !== j).join("+");
      if (!pairs.has(pair)) pairs.set(pair, new Map());
      pairs.get(pair).set(member, { key, member, ...metrics(row) });
    });
  }
  return pairs;
}
function groupsFor(pair, annotations) {
  const labels = pair.split("+").map((m) => {
    const a = annotations.get(m);
    return { role: a?.role ?? "유형 미등록", fit: a?.fitRole ?? "유형 미등록" };
  });
  const roles = labels.map((a) => a.role).sort();
  const fits = labels.map((a) => `${a.role} · ${a.fit}`).sort();
  return [
    { id: `roles:${JSON.stringify(roles)}`, level: "roles", label: roles.join(" + ") },
    { id: `fitRoles:${JSON.stringify(fits)}`, level: "fitRoles", label: fits.join(" + ") },
    ...[...new Set(fits)].map((fit) => ({
      id: `allyFitRole:${fit}`,
      level: "allyFitRole",
      label: `${fit} 동료 포함`,
    })),
  ];
}
function emptyGroup(descriptor) {
  return {
    ...descriptor,
    contexts: 0,
    known: 0,
    unknown: 0,
    unavailable: 0,
    noAlternative: 0,
    pairMass: 0,
    adverseMass: 0,
    coveredMass: 0,
    mixedMass: 0,
    comparisonCount: 0,
    candidates: new Map(),
    anchors: new Map(),
    evidence: [],
    reviewContexts: [],
  };
}
function keepExample(list, example) {
  list.push(example);
  list.sort(
    (a, b) =>
      (b.repairedMass ?? 0) - (a.repairedMass ?? 0) ||
      b.support - a.support ||
      a.pair.localeCompare(b.pair)
  );
  if (list.length > 3) list.pop();
}
function candidateState(member) {
  return {
    member,
    comparablePairs: 0,
    missingPairs: 0,
    betterAllPool: 0,
    beatenByPool: 0,
    mixed: 0,
    deficitMass: 0,
    repairedMass: 0,
    examples: [],
    counterexamples: [],
  };
}
function candidateSummary(s, global) {
  const repairShare = ratio(s.repairedMass, s.deficitMass);
  const globalRepairShare = ratio(global.repairedMass, global.deficitMass);
  return {
    member: s.member,
    comparablePairs: s.comparablePairs,
    missingPairs: s.missingPairs,
    betterAllPool: s.betterAllPool,
    beatenByPool: s.beatenByPool,
    mixed: s.mixed,
    deficitMass: s.deficitMass,
    repairedMass: s.repairedMass,
    repairShare,
    globalRepairShare,
    specificity:
      repairShare === null || globalRepairShare === null ? null : repairShare - globalRepairShare,
    examples: s.examples,
    counterexamples: s.counterexamples,
  };
}
export function analyzePoolTendencies({ pairs, pool, annotations = new Map() }) {
  if (!pool.length || new Set(pool).size !== pool.length || pool.some((m) => !/^\d+:\d+$/.test(m)))
    throw new Error("Invalid pool");
  const allMembers = new Set([...pairs.values()].flatMap((options) => [...options.keys()]));
  if (pool.some((m) => !allMembers.has(m)))
    throw new Error("Pool member missing from observations");
  const selected = new Set(pool);
  const selectedCharacters = new Set(pool.map(character));
  const preferredRoles = new Set(pool.map((m) => annotations.get(m)?.role).filter(Boolean));
  const groups = new Map();
  const total = emptyGroup({ id: "all", level: "all", label: "전체 동료 조합" });
  const globalCandidates = new Map(
    [...allMembers]
      .filter((m) => !selectedCharacters.has(character(m)))
      .map((m) => [m, candidateState(m)])
  );
  for (const [pair, options] of pairs) {
    const descriptors = groupsFor(pair, annotations);
    const matching = [
      total,
      ...descriptors.map((d) => {
        if (!groups.has(d.id)) groups.set(d.id, emptyGroup(d));
        return groups.get(d.id);
      }),
    ];
    matching.forEach((g) => g.contexts++);
    const allies = pair.split("+").map(character);
    const eligible = pool.filter((m) => !allies.includes(character(m)));
    if (!eligible.length) {
      matching.forEach((g) => g.unavailable++);
      continue;
    }
    if (eligible.some((m) => !options.has(m))) {
      matching.forEach((g) => g.unknown++);
      continue;
    }
    const incumbents = eligible.map((m) => options.get(m));
    const alternatives = [...options.values()].filter((o) => !selected.has(o.member));
    if (!alternatives.length) {
      matching.forEach((g) => g.noAlternative++);
      continue;
    }
    const n = Math.min(...incumbents.map((i) => i.games));
    let optionMass = 0,
      adverse = 0,
      covered = 0;
    const superior = [];
    const weaker = [];
    for (const option of alternatives) {
      const weight = support(Math.min(n, option.games));
      optionMass += weight;
      if (incumbents.every((i) => dominates(option, i))) {
        adverse += weight;
        superior.push({ option, weight });
      } else if (incumbents.some((i) => dominates(i, option))) {
        covered += weight;
        weaker.push({ option, weight });
      }
    }
    const pairMass = optionMass / alternatives.length;
    const adverseFraction = adverse / optionMass;
    const coveredFraction = covered / optionMass;
    for (const g of matching) {
      g.known++;
      g.pairMass += pairMass;
      g.adverseMass += pairMass * adverseFraction;
      g.coveredMass += pairMass * coveredFraction;
      g.mixedMass += pairMass * (1 - adverseFraction - coveredFraction);
      g.comparisonCount += alternatives.length;
      g.reviewContexts.push({
        pair,
        support: pairMass,
        adverseFraction,
        alternative: [...weaker].sort((a, b) => b.weight - a.weight)[0]?.option.member ?? null,
      });
      for (const code of allies) {
        if (!g.anchors.has(code))
          g.anchors.set(code, { character: code, contexts: 0, mass: 0, adverse: 0 });
        const a = g.anchors.get(code);
        a.contexts++;
        a.mass += pairMass;
        a.adverse += pairMass * adverseFraction;
      }
      const representative = (entries) => [...entries].sort((a, b) => b.weight - a.weight)[0];
      if (superior.length) {
        const e = representative(superior);
        keepExample(g.evidence, {
          pair,
          alternative: e.option.member,
          support: e.weight,
          adverseFraction,
        });
      }
    }
    // Every observed third option is assessed; historical role/type never gates a candidate.
    for (const option of alternatives) {
      if (selectedCharacters.has(character(option.member))) continue;
      if (!globalCandidates.has(option.member))
        globalCandidates.set(option.member, candidateState(option.member));
      const states = matching.map((g) => {
        if (g === total) return globalCandidates.get(option.member);
        if (!g.candidates.has(option.member))
          g.candidates.set(option.member, candidateState(option.member));
        return g.candidates.get(option.member);
      });
      const candidateMass = support(Math.min(n, option.games));
      const comparisonSupport = Math.min(pairMass, candidateMass);
      const deficitMass = comparisonSupport * adverseFraction;
      const rescued = superior.reduce(
        (sum, other) =>
          sum +
          (dominates(option, other.option) ||
          (option.winRate === other.option.winRate &&
            option.averageRank === other.option.averageRank &&
            option.averageRP === other.option.averageRP)
            ? other.weight
            : 0),
        0
      );
      const repairedMass = (comparisonSupport * rescued) / optionMass;
      const improves = incumbents.every((i) => dominates(option, i));
      const redundant = incumbents.some((i) => dominates(i, option));
      for (const c of states) {
        c.comparablePairs++;
        c.deficitMass += deficitMass;
        c.repairedMass += repairedMass;
        if (improves) {
          c.betterAllPool++;
          keepExample(c.examples, { pair, support: candidateMass, repairedMass });
        } else if (redundant) {
          c.beatenByPool++;
          keepExample(c.counterexamples, { pair, support: candidateMass });
        } else c.mixed++;
      }
    }
  }
  // Missing candidate observations remain unknown; they never become failures or repairs.
  for (const g of groups.values()) {
    for (const member of globalCandidates.keys()) {
      if (!g.candidates.has(member)) g.candidates.set(member, candidateState(member));
      const state = g.candidates.get(member);
      const incompatible = g.anchors.get(character(member))?.contexts ?? 0;
      state.missingPairs = Math.max(0, g.known - state.comparablePairs - incompatible);
    }
  }
  for (const c of globalCandidates.values())
    c.missingPairs =
      total.known - c.comparablePairs - (total.anchors.get(character(c.member))?.contexts ?? 0);
  total.candidates = globalCandidates;
  const baseline = ratio(total.adverseMass, total.pairMass);
  function summary(g) {
    const adverseRate = ratio(g.adverseMass, g.pairMass);
    const anchors = [...g.anchors.values()].map((a) => ({
      character: a.character,
      contexts: a.contexts,
      adverseRate: ratio(a.adverse, a.mass),
    }));
    const candidates = [...g.candidates.values()]
      .map((c) => candidateSummary(c, globalCandidates.get(c.member)))
      .sort(
        (a, b) =>
          b.repairedMass - a.repairedMass ||
          b.betterAllPool - a.betterAllPool ||
          a.member.localeCompare(b.member)
      );
    const leaveOneCharacterOut = [...g.anchors.values()].map((a) => {
      const globalAnchor = total.anchors.get(a.character);
      const remainingMass = g.pairMass - a.mass;
      const baselineMass = total.pairMass - (globalAnchor?.mass ?? 0);
      return {
        character: a.character,
        remainingPairs: g.known - a.contexts,
        excessAdverseRate:
          remainingMass > 1e-12 && baselineMass > 1e-12
            ? (g.adverseMass - a.adverse) / remainingMass -
              (total.adverseMass - (globalAnchor?.adverse ?? 0)) / baselineMass
            : null,
      };
    });
    return {
      id: g.id,
      level: g.level,
      label: g.label,
      contexts: g.contexts,
      known: g.known,
      unknown: g.unknown,
      unavailable: g.unavailable,
      noAlternative: g.noAlternative,
      comparisonCount: g.comparisonCount,
      supportMass: g.pairMass,
      adverseRate,
      coveredRate: ratio(g.coveredMass, g.pairMass),
      mixedRate: ratio(g.mixedMass, g.pairMass),
      excessAdverseRate: adverseRate === null || baseline === null ? null : adverseRate - baseline,
      excessAdverseMass: baseline === null ? 0 : g.adverseMass - baseline * g.pairMass,
      distinctAllyCharacters: anchors.length,
      maxAnchorShare: g.known ? Math.max(0, ...anchors.map((a) => a.contexts / g.known)) : null,
      anchors: anchors.sort((a, b) => b.contexts - a.contexts),
      evidence: g.evidence,
      counterevidence: g.reviewContexts
        .filter((e) => baseline !== null && e.adverseFraction < baseline)
        .sort((a, b) => b.support - a.support || a.pair.localeCompare(b.pair))
        .slice(0, 3),
      leaveOneCharacterOut,
      sameRoleCandidates: candidates
        .filter((c) => preferredRoles.has(annotations.get(c.member)?.role))
        .slice(0, 5),
      assessedCandidates: candidates.length,
      candidates: candidates.slice(0, 5),
    };
  }
  const globalCandidateSummaries = [...globalCandidates.values()]
    .map((c) => candidateSummary(c, c))
    .sort((a, b) => b.repairedMass - a.repairedMass || a.member.localeCompare(b.member));
  return {
    method: POOL_TENDENCY_METHOD,
    pool: sortMembers(pool),
    total: summary(total),
    groups: [...groups.values()]
      .map(summary)
      .sort((a, b) => b.excessAdverseMass - a.excessAdverseMass || a.id.localeCompare(b.id)),
    candidates: globalCandidateSummaries,
  };
}

// A refreshed source, type annotation, skill text or analysis implementation makes
// old prose stale. This is a provenance check, not approval of tactical claims.
export function validatePoolTendencyReview(review, report) {
  const basis = review?.basis;
  if (!basis?.inputSha256 || !Array.isArray(basis.pool) || !report?.provenance?.inputSha256)
    return { current: false, changedInputs: ["missing-basis"] };
  const changedInputs = [];
  if (basis.methodVersion !== report.method.version) changedInputs.push("method-version");
  if (sortMembers(basis.pool).join("+") !== sortMembers(report.pool).join("+"))
    changedInputs.push("pool");
  const paths = new Set([
    ...Object.keys(basis.inputSha256),
    ...Object.keys(report.provenance.inputSha256),
  ]);
  for (const path of paths)
    if (basis.inputSha256[path] !== report.provenance.inputSha256[path]) changedInputs.push(path);
  return { current: changedInputs.length === 0, changedInputs };
}
