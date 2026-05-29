import { ArrowRight, ChevronRight } from "lucide-react";
import Image from "next/image";
import itemNameMap from "@/../const/itemNameMap.json";
import { ItemIcon } from "@/components/character/shared";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
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
import {
  characterDisplayName,
  apiRowToCombo,
  comboTier,
  weaponDisplayName,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "./types";

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-accent-gold)]",
  S: "text-[var(--color-accent-gold)]",
  A: "text-[var(--color-primary-hover)]",
  B: "text-[#34d399]",
  C: "text-[var(--color-accent-purple)]",
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
}

const TRAIT_GROUP_META: Record<
  TopTraitBuild["mainGroup"],
  { label: string; color: string; ring: string }
> = {
  havoc: {
    label: "혼돈",
    color: "text-[#f87171]",
    ring: "border-[rgba(248,113,113,0.36)] bg-[rgba(248,113,113,0.12)]",
  },
  fortification: {
    label: "방어",
    color: "text-[#60a5fa]",
    ring: "border-[rgba(96,165,250,0.36)] bg-[rgba(96,165,250,0.12)]",
  },
  support: {
    label: "지원",
    color: "text-[#4ade80]",
    ring: "border-[rgba(74,222,128,0.36)] bg-[rgba(74,222,128,0.12)]",
  },
  chaos: {
    label: "혼돈",
    color: "text-[#a78bfa]",
    ring: "border-[rgba(167,139,250,0.36)] bg-[rgba(167,139,250,0.12)]",
  },
  unknown: {
    label: "기타",
    color: "text-[var(--color-muted-foreground)]",
    ring: "border-[var(--color-border)] bg-[var(--color-surface-3)]",
  },
};

function MemberAvatar({ member, size = "h-16 w-16" }: { member: TrioWeaponMember; size?: string }) {
  return (
    <Link
      href={`/character/${member.character}`}
      aria-label={`${characterDisplayName(member.character)} 캐릭터 페이지`}
      className={`relative ${size} shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] ring-1 ring-transparent transition-all hover:ring-[rgba(96,165,250,0.42)]`}
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

function MetricTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="metric-card p-4">
      <p className="metric-label">{label}</p>
      <p className="metric-value mt-1.5">{value}</p>
      {sublabel && (
        <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--color-muted-foreground)]">
          {sublabel}
        </p>
      )}
    </div>
  );
}

export function MetricsBlock({ combo }: { combo: TrioWeaponCombo }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricTile
        label="평균 승률"
        value={`${combo.winRate.toFixed(1)}%`}
        sublabel="trio-weapon 단위"
      />
      <MetricTile
        label="평균 RP"
        value={`${combo.averageRP >= 0 ? "+" : ""}${combo.averageRP.toFixed(0)}`}
        sublabel="3인 평균"
      />
      <MetricTile
        label="평균 순위"
        value={`#${combo.averageRank.toFixed(1)}`}
        sublabel="낮을수록 좋음"
      />
      <MetricTile
        label="표본 수"
        value={combo.totalGames.toLocaleString("ko-KR")}
        sublabel="누적 매치"
      />
    </section>
  );
}

function ItemThumb({ code, label }: { code: number | null; label: string }) {
  const name = itemNameOf(code);
  return (
    <div className="flex w-16 flex-col items-center gap-1 text-center">
      <ItemIcon code={code} size={40} />
      <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </span>
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
      <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </span>
      {name && (
        <span className="line-clamp-2 text-[10px] leading-tight text-[var(--color-foreground)]">
          {name}
        </span>
      )}
    </div>
  );
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
  const meta = TRAIT_GROUP_META[trait.mainGroup];
  const showsPopularComparison = trait.popularCore != null && trait.popularCore !== trait.mainCore;
  const isComboCore = trait.mainCoreSource === "combo";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.ring} ${meta.color}`}
        >
          {meta.label} 메인
        </span>
        <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
          그룹 픽률 {trait.groupPickRate.toFixed(1)}% · 그룹 승률{" "}
          <span className="font-bold text-[var(--color-foreground)]">
            {trait.groupWinRate.toFixed(1)}%
          </span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <TraitThumb
            code={trait.mainCore}
            label={isComboCore ? "조합 코어" : "고승률 코어"}
            size={48}
            traitNames={traitNames}
          />
          <p className="font-mono text-[11px] tabular-nums text-[var(--color-stat-up)]">
            승률 {trait.mainCoreWinRate.toFixed(1)}%
          </p>
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            {trait.mainCoreGames.toLocaleString("ko-KR")}판
            {!isComboCore && ` · 픽률 ${trait.mainCorePickRate.toFixed(1)}%`}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <TraitThumb code={trait.sub1} label="서브 1" traitNames={traitNames} />
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            승률 {trait.sub1WinRate.toFixed(1)}%
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <TraitThumb code={trait.sub2} label="서브 2" traitNames={traitNames} />
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            승률 {trait.sub2WinRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {showsPopularComparison && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-2">
          <TraitThumb
            code={trait.popularCore}
            label="인기 코어"
            size={32}
            traitNames={traitNames}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
              가장 많이 쓰는 코어 (비교용)
            </p>
            <p className="font-mono text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
              픽률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {trait.popularCorePickRate.toFixed(1)}%
              </span>
              {" · "}승률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {trait.popularCoreWinRate.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      )}

      {trait.secondaryGroup && (trait.secondaryOpt1 != null || trait.secondaryOpt2 != null) && (
        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${TRAIT_GROUP_META[trait.secondaryGroup].ring} ${TRAIT_GROUP_META[trait.secondaryGroup].color}`}
            >
              {TRAIT_GROUP_META[trait.secondaryGroup].label} 부특성 · 픽률 1위
            </span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
              부특성 픽률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {trait.secondaryPickRate.toFixed(1)}%
              </span>
              {" · "}승률{" "}
              <span className="font-bold text-[var(--color-foreground)]">
                {trait.secondaryWinRate.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div className="flex flex-col items-center gap-1">
              <TraitThumb
                code={trait.secondaryOpt1}
                label="옵션 1"
                size={36}
                traitNames={traitNames}
              />
              <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                픽 {trait.secondaryOpt1PickRate.toFixed(1)}%
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TraitThumb
                code={trait.secondaryOpt2}
                label="옵션 2"
                size={36}
                traitNames={traitNames}
              />
              <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                픽 {trait.secondaryOpt2PickRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CharacterDetailCard({ data }: { data: CharacterDetailData }) {
  const { member, patchVersion, topTrait, topBuild, traitNames } = data;
  return (
    <article className="char-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
        <MemberAvatar member={member} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold leading-tight text-[var(--color-foreground)]">
            {characterDisplayName(member.character)}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {weaponDisplayName(member.weapon)}
          </p>
        </div>
        <Link
          href={`/character/${member.character}`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-foreground)] transition-colors hover:border-[rgba(96,165,250,0.32)] hover:bg-[rgba(96,165,250,0.08)] hover:text-[var(--color-primary-hover)]"
        >
          빌드
          <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </header>

      <section>
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          추천 특성 · 패치 {patchVersion}
        </h3>
        <div className="mt-2">
          <TraitBlock trait={topTrait} traitNames={traitNames} />
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          추천 아이템
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
      <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">캐릭터별 추천 빌드</h2>
        <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
          무기군별 호출
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
    <section className="dashboard-panel flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">상위 특성 조합</h2>
        <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
          평균 RP 기준
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {topRows.map((row, index) => (
          <div
            key={`${row.mainCore1}-${row.mainCore2}-${row.mainCore3}-${index}`}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/72 p-3"
          >
            <span className="w-8 font-mono text-sm font-black text-[var(--color-muted-foreground)]">
              #{index + 1}
            </span>
            <div className="flex flex-wrap gap-3">
              {combo.members.map((member) => (
                <div
                  key={`${member.character}-${member.weapon}`}
                  className="flex items-center gap-2"
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
            <div className="ml-auto flex items-center gap-4 font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">
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
        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
          유사 조합
        </span>
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
    <section className="dashboard-panel flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          비슷한 조합 {top.length}개
        </h2>
        <Link
          href={listHref}
          scroll={false}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
        >
          실험실에서 더 보기
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      <section className="dashboard-panel flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
            조합 점수
          </p>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className={`font-mono text-[3.4rem] font-black leading-none tracking-tighter ${SCORE_COLOR[score] ?? ""}`}
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
              {combo.averageRP.toFixed(0)}
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
        className="flex h-[250px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)] text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)]"
      >
        AD · 300×250 · STICKY
      </div>
    </aside>
  );
}
