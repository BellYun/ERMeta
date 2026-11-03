import { createHash } from "node:crypto";

export const POOL_ACTION_METHOD = "pool-actions-v1";
export function fingerprintActionScenario(scenario) {
  return sha(
    JSON.stringify(
      scenario.goals.map((g) => ({
        id: g.id,
        anyOf: g.anyOf.map((s) => ({
          effects: [...s.effects].sort(),
          deliveries: s.deliveries ? [...s.deliveries].sort() : null,
          activations: s.activations ? [...s.activations].sort() : null,
        })),
      }))
    )
  );
}
const sha = (text) => createHash("sha256").update(text).digest("hex");
export const fingerprintActionSources = (keys, l10n) =>
  sha(JSON.stringify([...keys].sort().map((key) => [key, l10n[key]])));
const effectRules = [
  ["hard-control", /기절|속박|공중에 띄/],
  ["ally-damage-absorption", /아군[^.\\]{0,100}보호막/],
  ["projectile-block", /투사체[^.\\]{0,100}(막아|제거)/],
  ["area-slow", /이동 속도[^.\\]{0,30}(감소|느려)/],
];

/** Source extraction proposes facts for expansion; an unreviewed proposal is never absence proof. */
export function buildActionCatalogue({ profileKeys, l10n, model }) {
  if (model.version !== 1) throw new Error("Unsupported action model");
  const keys = Object.keys(l10n);
  return [...new Set(profileKeys)].map((member) => {
    if (!/^\d+:\d+$/.test(member)) throw new Error(`Invalid profile: ${member}`);
    const [character, weapon] = member.split(":");
    const prefix = `Skill/LobbyDesc/10${character.padStart(2, "0")}`;
    const characterKeys = keys.filter((key) => key.startsWith(prefix));
    const weaponKey = `Skill/LobbyDesc/30${weapon.padStart(2, "0")}000`;
    const parts = [
      { entry: model.characters[character], keys: characterKeys, family: "character" },
      { entry: model.weapons[weapon], keys: l10n[weaponKey] ? [weaponKey] : [], family: "weapon" },
    ];
    const actions = [],
      stale = [];
    const validScopes = [];
    for (const part of parts) {
      const current = Boolean(
        part.entry &&
        part.keys.length &&
        part.entry.sourceFingerprint === fingerprintActionSources(part.keys, l10n)
      );
      validScopes.push(current ? part.entry.auditedScopes : []);
      for (const action of part.entry?.actions ?? []) {
        if (
          !action.sourceKeys.length ||
          action.sourceKeys.some((key) =>
            part.family === "character" ? !key.startsWith(prefix) : key !== weaponKey
          )
        )
          throw new Error(`Action source belongs to another profile: ${action.id}`);
        const badKeys = action.sourceKeys.filter(
          (key) => !l10n[key] || sha(l10n[key]) !== action.sourceSha256[key]
        );
        if (badKeys.length) {
          stale.push({ id: action.id, changedSources: badKeys });
          continue;
        }
        actions.push({
          ...action,
          sourceAudit: "source-grounded",
          reviewStatus: part.entry.reviewStatus,
          sources: action.sourceKeys.map((key) => ({
            key,
            text: l10n[key],
            sha256: sha(l10n[key]),
          })),
        });
      }
    }
    const sourceKeys = [...characterKeys, ...(l10n[weaponKey] ? [weaponKey] : [])];
    const proposals = sourceKeys.flatMap((key) => {
      const effects = effectRules
        .filter(([, pattern]) => pattern.test(l10n[key]))
        .map(([effect]) => effect);
      return effects.length
        ? [{ key, text: l10n[key], effects, status: "text-extraction-proposal" }]
        : [];
    });
    const auditedScopes = validScopes[0].filter((scope) => validScopes[1].includes(scope));
    return {
      member,
      name: l10n[`Character/Name/${character}`] ?? member,
      auditedScopes,
      scopeContracts: model.scopeContracts,
      actions,
      proposals,
      stale,
      sourceKeys,
      sourceFingerprint: fingerprintActionSources(sourceKeys, l10n),
      sourceAudit: auditedScopes.length ? "scoped-source-audit" : "partial-or-unreviewed",
    };
  });
}
function selectorMatches(action, selector) {
  return (
    selector.effects.every((effect) => action.effects.includes(effect)) &&
    (!selector.deliveries || selector.deliveries.includes(action.delivery)) &&
    (!selector.activations || selector.activations.includes(action.activation))
  );
}
function actionState(action, facts, unavailableResources) {
  const blocked = action.conditions
    .filter((c) => Object.hasOwn(facts, c.fact) && facts[c.fact] !== c.equals)
    .map((c) => c.explanation);
  for (const resource of action.resources)
    if (unavailableResources.includes(resource))
      blocked.push(`${resource}를 이 시간 창에서 사용할 수 없음`);
  const unknown = action.conditions.filter((c) => !Object.hasOwn(facts, c.fact));
  return { action, blocked, unknown };
}
export function evaluateProfileScenario(profile, scenario) {
  const facts = { ...(scenario.facts ?? {}), ...(scenario.factsByProfile?.[profile.member] ?? {}) };
  const unavailable = scenario.unavailableResourcesByProfile?.[profile.member] ?? [];
  const choices = scenario.goals.map((goal) => ({
    goal,
    routes: profile.actions
      .filter((action) => goal.anyOf.some((s) => selectorMatches(action, s)))
      .map((a) => actionState(a, facts, unavailable)),
  }));
  const methods = choices.flatMap((c) =>
    c.routes.map((r) => ({
      goal: c.goal.id,
      action: r.action.id,
      label: r.action.label,
      resources: r.action.resources,
      conditions: r.action.conditions,
      unknownConditions: r.unknown,
      blocked: r.blocked,
      limitations: r.action.limitations,
      sources: r.action.sources,
    }))
  );
  const missing = choices.filter((c) => !c.routes.length).map((c) => c.goal.id);
  if (missing.length)
    return {
      member: profile.member,
      status:
        profile.auditedScopes.includes(scenario.scope) &&
        profile.scopeContracts?.[scenario.scope] === fingerprintActionScenario(scenario)
          ? "gap"
          : "unknown",
      missingGoals: missing,
      methods,
      reasons: missing.map(
        (id) =>
          `현재 모델에서 ${scenario.goals.find((g) => g.id === id).label} 수단을 확인하지 못함`
      ),
      routes: [],
      sourceKeys: profile.sourceKeys,
    };
  let best = null;
  function search(i, resources, requiredFacts, route) {
    if (i === choices.length) {
      const conditional = route.reduce((sum, r) => sum + r.unknown.length, 0);
      if (!best || conditional < best.conditional) best = { conditional, route };
      return;
    }
    for (const candidate of choices[i].routes) {
      if (candidate.blocked.length || candidate.action.resources.some((r) => resources.has(r)))
        continue;
      if (
        candidate.unknown.some(
          (c) => requiredFacts.has(c.fact) && requiredFacts.get(c.fact) !== c.equals
        )
      )
        continue;
      const nextFacts = new Map(requiredFacts);
      candidate.unknown.forEach((c) => nextFacts.set(c.fact, c.equals));
      search(i + 1, new Set([...resources, ...candidate.action.resources]), nextFacts, [
        ...route,
        { goal: choices[i].goal.id, ...candidate },
      ]);
    }
  }
  search(0, new Set(), new Map(), []);
  if (!best)
    return {
      member: profile.member,
      status: "state-limited",
      missingGoals: [],
      methods,
      reasons: [...new Set(choices.flatMap((c) => c.routes.flatMap((r) => r.blocked)))].concat(
        "사용 조건·형태 또는 같은 시간 창의 스킬 자원을 함께 충족하는 경로를 확인하지 못함"
      ),
      routes: [],
      sourceKeys: profile.sourceKeys,
    };
  return {
    member: profile.member,
    status: best.conditional ? "conditional" : "available",
    missingGoals: [],
    reasons: [],
    methods,
    routes: best.route.map((r) => ({
      goal: r.goal,
      action: r.action.id,
      label: r.action.label,
      resources: r.action.resources,
      requiredConditions: r.unknown,
      limitations: r.action.limitations,
      sources: r.action.sources,
    })),
    sourceKeys: profile.sourceKeys,
  };
}

/** Each scenario is solved with one actual pick; abilities from different pool picks never combine. */
export function analyzePoolActions({ pool, catalogue, scenarios, allies = [] }) {
  if (!pool.length || new Set(pool).size !== pool.length) throw new Error("Invalid pool");
  const byMember = new Map(catalogue.map((p) => [p.member, p]));
  if (pool.some((m) => !byMember.has(m))) throw new Error("Unknown pool member");
  if (
    allies.length &&
    (allies.length !== 2 ||
      new Set(allies.map((m) => m.split(":")[0])).size !== 2 ||
      allies.some((m) => !byMember.has(m)))
  )
    throw new Error("Invalid allies");
  const allyCharacters = new Set(allies.map((m) => m.split(":")[0]));
  const eligiblePool = pool.filter((m) => !allyCharacters.has(m.split(":")[0]));
  const assessments = scenarios.map((scenario) => {
    if (!scenario.goals.length || !scenario.goals.every((g) => g.anyOf.length))
      throw new Error("Invalid scenario");
    const picks = eligiblePool.map((member) =>
      evaluateProfileScenario(byMember.get(member), scenario)
    );
    const allyResponses = allies.map((member) =>
      evaluateProfileScenario(byMember.get(member), scenario)
    );
    const allyCoverage = allyResponses.some((p) => ["available", "conditional"].includes(p.status))
      ? "has-response"
      : !allies.length
        ? "not-specified"
        : allyResponses.some((p) => p.status === "unknown")
          ? "unknown"
          : "not-established";
    const status = picks.some((p) => p.status === "available")
      ? "available"
      : picks.some((p) => p.status === "conditional")
        ? "conditional"
        : picks.some((p) => p.status === "unknown")
          ? "unknown"
          : picks.some((p) => p.status === "state-limited")
            ? "state-limited"
            : "gap";
    let explanation;
    if (!eligiblePool.length)
      explanation = "현재 픽들이 동료와 실험체가 겹쳐 선택 가능한 내 픽이 없습니다.";
    else if (allyCoverage === "has-response")
      explanation = "동료에게 대응 수단이 있어 이 역할을 내 픽풀의 필수 보완으로 잡지 않습니다.";
    else if (allyCoverage === "unknown")
      explanation =
        "동료의 관련 능력 검토가 부족해 내 픽풀이 반드시 맡아야 하는 역할인지 판단을 보류합니다.";
    else if (status === "available" || status === "conditional")
      explanation = `기존 픽 중 ${picks
        .filter((p) => ["available", "conditional"].includes(p.status))
        .map((p) => byMember.get(p.member).name)
        .join("·")}에게 대응 수단이 있습니다. 위치·형태·자원 조건을 확인해야 합니다.`;
    else if (status === "gap")
      explanation =
        "이 요구가 실제로 필요한 상황이라면, 검토한 기존 픽들의 능력 범위에서 직접 대응 수단을 확인하지 못했습니다.";
    else if (status === "state-limited")
      explanation =
        "행동 수단은 있지만 주어진 상태나 같은 시간 창의 스킬 자원 조건을 함께 충족하지 못합니다.";
    else explanation = "능력 자료가 미검토이거나 바뀌어 대응 여부를 판단하지 못합니다.";
    return {
      id: scenario.id,
      label: scenario.label,
      demandStatus: scenario.demandStatus,
      assumptions: scenario.assumptions,
      status: !eligiblePool.length ? "no-selectable-pick" : status,
      picks,
      explanation,
      allyResponses,
      allyCoverage,
      weaknessStatus: !eligiblePool.length
        ? "no-selectable-pick"
        : allyCoverage === "has-response"
          ? "ally-has-response"
          : allyCoverage === "unknown"
            ? "ally-coverage-unknown"
            : status === "gap"
              ? "conditional-scenario-gap"
              : "not-established",
    };
  });
  const selectedCharacters = new Set([...pool, ...allies].map((m) => m.split(":")[0]));
  const candidates = catalogue
    .filter((p) => !selectedCharacters.has(p.member.split(":")[0]))
    .map((profile) => {
      const additions = assessments
        .filter((a) => a.status === "gap" && !["has-response", "unknown"].includes(a.allyCoverage))
        .flatMap((a) => {
          const scenario = scenarios.find((s) => s.id === a.id);
          const result = evaluateProfileScenario(profile, scenario);
          return ["available", "conditional"].includes(result.status)
            ? [
                {
                  scenario: a.id,
                  label: a.label,
                  ...result,
                  explanation: `‘${a.label}’ 상황을 위한 추가 선택지: ${profile.name} — ${result.routes.map((r) => r.label).join("·")}. 사용 조건: ${result.routes.flatMap((r) => r.requiredConditions.map((c) => c.explanation)).join(" / ") || "추가로 확인할 입력 조건 없음"}`,
                },
              ]
            : [];
        });
      return {
        member: profile.member,
        name: profile.name,
        sourceAudit: profile.sourceAudit,
        additions,
        // No winner between weapons when the added route uses only shared character skills.
        capabilitySignature: JSON.stringify(
          additions.map((a) => [a.scenario, a.routes.map((r) => r.action)])
        ),
      };
    });
  const families = new Map();
  for (const c of candidates.filter((c) => c.additions.length)) {
    const key = `${c.member.split(":")[0]}:${c.capabilitySignature}`;
    if (!families.has(key))
      families.set(key, {
        name: c.name,
        members: [],
        additions: c.additions,
        weaponRanking: "not-established-for-shared-routes",
      });
    families.get(key).members.push(c.member);
  }
  return {
    method: POOL_ACTION_METHOD,
    pool,
    allies,
    eligiblePool,
    assessments,
    candidates: [...families.values()],
    unknownProfiles: catalogue
      .filter((p) => p.sourceAudit !== "scoped-source-audit")
      .map((p) => ({ member: p.member, proposalSources: p.proposals.map((s) => s.key) })),
    conclusionStatus: "proposed-conditional-scenarios",
    routeSelection: "feasibility-witness-not-an-optimal-combat-sequence",
    observationNote:
      "행동 수단과 사용 조건을 먼저 비교한 결과다. 성적을 근거로 역할을 역산한 결과가 아니다.",
  };
}
