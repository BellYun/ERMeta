"use client";

import { BarChart3, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import * as React from "react";
import type { ComboEntry, LabCharacter, LabData } from "@/components/features/lab/types";
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
  sample: string;
  games: string;
  collapse: string;
  more: string;
  strongLabel: string;
  weakLabel: string;
  insufficientSample: string;
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
    sample: "표본",
    games: "판",
    collapse: "접기",
    more: "더보기",
    strongLabel: "강한 조합",
    weakLabel: "약한 조합",
    insufficientSample: "표본 부족",
  },
  en: {
    title: "Role Combo RP",
    sampleChecking: "Checking role-combo samples",
    sample: "Sample",
    games: "games",
    collapse: "Collapse",
    more: "More",
    strongLabel: "Higher RP",
    weakLabel: "Lower RP",
    insufficientSample: "Limited sample",
  },
  ja: {
    title: "役割編成別RP",
    sampleChecking: "役割編成サンプルを確認中",
    sample: "サンプル",
    games: "試合",
    collapse: "閉じる",
    more: "もっと見る",
    strongLabel: "高RP",
    weakLabel: "低RP",
    insufficientSample: "サンプル不足",
  },
  "zh-Hans": {
    title: "定位组合 RP",
    sampleChecking: "正在确认定位组合样本",
    sample: "样本",
    games: "场",
    collapse: "收起",
    more: "更多",
    strongLabel: "较高 RP",
    weakLabel: "较低 RP",
    insufficientSample: "样本不足",
  },
  "zh-Hant": {
    title: "定位組合 RP",
    sampleChecking: "正在確認定位組合樣本",
    sample: "樣本",
    games: "場",
    collapse: "收起",
    more: "更多",
    strongLabel: "較高 RP",
    weakLabel: "較低 RP",
    insufficientSample: "樣本不足",
  },
};

interface RoleComboRpPanelProps {
  characterCode: number;
  selectedWeapon: number | null;
}

interface RoleComboData {
  role: string;
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
          <div className="h-9 rounded-md bg-[var(--color-surface-2)]" />
          <div className="h-48 rounded-md bg-[var(--color-surface-2)]" />
        </div>
      ) : !data ? (
        <div className="mx-4 mb-4 flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-center text-xs text-[var(--color-muted-foreground)]">
          {copy.sampleChecking}
        </div>
      ) : (
        <>
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
              className="flex min-h-[40px] items-center justify-center gap-1.5 border-t border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            >
              {expanded ? copy.collapse : copy.more}
              <ChevronDown className={cn("h-3.5 w-3.5", expanded && "rotate-180")} />
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
    <li className="border-b border-[var(--color-border)]/40 last:border-b-0">
      <div className="w-full py-1.5 text-left">
        <span className="mb-1.5 flex items-start justify-between gap-2">
          <span className="break-keep text-[11px] leading-snug text-[var(--color-muted-foreground)]">
            {localizeRoleText(entry.multiset, locale)}
          </span>
        </span>

        <span className={cn("flex items-center gap-1.5", !isStrong && "flex-row-reverse")}>
          <span
            aria-hidden="true"
            className="flex h-2 min-w-0 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)]"
            style={{ justifyContent: isStrong ? "flex-start" : "flex-end" }}
          >
            <span
              className="h-full rounded opacity-70"
              style={{
                width: `${pct}%`,
                backgroundColor: isStrong ? "var(--color-tier-s)" : "var(--color-danger)",
              }}
            />
          </span>
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
        </span>
      </div>
    </li>
  );
}
