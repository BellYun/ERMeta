"use client";

import { BarChart2, ChevronDown, FileText, Loader2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { useL10n } from "@/components/L10nProvider";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl, getCharacterName } from "@/lib/characterMap";
import { DEFAULT_CHARACTER_ANALYSIS_TIER } from "@/lib/characterTier";
import type { Tier } from "@/lib/design-tokens";
import { buildHomeMetaView, type HomeMetaStats } from "@/lib/homeMetaShared";
import { cn } from "@/lib/utils";
import {
  getRepresentativeWeaponCode,
  getWeaponGroupImageUrl,
  resolveWeaponName,
} from "@/lib/weaponMap";
import { computeCharacterMetaTiers } from "../tier-ranking/utils";
import { CharacterHeader } from "./CharacterHeader";
import { RoleComboRpPanel } from "./RoleComboRpPanel";
import { fetchStats, fetchStatsHistory } from "./utils";

// 탭 콘텐츠: lazy import (코드 스플릿)
const PatchComparisonTab = React.lazy(() =>
  import("./PatchComparisonTab").then((m) => ({ default: m.PatchComparisonTab }))
);
const PatchLogTab = React.lazy(() =>
  import("./PatchLogTab").then((m) => ({ default: m.PatchLogTab }))
);
const CharacterDetailedAnalyzer = React.lazy(() =>
  import("@/components/character/CharacterDetailedAnalyzer").then((m) => ({
    default: m.CharacterDetailedAnalyzer,
  }))
);

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 text-[var(--color-muted-foreground)]" />
    </div>
  );
}

interface CharacterWeaponMember {
  profileKey: string;
  characterCode: number;
  characterName: string;
  weapon: number | null;
  weaponName: string;
}

interface PartnerTypeInfo {
  role: string;
  fitRole: string;
  members: CharacterWeaponMember[];
}

function formatPartnerTypeLabel(role: string, fitRole: string) {
  const typedFitRole = fitRole.endsWith("형") ? fitRole : `${fitRole}형`;
  return `${typedFitRole} ${role}`;
}

function getCharacterWeaponHref(member: CharacterWeaponMember) {
  const weaponQuery = member.weapon != null ? `?weapon=${member.weapon}` : "";
  return `/character/${member.characterCode}${weaponQuery}`;
}

function CharacterWeaponPortrait({
  member,
  size = "compact",
}: {
  member: CharacterWeaponMember;
  size?: "compact" | "large";
}) {
  const weaponImage = getWeaponGroupImageUrl(member.weapon);
  const isLarge = size === "large";

  return (
    <span className={cn("relative block shrink-0", isLarge ? "h-12 w-12" : "h-8 w-8")}>
      <Image
        src={getCharacterMiniWebpUrl(member.characterCode)}
        alt={member.characterName}
        width={isLarge ? 48 : 32}
        height={isLarge ? 48 : 32}
        className="h-full w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] object-cover object-top"
      />
      {weaponImage ? (
        <span
          className={cn(
            "weapon-icon-backdrop absolute -bottom-1 -right-1 grid place-items-center rounded-full border shadow-sm",
            isLarge ? "h-6 w-6" : "h-[18px] w-[18px]"
          )}
          title={member.weaponName}
        >
          <Image
            src={weaponImage}
            alt={member.weaponName}
            width={isLarge ? 20 : 14}
            height={isLarge ? 20 : 14}
            className={isLarge ? "h-5 w-5 object-contain" : "h-3.5 w-3.5 object-contain"}
          />
        </span>
      ) : null}
    </span>
  );
}

function PartnerTypePopover({
  partner,
  membersLabel,
  profileUnit,
}: {
  partner: PartnerTypeInfo;
  membersLabel: string;
  profileUnit: string;
}) {
  const label = formatPartnerTypeLabel(partner.role, partner.fitRole);

  if (partner.members.length === 0) {
    return <span>{label}</span>;
  }

  return (
    <span className="group/partner relative inline-block">
      <button
        type="button"
        className="rounded-sm border-b border-dashed border-[var(--color-muted-foreground)] text-left outline-none transition-colors hover:text-[var(--color-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label={`${label}, ${membersLabel} ${partner.members.length}${profileUnit}`}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-auto invisible fixed inset-x-4 top-1/2 z-[1000] w-auto -translate-y-1/2 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 opacity-0 shadow-xl transition group-hover/partner:visible group-hover/partner:opacity-100 group-focus-within/partner:visible group-focus-within/partner:opacity-100 sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(22rem,calc(100vw-3rem))] sm:translate-y-1 sm:before:absolute sm:before:-top-2 sm:before:left-0 sm:before:h-2 sm:before:w-full sm:before:content-[''] sm:group-hover/partner:translate-y-0 sm:group-focus-within/partner:translate-y-0"
      >
        <strong className="block text-sm text-[var(--color-foreground)]">{label}</strong>
        <span className="mt-2 block text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          {membersLabel} · {partner.members.length}
          {profileUnit}
        </span>
        <span className="mt-1.5 grid grid-cols-2 gap-1.5">
          {partner.members.map((member) => (
            <Link
              key={member.profileKey}
              href={getCharacterWeaponHref(member)}
              className="flex min-w-0 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1.5 text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <CharacterWeaponPortrait member={member} />
              <span className="min-w-0">
                <strong className="block truncate text-[11px] font-semibold">
                  {member.characterName}
                </strong>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted-foreground)]">
                  {member.weaponName}
                </span>
              </span>
            </Link>
          ))}
        </span>
      </span>
    </span>
  );
}

interface CharacterAnalysisClientProps {
  initialPatches?: string[];
  initialStats?: CharacterStatsResponse | null;
  initialPrevStats?: CharacterStatsResponse | null;
  initialMetaTiers?: Record<string, Tier>;
  code: number;
  weaponTypeProfiles?: Record<
    string,
    {
      groupName: string;
      subtype: string;
      peers: CharacterWeaponMember[];
      signatures: Array<{
        partnerTypes: Array<{
          role: string;
          fitRole: string;
          members: CharacterWeaponMember[];
        }>;
        roleComposition: string;
        games: number;
        adjustedResidual: number;
      }>;
    }
  >;
}

function readWeaponFromLocation(): number | null {
  if (typeof window === "undefined") return null;

  const rawWeapon = new URL(window.location.href).searchParams.get("weapon");
  if (!rawWeapon) return null;

  const weapon = Number.parseInt(rawWeapon, 10);
  return Number.isFinite(weapon) ? weapon : null;
}

function replaceWeaponInLocation(weapon: number | null) {
  const url = new URL(window.location.href);
  if (weapon != null) {
    url.searchParams.set("weapon", String(weapon));
  } else {
    url.searchParams.delete("weapon");
  }
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function CharacterAnalysisClient({
  initialPatches,
  initialStats,
  initialPrevStats,
  initialMetaTiers = {},
  code,
  weaponTypeProfiles = {},
}: CharacterAnalysisClientProps) {
  const { l10n } = useL10n();
  const t = useTranslations("characterAnalysis");
  const characterHeaderT = useTranslations("characterHeader");
  const patches = React.useMemo(() => initialPatches ?? [], [initialPatches]);
  const selectablePatches = patches;

  const [selectedTier, setSelectedTier] = React.useState<string>(DEFAULT_CHARACTER_ANALYSIS_TIER);
  const [selectedPatch, setSelectedPatch] = React.useState<string | null>(() => patches[0] ?? null);
  const [expandedSignatureProfiles, setExpandedSignatureProfiles] = React.useState<Set<string>>(
    () => new Set()
  );

  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(() =>
    getRepresentativeWeaponCode(code)
  );

  React.useEffect(() => {
    const requestedWeapon = readWeaponFromLocation();
    const weapon = requestedWeapon ?? getRepresentativeWeaponCode(code);
    setSelectedWeapon(weapon);

    // 클라이언트 라우팅은 서버 Proxy redirect를 거치지 않을 수 있으므로
    // 대표 무기 선택 상태를 현재 URL에도 명시한다.
    if (requestedWeapon == null && weapon != null) {
      replaceWeaponInLocation(weapon);
    }
  }, [code]);

  // 무기 변경 시 URL 파라미터 동기화
  const handleWeaponChange = React.useCallback((weapon: number | null) => {
    setSelectedWeapon(weapon);
    replaceWeaponInLocation(weapon);
  }, []);

  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>(
    () => {
      if (!patches.length) return [];
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null);
      if (initialStats) initial[0] = initialStats;
      if (initialPrevStats) initial[1] = initialPrevStats;
      return initial;
    }
  );
  const [loading, setLoading] = React.useState(false);

  const selectedPatchIndex = selectedPatch ? patches.indexOf(selectedPatch) : 0;
  const selectedPreviousPatch =
    selectedPatchIndex >= 0 ? (patches[selectedPatchIndex + 1] ?? null) : null;

  const stats = selectedPatchIndex >= 0 ? (allPatchStats[selectedPatchIndex] ?? null) : null;
  const previousStats =
    selectedPatchIndex >= 0 && selectedPreviousPatch
      ? (allPatchStats[selectedPatchIndex + 1] ?? null)
      : null;

  React.useEffect(() => {
    if (!selectablePatches.length) return;
    setSelectedPatch((current) =>
      current && selectablePatches.includes(current) ? current : selectablePatches[0]
    );
  }, [selectablePatches]);

  // 티어 변경 시 데이터 리페치
  React.useEffect(() => {
    let cancelled = false;

    if (selectedTier === DEFAULT_CHARACTER_ANALYSIS_TIER && initialStats) {
      setAllPatchStats(() => {
        const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null);
        if (initialStats) initial[0] = initialStats;
        if (initialPrevStats) initial[1] = initialPrevStats;
        return initial;
      });
      setSelectedWeapon(readWeaponFromLocation() ?? initialStats?.weapons?.[0]?.bestWeapon ?? null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const fetchPriorityStats = async () => {
      setLoading(true);
      setAllPatchStats([]);
      setSelectedWeapon(null);

      const priorityPatches = patches.slice(0, 2);
      const priorityResults = await Promise.all(
        priorityPatches.map((patch) => fetchStats(code, patch, selectedTier))
      );

      if (cancelled) {
        return;
      }

      const current = priorityResults[0] ?? null;
      setSelectedWeapon(readWeaponFromLocation() ?? current?.weapons?.[0]?.bestWeapon ?? null);

      setAllPatchStats((prev) => {
        const merged =
          prev.length === patches.length ? [...prev] : Array(patches.length).fill(null);
        priorityResults.forEach((result, index) => {
          merged[index] = result;
        });
        return merged;
      });
      setLoading(false);
    };

    void fetchPriorityStats().catch(() => {
      if (cancelled) {
        return;
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [code, initialPrevStats, initialStats, patches, selectedTier]);

  React.useEffect(() => {
    if (!patches.length) return;

    let cancelled = false;

    const fetchPatchHistory = async () => {
      const history = await fetchStatsHistory(code, patches, selectedTier);
      if (cancelled || !history) return;

      setAllPatchStats((prev) => {
        const merged =
          prev.length === patches.length ? [...prev] : Array(patches.length).fill(null);
        history.forEach((stat, index) => {
          merged[index] = stat;
        });
        return merged;
      });
    };

    void fetchPatchHistory();

    return () => {
      cancelled = true;
    };
  }, [code, patches, selectedTier]);

  React.useEffect(() => {
    let cancelled = false;
    if (!selectedPatch || selectedPatchIndex < 0) return;
    const hasSelectedPatchStats = Boolean(allPatchStats[selectedPatchIndex]);
    const hasPreviousPatchStats =
      !selectedPreviousPatch || Boolean(allPatchStats[selectedPatchIndex + 1]);
    if (hasSelectedPatchStats && hasPreviousPatchStats) return;

    const fetchSelectedPatch = async () => {
      setLoading(true);
      const [selectedResult, previousResult] = await Promise.all([
        hasSelectedPatchStats
          ? Promise.resolve(allPatchStats[selectedPatchIndex])
          : fetchStats(code, selectedPatch, selectedTier),
        selectedPreviousPatch && !hasPreviousPatchStats
          ? fetchStats(code, selectedPreviousPatch, selectedTier)
          : Promise.resolve(allPatchStats[selectedPatchIndex + 1] ?? null),
      ]);
      if (cancelled) return;

      setAllPatchStats((prev) => {
        const merged =
          prev.length === patches.length ? [...prev] : Array(patches.length).fill(null);
        merged[selectedPatchIndex] = selectedResult ?? null;
        if (selectedPreviousPatch) {
          merged[selectedPatchIndex + 1] = previousResult;
        }
        return merged;
      });
      setSelectedWeapon(
        readWeaponFromLocation() ?? selectedResult?.weapons?.[0]?.bestWeapon ?? null
      );
      setLoading(false);
    };

    void fetchSelectedPatch().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    allPatchStats,
    code,
    patches.length,
    selectedPatch,
    selectedPatchIndex,
    selectedPreviousPatch,
    selectedTier,
  ]);

  const currentPatch = selectedPatch ?? patches[0] ?? null;
  const initialPatch = patches[0] ?? null;
  const [homeMetaStatsByPatch, setHomeMetaStatsByPatch] = React.useState<
    Record<string, HomeMetaStats>
  >({});
  const currentHomeMetaStats = currentPatch ? homeMetaStatsByPatch[currentPatch] : undefined;
  const hasInitialMetaTiers = Object.keys(initialMetaTiers).length > 0;
  const isInitialMetaSelection =
    currentPatch === initialPatch && selectedTier === DEFAULT_CHARACTER_ANALYSIS_TIER;

  React.useEffect(() => {
    if (!currentPatch || currentHomeMetaStats) return;
    if (isInitialMetaSelection && hasInitialMetaTiers) return;

    const controller = new AbortController();

    fetch(`/api/meta/home-stats?patchVersion=${encodeURIComponent(currentPatch)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("메타 통계를 불러오지 못했습니다.");
        return (await response.json()) as HomeMetaStats;
      })
      .then((metaStats) => {
        setHomeMetaStatsByPatch((current) => ({
          ...current,
          [currentPatch]: metaStats,
        }));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [currentHomeMetaStats, currentPatch, hasInitialMetaTiers, isInitialMetaSelection]);

  const characterMetaTiers = React.useMemo(() => {
    if (!currentPatch) return {};

    if (currentHomeMetaStats) {
      const rankings = buildHomeMetaView(currentHomeMetaStats, selectedTier).rankingData.rankings;
      return computeCharacterMetaTiers(rankings, code);
    }

    return isInitialMetaSelection ? initialMetaTiers : {};
  }, [
    code,
    currentHomeMetaStats,
    currentPatch,
    initialMetaTiers,
    isInitialMetaSelection,
    selectedTier,
  ]);

  const selectedWeaponStat = React.useMemo(() => {
    if (!stats?.weapons || selectedWeapon == null) return null;
    return stats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null;
  }, [stats, selectedWeapon]);

  const prevSelectedWeaponStat = React.useMemo(() => {
    if (!previousStats?.weapons || selectedWeapon == null) return null;
    return previousStats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null;
  }, [previousStats, selectedWeapon]);

  const displayStat = selectedWeaponStat ?? stats;
  const displayPrevStat = prevSelectedWeaponStat ?? previousStats;
  const charTier =
    displayStat && displayStat.totalGames > 0 && selectedWeapon != null
      ? (characterMetaTiers[String(selectedWeapon)] ?? null)
      : null;

  const chartData = React.useMemo(() => {
    return patches
      .map((patch, i) => {
        const s = allPatchStats[i];
        if (!s) return null;
        let winRate: number;
        let averageRP: number;
        if (selectedWeapon != null && s.weapons) {
          const w = s.weapons.find((ws) => ws.bestWeapon === selectedWeapon);
          if (!w || w.totalGames === 0) return null;
          winRate = w.winRate;
          averageRP = w.averageRP;
        } else {
          if (s.totalGames === 0) return null;
          winRate = s.winRate;
          averageRP = s.averageRP;
        }
        return {
          patch,
          winRate: parseFloat(winRate.toFixed(2)),
          averageRP: parseFloat(averageRP.toFixed(1)),
        };
      })
      .filter((d): d is { patch: string; winRate: number; averageRP: number } => d != null)
      .reverse();
  }, [patches, allPatchStats, selectedWeapon]);

  const hasPreviousData = displayPrevStat != null && (displayPrevStat.totalGames ?? 0) > 0;
  const characterTypeEntries = React.useMemo(() => {
    if (selectedWeapon != null) {
      const profile =
        weaponTypeProfiles[String(selectedWeapon)] ?? weaponTypeProfiles.default ?? null;
      return profile ? [{ weaponCode: selectedWeapon, profile }] : [];
    }

    return Object.entries(weaponTypeProfiles).map(([weaponKey, profile]) => ({
      weaponCode: weaponKey === "default" ? null : Number(weaponKey),
      profile,
    }));
  }, [selectedWeapon, weaponTypeProfiles]);
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <section className="dashboard-panel character-analysis-panel p-3">
          <CharacterHeader
            selectedCode={code}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            patches={selectablePatches}
            selectedPatch={currentPatch}
            setSelectedPatch={setSelectedPatch}
            selectedWeapon={selectedWeapon}
            setSelectedWeapon={handleWeaponChange}
            stats={stats}
            previousStats={previousStats}
            displayStat={displayStat}
            displayPrevStat={displayPrevStat}
            charTier={charTier}
            currentPatch={currentPatch}
            loading={loading}
            hasPreviousData={hasPreviousData}
          />
        </section>

        {!loading && displayStat && displayStat.totalGames > 0 && (
          <section className="dashboard-panel character-analysis-panel p-3">
            <div className="mb-2.5 flex items-center gap-2">
              <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
                {t("quickSummary")}
              </h2>
            </div>
            <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
              {/* Tier */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  {t("summary.tier")}
                </span>
                {charTier && (
                  <span
                    className={cn(
                      "font-mono text-lg font-bold",
                      charTier === "S"
                        ? "text-[var(--color-tier-s)]"
                        : charTier === "A"
                          ? "text-[var(--color-tier-a)]"
                          : charTier === "B"
                            ? "text-[var(--color-tier-b)]"
                            : charTier === "C"
                              ? "text-[var(--color-tier-c)]"
                              : "text-[var(--color-tier-d)]"
                    )}
                  >
                    {charTier}
                  </span>
                )}
              </div>
              {/* Win Rate */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  {t("summary.winRate")}
                </span>
                <span
                  className={cn(
                    "font-mono text-lg font-bold tabular-nums",
                    displayStat.winRate > 12.5
                      ? "text-[var(--color-stat-up)]"
                      : "text-[var(--color-stat-down)]"
                  )}
                >
                  {displayStat.winRate.toFixed(1)}%
                </span>
              </div>
              {/* Best Weapon */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  {t("summary.recommendedWeapon")}
                </span>
                <span className="text-sm font-bold text-[var(--color-foreground)]">
                  {stats?.weapons?.[0]
                    ? resolveWeaponName(stats.weapons[0].bestWeapon ?? null, l10n)
                    : "\u2014"}
                </span>
              </div>
              {/* Pick Rate */}
              <div className="flex items-center justify-between bg-[var(--color-surface)] px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  {t("summary.pickRate")}
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-[var(--color-foreground)]">
                  {(stats?.pickRate ?? displayStat.pickRate).toFixed(1)}%
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      {characterTypeEntries.length > 0 ? (
        <section className="dashboard-panel character-analysis-panel character-type-panel z-[30] p-3">
          <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-2.5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
              {characterHeaderT("characterType")}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {characterHeaderT("characterTypeHint")}
            </p>
          </div>
          <div className="mt-2.5 grid gap-2.5">
            {characterTypeEntries.map(({ weaponCode, profile }) => {
              const signatureProfileKey = `${code}:${weaponCode ?? "default"}`;
              const signaturesExpanded = expandedSignatureProfiles.has(signatureProfileKey);
              const visibleSignatures = signaturesExpanded
                ? profile.signatures.slice(0, 20)
                : profile.signatures.slice(0, 5);

              return (
                <article
                  key={weaponCode ?? "default"}
                  className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1.2fr)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <CharacterWeaponPortrait
                          size="large"
                          member={{
                            profileKey: `${code}_${weaponCode ?? "default"}`,
                            characterCode: code,
                            characterName: getCharacterName(code),
                            weapon: weaponCode,
                            weaponName:
                              weaponCode == null
                                ? characterHeaderT("allWeapons")
                                : resolveWeaponName(weaponCode, l10n),
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {weaponCode == null
                              ? characterHeaderT("allWeapons")
                              : resolveWeaponName(weaponCode, l10n)}
                          </p>
                          <h3 className="mt-1 text-base font-bold leading-6 text-[var(--color-foreground)]">
                            {profile.groupName}
                          </h3>
                        </div>
                      </div>
                      <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
                        {characterHeaderT("internalType")} · {profile.subtype}
                      </span>
                    </div>

                    {profile.peers.length > 0 ? (
                      <div className="mt-2.5">
                        <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                          {characterHeaderT("sameType")}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {profile.peers.map((peer) => (
                            <Link
                              key={peer.profileKey}
                              href={getCharacterWeaponHref(peer)}
                              className="flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1 pr-2 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                            >
                              <CharacterWeaponPortrait member={peer} />
                              <span className="min-w-0">
                                <strong className="block truncate text-xs text-[var(--color-foreground)]">
                                  {peer.characterName}
                                </strong>
                                <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted-foreground)]">
                                  {peer.weaponName}
                                </span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {profile.signatures.length > 0 ? (
                    <div className="border-t border-[var(--color-border)] pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                      <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                        {characterHeaderT("signatureComposition")}
                      </p>
                      <ol className="mt-2 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                        {visibleSignatures.map((signature, index) => (
                          <li
                            key={`${signature.roleComposition}-${signature.partnerTypes
                              .map((partner) => `${partner.role}:${partner.fitRole}`)
                              .join("|")}`}
                            className="grid gap-1 py-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-2"
                          >
                            <span className="hidden text-xs font-bold tabular-nums text-[var(--color-muted-foreground)] sm:block">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-[var(--color-foreground)]">
                                {signature.partnerTypes.map((partner, partnerIndex) => (
                                  <React.Fragment key={`${partner.role}:${partner.fitRole}`}>
                                    {partnerIndex > 0 ? (
                                      <span className="text-[var(--color-muted-foreground)]">
                                        ×
                                      </span>
                                    ) : null}
                                    <PartnerTypePopover
                                      partner={partner}
                                      membersLabel={characterHeaderT("typeCharacters")}
                                      profileUnit={characterHeaderT("profileUnit")}
                                    />
                                  </React.Fragment>
                                ))}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                                {signature.roleComposition}
                              </p>
                            </div>
                            <p className="text-xs tabular-nums text-[var(--color-muted-foreground)] sm:text-right">
                              {signature.games.toLocaleString()} {characterHeaderT("gamesUnit")} ·{" "}
                              <span className="font-bold text-[var(--color-foreground)]">
                                {signature.adjustedResidual >= 0 ? "+" : ""}
                                {signature.adjustedResidual.toFixed(2)} RP
                              </span>
                            </p>
                          </li>
                        ))}
                      </ol>
                      {profile.signatures.length > 5 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSignatureProfiles((current) => {
                              const next = new Set(current);
                              if (next.has(signatureProfileKey)) {
                                next.delete(signatureProfileKey);
                              } else {
                                next.add(signatureProfileKey);
                              }
                              return next;
                            })
                          }
                          className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
                        >
                          {signaturesExpanded
                            ? characterHeaderT("collapseSignatures")
                            : characterHeaderT("showMoreSignatures", {
                                visible: visibleSignatures.length,
                                total: Math.min(profile.signatures.length, 20),
                              })}
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              signaturesExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <RoleComboRpPanel characterCode={code} selectedWeapon={selectedWeapon} />

      <div className="pt-0.5 sm:pt-1">
        <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="dashboard-kicker text-[10px] sm:text-[11px]">{t("deepDive")}</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="dashboard-panel character-analysis-panel p-3">
            <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
              <BarChart2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
                {t("patchComparison")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <PatchComparisonTab
                chartData={chartData}
                stats={stats}
                loading={loading}
                selectedCode={code}
              />
            </Suspense>
          </section>

          <section className="dashboard-panel character-analysis-panel p-3">
            <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
              <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
                {t("patchNotes")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <PatchLogTab patches={patches} selectedCode={code} />
            </Suspense>
          </section>

          <section className="dashboard-panel character-analysis-panel p-3 xl:col-span-2">
            <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
              <BarChart2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
                {t("stats")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <CharacterDetailedAnalyzer
                characterCode={code}
                tier={selectedTier}
                patchVersion={currentPatch}
                bestWeapon={selectedWeapon}
              />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
