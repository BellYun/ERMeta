import { ArrowRight, ChevronRight } from "lucide-react";
import Image from "next/image";
import itemNameMap from "@/../const/itemNameMap.json";
import { ItemIcon } from "@/components/character/shared";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { TRAIT_CORES, TRAIT_SUBS_SLOT1, TRAIT_SUBS_SLOT2 } from "@/utils/traitCodes";
import {
  characterDisplayName,
  apiRowToCombo,
  comboTier,
  weaponDisplayName,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "./types";

const ITEM_NAMES = itemNameMap as Record<string, string>;

function itemNameOf(code: number | null | undefined): string {
  if (code == null) return "";
  return ITEM_NAMES[String(code)] ?? `#${code}`;
}

function traitNameOf(
  names: Record<number, string> | undefined,
  code: number | null | undefined
): string {
  if (code == null) return "";
  return names?.[code] ?? `#${code}`;
}

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-foreground)]",
  S: "text-[var(--color-foreground)]",
  A: "text-[var(--color-foreground)]",
  B: "text-[var(--color-muted-foreground)]",
  C: "text-[var(--color-muted-foreground)]",
  D: "text-[var(--color-muted-foreground)]",
};

export interface CharacterDetailData {
  member: TrioWeaponMember;
  patchVersion: string;
  topTrait: TopTraitBuild | null;
  topBuild: TopEquipmentBuild | null;
  traitNames?: Record<number, string>;
}

export interface TopEquipmentBuild {
  mainCore: number | null;
  weapon: number | null;
  chest: number | null;
  head: number | null;
  arm: number | null;
  leg: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

export interface TraitSubOption {
  code: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

export interface TraitSecondaryInfo {
  secGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown";
  totalGames: number;
  pickRate: number;
  winRate: number;
  optionTrait1Options: TraitSubOption[];
  optionTrait2Options: TraitSubOption[];
}

export interface TopTraitBuild {
  mainGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown";
  groupPickRate: number;
  groupWinRate: number;
  totalGames: number;
  /** 표본 ≥ 20 옵션 중 winRate 최고. 최소 표본 미달 시 pickRate fallback. */
  mainCore: number | null;
  mainCoreSource?: "combo" | "global";
  mainCorePickRate: number;
  mainCoreWinRate: number;
  mainCoreGames: number;
  /** 같은 그룹의 가장 인기있는 (pickRate 최고) 코어 — 비교용 */
  popularCore: number | null;
  popularCorePickRate: number;
  popularCoreWinRate: number;
  sub1: number | null;
  sub1WinRate: number;
  sub2: number | null;
  sub2WinRate: number;
  /** 부특성 (sub group) + 옵션 픽률 최고 조합 */
  secondaryGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown" | null;
  secondaryPickRate: number;
  secondaryWinRate: number;
  secondaryOpt1: number | null;
  secondaryOpt1PickRate: number;
  secondaryOpt1WinRate: number;
  secondaryOpt2: number | null;
  secondaryOpt2PickRate: number;
  secondaryOpt2WinRate: number;
  mainCoreOptions?: TraitSubOption[];
  sub1Options?: TraitSubOption[];
  sub2Options?: TraitSubOption[];
  secondaries?: TraitSecondaryInfo[];
}

const TRAIT_GROUP_META: Record<
  TopTraitBuild["mainGroup"],
  { label: string; letter: string; bg: string; color: string; ring: string }
> = {
  havoc: {
    label: "파괴",
    letter: "파",
    bg: "bg-[var(--color-surface-2)]",
    color: "text-[var(--color-foreground)]",
    ring: "border-[var(--color-border)] bg-white",
  },
  fortification: {
    label: "저항",
    letter: "저",
    bg: "bg-[var(--color-surface-2)]",
    color: "text-[var(--color-foreground)]",
    ring: "border-[var(--color-border)] bg-white",
  },
  support: {
    label: "지원",
    letter: "지",
    bg: "bg-[var(--color-surface-2)]",
    color: "text-[var(--color-foreground)]",
    ring: "border-[var(--color-border)] bg-white",
  },
  chaos: {
    label: "혼돈",
    letter: "혼",
    bg: "bg-[var(--color-surface-2)]",
    color: "text-[var(--color-foreground)]",
    ring: "border-[var(--color-border)] bg-white",
  },
  unknown: {
    label: "기타",
    letter: "?",
    bg: "bg-[var(--color-surface-2)]",
    color: "text-[var(--color-muted-foreground)]",
    ring: "border-[var(--color-border)] bg-[var(--color-surface-3)]",
  },
};

function MemberAvatar({ member, size = "h-16 w-16" }: { member: TrioWeaponMember; size?: string }) {
  return (
    <Link
      href={`/character/${member.character}`}
      aria-label={`${characterDisplayName(member.character)} 캐릭터 페이지`}
      className={`relative ${size} shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-light)]`}
    >
      <Image
        src={getCharacterMiniWebpUrl(member.character)}
        alt={characterDisplayName(member.character)}
        fill
        sizes="64px"
        className="object-cover"
        unoptimized
      />
    </Link>
  );
}

function ItemThumb({ code, label }: { code: number | null; label: string }) {
  const name = itemNameOf(code);
  return (
    <div className="flex w-16 flex-col items-center gap-1 text-center">
      <ItemIcon code={code} size={40} />
      <span className="text-[9px] text-[var(--color-muted-foreground)]">{label}</span>
      {name && (
        <span className="line-clamp-2 text-[10px] leading-tight text-[var(--color-foreground)]">
          {name}
        </span>
      )}
    </div>
  );
}

function TraitThumb({
  code,
  label,
  size = 44,
  traitNames,
}: {
  code: number | null;
  label: string;
  size?: number;
  traitNames?: Record<number, string>;
}) {
  const name = traitNameOf(traitNames, code);
  return (
    <div className="flex w-20 flex-col items-center gap-1 text-center">
      <div
        className="relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)]"
        style={{ width: size, height: size }}
      >
        {code != null && code > 0 ? (
          <Image
            src={`/TraitSkill/TraitSkillIcon_${code}.png`}
            alt={name || label}
            width={size}
            height={size}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-muted-foreground)]">
            —
          </span>
        )}
      </div>
      <span className="text-[9px] text-[var(--color-muted-foreground)]">{label}</span>
      {name && (
        <span className="line-clamp-2 text-[10px] leading-tight text-[var(--color-foreground)]">
          {name}
        </span>
      )}
    </div>
  );
}

function TraitIconSmall({ code, size = 24 }: { code: number; size?: number }) {
  return (
    <Image
      src={`/TraitSkill/TraitSkillIcon_${code}.png`}
      alt={String(code)}
      width={size}
      height={size}
      className="shrink-0 rounded-sm"
      unoptimized
    />
  );
}

function buildOptionGrid(
  codes: number[] | undefined,
  options: TraitSubOption[] | undefined,
  selected: number | null,
  selectedPickRate = 0,
  selectedWinRate = 0,
  selectedGames = 0
): TraitSubOption[] {
  if (!codes) return [];

  const byCode = new Map((options ?? []).filter((o) => o.code != null).map((o) => [o.code, o]));
  return codes.map((code) => {
    const current = byCode.get(code);
    if (current) return current;
    return {
      code,
      totalGames: code === selected ? selectedGames : 0,
      pickRate: code === selected ? selectedPickRate : 0,
      winRate: code === selected ? selectedWinRate : 0,
    };
  });
}

function TraitTreeRow({
  options,
  traitNames,
}: {
  options: TraitSubOption[];
  traitNames?: Record<number, string>;
}) {
  const maxPick = Math.max(...options.map((o) => o.pickRate));
  return (
    <div className="flex w-full items-start justify-center gap-1.5 sm:gap-3">
      {options.map((opt) => {
        if (opt.code == null) return null;
        const isTop = opt.pickRate === maxPick && maxPick > 0;
        return (
          <div key={opt.code} className="flex shrink-0 flex-col items-center gap-1">
            <div
              className={cn(
                "rounded-full",
                isTop
                  ? "p-0.5 outline outline-1 outline-[var(--color-border-light)]"
                  : "opacity-35 grayscale"
              )}
            >
              <TraitIconSmall code={opt.code} size={isTop ? 36 : 28} />
            </div>
            <span
              className={cn(
                "max-w-[44px] truncate text-center text-[10px] font-medium sm:max-w-[56px]",
                isTop ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
              )}
            >
              {traitNameOf(traitNames, opt.code)}
            </span>
            <div className="flex gap-1 sm:gap-1.5">
              <span
                className={cn(
                  "font-mono text-[9px]",
                  isTop ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
                )}
              >
                {opt.pickRate.toFixed(1)}%
              </span>
              <span
                className={cn(
                  "font-mono text-[9px]",
                  opt.winRate >= 12.5
                    ? "text-[var(--color-accent-gold)]"
                    : "text-[var(--color-danger)]"
                )}
              >
                {opt.winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function topByPick(options: TraitSubOption[]): TraitSubOption | null {
  return [...options].sort((a, b) => b.pickRate - a.pickRate)[0] ?? null;
}

function TraitBlock({
  trait,
  traitNames,
}: {
  trait: TopTraitBuild | null;
  traitNames?: Record<number, string>;
}) {
  if (!trait) {
    return <p className="text-xs text-[var(--color-muted-foreground)]">특성 표본이 부족합니다.</p>;
  }
  const mainCoreOptions = buildOptionGrid(
    TRAIT_CORES[trait.mainGroup],
    trait.mainCoreOptions,
    trait.mainCore,
    trait.mainCorePickRate,
    trait.mainCoreWinRate,
    trait.mainCoreGames
  );
  const sub1Options = buildOptionGrid(
    TRAIT_SUBS_SLOT1[trait.mainGroup],
    trait.sub1Options,
    trait.sub1,
    0,
    trait.sub1WinRate
  );
  const sub2Options = buildOptionGrid(
    TRAIT_SUBS_SLOT2[trait.mainGroup],
    trait.sub2Options,
    trait.sub2,
    0,
    trait.sub2WinRate
  );
  const topMainCore = trait.mainCore ?? topByPick(mainCoreOptions)?.code ?? null;
  const secondaries =
    trait.secondaries && trait.secondaries.length > 0
      ? [
          [...trait.secondaries]
            .filter(
              (secondary) => secondary.secGroup !== trait.mainGroup && secondary.totalGames > 0
            )
            .sort((a, b) => b.pickRate - a.pickRate)[0],
        ].filter((secondary): secondary is TraitSecondaryInfo => secondary != null)
      : trait.secondaryGroup && trait.secondaryGroup !== trait.mainGroup
        ? [
            {
              secGroup: trait.secondaryGroup,
              totalGames: 0,
              pickRate: trait.secondaryPickRate,
              winRate: trait.secondaryWinRate,
              optionTrait1Options: buildOptionGrid(
                TRAIT_SUBS_SLOT1[trait.secondaryGroup],
                undefined,
                trait.secondaryOpt1,
                trait.secondaryOpt1PickRate,
                trait.secondaryOpt1WinRate
              ),
              optionTrait2Options: buildOptionGrid(
                TRAIT_SUBS_SLOT2[trait.secondaryGroup],
                undefined,
                trait.secondaryOpt2,
                trait.secondaryOpt2PickRate,
                trait.secondaryOpt2WinRate
              ),
            },
          ]
        : [];

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <div className="flex flex-col items-center gap-3">
          {topMainCore != null && (
            <div className="rounded border border-[var(--color-border)] bg-white p-1">
              <TraitIconSmall code={topMainCore} size={40} />
            </div>
          )}
          <TraitTreeRow options={mainCoreOptions} traitNames={traitNames} />
          <TraitTreeRow options={sub1Options} traitNames={traitNames} />
          <TraitTreeRow options={sub2Options} traitNames={traitNames} />
        </div>
      </div>

      {secondaries.length > 0 && (
        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-white">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2 sm:px-4">
            <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)] sm:text-xs">
              부특성 조합
            </span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div
              className={cn(
                "flex min-w-max gap-px bg-[var(--color-border)]/30 sm:grid sm:min-w-0",
                secondaries.length === 1 && "sm:grid-cols-1",
                secondaries.length === 2 && "sm:grid-cols-2",
                secondaries.length >= 3 && "sm:grid-cols-3"
              )}
            >
              {secondaries.map((sec) => {
                const secMeta = TRAIT_GROUP_META[sec.secGroup];
                const opt1 = buildOptionGrid(
                  TRAIT_SUBS_SLOT1[sec.secGroup],
                  sec.optionTrait1Options,
                  null
                );
                const opt2 = buildOptionGrid(
                  TRAIT_SUBS_SLOT2[sec.secGroup],
                  sec.optionTrait2Options,
                  null
                );
                return (
                  <div
                    key={sec.secGroup}
                    className="min-w-[220px] overflow-hidden bg-white p-3 sm:min-w-0 sm:p-4"
                  >
                    <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                            secMeta.bg
                          )}
                        >
                          <span className={cn("text-xs font-bold", secMeta.color)}>
                            {secMeta.letter}
                          </span>
                        </div>
                        <span className={cn("truncate text-xs font-bold", secMeta.color)}>
                          {secMeta.label}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1.5 font-mono text-[10px] sm:gap-2">
                        <span className="whitespace-nowrap text-[var(--color-muted-foreground)]">
                          픽 {sec.pickRate.toFixed(0)}%
                        </span>
                        <span
                          className={cn(
                            "whitespace-nowrap",
                            sec.winRate >= 12.5
                              ? "text-[var(--color-accent-gold)]"
                              : "text-[var(--color-danger)]"
                          )}
                        >
                          승 {sec.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col items-center gap-2">
                      <TraitTreeRow options={opt1} traitNames={traitNames} />
                      <TraitTreeRow options={opt2} traitNames={traitNames} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterDetailCard({ data }: { data: CharacterDetailData }) {
  const { member, patchVersion, topTrait, topBuild, traitNames } = data;
  return (
    <article className="char-card flex flex-col gap-3 p-3 sm:p-4">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
        <MemberAvatar member={member} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight text-[var(--color-foreground)]">
            {characterDisplayName(member.character)}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {weaponDisplayName(member.weapon)}
          </p>
        </div>
        <Link
          href={`/character/${member.character}`}
          className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
        >
          빌드
          <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </header>

      <section>
        <h3 className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          주요 특성 · 패치 {patchVersion}
        </h3>
        <div className="mt-2">
          <TraitBlock trait={topTrait} traitNames={traitNames} />
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          주요 아이템
        </h3>
        {!topBuild ? (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            해당 코어 기준 아이템 표본이 부족합니다.
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <ItemThumb code={topBuild.weapon} label="무기" />
              <ItemThumb code={topBuild.chest} label="옷" />
              <ItemThumb code={topBuild.head} label="머리" />
              <ItemThumb code={topBuild.arm} label="팔" />
              <ItemThumb code={topBuild.leg} label="다리" />
            </div>
            <p className="mt-2 font-mono text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
              승률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {topBuild.winRate.toFixed(1)}%
              </span>
              {" · "}픽률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {topBuild.pickRate.toFixed(2)}%
              </span>
              {" · "}
              {topBuild.totalGames.toLocaleString("ko-KR")} 매치
            </p>
          </>
        )}
      </section>
    </article>
  );
}

export function CharacterDetailGrid({ rows }: { rows: CharacterDetailData[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-border-light)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">캐릭터별 주요 빌드</h2>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">무기군별 호출</p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {rows.map((row) => (
          <CharacterDetailCard key={`${row.member.character}-${row.member.weapon}`} data={row} />
        ))}
      </div>
    </section>
  );
}

function coreForMember(row: ApiTrioWeaponRow, member: TrioWeaponMember): number | null {
  if (row.character1 === member.character && row.weaponType1 === member.weapon)
    return row.mainCore1;
  if (row.character2 === member.character && row.weaponType2 === member.weapon)
    return row.mainCore2;
  if (row.character3 === member.character && row.weaponType3 === member.weapon)
    return row.mainCore3;
  return null;
}

export function TraitComboBlock({
  combo,
  rows,
  traitNames,
}: {
  combo: TrioWeaponCombo;
  rows: ApiTrioWeaponRow[];
  traitNames?: Record<number, string>;
}) {
  const topRows = rows
    .filter((row) => apiRowToCombo(row).id === combo.id)
    .sort((a, b) => b.averageRP - a.averageRP)
    .slice(0, 3);

  if (topRows.length === 0) return null;

  return (
    <section className="dashboard-panel flex flex-col gap-3 p-4 sm:p-4">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-border-light)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">상위 특성 조합</h2>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">평균 RP 기준</p>
      </div>
      <div className="flex flex-col gap-2">
        {topRows.map((row, index) => (
          <div
            key={`${row.mainCore1}-${row.mainCore2}-${row.mainCore3}-${index}`}
            className="grid gap-3 rounded-md border border-[var(--color-border)] bg-white p-3 md:grid-cols-[44px_1fr_auto] md:items-center"
          >
            <span className="font-mono text-sm font-bold text-[var(--color-muted-foreground)]">
              #{index + 1}
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {combo.members.map((member) => (
                <div
                  key={`${member.character}-${member.weapon}`}
                  className="flex min-w-0 items-center gap-2 rounded-md bg-white px-2 py-1.5"
                >
                  <MemberAvatar member={member} size="h-8 w-8" />
                  <TraitThumb
                    code={coreForMember(row, member)}
                    label={characterDisplayName(member.character)}
                    size={34}
                    traitNames={traitNames}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 font-mono text-xs tabular-nums text-[var(--color-muted-foreground)] md:justify-end">
              <span>{row.totalGames.toLocaleString("ko-KR")}판</span>
              <span>승률 {row.winRate.toFixed(1)}%</span>
              <span className="font-bold text-[var(--color-accent-gold)]">
                {row.averageRP >= 0 ? "+" : ""}
                {row.averageRP.toFixed(1)} RP
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniComboCard({
  combo,
  detailHrefQueryString,
}: {
  combo: TrioWeaponCombo;
  detailHrefQueryString: string;
}) {
  const score = comboTier(combo.winRate, combo.averageRP, combo.averageRank, combo.totalGames);
  return (
    <Link
      href={`/trio-lab/${combo.id}${detailHrefQueryString}`}
      prefetch={false}
      scroll={false}
      className="char-card group flex flex-col gap-2 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-muted-foreground)]">유사 조합</span>
        <span className={`font-mono text-sm font-bold ${SCORE_COLOR[score] ?? ""}`}>{score}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {combo.members.map((m) => (
          <div
            key={`${m.character}-${m.weapon}`}
            className="relative h-9 w-9 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]"
          >
            <Image
              src={getCharacterMiniWebpUrl(m.character)}
              alt={characterDisplayName(m.character)}
              fill
              sizes="36px"
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
      <p className="line-clamp-1 text-[11px] font-medium text-[var(--color-foreground)]">
        {combo.members.map((m) => characterDisplayName(m.character)).join(" + ")}
      </p>
      <p className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
        승률 {combo.winRate.toFixed(1)}% · #{combo.averageRank.toFixed(1)}
      </p>
    </Link>
  );
}

export function SimilarBlock({
  detailHrefQueryString,
  listHref,
  similar,
}: {
  detailHrefQueryString: string;
  listHref: string;
  similar: TrioWeaponCombo[];
}) {
  const top = similar.slice(0, 4);
  if (top.length === 0) return null;
  return (
    <section className="dashboard-panel flex flex-col gap-3 p-4 sm:p-4">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-border-light)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          비슷한 조합 {top.length}개
        </h2>
        <Link
          href={listHref}
          scroll={false}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
        >
          실험실에서 더 보기
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {top.map((c) => (
          <MiniComboCard key={c.id} combo={c} detailHrefQueryString={detailHrefQueryString} />
        ))}
      </div>
    </section>
  );
}

export function StickySidebar({ combo }: { combo: TrioWeaponCombo }) {
  const score = comboTier(combo.winRate, combo.averageRP, combo.averageRank, combo.totalGames);
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <section className="dashboard-panel flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--color-muted-foreground)]">조합 점수</p>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className={`font-mono text-[2.8rem] font-bold leading-none ${SCORE_COLOR[score] ?? ""}`}
          >
            {score}
          </span>
          <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
            승률 · 평균 RP · 평균 순위 기반
          </p>
        </div>
        <dl className="mt-2 flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-[var(--color-muted-foreground)]">표본 수</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {combo.totalGames.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-[var(--color-muted-foreground)]">평균 RP</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {combo.averageRP >= 0 ? "+" : ""}
              {combo.averageRP.toFixed(1)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-[var(--color-muted-foreground)]">평균 순위</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              #{combo.averageRank.toFixed(1)}
            </dd>
          </div>
        </dl>
      </section>

      <div
        aria-label="광고 슬롯"
        className="flex h-[250px] items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)] text-[11px] text-[var(--color-muted-foreground)]"
      >
        AD · 300×250 · STICKY
      </div>
    </aside>
  );
}
