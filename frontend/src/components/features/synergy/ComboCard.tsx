"use client";

import Image from "next/image";
import * as React from "react";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import type { TrioResult } from "./types";

const SMALL_SAMPLE_THRESHOLD = 10;

export function ComboCard({
  rec,
  rank,
  getCharName,
  selectedAllies,
  isFocusPoolCombo = false,
  isTopResult = false,
  compact = false,
  priorityImages = false,
  prefetchOnViewport = false,
  onPrefetchAnalysis,
  onNavigateAnalysis,
}: {
  rec: TrioResult;
  rank: number;
  getCharName: (code: number) => string;
  selectedAllies: number[];
  isFocusPoolCombo?: boolean;
  isTopResult?: boolean;
  compact?: boolean;
  /** true면 이미지를 priority로 즉시 로드 (상위 카드용) */
  priorityImages?: boolean;
  prefetchOnViewport?: boolean;
  onPrefetchAnalysis?: (code: number, rank: number, trigger: "hover" | "viewport") => void;
  onNavigateAnalysis?: (code: number) => void;
}) {
  // 선택한 아군을 앞에, 추천 실험체를 마지막에 표시
  const { chars, rest } = React.useMemo(() => {
    const allChars = [rec.character1, rec.character2, rec.character3];
    const nextAllies: number[] = [];
    const nextRest: number[] = [];
    for (const code of allChars) {
      if (selectedAllies.includes(code) && nextAllies.length < selectedAllies.length) {
        nextAllies.push(code);
      } else {
        nextRest.push(code);
      }
    }
    // 선택 순서 유지
    nextAllies.sort((a, b) => selectedAllies.indexOf(a) - selectedAllies.indexOf(b));
    return { chars: [...nextAllies, ...nextRest], rest: nextRest };
  }, [rec.character1, rec.character2, rec.character3, selectedAllies]);
  const isSmallSample = rec.totalGames < SMALL_SAMPLE_THRESHOLD;
  const cardRef = React.useRef<HTMLDivElement>(null);

  const prefetchRecommended = React.useCallback(
    (trigger: "hover" | "viewport") => {
      if (!onPrefetchAnalysis) return;
      for (const code of rest) onPrefetchAnalysis(code, rank, trigger);
    },
    [onPrefetchAnalysis, rank, rest]
  );

  React.useEffect(() => {
    if (!prefetchOnViewport || !onPrefetchAnalysis) return;
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        prefetchRecommended("viewport");
        observer.disconnect();
      },
      { rootMargin: "240px 0px", threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [onPrefetchAnalysis, prefetchOnViewport, prefetchRecommended]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "combo-card",
        "group flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
      )}
      data-accent={isFocusPoolCombo || isTopResult ? "true" : undefined}
      onPointerEnter={() => prefetchRecommended("hover")}
    >
      {/* 순위 */}
      <span
        className={cn(
          "w-5 shrink-0 text-center text-xs font-bold group-hover:text-[var(--color-foreground)]",
          isTopResult
            ? "text-[var(--color-accent-foreground)]"
            : "text-[var(--color-muted-foreground)]"
        )}
      >
        {rank}
      </span>

      {/* 3실험체 */}
      <div className="flex items-center gap-1">
        {chars.map((code, i) => {
          const isRecommended = !selectedAllies.includes(code);
          const charContent = (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]",
                  isRecommended &&
                    (isTopResult
                      ? "border border-[var(--color-accent)]"
                      : "border border-[var(--color-border-light)]")
                )}
              >
                <Image
                  src={getCharacterMiniWebpUrl(code)}
                  alt={getCharName(code)}
                  fill
                  className="object-cover"
                  sizes="32px"
                  loading={priorityImages ? "eager" : "lazy"}
                  priority={priorityImages}
                />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "w-10 truncate text-center text-[9px]",
                    isRecommended
                      ? "text-[var(--color-foreground)] group-hover/char:text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {getCharName(code)}
                </span>
              )}
            </div>
          );
          return (
            <React.Fragment key={code}>
              {isRecommended && onNavigateAnalysis ? (
                <button
                  type="button"
                  onFocus={() => onPrefetchAnalysis?.(code, rank, "hover")}
                  onClick={() => onNavigateAnalysis(code)}
                  className="group/char relative z-10 cursor-pointer flex items-center gap-1"
                  title={`${getCharName(code)} 분석 보기`}
                >
                  {charContent}
                  {rest.length === 1 && (
                    <span className="whitespace-nowrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-foreground)] transition-colors group-hover/char:border-[var(--color-border-light)]">
                      분석보기
                    </span>
                  )}
                </button>
              ) : (
                charContent
              )}
              {i < 2 && <span className="text-[10px] text-[var(--color-border)]">+</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* 소표본 배지 */}
      {isSmallSample && (
        <span className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--color-muted-foreground)]">
          소표본
        </span>
      )}

      {/* 스탯 */}
      {compact ? (
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span className="text-xs font-semibold text-[var(--color-foreground)]">
            {rec.winRate.toFixed(1)}%
          </span>
          <span
            className={cn(
              "text-[10px]",
              rec.averageRP >= 0
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-muted-foreground)]"
            )}
          >
            {rec.averageRP > 0 ? "+" : ""}
            {rec.averageRP.toFixed(1)} RP
          </span>
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-3 text-right sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              {rec.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</span>
            <span
              className={cn(
                "text-sm font-semibold",
                rec.averageRP >= 0
                  ? "text-[var(--color-accent-gold)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {rec.averageRP > 0 ? "+" : ""}
              {rec.averageRP.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">게임 수</span>
            <span className="text-sm text-[var(--color-foreground)]">
              {rec.totalGames.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
            <span className="text-sm text-[var(--color-foreground)]">
              #{rec.averageRank.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
