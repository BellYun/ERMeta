const char = (member) => member.split(":")[0];
const dominates = (a, b) =>
  a.winRate >= b.winRate &&
  a.averageRank <= b.averageRank &&
  a.averageRP >= b.averageRP &&
  (a.winRate > b.winRate || a.averageRank < b.averageRank || a.averageRP > b.averageRP);
const empty = () => ({ A: 0, B: 0, M: 0, U: 0, X: 0, N: 0 });
const share = (n, d) => (d ? n / d : null);
const known = (counts) => counts.A + counts.B + counts.M;

function descriptors(pair, annotations) {
  const members = pair.split("+");
  const profiles = members.map(
    (member) => annotations.get(member) ?? { role: "유형 미등록", fitRole: "유형 미등록" }
  );
  const fits = profiles.map((p) => `${p.role} · ${p.fitRole}`);
  const roles = profiles.map((p) => p.role).sort();
  return [
    { id: "all", level: "all", label: "전체 동료 조합" },
    { id: `roles:${JSON.stringify(roles)}`, level: "roles", label: roles.join(" + ") },
    {
      id: `fitRoles:${JSON.stringify([...fits].sort())}`,
      level: "fitRoles",
      label: [...fits].sort().join(" + "),
    },
    ...[...new Set(fits)].map((fit) => ({
      id: `allyFitRole:${fit}`,
      level: "allyFitRole",
      label: `${fit} 동료 포함`,
    })),
    ...members.flatMap((member, i) => [
      {
        id: `allyExact:${member}`,
        level: "allyExact",
        label: `${member} 동료 포함`,
        anchor: member,
      },
      {
        id: `anchorFitRole:${member}:${fits[1 - i]}`,
        level: "anchorFitRole",
        label: `${member} + ${fits[1 - i]}`,
        anchor: member,
      },
    ]),
  ];
}

function countsFor(indices, statuses, contexts, excludedCharacter = null) {
  const counts = empty();
  const strata = {};
  for (const i of indices) {
    if (excludedCharacter && contexts[i].members.some((m) => char(m) === excludedCharacter))
      continue;
    const status = statuses[i];
    counts[status]++;
    const k = contexts[i].eligible.length;
    strata[k] ??= empty();
    strata[k][status]++;
  }
  return { counts, strata };
}

function summarize(indices, statuses, contexts, global, excludedCharacter = null) {
  const { counts, strata } = countsFor(indices, statuses, contexts, excludedCharacter);
  const n = known(counts);
  const expected = Object.entries(strata).reduce((sum, [k, c]) => {
    const base = global.strata[k];
    return sum + known(c) * (base && known(base) ? base.A / known(base) : 0);
  }, 0);
  return {
    counts,
    known: n,
    betterShare: share(counts.A, n),
    beatenShare: share(counts.B, n),
    globalBetterShare: share(global.counts.A, known(global.counts)),
    excessBetterContexts: counts.A - expected,
    // Stratification only controls the number of selectable pool picks, not RP or season.
    expectedBetterAtGlobalRates: expected,
    selectablePoolStrata: Object.entries(strata).map(([k, c]) => ({
      selectablePicks: Number(k),
      ...c,
    })),
  };
}

/** All observed pairs, all new-character weapon candidates, no sample/season/tier/type filters. */
export function auditPoolPatterns({ pairs, pool, annotations = new Map() }) {
  if (!pool.length || new Set(pool).size !== pool.length || pool.some((m) => !/^\d+:\d+$/.test(m)))
    throw new Error("Invalid pool");
  const members = new Set([...pairs.values()].flatMap((options) => [...options.keys()]));
  if (pool.some((m) => !members.has(m))) throw new Error("Missing pool profile");
  const poolCharacters = new Set(pool.map(char));
  const candidates = [...members].filter((m) => !poolCharacters.has(char(m))).sort();
  const playstylePreference = inferPoolPlaystylePreference(
    pool.map((m) => ({ ...annotations.get(m), weapon: Number(m.split(":")[1]) }))
  );
  const candidatePlaystyleMatches = Object.fromEntries(
    candidates.map((member) => [
      member,
      getPoolPlaystyleMatch(
        { role: annotations.get(member)?.role, weapon: Number(member.split(":")[1]) },
        playstylePreference
      ),
    ])
  );
  const groups = new Map();
  const contexts = [...pairs.entries()].map(([pair, options], index) => {
    const allies = pair.split("+");
    const eligible = pool.filter((m) => !allies.some((a) => char(a) === char(m)));
    for (const descriptor of descriptors(pair, annotations)) {
      if (!groups.has(descriptor.id)) groups.set(descriptor.id, { ...descriptor, indices: [] });
      groups.get(descriptor.id).indices.push(index);
    }
    return { pair, members: allies, eligible, complete: eligible.every((m) => options.has(m)) };
  });
  const allIndices = contexts.map((_, i) => i);
  const matrix = [];
  const statusByCandidate = {};
  for (const candidate of candidates) {
    const statuses = contexts
      .map((context) => {
        if (context.members.some((m) => char(m) === char(candidate))) return "X";
        if (!context.eligible.length) return "N";
        const options = pairs.get(context.pair);
        const row = options.get(candidate);
        if (!context.complete || !row) return "U";
        const incumbents = context.eligible.map((m) => options.get(m));
        return incumbents.every((i) => dominates(row, i))
          ? "A"
          : incumbents.some((i) => dominates(i, row))
            ? "B"
            : "M";
      })
      .join("");
    statusByCandidate[candidate] = statuses;
    const global = countsFor(allIndices, statuses, contexts);
    for (const group of groups.values()) {
      const result = summarize(group.indices, statuses, contexts, global);
      matrix.push({ candidate, group: group.id, ...result });
    }
  }
  return {
    method: "pool-pattern-audit-v2",
    pool,
    statusLegend: {
      A: "beats-every-selectable-pool-pick",
      B: "beaten-by-a-pool-pick",
      M: "mixed-or-equal",
      U: "missing-observation",
      X: "candidate-is-an-ally",
      N: "no-selectable-pool-pick",
    },
    groups: [...groups.values()],
    contexts,
    candidates,
    playstylePreference,
    candidatePlaystyleMatches,
    statusByCandidate,
    matrix,
  };
}

/** Inspect concentration and sample sizes after a repeated pattern has been found. */
export function inspectPoolPattern({ audit, candidate, groupId, pairs }) {
  const group = audit.groups.find((g) => g.id === groupId);
  const statuses = audit.statusByCandidate[candidate];
  if (!group || !statuses) throw new Error("Unknown pattern");
  const allIndices = audit.contexts.map((_, i) => i);
  const global = countsFor(allIndices, statuses, audit.contexts);
  const members = new Set(group.indices.flatMap((i) => audit.contexts[i].members.map(char)));
  const leaveOneCharacterOut = [...members].map((character) => {
    const reducedGlobal = countsFor(allIndices, statuses, audit.contexts, character);
    return {
      character,
      ...summarize(group.indices, statuses, audit.contexts, reducedGlobal, character),
    };
  });
  const distribution = (values) => {
    const sorted = values.filter((v) => v !== null).sort((a, b) => a - b);
    return sorted.length
      ? { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted.at(-1) }
      : null;
  };
  const contexts = group.indices.map((i) => {
    const context = audit.contexts[i];
    const options = pairs.get(context.pair);
    return {
      pair: context.pair,
      status: statuses[i],
      candidate: options.get(candidate) ?? null,
      incumbents: context.eligible.map((m) => ({ member: m, observation: options.get(m) ?? null })),
    };
  });
  return {
    candidate,
    group,
    summary: summarize(group.indices, statuses, audit.contexts, global),
    sampleSizes: ["A", "B", "M"].map((status) => {
      const selected = contexts.filter((c) => c.status === status);
      return {
        status,
        candidateGames: distribution(selected.map((c) => c.candidate.games)),
        minimumIncumbentGames: distribution(
          selected.map((c) => Math.min(...c.incumbents.map((m) => m.observation.games)))
        ),
      };
    }),
    leaveOneCharacterOut,
    contexts,
    interpretation:
      "Repeated full-period observations. Removing an ally tests concentration; it does not identify the cause or validate a tactical role.",
  };
}

export function rankPoolPatternLeads(audit, level, { respectPlaystyle = true } = {}) {
  const groupById = new Map(audit.groups.map((g) => [g.id, g]));
  return audit.matrix
    .filter((r) => groupById.get(r.group).level === level && r.known)
    .sort(
      (a, b) =>
        // Actual additions first; a matching style cannot rescue zero observed benefit.
        Number(b.counts.A > 0) - Number(a.counts.A > 0) ||
        (respectPlaystyle
          ? poolPlaystylePriority(
              audit.candidatePlaystyleMatches?.[a.candidate] ?? "undetermined"
            ) -
            poolPlaystylePriority(audit.candidatePlaystyleMatches?.[b.candidate] ?? "undetermined")
          : 0) ||
        b.excessBetterContexts - a.excessBetterContexts ||
        b.known - a.known ||
        a.candidate.localeCompare(b.candidate) ||
        a.group.localeCompare(b.group)
    );
}
import {
  getPoolPlaystyleMatch,
  inferPoolPlaystylePreference,
  poolPlaystylePriority,
} from "../../src/lib/poolPlaystylePreference.mjs";
