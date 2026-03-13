"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterHalfImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"
import { useFilter } from "./FilterContext"
import { resolveWeaponName } from "@/lib/weaponMap"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"

const FALLBACK_MAP = buildFallbackMap()

function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType)
  if (types.every((t) => t === "buff")) return "buff"
  if (types.every((t) => t === "nerf")) return "nerf"
  if (types.includes("buff") && types.includes("nerf")) return "rework"
  return types[0] ?? "rework"
}

const CHANGE_LABEL: Record<string, { text: string; color: string }> = {
  buff: { text: "BUFF", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  nerf: { text: "NERF", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  rework: { text: "ADJUST", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
}

const AUTO_SLIDE_INTERVAL = 4000

// 반응형 카드 너비: 모바일 80%, 태블릿 40%, 데스크탑 30%
function useCardWidthPercent() {
  const [width, setWidth] = React.useState(30)
  React.useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setWidth(80)
      else if (window.innerWidth < 1024) setWidth(40)
      else setWidth(30)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return width
}

export function HoneyPicksSection() {
  const { l10n } = useL10n()
  const { patch, tier } = useFilter()
  const router = useRouter()
  const cardWidth = useCardWidthPercent()
  const [picks, setPicks] = React.useState<HoneyPickData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentPatch, setCurrentPatch] = React.useState<string>("")
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(true)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStartX, setDragStartX] = React.useState(0)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [mobileSheet, setMobileSheet] = React.useState<{ pick: HoneyPickData; patchNote: CharacterPatchNote; changeLabel: { text: string; color: string } | null } | null>(null)
  const autoSlideRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // patch, tier는 useFilter()에서 가져옴

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (patch) params.set("patchVersion", patch)
    params.set("tier", tier)

    fetch(`/api/meta/honey-picks?${params}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "API 오류")
        setPicks(data.picks ?? [])
        setCurrentPatch(data.patchVersion ?? patch ?? "")
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      )
      .finally(() => setLoading(false))
  }, [patch, tier])

  // 무한 슬라이더: 앞뒤에 충분한 클론 추가
  const visibleCount = Math.ceil(100 / cardWidth) + 1
  const cloneCount = visibleCount
  const extendedPicks = React.useMemo(() => {
    if (picks.length === 0) return []
    const len = picks.length
    const before = Array.from({ length: cloneCount }, (_, i) => picks[(len - cloneCount + i) % len])
    const after = Array.from({ length: cloneCount }, (_, i) => picks[i % len])
    return [...before, ...picks, ...after]
  }, [picks, cloneCount])

  // 자동 슬라이드
  const startAutoSlide = React.useCallback(() => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current)
    autoSlideRef.current = setInterval(() => {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    }, AUTO_SLIDE_INTERVAL)
  }, [])

  const stopAutoSlide = React.useCallback(() => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current)
      autoSlideRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (picks.length <= 1) return
    setCurrentIndex(cloneCount) // 첫 번째 실제 아이템
    startAutoSlide()
    return stopAutoSlide
  }, [picks, startAutoSlide, stopAutoSlide])

  // 무한 루프 경계 처리
  React.useEffect(() => {
    if (picks.length <= 1) return

    // 마지막 실제 아이템 이후 클론으로 진입 → 실제 첫 번째로 점프
    if (currentIndex >= picks.length + cloneCount) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(cloneCount)
      }, 500)
      return () => clearTimeout(timer)
    }

    // 첫 번째 클론으로 역방향 진입 → 실제 마지막으로 점프
    if (currentIndex < cloneCount) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(picks.length + cloneCount - 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, picks.length])

  // 점프 후 트랜지션 재활성화
  React.useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(true), 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning])

  // 드래그/터치 핸들러
  const handleDragStart = (clientX: number) => {
    stopAutoSlide()
    setIsDragging(true)
    setDragStartX(clientX)
    setDragOffset(0)
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    setDragOffset(clientX - dragStartX)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    const threshold = 50
    if (dragOffset < -threshold) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    } else if (dragOffset > threshold) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev - 1)
    }
    setDragOffset(0)
    startAutoSlide()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (error) {
    return <p className="py-3 text-sm text-[var(--color-danger)]">{error}</p>
  }

  if (picks.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-[var(--color-muted-foreground)]">
        이번 패치에서 꿀챔 데이터가 없습니다.
      </p>
    )
  }

  // 현재 실제 인덱스 (0-based in original picks)
  const activeRealIndex = ((currentIndex - cloneCount) % picks.length + picks.length) % picks.length

  // translateX: 현재 카드를 가운데에 배치
  // 카드 좌측 시작점 = 50% - cardWidth/2 (화면 중앙에 카드 중심)
  const translateX = -(currentIndex * cardWidth) + (50 - cardWidth / 2)

  return (
    <div
      className="relative select-none"
      onMouseEnter={stopAutoSlide}
      onMouseLeave={startAutoSlide}
    >
      {/* 슬라이더 트랙 */}
      <div
        className="rounded-xl"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => isDragging && handleDragEnd()}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          className={cn(
            "flex",
            isTransitioning && "transition-transform duration-500 ease-in-out"
          )}
          style={{
            transform: `translateX(calc(${translateX}% + ${dragOffset}px))`,
          }}
        >
          {extendedPicks.map((pick, i) => {
            const name = getCharName(pick.characterNum)
            const weaponName = resolveWeaponName(pick.bestWeapon)
            const halfUrl = getCharacterHalfImageUrl(pick.characterNum)
            const patchNote = getCharacterPatchNote(pick.characterNum, currentPatch) ?? null
            const overallChange = patchNote ? getOverallChangeType(patchNote) : null
            const changeLabel = overallChange ? CHANGE_LABEL[overallChange] : null
            const isCenter = i === currentIndex

            // 원본 picks에서의 rank
            const rank = ((i - cloneCount) % picks.length + picks.length) % picks.length + 1

            return (
              <div
                key={`${pick.characterNum}-${i}`}
                className="shrink-0 px-1"
                style={{ width: `${cardWidth}%` }}
              >
                <div
                  className={cn(
                    "group/card relative cursor-pointer transition-all duration-500 ease-out rounded-xl",
                    isCenter ? "z-20 overflow-visible" : "brightness-[0.6] overflow-hidden"
                  )}
                  onClick={() => {
                    if (isCenter) {
                      // 모바일 + 패치노트 있으면 바텀시트
                      if (patchNote && window.innerWidth < 640) {
                        setMobileSheet({ pick, patchNote, changeLabel })
                      } else {
                        router.push(`/character-analysis?character=${pick.characterNum}`)
                      }
                    } else {
                      stopAutoSlide()
                      setIsTransitioning(true)
                      setCurrentIndex(i)
                      startAutoSlide()
                    }
                  }}
                >
                  {/* 메인 카드 (이미지 + 글래스 패널) */}
                  <div className="relative w-full aspect-[4/5] shrink-0 overflow-hidden rounded-xl">
                    {/* 풀 이미지 배경 */}
                    <Image
                      src={halfUrl}
                      alt={name}
                      fill
                      className={cn(
                        "object-cover object-top transition-transform duration-700",
                        isCenter && "group-hover/card:scale-105"
                      )}
                      sizes="33vw"
                      priority
                    />

                    {/* 하단 그라데이션 */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-surface)]/80 to-transparent" />

                    {/* 순위 배지 */}
                    <div className={cn(
                      "absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md text-[11px] font-bold",
                      isCenter
                        ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30"
                        : "bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]"
                    )}>
                      {rank}
                    </div>

                    {/* 글래스모피즘 정보 패널 */}
                    <div className={cn(
                      "absolute inset-x-2 bottom-2 rounded-lg border backdrop-blur-xl transition-all duration-400",
                      "bg-[var(--color-surface)]/50 border-[var(--color-border)]/60",
                      isCenter ? "p-2.5" : "p-2"
                    )}>
                      {/* 이름 + 무기 */}
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={cn(
                            "font-bold truncate text-[var(--color-foreground)]",
                            isCenter ? "text-sm" : "text-xs"
                          )}>
                            {name}
                          </p>
                          {isCenter && (
                            <p className="text-[10px] text-[var(--color-muted-foreground)] truncate mt-0.5">
                              {weaponName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 스탯 + 증가량 — 항상 표시 (센터만) */}
                      {isCenter && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--color-border)]/40">
                          <div className="flex-1 text-center">
                            <p className="text-[8px] text-[var(--color-muted-foreground)]">승률</p>
                            <p className={cn(
                              "text-[13px] font-bold tabular-nums leading-tight",
                              pick.winRate >= 60 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]"
                            )}>
                              {pick.winRate.toFixed(1)}%
                            </p>
                            <p className="text-[9px] font-medium text-green-400 mt-0.5">
                              +{pick.winRateDelta.toFixed(1)}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-[var(--color-border)]/40" />
                          <div className="flex-1 text-center">
                            <p className="text-[8px] text-[var(--color-muted-foreground)]">픽률</p>
                            <p className="text-[13px] font-bold tabular-nums leading-tight text-[var(--color-foreground)]">
                              {pick.pickRate.toFixed(1)}%
                            </p>
                            <p className="text-[9px] font-medium text-green-400 mt-0.5">
                              +{pick.pickRateDelta.toFixed(1)}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-[var(--color-border)]/40" />
                          <div className="flex-1 text-center">
                            <p className="text-[8px] text-[var(--color-muted-foreground)]">RP</p>
                            <p className={cn(
                              "text-[13px] font-bold tabular-nums leading-tight",
                              pick.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                            )}>
                              {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(0)}
                            </p>
                            <p className={cn(
                              "text-[9px] font-medium mt-0.5",
                              pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 패치노트 확장 패널 — 데스크탑: 호버시 오른쪽으로 펼침, 모바일: 바텀시트 */}
                  {isCenter && patchNote && (
                    <div className={cn(
                      "hidden sm:block absolute top-0 left-full h-full w-0 group-hover/card:w-52 overflow-hidden transition-all duration-500 ease-out rounded-r-xl",
                      "bg-[var(--color-surface)]/90 backdrop-blur-xl border-l border-[var(--color-border)]/60"
                    )}>
                      <div className="w-52 h-full p-3 flex flex-col gap-2 overflow-y-auto">
                        {/* 패치 버전 */}
                        <div className="flex items-center gap-1.5">
                          {changeLabel && (
                            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold border", changeLabel.color)}>
                              {changeLabel.text}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">
                            패치 {patchNote.patch}
                          </span>
                        </div>

                        {/* 변경사항 목록 */}
                        <div className="flex flex-col gap-1.5">
                          {patchNote.changes.map((change, ci) => {
                            const label = CHANGE_LABEL[change.changeType]
                            return (
                              <div key={ci} className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold border", label.color)}>
                                    {label.text}
                                  </span>
                                  <span className="text-[10px] font-medium text-[var(--color-foreground)]">
                                    {change.target}
                                  </span>
                                </div>
                                {change.valueSummary && (
                                  <p className="text-[9px] text-[var(--color-muted-foreground)] pl-1 break-words leading-tight">
                                    {change.valueSummary}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* 델타 요약 */}
                        <div className="mt-auto pt-2 border-t border-[var(--color-border)]/40">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[var(--color-muted-foreground)]">승률 변화</span>
                            <span className="font-semibold text-green-400">
                              +{pick.winRateDelta.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] mt-0.5">
                            <span className="text-[var(--color-muted-foreground)]">RP 변화</span>
                            <span className={cn(
                              "font-semibold",
                              pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {picks.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              stopAutoSlide()
              setIsTransitioning(true)
              setCurrentIndex(i + cloneCount)
              startAutoSlide()
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === activeRealIndex
                ? "w-4 bg-[var(--color-accent-gold)]"
                : "w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-muted-foreground)]"
            )}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>

      {/* 모바일 패치내역 바텀시트 */}
      {mobileSheet && (
        <div
          className="fixed inset-0 z-[100] sm:hidden"
          onClick={() => setMobileSheet(null)}
        >
          {/* 어두운 배경 */}
          <div className="absolute inset-0 bg-black/70 animate-[fadeIn_200ms_ease-out]" />

          {/* 바텀시트 */}
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--color-border)]/60 bg-[var(--color-surface)] backdrop-blur-xl animate-[slideUp_300ms_ease-out] max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--color-foreground)]">
                  {getCharName(mobileSheet.pick.characterNum)}
                </span>
                {mobileSheet.changeLabel && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold border", mobileSheet.changeLabel.color)}>
                    {mobileSheet.changeLabel.text}
                  </span>
                )}
                <span className="text-[11px] text-[var(--color-muted-foreground)]">
                  패치 {mobileSheet.patchNote.patch}
                </span>
              </div>
              <button
                onClick={() => setMobileSheet(null)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* 변경사항 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
              {mobileSheet.patchNote.changes.map((change, ci) => {
                const label = CHANGE_LABEL[change.changeType]
                return (
                  <div key={ci} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold border", label.color)}>
                        {label.text}
                      </span>
                      <span className="text-xs font-medium text-[var(--color-foreground)]">
                        {change.target}
                      </span>
                    </div>
                    {change.valueSummary && (
                      <p className="text-[11px] text-[var(--color-muted-foreground)] pl-1 leading-relaxed">
                        {change.valueSummary}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 델타 요약 + 상세 분석 버튼 */}
            <div className="px-4 py-3 border-t border-[var(--color-border)]/40">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--color-muted-foreground)]">승률</span>
                  <span className="font-semibold text-green-400">+{mobileSheet.pick.winRateDelta.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--color-muted-foreground)]">RP</span>
                  <span className={cn("font-semibold", mobileSheet.pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400")}>
                    {mobileSheet.pick.averageRPDelta >= 0 ? "+" : ""}{mobileSheet.pick.averageRPDelta.toFixed(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileSheet(null)
                  router.push(`/character-analysis?character=${mobileSheet.pick.characterNum}`)
                }}
                className="w-full py-2.5 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-sm font-semibold hover:bg-[var(--color-primary)]/25 transition-colors"
              >
                상세 분석 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
