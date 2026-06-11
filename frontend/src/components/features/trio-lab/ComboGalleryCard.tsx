import { ChevronRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { characterDisplayName, comboTier, weaponDisplayName, type TrioWeaponCombo } from "./types";

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-accent-gold)]",
  S: "text-[var(--color-accent-gold)]",
  A: "text-[var(--color-primary-hover)]",
  B: "text-[#34d399]",
  C: "text-[var(--color-accent-purple)]",
  D: "text-[var(--color-muted-foreground)]",
};
const SMALL_SAMPLE_THRESHOLD = 10;
const VERIFIED_SAMPLE_THRESHOLD = 50;

interface ComboGalleryCardProps {
  combo: TrioWeaponCombo;
  detailHref: string;
  characterOrder?: number[];
  rank: number;
}

export function ComboGalleryCard({
  combo,
  detailHref,
  characterOrder = [],
  rank,
}: ComboGalleryCardProps) {
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
  const recommendationReasons = React.useMemo(() => buildRecommendationReasons(combo), [combo]);
  const sampleLabel = isSmallSample
    ? "참고용"
    : combo.totalGames >= VERIFIED_SAMPLE_THRESHOLD
      ? "검증됨"
      : "보통 표본";

  return (
    <article className="char-card group relative flex h-full flex-col gap-3.5 p-4 transition-colors hover:border-[rgba(96,165,250,0.34)] sm:p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 font-mono text-[11px] font-bold text-[var(--color-muted-foreground)]">
            #{String(rank).padStart(2, "0")}
          </span>
          {isSmallSample && (
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
              소표본
            </span>
          )}
          {!isSmallSample && (
            <span className="rounded-md border border-[rgba(96,165,250,0.24)] bg-[rgba(96,165,250,0.10)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-hover)]">
              {sampleLabel}
            </span>
          )}
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-bold tabular-nums ${
            positiveRP
              ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.10)] text-[var(--color-stat-up)]"
              : "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.10)] text-[var(--color-stat-down)]"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />
          {positiveRP ? "+" : ""}
          {combo.averageRP.toFixed(1)} RP
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] p-2.5">
        {orderedMembers.map((m) => (
          <div
            key={`${m.character}-${m.weapon}`}
            className="flex min-w-0 flex-col items-center gap-1.5"
          >
            <Link
              href={`/character/${m.character}`}
              aria-label={`${characterDisplayName(m.character)} 캐릭터 페이지`}
              className={`relative block h-12 w-12 overflow-hidden rounded-xl border bg-[var(--color-surface-2)] ring-1 transition-all hover:ring-[rgba(96,165,250,0.32)] sm:h-14 sm:w-14 ${
                selectedSet.has(m.character)
                  ? "border-[rgba(96,165,250,0.48)] ring-[rgba(96,165,250,0.28)]"
                  : "border-[rgba(251,191,36,0.34)] ring-[rgba(251,191,36,0.22)]"
              }`}
            >
              <Image
                src={getCharacterMiniWebpUrl(m.character)}
                alt={characterDisplayName(m.character)}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </Link>
            <div className="min-w-0 text-center leading-tight">
              <p
                className={`mx-auto mb-1 w-fit rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  selectedSet.has(m.character)
                    ? "bg-[rgba(96,165,250,0.14)] text-[var(--color-primary-hover)]"
                    : "bg-[rgba(251,191,36,0.14)] text-[var(--color-accent-gold)]"
                }`}
              >
                {selectedSet.has(m.character) ? "선택" : "추천 후보"}
              </p>
              <p className="truncate text-xs font-semibold text-[var(--color-foreground)]">
                {characterDisplayName(m.character)}
              </p>
              <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {weaponDisplayName(m.weapon)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <span
          className={`inline-flex h-8 min-w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 font-mono text-lg font-extrabold ${SCORE_COLOR[score] ?? ""}`}
        >
          {score}
        </span>
        <span className="rounded-md bg-[var(--color-surface-3)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
          {combo.totalGames.toLocaleString("ko-KR")} 매치
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            승률
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.winRate.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            평균 RP
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.averageRP >= 0 ? "+" : ""}
            {combo.averageRP.toFixed(1)}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            평균 순위
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
          className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(251,191,36,0.28)] bg-[rgba(251,191,36,0.10)] py-2 text-xs font-bold text-[var(--color-accent-gold)] transition-colors hover:bg-[rgba(251,191,36,0.18)]"
        >
          조합 상세 보기
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Link>
      </footer>
    </article>
  );
}

function buildRecommendationReasons(combo: TrioWeaponCombo): string[] {
  const reasons: string[] = [];

  if (combo.averageRP >= 10) reasons.push("RP 효율 높음");
  else if (combo.averageRP >= 3) reasons.push("RP 양수권");
  else if (combo.averageRP < 0) reasons.push("RP 주의");

  if (combo.totalGames >= VERIFIED_SAMPLE_THRESHOLD) reasons.push("표본 충분");
  else if (combo.totalGames < SMALL_SAMPLE_THRESHOLD) reasons.push("표본 적음");

  if (combo.winRate >= 18) reasons.push("1위 전환 좋음");
  else if (combo.winRate >= 14) reasons.push("승률 준수");

  if (combo.averageRank <= 3.5) reasons.push("순방 안정");

  return reasons.slice(0, 3);
}
