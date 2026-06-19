"use client";

import { BarChart3, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import * as React from "react";
import type { ComboEntry, LabCharacter, LabData, LabGroup } from "@/components/features/lab/types";
import { useL10n } from "@/components/L10nProvider";
import type { RouteLocale } from "@/i18n/routing";
import { getComboRoles, type CharacterRole } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

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

type RoleComboCopy = {
  title: string;
  sampleChecking: string;
  pickCondition: string;
  sample: string;
  games: string;
  collapse: string;
  more: string;
  strongLabel: string;
  weakLabel: string;
  insufficientSample: string;
  noData: string;
  strong: (text: string) => string;
  mixed: (text: string, weakText: string) => string;
};

const ROLE_LABELS: Record<RouteLocale, Record<string, string>> = {
  ko: {
    탱커: "탱커",
    전사: "전사",
    암살자: "암살자",
    스킬딜러: "스킬딜러",
    "원거리 딜러": "원거리 딜러",
    지원가: "지원가",
  },
  en: {
    탱커: "Tank",
    전사: "Bruiser",
    암살자: "Assassin",
    스킬딜러: "Skill Damage",
    "원거리 딜러": "Ranged Carry",
    지원가: "Support",
  },
  ja: {
    탱커: "タンク",
    전사: "ファイター",
    암살자: "アサシン",
    스킬딜러: "スキルダメージ",
    "원거리 딜러": "遠距離キャリー",
    지원가: "サポート",
  },
  "zh-Hans": {
    탱커: "坦克",
    전사: "战士",
    암살자: "刺客",
    스킬딜러: "技能输出",
    "원거리 딜러": "远程输出",
    지원가: "辅助",
  },
  "zh-Hant": {
    탱커: "坦克",
    전사: "戰士",
    암살자: "刺客",
    스킬딜러: "技能輸出",
    "원거리 딜러": "遠程輸出",
    지원가: "輔助",
  },
};

const COPY: Record<RouteLocale, RoleComboCopy> = {
  ko: {
    title: "역할 조합별 RP",
    sampleChecking: "역할 조합 표본 확인 중",
    pickCondition: "픽 조건",
    sample: "표본",
    games: "판",
    collapse: "접기",
    more: "더보기",
    strongLabel: "강한 조합",
    weakLabel: "약한 조합",
    insufficientSample: "표본 부족",
    noData:
      "역할 조합별 RP 표본이 부족해 특정 상황을 단정하기 어렵습니다. 캐릭터 기본 지표와 현재 팀 조합의 역할 분포를 함께 봐야 합니다.",
    strong: (text: string) =>
      `역할 조합별 RP 기준으로 ${text}에서 성과가 높게 나왔습니다. 해당 역할군이 팀에 있을 때의 표본입니다.`,
    mixed: (text: string, weakText: string) =>
      `역할 조합별 RP 기준으로 ${text}에서 성과가 높게 나왔습니다. 반대로 ${weakText}처럼 낮게 나온 조합은 교전 개시, 앞라인, 마무리 화력 중 빠진 역할이 있었는지 함께 봐야 합니다.`,
  },
  en: {
    title: "Role Combo RP",
    sampleChecking: "Checking role-combo samples",
    pickCondition: "Pick Context",
    sample: "Sample",
    games: "games",
    collapse: "Collapse",
    more: "More",
    strongLabel: "Higher RP",
    weakLabel: "Lower RP",
    insufficientSample: "Limited sample",
    noData:
      "Role-combo RP samples are limited. Read this together with the character metrics and current team role spread.",
    strong: (text: string) =>
      `Role-combo RP is higher in ${text}. These samples show cases where those roles appeared on the team.`,
    mixed: (text: string, weakText: string) =>
      `Role-combo RP is higher in ${text}. Lower samples such as ${weakText} should be checked for missing engage, frontline, or finishing damage.`,
  },
  ja: {
    title: "役割編成別RP",
    sampleChecking: "役割編成サンプルを確認中",
    pickCondition: "ピック条件",
    sample: "サンプル",
    games: "試合",
    collapse: "閉じる",
    more: "もっと見る",
    strongLabel: "高RP",
    weakLabel: "低RP",
    insufficientSample: "サンプル不足",
    noData:
      "役割編成別RPのサンプルが少ないため、キャラクター基本指標とチーム内の役割分布を合わせて確認してください。",
    strong: (text: string) =>
      `役割編成別RPでは ${text} の成績が高く出ています。該当役割がチームにいる場合のサンプルです。`,
    mixed: (text: string, weakText: string) =>
      `役割編成別RPでは ${text} の成績が高く出ています。一方で ${weakText} のように低い編成は、開戦・前衛・決定力の不足も確認してください。`,
  },
  "zh-Hans": {
    title: "定位组合 RP",
    sampleChecking: "正在确认定位组合样本",
    pickCondition: "选择条件",
    sample: "样本",
    games: "场",
    collapse: "收起",
    more: "更多",
    strongLabel: "较高 RP",
    weakLabel: "较低 RP",
    insufficientSample: "样本不足",
    noData: "定位组合 RP 样本较少，需要与角色基础指标和当前队伍定位分布一起查看。",
    strong: (text: string) =>
      `定位组合 RP 中，${text} 的表现较高。这是队伍中出现对应定位时的样本。`,
    mixed: (text: string, weakText: string) =>
      `定位组合 RP 中，${text} 的表现较高。相反，${weakText} 等较低组合需要同时检查开战、前排或收割能力是否缺失。`,
  },
  "zh-Hant": {
    title: "定位組合 RP",
    sampleChecking: "正在確認定位組合樣本",
    pickCondition: "選擇條件",
    sample: "樣本",
    games: "場",
    collapse: "收起",
    more: "更多",
    strongLabel: "較高 RP",
    weakLabel: "較低 RP",
    insufficientSample: "樣本不足",
    noData: "定位組合 RP 樣本較少，需要與角色基礎指標和目前隊伍定位分布一起查看。",
    strong: (text: string) =>
      `定位組合 RP 中，${text} 的表現較高。這是隊伍中出現對應定位時的樣本。`,
    mixed: (text: string, weakText: string) =>
      `定位組合 RP 中，${text} 的表現較高。相反，${weakText} 等較低組合需要同時檢查開戰、前排或收割能力是否缺失。`,
  },
};

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

function localizeRoleText(value: string, locale: RouteLocale) {
  const labels = ROLE_LABELS[locale] ?? ROLE_LABELS.ko;
  return Object.entries(ROLE_LABELS.ko).reduce(
    (text, [koLabel]) => text.replaceAll(koLabel, labels[koLabel] ?? koLabel),
    value
  );
}

function formatComboEntry(entry: ComboEntry, copy: RoleComboCopy, locale: RouteLocale) {
  return `${localizeRoleText(entry.multiset, locale)}(${formatDelta(entry.delta)} RP, ${formatGames(
    entry.games
  )}${copy.games})`;
}

function buildPickTimingCopy(data: RoleComboData, copy: RoleComboCopy, locale: RouteLocale) {
  const strong = data.character.strong.slice(0, 2);
  const weak = data.character.weak[0] ?? null;

  if (strong.length === 0) {
    return copy.noData;
  }

  const strongText = strong.map((entry) => formatComboEntry(entry, copy, locale)).join(", ");

  if (!weak) return copy.strong(strongText);
  return copy.mixed(
    strongText,
    `${localizeRoleText(weak.multiset, locale)} (${formatDelta(weak.delta)} RP)`
  );
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
  const locale = useLocale() as RouteLocale;
  const { l10n } = useL10n();
  const copy = COPY[locale] ?? COPY.ko;
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
          <BarChart3 className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-[var(--color-foreground)]">
              {copy.title}
            </h2>
            {data ? (
              <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {localizeRoleText(data.role, locale)} ·{" "}
                {resolveWeaponName(data.character.weapon, l10n)} · {copy.sample}{" "}
                {formatGames(data.character.totalGames)}
                {copy.games}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2 px-4 pb-4">
          <div className="h-9 rounded-lg bg-[var(--color-surface-2)]" />
          <div className="h-48 rounded-lg bg-[var(--color-surface-2)]" />
        </div>
      ) : !data ? (
        <div className="mx-4 mb-4 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-white px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          {copy.sampleChecking}
        </div>
      ) : (
        <>
          {data.group ? (
            <div className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <div className="text-xs font-semibold text-[var(--color-foreground)]">
                {localizeRoleText(data.group.label, locale)}
              </div>
              {data.group.topPartnerRoles && data.group.topPartnerRoles.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.group.topPartnerRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--color-muted-foreground)]"
                    >
                      {localizeRoleText(role, locale)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
              {copy.pickCondition}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {buildPickTimingCopy(data, copy, locale)}
            </p>
          </div>

          <ComboDivergingList
            strong={data.character.strong}
            weak={data.character.weak}
            expanded={expanded}
            copy={copy}
            locale={locale}
          />

          {data.character.strong.length > 5 || data.character.weak.length > 5 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex min-h-[40px] items-center justify-center gap-1.5 border-t border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            >
              {expanded ? copy.collapse : copy.more}
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
  copy,
  locale,
}: {
  strong: ComboEntry[];
  weak: ComboEntry[];
  expanded: boolean;
  copy: RoleComboCopy;
  locale: RouteLocale;
}) {
  const visibleStrong = expanded ? strong : strong.slice(0, 5);
  const visibleWeak = expanded ? weak : weak.slice(0, 5);
  const maxDelta = Math.max(
    ...[...visibleStrong, ...visibleWeak].map((entry) => Math.abs(entry.delta)),
    1
  );

  return (
    <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-[1fr_1px_1fr] sm:divide-y-0">
      <ComboHalf
        label={copy.strongLabel}
        entries={visibleStrong}
        maxDelta={maxDelta}
        variant="strong"
        copy={copy}
        locale={locale}
      />
      <div aria-hidden="true" className="hidden self-stretch bg-[var(--color-border)] sm:block" />
      <ComboHalf
        label={copy.weakLabel}
        entries={visibleWeak}
        maxDelta={maxDelta}
        variant="weak"
        copy={copy}
        locale={locale}
      />
    </div>
  );
}

function ComboHalf({
  label,
  entries,
  maxDelta,
  variant,
  copy,
  locale,
}: {
  label: string;
  entries: ComboEntry[];
  maxDelta: number;
  variant: "strong" | "weak";
  copy: RoleComboCopy;
  locale: RouteLocale;
}) {
  return (
    <div className="px-4 pb-3 pt-2.5">
      <p
        className={cn(
          "mb-2 text-[11px] font-semibold",
          variant === "strong" ? "text-[var(--color-tier-s)]" : "text-[var(--color-danger)]"
        )}
      >
        {label}
      </p>

      {entries.length === 0 ? (
        <p className="py-2 text-xs italic text-[var(--color-muted-foreground)]">
          {copy.insufficientSample}
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {entries.map((entry) => (
            <ComboBarRow
              key={entry.multiset}
              entry={entry}
              pct={maxDelta > 0 ? Math.round((Math.abs(entry.delta) / maxDelta) * 100) : 0}
              variant={variant}
              copy={copy}
              locale={locale}
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
  copy,
  locale,
}: {
  entry: ComboEntry;
  pct: number;
  variant: "strong" | "weak";
  copy: RoleComboCopy;
  locale: RouteLocale;
}) {
  const isStrong = variant === "strong";

  return (
    <li className="border-b border-[var(--color-border)]/40 py-1.5 last:border-b-0">
      <p className="mb-1.5 break-keep text-[11px] leading-snug text-[var(--color-muted-foreground)]">
        {localizeRoleText(entry.multiset, locale)}
      </p>

      <div className={cn("flex items-center gap-1.5", !isStrong && "flex-row-reverse")}>
        <div
          aria-hidden="true"
          className="flex h-2 min-w-0 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)]"
          style={{ justifyContent: isStrong ? "flex-start" : "flex-end" }}
        >
          <div
            className="h-full rounded opacity-70"
            style={{
              width: `${pct}%`,
              backgroundColor: isStrong ? "var(--color-tier-s)" : "var(--color-danger)",
            }}
          />
        </div>
        <span className="w-[58px] shrink-0 text-right text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
          {formatGames(entry.games)}
          {copy.games}
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
