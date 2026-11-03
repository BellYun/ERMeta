import { analyzePoolActions, evaluateProfileScenario } from "./pool-action-analysis.mjs";

export const POOL_CONTEXT_METHOD = "pool-team-context-v1";
const usable = (p) => ["available", "conditional"].includes(p.status);
const character = (m) => m.split(":")[0];
const pairKey = (members) =>
  [...members]
    .sort((a, b) => {
      const [ac, aw] = a.split(":").map(Number);
      const [bc, bw] = b.split(":").map(Number);
      return ac - bc || aw - bw;
    })
    .join("+");

function summarizeTeamResponses(responses) {
  if (responses.some((r) => r.status === "available")) return "available";
  if (responses.some((r) => r.status === "conditional")) return "conditional";
  if (responses.some((r) => r.status === "unknown")) return "unknown";
  if (responses.some((r) => r.status === "state-limited")) return "state-limited";
  return "gap";
}

/** Compare two real teams in separate conditional questions, not a union of the user's pool. */
export function compareTeamResponses({ existing, candidate, allies, catalogue, scenarios }) {
  const byMember = new Map(catalogue.map((p) => [p.member, p]));
  if (
    new Set([...allies, existing].map(character)).size !== 3 ||
    new Set([...allies, candidate].map(character)).size !== 3
  )
    throw new Error("The third pick must be a different character from both allies");
  const response = (member, scenario) => {
    if (!byMember.has(member)) throw new Error(`Unknown profile: ${member}`);
    return {
      name: byMember.get(member).name,
      ...evaluateProfileScenario(byMember.get(member), scenario),
    };
  };
  return scenarios.map((scenario) => {
    const allyResponses = allies.map((member) => response(member, scenario));
    const existingResponse = response(existing, scenario);
    const candidateResponse = response(candidate, scenario);
    const before = summarizeTeamResponses([...allyResponses, existingResponse]);
    const after = summarizeTeamResponses([...allyResponses, candidateResponse]);
    const canBefore = ["available", "conditional"].includes(before);
    const canAfter = ["available", "conditional"].includes(after);
    const delta =
      canBefore && after === "gap"
        ? "lost-conditional-option"
        : before === "gap" && canAfter
          ? "gained-conditional-option"
          : canBefore && canAfter
            ? allyResponses.some(usable)
              ? "retained-by-ally"
              : "different-route-conditions"
            : before === "gap" && after === "gap"
              ? "absent-in-both-reviewed-teams"
              : "unknown-or-state-limited";
    return {
      scenario: scenario.id,
      label: scenario.label,
      assumptions: scenario.assumptions,
      allyResponses,
      existingResponse,
      candidateResponse,
      candidateRelatedMethods: byMember
        .get(candidate)
        .actions.filter(
          (action) =>
            !candidateResponse.methods.some((m) => m.action === action.id) &&
            scenario.goals.some((goal) =>
              goal.anyOf.some((s) => s.effects.every((effect) => action.effects.includes(effect)))
            )
        )
        .map((action) => ({
          action: action.id,
          label: action.label,
          delivery: action.delivery,
          activation: action.activation,
          sources: action.sources,
          limitations: action.limitations,
          status: "does-not-match-required-delivery-or-activation",
        })),
      before,
      after,
      delta,
      needStatus: "only-if-this-threat-applies",
      concurrency: "independent-question-not-a-simultaneous-combat-plan",
    };
  });
}

/** Positive actions can suggest a play option; a missing match never establishes a team weakness. */
export function inferAllyPlayOptions({ allies, catalogue, rules, scenarios }) {
  if (allies.length !== 2 || new Set(allies.map(character)).size !== 2)
    throw new Error("Two distinct allied characters are required");
  const byMember = new Map(catalogue.map((p) => [p.member, p]));
  if (allies.some((m) => !byMember.has(m))) throw new Error("Unknown ally profile");
  return rules.map((rule) => {
    if (!rule.slots.length || !rule.slots.every((s) => s.anyOf.length))
      throw new Error(`Invalid context rule: ${rule.id}`);
    if (!scenarios.some((s) => s.id === rule.scenario))
      throw new Error(`Missing scenario: ${rule.scenario}`);
    const slots = rule.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      responses: allies.map((member) => ({
        name: byMember.get(member).name,
        ...evaluateProfileScenario(byMember.get(member), {
          id: rule.id,
          // There is no absence audit for these support slots. Unknown is not a negative finding.
          scope: `context-support:${rule.id}:${slot.id}`,
          goals: [slot],
        }),
      })),
    }));
    const assignments = [];
    function assign(i, occupied, chosen) {
      if (i === slots.length) {
        assignments.push(chosen);
        return;
      }
      for (const response of slots[i].responses.filter(usable)) {
        if (occupied.has(character(response.member))) continue;
        assign(i + 1, new Set([...occupied, character(response.member)]), [
          ...chosen,
          { slot: slots[i].id, ...response },
        ]);
      }
    }
    assign(0, new Set(), []);
    return {
      rule: rule.id,
      label: rule.label,
      scenario: rule.scenario,
      alternativeScenario: rule.alternativeScenario,
      status: assignments.length ? "conditional-play-option" : "not-established",
      slots,
      assignments,
      assumptions: rule.assumptions,
      explanation: assignments.length
        ? assignments
            .map((assignment) =>
              rule.explanationTemplate.replace(/\{([^}]+)\}/g, (_, slot) => {
                const actor = assignment.find((a) => a.slot === slot);
                if (!actor) throw new Error(`Unknown template slot: ${slot}`);
                return actor.name;
              })
            )
            .join(" ")
        : "현재 행동 자료에서 이 선택지를 뒷받침하는 서로 다른 두 동료의 수단을 확인하지 못했습니다.",
      boundary: rule.boundary,
      necessity: "not-established",
    };
  });
}

export function buildContextObservationIndex(rows) {
  const pairs = new Map();
  for (const row of rows) {
    if (
      !Number.isInteger(row.games) ||
      row.games <= 0 ||
      !Number.isFinite(row.wins) ||
      !Number.isFinite(row.rankSum) ||
      !Number.isFinite(row.rp)
    )
      throw new Error(`Invalid pooled observation: ${row.key}`);
    const members = row.key.split("+");
    if (members.length !== 3 || new Set(members.map(character)).size !== 3)
      throw new Error(`Invalid exact trio: ${row.key}`);
    members.forEach((member, i) => {
      const pair = pairKey(members.filter((_, j) => i !== j));
      if (!pairs.has(pair)) pairs.set(pair, new Map());
      if (pairs.get(pair).has(member)) throw new Error(`Duplicate exact trio: ${row.key}`);
      pairs.get(pair).set(member, {
        key: row.key,
        member,
        metrics: {
          games: row.games,
          wins: row.wins,
          winRate: row.wins / row.games,
          averageRank: row.rankSum / row.games,
          averageRP: row.rp / row.games,
        },
      });
    });
  }
  return pairs;
}

const comparison = (a, b) => {
  const differences = [
    a.winRate - b.winRate,
    b.averageRank - a.averageRank,
    a.averageRP - b.averageRP,
  ];
  if (differences.every((d) => d >= 0) && differences.some((d) => d > 0)) return "ahead";
  if (differences.every((d) => d <= 0) && differences.some((d) => d < 0)) return "behind";
  return differences.every((d) => d === 0) ? "equal" : "mixed";
};

export function compareContextObservation({ allies, eligiblePool, candidate, observationIndex }) {
  const options = observationIndex.get(pairKey(allies)) ?? new Map();
  const candidateRow = options.get(candidate);
  const comparisons = eligiblePool.map((member) => {
    const row = options.get(member);
    return {
      member,
      metrics: row?.metrics ?? null,
      relation: !row || !candidateRow ? "unknown" : comparison(candidateRow.metrics, row.metrics),
    };
  });
  const complete = Boolean(
    candidateRow && comparisons.length && comparisons.every((r) => r.metrics)
  );
  const status = !eligiblePool.length
    ? "no-selectable-pick"
    : !complete
      ? "incomplete"
      : comparisons.every((c) => c.relation === "ahead")
        ? "ahead-of-every-pool-pick"
        : comparisons.some((c) => c.relation === "behind")
          ? "beaten-by-pool-pick"
          : "mixed-or-equal";
  return {
    status,
    candidate: candidateRow ?? { member: candidate, metrics: null },
    comparisons,
    observedThirds: options.size,
    filters: "none-season-tier-sample-or-role",
    causalStatus: "not-established",
  };
}

/** Infer play options first. Pooled observations are attached after inference and never select a need. */
export function analyzePoolTeamContext({
  pool,
  allies,
  catalogue,
  scenarios,
  rules,
  observationIndex,
}) {
  const inferred = inferAllyPlayOptions({ allies, catalogue, scenarios, rules });
  const actionAnalysis = analyzePoolActions({ pool, allies, catalogue, scenarios });
  const byMember = new Map(catalogue.map((p) => [p.member, p]));
  const actionable = inferred.filter((p) => p.status === "conditional-play-option");
  const options = actionable.map((option) => ({
    ...option,
    assessment: actionAnalysis.assessments.find((a) => a.id === option.scenario),
  }));
  const candidates = actionAnalysis.candidates.flatMap((family) => {
    const additions = family.additions.filter((addition) =>
      options.some((o) => o.scenario === addition.scenario)
    );
    if (!additions.length) return [];
    return [
      {
        ...family,
        additions,
        planStatus: "conditional-new-option",
        weaknessStatus: "not-a-confirmed-pool-weakness",
        tradeoffs: options.flatMap((option) => {
          const addition = additions.find((a) => a.scenario === option.scenario);
          if (!addition) return [];
          const alternative = scenarios.find((s) => s.id === option.alternativeScenario);
          if (!alternative)
            throw new Error(`Missing alternative scenario: ${option.alternativeScenario}`);
          return actionAnalysis.eligiblePool.map((member) => {
            const existing = evaluateProfileScenario(byMember.get(member), alternative);
            const candidate = evaluateProfileScenario(byMember.get(family.members[0]), alternative);
            return {
              member,
              addedScenario: addition.scenario,
              existingAlternative: existing,
              candidateAlternative: candidate,
              addedRoutes: addition.routes,
              teamResponseChanges: family.members.map((candidateMember) => ({
                candidate: candidateMember,
                changes: compareTeamResponses({
                  existing: member,
                  candidate: candidateMember,
                  allies,
                  catalogue,
                  scenarios,
                }),
              })),
              explanation: usable(existing)
                ? `기존 ${byMember.get(member).name} 선택 시: ${existing.routes.map((r) => r.label).join("·")}. ${family.name} 선택 시 추가되는 수단: ${addition.routes.map((r) => r.label).join("·")}. 어느 구도가 더 유리한지는 교전 조건에 따라 달라집니다.`
                : "기존 픽의 다른 교전 선택지는 아직 충분히 확인하지 못했습니다.",
              limitation: usable(candidate)
                ? `후속 제어 수단은 ‘${candidate.routes.map((r) => r.label).join("·")}’이며, 해당 기술의 사용 조건도 충족해야 합니다.`
                : "새 후보의 후속 제어도 이 모델에서 확정하지 못했습니다.",
            };
          });
        }),
        sharedControlLinks: family.members.flatMap((member) => {
          const bonus = byMember
            .get(member)
            .actions.filter((a) => a.effects.includes("bonus-vs-movement-impaired"));
          return bonus.flatMap((action) =>
            allies.flatMap((ally) => {
              const controls = byMember
                .get(ally)
                .actions.filter((a) =>
                  a.effects.some((e) =>
                    ["hard-control", "area-slow", "persistent-area-slow"].includes(e)
                  )
                );
              return controls.length
                ? [
                    {
                      member,
                      action: action.id,
                      sources: action.sources,
                      conditions: action.conditions,
                      ally,
                      controls: controls.map((a) => ({
                        action: a.id,
                        sources: a.sources,
                        conditions: a.conditions,
                      })),
                      status: "conditional-skill-interaction",
                      uniqueness: "not-exclusive-to-this-pair",
                      explanation: `${byMember.get(ally).name}의 이동 방해가 적용된 동안 ‘${action.label}’ 효과를 활용할 여지가 있습니다. 실제 적중과 시간 중첩은 확인하지 못했습니다.`,
                    },
                  ]
                : [];
            })
          );
        }),
        observations: family.members.map((candidate) =>
          compareContextObservation({
            allies,
            eligiblePool: actionAnalysis.eligiblePool,
            candidate,
            observationIndex,
          })
        ),
        ranking: "not-established",
      },
    ];
  });
  return {
    method: POOL_CONTEXT_METHOD,
    pool,
    allies,
    pair: pairKey(allies),
    eligiblePool: actionAnalysis.eligiblePool,
    inferred,
    options,
    existingChoices: actionAnalysis.eligiblePool.map((member) => ({
      member,
      name: byMember.get(member).name,
      assessments: actionAnalysis.assessments.map((a) => ({
        scenario: a.id,
        ...a.picks.find((p) => p.member === member),
      })),
    })),
    allyContributions: allies.map((member) => ({
      member,
      name: byMember.get(member).name,
      actions: byMember.get(member).actions,
      stale: byMember.get(member).stale,
    })),
    allyResponses: actionAnalysis.assessments.map((a) => ({
      scenario: a.id,
      label: a.label,
      coverage: a.allyCoverage,
      responses: a.allyResponses,
    })),
    candidates,
    observedAlternatives: [...(observationIndex.get(pairKey(allies))?.values() ?? [])],
    unknownProfiles: actionAnalysis.unknownProfiles,
    conclusion: "conditional-options-with-observational-checks-not-a-final-ranking",
  };
}

/** A broad rule that gives the same addition in opposing contexts cannot rank the two contexts. */
export function contrastTeamContexts(contexts) {
  const grouped = new Map();
  for (const context of contexts) {
    for (const candidate of context.candidates) {
      for (const observation of candidate.observations) {
        const signature = JSON.stringify([
          observation.candidate.member,
          context.options
            .filter((o) => candidate.additions.some((a) => a.scenario === o.scenario))
            .map((o) => o.rule)
            .sort(),
          candidate.additions.map((a) => [a.scenario, a.routes.map((r) => r.action).sort()]).sort(),
        ]);
        if (!grouped.has(signature)) grouped.set(signature, []);
        grouped.get(signature).push({
          pair: context.pair,
          candidate: observation.candidate.member,
          observationStatus: observation.status,
          lostOptionsByExistingPick: candidate.tradeoffs.flatMap((t) =>
            t.teamResponseChanges
              .filter((r) => r.candidate === observation.candidate.member)
              .flatMap((r) =>
                r.changes
                  .filter((c) => c.delta === "lost-conditional-option")
                  .map((c) => ({
                    existing: t.member,
                    scenario: c.scenario,
                    label: c.label,
                    sources: c.existingResponse.routes.flatMap((route) => route.sources),
                    conditions: c.existingResponse.routes.flatMap(
                      (route) => route.requiredConditions
                    ),
                  }))
              )
          ),
        });
      }
    }
  }
  return [...grouped.values()]
    .filter(
      (items) =>
        items.some((i) => i.observationStatus === "ahead-of-every-pool-pick") &&
        items.some((i) => i.observationStatus === "beaten-by-pool-pick")
    )
    .map((items) => ({
      status: "same-play-option-opposing-observations",
      contexts: items,
      rankingDecision: "hold-general-recommendation",
      explanation:
        "같은 행동 연결이 가능한데 성적 방향은 다릅니다. 이 규칙만으로 어느 동료 조합에서 이 후보가 더 좋은지 구별할 수 없으므로 일괄 추천 근거로 승격하지 않습니다.",
      distinctionStatus: "conditional-response-costs-are-not-a-proven-cause-of-performance",
    }));
}
