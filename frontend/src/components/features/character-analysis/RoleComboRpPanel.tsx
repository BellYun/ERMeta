"use client";

import { BarChart3, ChevronDown } from "lucide-react";
import * as React from "react";
import type { ComboEntry, LabCharacter, LabData, LabGroup } from "@/components/features/lab/types";
import { getComboRoles, type CharacterRole } from "@/lib/characterMap";
import { cn } from "@/lib/utils";

const ROLE_TO_LAB_SLUG: Record<CharacterRole, string> = {
  탱커: "tanks",
  전사: "warriors",
  암살자: "assassins",
  스킬딜러: "skilldealers",
  "원거리 딜러": "rangers",
  지원가: "supports",
};

const ALL_LAB_SLUGS = [
  "tanks",
  "warriors",
  "assassins",
  "skilldealers",
  "rangers",
  "supports",
] as const;

const labDataCache = new Map<string, Promise<LabData | null>>();

interface RoleComboRpPanelProps {
  characterCode: number;
  selectedWeapon: number | null;
}

interface RoleComboData {
  role: string;
  group: LabGroup | null;
  character: LabCharacter;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatGames(value: number) {
  return value.toLocaleString("ko-KR");
}

function buildPickTimingCopy(data: RoleComboData) {
  const strong = data.character.strong.slice(0, 2);
  const weak = data.character.weak[0] ?? null;

  if (strong.length === 0) {
    return "역할 조합별 RP 표본이 부족해 특정 상황을 단정하기 어렵습니다. 이 경우 캐릭터 기본 지표와 실제 팀 조합의 부족한 역할을 먼저 확인하세요.";
  }

  const strongText = strong
    .map(
      (entry) => `${entry.multiset}(${formatDelta(entry.delta)} RP, ${formatGames(entry.games)}판)`
    )
    .join(", ");

  if (!weak) {
    return `역할 조합별 RP 기준으로 ${strongText}에서 성과가 좋습니다. 이 역할군을 팀원이 이미 확보했거나 남은 픽으로 맞출 수 있을 때 선택 가치가 올라갑니다.`;
  }

  return `역할 조합별 RP 기준으로 ${strongText}에서 성과가 좋습니다. 반대로 ${weak.multiset}(${formatDelta(
    weak.delta
  )} RP)처럼 낮게 나온 조합은 팀의 교전 개시, 앞라인, 마무리 화력 중 빠지는 역할이 없는지 확인한 뒤 선택하는 편이 안전합니다.`;
}

async function fetchLabData(slug: string): Promise<LabData | null> {
  const cached = labDataCache.get(slug);
  if (cached) return cached;

  const promise = fetch(`/data/lab/${slug}.json`).then((res) =>
    res.ok ? (res.json() as Promise<LabData>) : null
  );
  labDataCache.set(slug, promise);
  return promise;
}

function findLabCharacter(
  data: LabData,
  characterCode: number,
  weapon: number
): RoleComboData | null {
  const character = data.characters.find(
    (item) =>
      Number(item.characterCode) === Number(characterCode) && Number(item.weapon) === Number(weapon)
  );
  if (!character) return null;
  return {
    role: data.role,
    group: data.groups.find((group) => group.id === character.groupId) ?? null,
    character,
  };
}

async function findCharacterInSlugs(
  slugs: readonly string[],
  characterCode: number,
  selectedWeapon: number
): Promise<RoleComboData | null> {
  const results = await Promise.all(slugs.map((slug) => fetchLabData(slug)));

  for (const result of results) {
    if (!result) continue;
    const found = findLabCharacter(result, characterCode, selectedWeapon);
    if (found) return found;
  }

  return null;
}

export function RoleComboRpPanel({ characterCode, selectedWeapon }: RoleComboRpPanelProps) {
  const [data, setData] = React.useState<RoleComboData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (selectedWeapon == null) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);
    setExpanded(false);

    const weapon = selectedWeapon;
    const roles = getComboRoles(characterCode, weapon);
    const preferredSlugs = roles.map((role) => ROLE_TO_LAB_SLUG[role]).filter(Boolean);
    const uniquePreferredSlugs = [...new Set(preferredSlugs)];
    const remainingSlugs = ALL_LAB_SLUGS.filter((slug) => !uniquePreferredSlugs.includes(slug));

    async function loadData() {
      const preferredFound = await findCharacterInSlugs(
        uniquePreferredSlugs,
        characterCode,
        weapon
      );
      if (preferredFound) return preferredFound;
      return findCharacterInSlugs(remainingSlugs, characterCode, weapon);
    }

    loadData()
      .then((found) => {
        if (cancelled) return;
        setData(found);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [characterCode, selectedWeapon]);

  return (
    <section className="dashboard-panel flex min-w-0 flex-col overflow-hidden p-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex w-full items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <BarChart3 className="h-4 w-4 shrink-0 text-[var(--color-accent-gold)]" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black tracking-[-0.03em] text-[var(--color-foreground)]">
              역할 조합별 RP
            </h2>
            {data ? (
              <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {data.role} · {data.character.weaponName} · 표본{" "}
                {formatGames(data.character.totalGames)}판
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2 px-4 pb-4">
          <div className="h-9 animate-pulse rounded-lg bg-[rgba(255,255,255,0.045)]" />
          <div className="h-48 animate-pulse rounded-lg bg-[rgba(255,255,255,0.045)]" />
        </div>
      ) : !data ? (
        <div className="mx-4 mb-4 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          역할 조합 표본 확인 중
        </div>
      ) : (
        <>
          {data.group ? (
            <div className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] px-3 py-2">
              <div className="text-xs font-semibold text-[var(--color-foreground)]">
                {data.group.label}
              </div>
              {data.group.topPartnerRoles && data.group.topPartnerRoles.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.group.topPartnerRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-[rgba(255,255,255,0.055)] px-1.5 py-0.5 text-[9px] text-[var(--color-muted-foreground)]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mx-4 mb-3 rounded-lg border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.06)] px-3 py-2.5">
            <p className="text-[11px] font-bold text-[var(--color-primary)]">언제 뽑으면 좋은가</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {buildPickTimingCopy(data)}
            </p>
          </div>

          <ComboDivergingList
            strong={data.character.strong}
            weak={data.character.weak}
            expanded={expanded}
          />

          {data.character.strong.length > 5 || data.character.weak.length > 5 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex min-h-[40px] items-center justify-center gap-1.5 border-t border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-muted-foreground)] transition-colors hover:bg-[rgba(255,255,255,0.035)] hover:text-[var(--color-foreground)]"
            >
              {expanded ? "접기" : "더보기"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function ComboDivergingList({
  strong,
  weak,
  expanded,
}: {
  strong: ComboEntry[];
  weak: ComboEntry[];
  expanded: boolean;
}) {
  const visibleStrong = expanded ? strong : strong.slice(0, 5);
  const visibleWeak = expanded ? weak : weak.slice(0, 5);
  const maxDelta = Math.max(
    ...[...visibleStrong, ...visibleWeak].map((entry) => Math.abs(entry.delta)),
    1
  );

  return (
    <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-[1fr_1px_1fr] sm:divide-y-0">
      <ComboHalf label="강한 조합" entries={visibleStrong} maxDelta={maxDelta} variant="strong" />
      <div aria-hidden="true" className="hidden self-stretch bg-[var(--color-border)] sm:block" />
      <ComboHalf label="약한 조합" entries={visibleWeak} maxDelta={maxDelta} variant="weak" />
    </div>
  );
}

function ComboHalf({
  label,
  entries,
  maxDelta,
  variant,
}: {
  label: string;
  entries: ComboEntry[];
  maxDelta: number;
  variant: "strong" | "weak";
}) {
  return (
    <div className="px-4 pb-3 pt-2.5">
      <p
        className={cn(
          "mb-2 text-[11px] font-bold uppercase tracking-wide",
          variant === "strong" ? "text-[var(--color-tier-s)]" : "text-[var(--color-danger)]"
        )}
      >
        {label}
      </p>

      {entries.length === 0 ? (
        <p className="py-2 text-xs italic text-[var(--color-muted-foreground)]">표본 부족</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {entries.map((entry) => (
            <ComboBarRow
              key={entry.multiset}
              entry={entry}
              pct={maxDelta > 0 ? Math.round((Math.abs(entry.delta) / maxDelta) * 100) : 0}
              variant={variant}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ComboBarRow({
  entry,
  pct,
  variant,
}: {
  entry: ComboEntry;
  pct: number;
  variant: "strong" | "weak";
}) {
  const isStrong = variant === "strong";

  return (
    <li className="border-b border-[var(--color-border)]/40 py-1.5 last:border-b-0">
      <p className="mb-1.5 break-keep text-[11px] leading-snug text-[var(--color-muted-foreground)]">
        {entry.multiset}
      </p>

      <div className={cn("flex items-center gap-1.5", !isStrong && "flex-row-reverse")}>
        <div
          aria-hidden="true"
          className="flex h-[14px] min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
          style={{ justifyContent: isStrong ? "flex-start" : "flex-end" }}
        >
          <div
            className="h-full rounded-full opacity-80"
            style={{
              width: `${pct}%`,
              backgroundColor: isStrong ? "var(--color-tier-s)" : "var(--color-danger)",
            }}
          />
        </div>
        <span className="w-[58px] shrink-0 text-right text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
          {formatGames(entry.games)}판
        </span>
        <span
          className={cn(
            "w-[38px] shrink-0 text-xs font-semibold tabular-nums",
            isStrong
              ? "text-left text-[var(--color-tier-s)]"
              : "text-right text-[var(--color-danger)]"
          )}
        >
          {formatDelta(entry.delta)}
        </span>
      </div>
    </li>
  );
}
