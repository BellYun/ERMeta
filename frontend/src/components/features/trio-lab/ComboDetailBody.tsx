import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  Wand2,
  Share2,
  ArrowDown,
  ArrowUp,
  RotateCw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ItemIcon } from "@/components/character/shared";
import type { PatchChange } from "@/data/10.1";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import {
  characterDisplayName,
  scoreFromWinRate,
  weaponDisplayName,
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
  patchChanges: PatchChange[];
  patchVersion: string;
  topTrait: TopTraitBuild | null;
  topBuild: TopEquipmentBuild | null;
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

const CHANGE_ICON = {
  buff: <ArrowUp className="h-3 w-3" strokeWidth={2.4} />,
  nerf: <ArrowDown className="h-3 w-3" strokeWidth={2.4} />,
  rework: <RotateCw className="h-3 w-3" strokeWidth={2.4} />,
} as const;

const CHANGE_LABEL = { buff: "버프", nerf: "너프", rework: "리워크" } as const;

const CHANGE_COLOR = {
  buff: "border-[rgba(74,222,128,0.32)] bg-[rgba(74,222,128,0.12)] text-[var(--color-stat-up)]",
  nerf: "border-[rgba(248,113,113,0.32)] bg-[rgba(248,113,113,0.12)] text-[var(--color-stat-down)]",
  rework:
    "border-[rgba(167,139,250,0.32)] bg-[rgba(167,139,250,0.12)] text-[var(--color-accent-purple)]",
} as const;

function PatchChangeRow({ change }: { change: PatchChange }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${CHANGE_COLOR[change.changeType]}`}
      >
        {CHANGE_ICON[change.changeType]}
        {CHANGE_LABEL[change.changeType]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--color-foreground)]">{change.target}</p>
        {change.valueSummary && (
          <p className="mt-0.5 font-mono text-[11px] text-[var(--color-muted-foreground)]">
            {change.valueSummary}
          </p>
        )}
      </div>
    </li>
  );
}

function ItemThumb({ code, label }: { code: number | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ItemIcon code={code} size={40} />
      <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </span>
    </div>
  );
}

function TraitThumb({
  code,
  label,
  size = 44,
}: {
  code: number | null;
  label: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)]"
        style={{ width: size, height: size }}
      >
        {code != null && code > 0 ? (
          <Image
            src={`/TraitSkill/TraitSkillIcon_${code}.png`}
            alt={label}
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
    </div>
  );
}

function TraitBlock({ trait }: { trait: TopTraitBuild | null }) {
  if (!trait) {
    return <p className="text-xs text-[var(--color-muted-foreground)]">특성 표본이 부족합니다.</p>;
  }
  const meta = TRAIT_GROUP_META[trait.mainGroup];
  const showsPopularComparison = trait.popularCore != null && trait.popularCore !== trait.mainCore;

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
          <TraitThumb code={trait.mainCore} label="고승률 코어" size={48} />
          <p className="font-mono text-[11px] tabular-nums text-[var(--color-stat-up)]">
            승률 {trait.mainCoreWinRate.toFixed(1)}%
          </p>
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            {trait.mainCoreGames.toLocaleString("ko-KR")}판 · 픽률{" "}
            {trait.mainCorePickRate.toFixed(1)}%
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <TraitThumb code={trait.sub1} label="서브 1" />
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            승률 {trait.sub1WinRate.toFixed(1)}%
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <TraitThumb code={trait.sub2} label="서브 2" />
          <p className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
            승률 {trait.sub2WinRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {showsPopularComparison && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-2">
          <TraitThumb code={trait.popularCore} label="인기 코어" size={32} />
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
    </>
  );
}

function CharacterDetailCard({ data }: { data: CharacterDetailData }) {
  const { member, patchChanges, patchVersion, topTrait, topBuild } = data;
  return (
    <article className="char-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
        <MemberAvatar member={member} />
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
          <TraitBlock trait={topTrait} />
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          이 특성에 맞는 추천 아이템
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

      <section className="border-t border-[var(--color-border)] pt-3">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          최근 패치 변동 · {patchVersion}
        </h3>
        {patchChanges.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            이번 패치에서 변경 사항 없음.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-[var(--color-border)]">
            {patchChanges.slice(0, 4).map((change, idx) => (
              <PatchChangeRow key={idx} change={change} />
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

export function CharacterDetailGrid({ rows }: { rows: CharacterDetailData[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          캐릭터별 추천 빌드 + 최근 패치
        </h2>
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

function MiniComboCard({ combo }: { combo: TrioWeaponCombo }) {
  const score = scoreFromWinRate(combo.winRate, combo.totalGames);
  return (
    <Link href={`/trio-lab/${combo.id}`} className="char-card group flex flex-col gap-2 p-3">
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

export function SimilarBlock({ similar }: { similar: TrioWeaponCombo[] }) {
  const top = similar.slice(0, 4);
  if (top.length === 0) return null;
  return (
    <section className="dashboard-panel flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          비슷한 조합 {top.length}개
        </h2>
        <Link
          href="/trio-lab"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
        >
          실험실에서 더 보기
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {top.map((c) => (
          <MiniComboCard key={c.id} combo={c} />
        ))}
      </div>
    </section>
  );
}

export function StickySidebar({ combo }: { combo: TrioWeaponCombo }) {
  const score = scoreFromWinRate(combo.winRate, combo.totalGames);
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
            승률 {combo.winRate.toFixed(1)}% 기반
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

      <section className="dashboard-panel flex flex-col gap-2.5 p-5">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
          다음 액션
        </p>
        <Link
          href={`/synergy?focus=${combo.members[0].character}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(251,191,36,0.32)] bg-[rgba(251,191,36,0.12)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-gold)] transition-colors hover:bg-[rgba(251,191,36,0.2)]"
        >
          <Wand2 className="h-4 w-4" strokeWidth={2.2} />이 조합 직접 만들어보기
        </Link>
        <Link
          href={`/synergy-detail?ally1=${combo.members[0].character}&ally2=${combo.members[1].character}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />내 픽으로 비슷한 조합 찾기
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.2} />
          조합 공유 / 북마크
        </button>
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
