"use client";

import { ArrowUpRight, Check, RotateCcw, Search, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { analytics } from "@/lib/analytics";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import {
  PROFILE_LAYER_AXES,
  type CharacterProfileAxis,
  type CharacterProfileLayer,
} from "@/lib/characterProfileAxes";
import {
  analyzeCharacterPool,
  getControlDifficultyLevel,
  type ControlDifficultyLevel,
  type PoolArchetypeKey,
  type PoolCoverageStatus,
  type PoolDifficultyPreference,
  type PoolDifficultyTendency,
  type PoolProfile,
  type PoolRecommendation,
  type PoolRoleScenario,
} from "@/lib/poolGapAnalysis";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ergg:manual-character-pool:v2";
const DIFFICULTY_STORAGE_KEY = "ergg:pool-difficulty-preference:v1";
const LAYERS: CharacterProfileLayer[] = ["function", "damage", "combat"];

const DIFFICULTY_PREFERENCE_OPTIONS: Array<{
  value: PoolDifficultyPreference;
  ko: string;
  fallback: string;
}> = [
  { value: "auto", ko: "자동", fallback: "Auto" },
  { value: "easy", ko: "쉬움 · 1~2", fallback: "Easy · 1–2" },
  { value: "medium", ko: "보통까지 · 1~3", fallback: "Moderate · 1–3" },
  { value: "any", ko: "제한 없음 · 1~5", fallback: "Any · 1–5" },
];

const AXIS_LABELS: Record<"ko" | "fallback", Record<CharacterProfileAxis, string>> = {
  ko: {
    engage: "교전 개시",
    frontline: "전열 유지",
    chase: "추격 압박",
    disrupt: "진형 붕괴",
    finish: "진입 마무리",
    zone: "공간 장악",
    peel: "후열 보호",
    burst: "순간 폭딜",
    sustainedDps: "지속 화력",
    mobility: "기동성",
    crowdControl: "CC",
    selfSustain: "자체 유지력",
    rangePressure: "사거리 압박",
  },
  fallback: {
    engage: "Engage",
    frontline: "Frontline",
    chase: "Chase",
    disrupt: "Disrupt",
    finish: "Finish",
    zone: "Zone",
    peel: "Peel",
    burst: "Burst",
    sustainedDps: "Sustained DPS",
    mobility: "Mobility",
    crowdControl: "CC",
    selfSustain: "Self-sustain",
    rangePressure: "Range pressure",
  },
};

const LAYER_LABELS: Record<"ko" | "fallback", Record<CharacterProfileLayer, string>> = {
  ko: { function: "전투 역할", damage: "화력", combat: "전투 방식" },
  fallback: { function: "Combat role", damage: "Damage", combat: "Combat profile" },
};

const ARCHETYPE_LABELS: Record<"ko" | "fallback", Record<PoolArchetypeKey, string>> = {
  ko: {
    melee: "근거리 딜러",
    tank: "탱커",
    marksman: "평타 원거리 딜러",
    caster: "스킬딜러",
    support: "지원가",
  },
  fallback: {
    melee: "Melee",
    tank: "Tank",
    marksman: "Marksman",
    caster: "Skill dealer",
    support: "Support",
  },
};

const STATUS_LABELS: Record<"ko" | "fallback", Record<PoolCoverageStatus, string>> = {
  ko: { vulnerable: "취약", limited: "선택지 부족", covered: "대응 가능" },
  fallback: { vulnerable: "Weak", limited: "Limited", covered: "Covered" },
};

const DIFFICULTY_TENDENCY_LABELS: Record<
  "ko" | "fallback",
  Record<PoolDifficultyTendency, string>
> = {
  ko: { easy: "쉬운 조작 선호", balanced: "보통 난이도", technical: "고숙련 픽 가능" },
  fallback: { easy: "Easy controls", balanced: "Moderate", technical: "Technical pool" },
};

const CONTROL_DIFFICULTY_LABELS: Record<
  "ko" | "fallback",
  Record<ControlDifficultyLevel, string>
> = {
  ko: { easy: "쉬움", medium: "보통", hard: "어려움" },
  fallback: { easy: "Easy", medium: "Moderate", hard: "Hard" },
};

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatRp(value: number, locale: string) {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  return (value >= 0 ? "+" : "") + number + " RP";
}

function capabilityStatus(value: number) {
  if (value < 0.45) return "low" as const;
  if (value < 0.72) return "medium" as const;
  return "enough" as const;
}

function rolePairLabel(scenario: Pick<PoolRoleScenario, "partnerRoles">) {
  return scenario.partnerRoles.join(" + ");
}

function statusClasses(status: PoolCoverageStatus) {
  switch (status) {
    case "vulnerable":
      return "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]";
    case "limited":
      return "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning-foreground)]";
    case "covered":
      return "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]";
  }
}

function recommendationReason(
  recommendation: PoolRecommendation,
  labels: Record<CharacterProfileAxis, string>,
  korean: boolean,
  difficultyPreference: PoolDifficultyPreference
) {
  const contexts = recommendation.improvements
    .slice(0, 2)
    .map((item) => item.partnerRoles.join(" + "))
    .join(korean ? " · " : ", ");
  const axes = recommendation.axisFills
    .slice(0, 2)
    .map((fill) => labels[fill.axis])
    .join(korean ? " · " : ", ");
  if (korean) {
    const axisReason = axes ? ` 현재 풀에 부족한 ${axes}도 새로 확보합니다.` : "";
    const difficultyReason =
      difficultyPreference === "any"
        ? " 난이도 제한 없이 조합 적합도를 우선했습니다."
        : difficultyPreference !== "auto"
          ? " 선택한 조작 난이도 범위에 맞습니다."
          : recommendation.difficultyPenalty > 0
            ? " 조작 부담은 현재 픽풀보다 높아 추천 점수에 보수적으로 반영했습니다."
            : " 현재 픽풀과 같거나 더 쉬운 조작 성향입니다.";
    return `${contexts} 조합에서 지금보다 나은 선택지를 만듭니다.${axisReason}${difficultyReason}`;
  }
  const axisReason = axes ? ` It also adds the missing ${axes}.` : "";
  const difficultyReason =
    difficultyPreference === "any"
      ? " Composition fit is prioritized without a difficulty limit."
      : difficultyPreference !== "auto"
        ? " It fits your selected control-difficulty range."
        : recommendation.difficultyPenalty > 0
          ? " Its higher control burden is conservatively reflected in the ranking."
          : " Its control burden is similar to or easier than your current pool.";
  return `Improves your options with ${contexts}.${axisReason}${difficultyReason}`;
}

interface PoolGapAnalyzerProps {
  profiles: PoolProfile[];
  locale: string;
}

export function PoolGapAnalyzer({ profiles, locale }: PoolGapAnalyzerProps) {
  const language = locale === "ko" ? "ko" : "fallback";
  const korean = language === "ko";
  const axisLabels = AXIS_LABELS[language];
  const layerLabels = LAYER_LABELS[language];
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState(korean ? "전체" : "All");
  const [difficultyPreference, setDifficultyPreference] =
    React.useState<PoolDifficultyPreference>("auto");
  const [storageReady, setStorageReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      const valid = new Set(profiles.map((profile) => profile.profileKey));
      if (Array.isArray(saved)) {
        setSelectedKeys(
          saved.filter((key): key is string => typeof key === "string" && valid.has(key))
        );
      }
      const savedDifficulty = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
      if (
        savedDifficulty === "auto" ||
        savedDifficulty === "easy" ||
        savedDifficulty === "medium" ||
        savedDifficulty === "any"
      ) {
        setDifficultyPreference(savedDifficulty);
      }
    } catch {
      // Manual pool selection works without local storage.
    } finally {
      setStorageReady(true);
    }
  }, [profiles]);

  React.useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
    } catch {
      // Manual pool selection works without local storage.
    }
  }, [selectedKeys, storageReady]);

  React.useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficultyPreference);
    } catch {
      // Difficulty selection still works without local storage.
    }
  }, [difficultyPreference, storageReady]);

  const profileByKey = React.useMemo(
    () => new Map(profiles.map((profile) => [profile.profileKey, profile])),
    [profiles]
  );
  const selectedProfiles = React.useMemo(
    () => selectedKeys.map((key) => profileByKey.get(key)).filter(Boolean) as PoolProfile[],
    [profileByKey, selectedKeys]
  );
  const analysis = React.useMemo(
    () => analyzeCharacterPool(selectedProfiles, profiles, { difficultyPreference }),
    [difficultyPreference, profiles, selectedProfiles]
  );
  const roles = React.useMemo(
    () => [...new Set(profiles.map((profile) => profile.role))],
    [profiles]
  );
  const selectedSet = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const allRoles = korean ? "전체" : "All";
  const filteredProfiles = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return profiles.filter((profile) => {
      if (roleFilter !== allRoles && profile.role !== roleFilter) return false;
      if (!normalized) return true;
      return (profile.characterName + " " + profile.weaponName + " " + profile.typeName)
        .toLocaleLowerCase(locale)
        .includes(normalized);
    });
  }, [allRoles, locale, profiles, query, roleFilter]);

  const toggleProfile = React.useCallback(
    (profile: PoolProfile) => {
      const removing = selectedKeys.includes(profile.profileKey);
      const nextKeys = removing
        ? selectedKeys.filter((key) => key !== profile.profileKey)
        : [...selectedKeys, profile.profileKey];
      setSelectedKeys(nextKeys);
      analytics.characterPoolProfileToggled({
        action: removing ? "removed" : "added",
        characterCode: profile.characterCode,
        weaponCode: profile.weapon,
        role: profile.role,
        poolSize: nextKeys.length,
      });
    },
    [selectedKeys]
  );

  const resetPool = React.useCallback(() => {
    analytics.characterPoolReset({ previousPoolSize: selectedKeys.length });
    setSelectedKeys([]);
  }, [selectedKeys.length]);

  const selectDifficultyPreference = React.useCallback(
    (nextPreference: PoolDifficultyPreference) => {
      if (nextPreference === difficultyPreference) return;
      analytics.characterPoolDifficultySelected({
        preference: nextPreference,
        previousPreference: difficultyPreference,
        poolSize: selectedProfiles.length,
      });
      setDifficultyPreference(nextPreference);
    },
    [difficultyPreference, selectedProfiles.length]
  );

  const coverageByAxis = React.useMemo(
    () => new Map(analysis.axisCoverage.map((coverage) => [coverage.axis, coverage])),
    [analysis.axisCoverage]
  );
  const scenarioCounts = React.useMemo(
    () =>
      analysis.scenarios.reduce<Record<PoolCoverageStatus, number>>(
        (counts, scenario) => {
          counts[scenario.status] += 1;
          return counts;
        },
        { vulnerable: 0, limited: 0, covered: 0 }
      ),
    [analysis.scenarios]
  );
  const lastRecommendationViewRef = React.useRef("");

  React.useEffect(() => {
    if (!storageReady || selectedProfiles.length === 0) return;
    const signature = [
      selectedKeys.toSorted().join(","),
      difficultyPreference,
      analysis.recommendations.map((recommendation) => recommendation.profile.profileKey).join(","),
    ].join("|");
    if (signature === lastRecommendationViewRef.current) return;
    lastRecommendationViewRef.current = signature;

    const topRecommendation = analysis.recommendations[0]?.profile;
    analytics.characterPoolRecommendationsViewed({
      poolSize: selectedProfiles.length,
      difficultyPreference,
      recommendationCount: analysis.recommendations.length,
      vulnerableCount: scenarioCounts.vulnerable,
      limitedCount: scenarioCounts.limited,
      coveredCount: scenarioCounts.covered,
      topCharacterCode: topRecommendation?.characterCode ?? null,
      topDifficultyRating: topRecommendation?.difficultyRating ?? null,
    });
  }, [
    analysis.recommendations,
    difficultyPreference,
    scenarioCounts.covered,
    scenarioCounts.limited,
    scenarioCounts.vulnerable,
    selectedKeys,
    selectedProfiles.length,
    storageReady,
  ]);

  return (
    <section
      id="pool-gap-analyzer"
      className="scroll-mt-24 overflow-hidden rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm"
      aria-labelledby="pool-gap-analyzer-title"
    >
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">Character Pool Gap Finder</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {korean
              ? "개인 전적 미사용 · 직접 고른 픽풀만 분석"
              : "No match history · manual pool only"}
          </span>
        </div>
        <h2
          id="pool-gap-analyzer-title"
          className="mt-2 text-xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-2xl"
        >
          {korean ? "내 캐릭터 풀에서 비어 있는 자리를 찾습니다" : "Find the gaps in your pool"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
          {korean
            ? "내가 플레이하는 실험체를 직접 고르면 가능한 아군 역할 조합 21가지를 모두 대입합니다. 현재 풀로 대응하기 어려운 경우와 같은 포지션에서 추가할 후보를 보여줍니다."
            : "Choose the characters you play. Every allied role pair is tested, then missing matchups and same-position additions are recommended."}
        </p>
      </header>

      <div className="grid min-w-0 xl:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.22fr)]">
        <div className="min-w-0 border-b border-[var(--color-border)] p-4 sm:p-5 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                {korean ? "내 캐릭터 풀" : "My character pool"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {korean
                  ? "전적을 불러오지 않습니다. 실제로 사용하는 실험체·무기를 모두 선택하세요."
                  : "No history is imported. Select every character and weapon you actually play."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-accent-muted)] px-2.5 py-1 text-xs font-bold tabular-nums text-[var(--color-accent-foreground)]">
                {korean ? "픽풀 " : "Pool "}
                {selectedProfiles.length}
              </span>
              {selectedProfiles.length > 0 ? (
                <button
                  type="button"
                  onClick={resetPool}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-3)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {korean ? "초기화" : "Reset"}
                </button>
              ) : null}
            </div>
          </div>

          {selectedProfiles.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedProfiles.map((profile) => (
                <button
                  key={profile.profileKey}
                  type="button"
                  onClick={() => toggleProfile(profile)}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-muted)] p-2 text-left"
                >
                  <Image
                    src={getCharacterMiniWebpUrl(profile.characterCode)}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{profile.characterName}</strong>
                    <span className="block truncate text-[10px] text-[var(--color-muted-foreground)]">
                      {profile.weaponName} · {profile.role}
                    </span>
                  </span>
                  <X className="h-3.5 w-3.5 shrink-0" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={korean ? "실험체 또는 무기 검색" : "Search character or weapon"}
              className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-sm outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center text-[var(--color-muted-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {[allRoles, ...roles].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                aria-pressed={roleFilter === role}
                className={cn(
                  "min-h-9 shrink-0 rounded-md border px-2.5 text-xs font-semibold",
                  roleFilter === role
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                )}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="mt-3 grid max-h-[32rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
            {filteredProfiles.map((profile) => {
              const selected = selectedSet.has(profile.profileKey);
              return (
                <button
                  key={profile.profileKey}
                  type="button"
                  onClick={() => toggleProfile(profile)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-md border p-2 text-left",
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                      : "border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                  )}
                >
                  <Image
                    src={getCharacterMiniWebpUrl(profile.characterCode)}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{profile.characterName}</strong>
                    <span className="block truncate text-[10px] text-[var(--color-muted-foreground)]">
                      {profile.weaponName} · {profile.role}
                    </span>
                  </span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          {selectedProfiles.length === 0 ? (
            <div className="grid min-h-[24rem] place-items-center text-center">
              <div className="max-w-sm">
                <Sparkles className="mx-auto h-7 w-7 text-[var(--color-accent)]" />
                <h3 className="mt-3 font-bold">
                  {korean ? "내가 사용하는 실험체를 선택하세요" : "Select your character pool"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {korean
                    ? "선택한 픽풀 전체를 기준으로 취약한 아군 조합과 추가할 캐릭터를 찾습니다."
                    : "Your whole pool is checked for weak ally combinations and useful additions."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 gap-7">
              <section
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                aria-labelledby="difficulty-preference-title"
              >
                <div>
                  <h3 id="difficulty-preference-title" className="text-sm font-bold">
                    {korean ? "추천 조작 난이도" : "Recommended control difficulty"}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                    {korean
                      ? "추천받을 공식 난이도 범위를 직접 고릅니다. 자동은 현재 픽풀의 난이도를 따릅니다."
                      : "Choose the official difficulty range for recommendations. Auto follows your current pool."}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {DIFFICULTY_PREFERENCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectDifficultyPreference(option.value)}
                      aria-pressed={difficultyPreference === option.value}
                      className={cn(
                        "min-h-10 rounded-md border px-2 text-xs font-semibold",
                        difficultyPreference === option.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-3)]"
                      )}
                    >
                      {option[language]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="min-w-0" aria-labelledby="pool-summary-title">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 id="pool-summary-title" className="text-base font-bold">
                      {korean ? "내 픽풀 요약" : "Pool summary"}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {korean
                        ? "픽풀에서는 캐릭터를 동시에 합치지 않고, 각 기능별로 가장 잘하는 선택지를 봅니다."
                        : "Pool coverage uses the best available pick for each capability."}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {analysis.difficultyTendency ? (
                      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-right">
                        <span className="block text-[10px] text-[var(--color-muted-foreground)]">
                          {korean
                            ? `현재 픽풀 난이도${analysis.difficultyUsesFallback ? " · 일부 추정" : ""}`
                            : `Current pool difficulty${analysis.difficultyUsesFallback ? " · partly estimated" : ""}`}
                        </span>
                        <strong className="text-sm">
                          {DIFFICULTY_TENDENCY_LABELS[language][analysis.difficultyTendency]}
                        </strong>
                      </div>
                    ) : null}
                    {analysis.preferredArchetype ? (
                      <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-3 py-2 text-right">
                        <span className="block text-[10px] text-[var(--color-muted-foreground)]">
                          {korean ? "추가 추천 포지션" : "Recommendation position"}
                        </span>
                        <strong className="text-sm text-[var(--color-accent-foreground)]">
                          {ARCHETYPE_LABELS[language][analysis.preferredArchetype]}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {LAYERS.map((layer) => (
                    <div
                      key={layer}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                    >
                      <h4 className="text-xs font-bold">{layerLabels[layer]}</h4>
                      <div className="mt-3 grid gap-2.5">
                        {PROFILE_LAYER_AXES[layer].map((axis) => {
                          const coverage = coverageByAxis.get(axis);
                          const value = coverage?.value ?? 0;
                          const status = capabilityStatus(value);
                          return (
                            <div key={axis}>
                              <div className="flex justify-between gap-2 text-[10px]">
                                <span className="font-semibold">{axisLabels[axis]}</span>
                                <span className="tabular-nums text-[var(--color-muted-foreground)]">
                                  {Math.round(value * 100)}%
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    status === "low"
                                      ? "bg-[var(--color-danger)]"
                                      : status === "medium"
                                        ? "bg-[var(--color-warning)]"
                                        : "bg-[var(--color-success)]"
                                  )}
                                  style={{ width: Math.round(value * 100) + "%" }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="min-w-0" aria-labelledby="pool-additions-title">
                <h3 id="pool-additions-title" className="text-base font-bold">
                  {korean ? "같은 포지션에서 추가할 후보" : "Same-position additions"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {korean
                    ? "주 포지션은 유지하면서 현재 풀의 취약 조합을 가장 많이 줄이는 순서입니다."
                    : "Candidates keep your main position while reducing the most weak matchups."}
                </p>
                <ol className="mt-3 min-w-0 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                  {analysis.recommendations.map((recommendation, index) => {
                    const profile = recommendation.profile;
                    return (
                      <li
                        key={profile.profileKey}
                        className="grid min-w-0 gap-3 py-4 md:grid-cols-[2rem_minmax(10rem,0.7fr)_minmax(0,1.3fr)_auto] md:items-center"
                      >
                        <span className="font-mono text-xs font-bold text-[var(--color-muted-foreground)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Image
                            src={getCharacterMiniWebpUrl(profile.characterCode)}
                            alt=""
                            width={44}
                            height={44}
                            className="h-11 w-11 shrink-0 rounded-md object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{profile.characterName}</p>
                            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                              {profile.weaponName} · {profile.typeName}
                            </p>
                            <span className="mt-1 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                              {korean ? "조작 " : "Controls "}
                              {
                                CONTROL_DIFFICULTY_LABELS[language][
                                  getControlDifficultyLevel(profile.controlDifficulty)
                                ]
                              }
                              {profile.difficultyRating != null
                                ? ` · ${profile.difficultyRating}/5`
                                : korean
                                  ? " · 추정"
                                  : " · estimated"}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs leading-5">
                            {recommendationReason(
                              recommendation,
                              axisLabels,
                              korean,
                              difficultyPreference
                            )}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {recommendation.improvements.slice(0, 3).map((improvement) => (
                              <span
                                key={improvement.key}
                                className="rounded-full bg-[var(--color-accent-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-accent-foreground)]"
                              >
                                {improvement.partnerRoles.join(" + ")}
                                {improvement.synergy
                                  ? " · " + formatRp(improvement.synergy.adjustedRp, locale)
                                  : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Link
                          href={
                            "/" +
                            locale +
                            "/character/" +
                            profile.characterCode +
                            (profile.weapon == null ? "" : "?weapon=" + profile.weapon)
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-bold text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-muted)]"
                          onClick={() =>
                            analytics.characterPoolRecommendationClicked({
                              characterCode: profile.characterCode,
                              weaponCode: profile.weapon,
                              rank: index + 1,
                              difficultyRating: profile.difficultyRating,
                              difficultyPreference,
                              poolSize: selectedProfiles.length,
                              improvedScenarioCount: recommendation.improvements.length,
                            })
                          }
                        >
                          {korean ? "상세" : "Details"}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="min-w-0" aria-labelledby="pool-scenarios-title">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 id="pool-scenarios-title" className="text-base font-bold">
                      {korean ? "모든 아군 조합 커버리지" : "All allied role combinations"}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {korean
                        ? "6개 역할의 중복 포함 조합 21가지를 전부 평가합니다. 수치는 시즌 10·11 표본을 내부 신뢰도 보정한 값입니다."
                        : "All 21 unordered role pairs are evaluated with reliability-adjusted long-term evidence."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    {(["vulnerable", "limited", "covered"] as PoolCoverageStatus[]).map(
                      (status) => (
                        <span
                          key={status}
                          className={cn("rounded-full border px-2 py-1", statusClasses(status))}
                        >
                          {STATUS_LABELS[language][status]} {scenarioCounts[status]}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-md border border-[var(--color-border)]">
                  <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
                    <thead className="bg-[var(--color-surface-2)] text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">{korean ? "아군 역할" : "Allies"}</th>
                        <th className="px-3 py-2.5 font-bold">{korean ? "상태" : "Status"}</th>
                        <th className="px-3 py-2.5 font-bold">
                          {korean ? "현재 풀 최선" : "Best current pick"}
                        </th>
                        <th className="px-3 py-2.5 font-bold">
                          {korean ? "판단 근거" : "Evidence"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {analysis.scenarios.map((scenario) => {
                        const pick = scenario.bestPick;
                        const synergy = pick?.synergy;
                        return (
                          <tr key={scenario.key} className="align-middle">
                            <td className="whitespace-nowrap px-3 py-3 font-bold">
                              {rolePairLabel(scenario)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-1 text-[10px] font-bold",
                                  statusClasses(scenario.status)
                                )}
                              >
                                {STATUS_LABELS[language][scenario.status]}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {pick ? (
                                <span className="font-semibold">
                                  {pick.profile.characterName} · {pick.profile.weaponName}
                                </span>
                              ) : (
                                <span className="text-[var(--color-muted-foreground)]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-[var(--color-muted-foreground)]">
                              {synergy ? (
                                <span>
                                  {formatRp(synergy.adjustedRp, locale)} ·{" "}
                                  {formatNumber(synergy.games, locale)}
                                  {korean ? "판" : " games"}
                                </span>
                              ) : pick ? (
                                <span>
                                  {korean
                                    ? "장기 표본 없음 · 기능 적합도 기준"
                                    : "Structural fit · no long-term sample"}
                                </span>
                              ) : (
                                <span>{korean ? "선택된 픽 없음" : "No pool pick"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
