import { ChevronRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import type { RouteLocale } from "@/i18n/routing";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { comboTier, type TrioWeaponCombo } from "./types";

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-foreground)]",
  S: "text-[var(--color-foreground)]",
  A: "text-[var(--color-foreground)]",
  B: "text-[var(--color-muted-foreground)]",
  C: "text-[var(--color-muted-foreground)]",
  D: "text-[var(--color-muted-foreground)]",
};
const SMALL_SAMPLE_THRESHOLD = 10;
const VERIFIED_SAMPLE_THRESHOLD = 50;

const COPY = {
  ko: {
    reference: "참고용",
    verified: "검증됨",
    normalSample: "보통 표본",
    smallSample: "소표본",
    characterPage: (name: string) => `${name} 캐릭터 페이지`,
    selected: "선택",
    candidate: "후보",
    matches: "매치",
    winRate: "승률",
    averageRP: "평균 RP",
    averageRank: "평균 순위",
    detail: "조합 상세 보기",
    reasons: {
      highRp: "RP 효율 높음",
      positiveRp: "RP 양수권",
      cautionRp: "RP 주의",
      enoughSample: "표본 충분",
      lowSample: "표본 적음",
      highWin: "1위 전환 좋음",
      solidWin: "승률 준수",
      stableRank: "순방 안정",
    },
  },
  en: {
    reference: "Reference",
    verified: "Verified",
    normalSample: "Moderate sample",
    smallSample: "Small sample",
    characterPage: (name: string) => `${name} character page`,
    selected: "Selected",
    candidate: "Candidate",
    matches: "matches",
    winRate: "Win rate",
    averageRP: "Avg RP",
    averageRank: "Avg rank",
    detail: "View team detail",
    reasons: {
      highRp: "High RP value",
      positiveRp: "Positive RP",
      cautionRp: "RP caution",
      enoughSample: "Sample ready",
      lowSample: "Low sample",
      highWin: "Strong win conversion",
      solidWin: "Solid win rate",
      stableRank: "Stable placement",
    },
  },
  ja: {
    reference: "参考",
    verified: "検証済み",
    normalSample: "通常サンプル",
    smallSample: "小サンプル",
    characterPage: (name: string) => `${name} キャラクターページ`,
    selected: "選択",
    candidate: "候補",
    matches: "試合",
    winRate: "勝率",
    averageRP: "平均RP",
    averageRank: "平均順位",
    detail: "編成詳細を見る",
    reasons: {
      highRp: "RP効率が高い",
      positiveRp: "RPプラス",
      cautionRp: "RP注意",
      enoughSample: "サンプル十分",
      lowSample: "サンプル少",
      highWin: "1位転換が高い",
      solidWin: "勝率安定",
      stableRank: "順位安定",
    },
  },
  "zh-Hans": {
    reference: "参考",
    verified: "已验证",
    normalSample: "普通样本",
    smallSample: "小样本",
    characterPage: (name: string) => `${name} 角色页面`,
    selected: "已选",
    candidate: "候选",
    matches: "场",
    winRate: "胜率",
    averageRP: "平均 RP",
    averageRank: "平均名次",
    detail: "查看阵容详情",
    reasons: {
      highRp: "RP 效率高",
      positiveRp: "RP 为正",
      cautionRp: "RP 需注意",
      enoughSample: "样本充足",
      lowSample: "样本较少",
      highWin: "第一名转换好",
      solidWin: "胜率稳定",
      stableRank: "排名稳定",
    },
  },
  "zh-Hant": {
    reference: "參考",
    verified: "已驗證",
    normalSample: "普通樣本",
    smallSample: "小樣本",
    characterPage: (name: string) => `${name} 角色頁面`,
    selected: "已選",
    candidate: "候選",
    matches: "場",
    winRate: "勝率",
    averageRP: "平均 RP",
    averageRank: "平均名次",
    detail: "查看陣容詳情",
    reasons: {
      highRp: "RP 效率高",
      positiveRp: "RP 為正",
      cautionRp: "RP 需注意",
      enoughSample: "樣本充足",
      lowSample: "樣本較少",
      highWin: "第一名轉換好",
      solidWin: "勝率穩定",
      stableRank: "排名穩定",
    },
  },
} as const;

interface ComboGalleryCardProps {
  combo: TrioWeaponCombo;
  detailHref: string;
  characterOrder?: number[];
  rank: number;
  copyLocale: RouteLocale;
  getCharName: (code: number) => string;
  getWeaponName: (code: number) => string;
}

export function ComboGalleryCard({
  combo,
  detailHref,
  characterOrder = [],
  rank,
  copyLocale,
  getCharName,
  getWeaponName,
}: ComboGalleryCardProps) {
  const copy = COPY[copyLocale] ?? COPY.ko;
  const score = comboTier(combo.winRate, combo.averageRP, combo.averageRank, combo.totalGames);
  const positiveRP = combo.averageRP > 0;
  const isSmallSample = combo.totalGames < SMALL_SAMPLE_THRESHOLD;
  const selectedSet = React.useMemo(() => new Set(characterOrder), [characterOrder]);
  const orderedMembers = React.useMemo(
    () =>
      combo.members
        .map((member, index) => ({ member, index }))
        .sort((a, b) => {
          const orderA = characterOrder.indexOf(a.member.character);
          const orderB = characterOrder.indexOf(b.member.character);
          const rankA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
          const rankB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
          return rankA - rankB || a.index - b.index;
        })
        .map(({ member }) => member),
    [characterOrder, combo.members]
  );
  const recommendationReasons = React.useMemo(
    () => buildRecommendationReasons(combo, copy),
    [combo, copy]
  );
  const sampleLabel = isSmallSample
    ? copy.reference
    : combo.totalGames >= VERIFIED_SAMPLE_THRESHOLD
      ? copy.verified
      : copy.normalSample;

  return (
    <article className="char-card group relative flex h-full flex-col gap-3.5 p-4 transition-colors hover:border-[var(--color-border-light)] sm:p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 font-mono text-[11px] font-bold text-[var(--color-muted-foreground)]">
            #{String(rank).padStart(2, "0")}
          </span>
          {isSmallSample && (
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
              {copy.smallSample}
            </span>
          )}
          {!isSmallSample && (
            <span className="rounded border border-[var(--color-border)] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-foreground)]">
              {sampleLabel}
            </span>
          )}
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded border bg-white px-2.5 py-1 text-[12px] font-bold tabular-nums ${
            positiveRP
              ? "border-[var(--color-border)] text-[var(--color-stat-up)]"
              : "border-[var(--color-border)] text-[var(--color-stat-down)]"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />
          {positiveRP ? "+" : ""}
          {combo.averageRP.toFixed(1)} RP
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--color-border)] bg-white p-2.5">
        {orderedMembers.map((m) => (
          <div
            key={`${m.character}-${m.weapon}`}
            className="flex min-w-0 flex-col items-center gap-1.5"
          >
            <Link
              href={`/character/${m.character}`}
              aria-label={copy.characterPage(getCharName(m.character))}
              className={`relative block h-12 w-12 overflow-hidden rounded border bg-[var(--color-surface-2)] transition-colors hover:border-[var(--color-border-light)] sm:h-14 sm:w-14 ${
                selectedSet.has(m.character)
                  ? "border-[var(--color-border-light)]"
                  : "border-[var(--color-border)]"
              }`}
            >
              <Image
                src={getCharacterMiniWebpUrl(m.character)}
                alt={getCharName(m.character)}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </Link>
            <div className="min-w-0 text-center leading-tight">
              <p
                className={`mx-auto mb-1 w-fit rounded border bg-white px-1.5 py-0.5 text-[9px] font-bold ${
                  selectedSet.has(m.character)
                    ? "border-[var(--color-border-light)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {selectedSet.has(m.character) ? copy.selected : copy.candidate}
              </p>
              <p className="truncate text-xs font-semibold text-[var(--color-foreground)]">
                {getCharName(m.character)}
              </p>
              <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {getWeaponName(m.weapon)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <span
          className={`inline-flex h-8 min-w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 font-mono text-lg font-bold ${SCORE_COLOR[score] ?? ""}`}
        >
          {score}
        </span>
        <span className="rounded-md bg-[var(--color-surface-3)] px-2 py-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
          {combo.totalGames.toLocaleString("ko-KR")} {copy.matches}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
            {copy.winRate}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.winRate.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
            {copy.averageRP}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.averageRP >= 0 ? "+" : ""}
            {combo.averageRP.toFixed(1)}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
            {copy.averageRank}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            #{combo.averageRank.toFixed(1)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {recommendationReasons.map((reason) => (
          <span
            key={reason}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 text-[10px] font-semibold text-[var(--color-muted-foreground)]"
          >
            {reason}
          </span>
        ))}
      </div>

      <footer className="mt-auto pt-1">
        <Link
          href={detailHref}
          scroll={false}
          className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white py-2 text-xs font-bold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
        >
          {copy.detail}
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Link>
      </footer>
    </article>
  );
}

function buildRecommendationReasons(
  combo: TrioWeaponCombo,
  copy: (typeof COPY)[RouteLocale]
): string[] {
  const reasons: string[] = [];

  if (combo.averageRP >= 10) reasons.push(copy.reasons.highRp);
  else if (combo.averageRP >= 3) reasons.push(copy.reasons.positiveRp);
  else if (combo.averageRP < 0) reasons.push(copy.reasons.cautionRp);

  if (combo.totalGames >= VERIFIED_SAMPLE_THRESHOLD) reasons.push(copy.reasons.enoughSample);
  else if (combo.totalGames < SMALL_SAMPLE_THRESHOLD) reasons.push(copy.reasons.lowSample);

  if (combo.winRate >= 18) reasons.push(copy.reasons.highWin);
  else if (combo.winRate >= 14) reasons.push(copy.reasons.solidWin);

  if (combo.averageRank <= 3.5) reasons.push(copy.reasons.stableRank);

  return reasons.slice(0, 3);
}
