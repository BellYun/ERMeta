"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterHalfImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"
import { useFilter } from "../FilterContext"
import { resolveWeaponName } from "@/lib/weaponMap"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"
import { useCarousel } from "./useCarousel"
import { HoneyPickCard, CHANGE_LABEL, getOverallChangeType } from "./HoneyPickCard"
import { PatchNoteBottomSheet } from "./PatchNoteBottomSheet"

const FALLBACK_MAP = buildFallbackMap()

interface HoneyPicksSectionProps {
  /** 서버에서 프리페치한 초기 데이터 */
  initialData?: HoneyPickData[]
  /** 서버에서 프리페치한 패치 버전 */
  initialPatchVersion?: string
}

export function HoneyPicksSection({ initialData, initialPatchVersion }: HoneyPicksSectionProps) {
  const { l10n } = useL10n()
  const { patch, tier } = useFilter()
  const router = useRouter()
  const [picks, setPicks] = React.useState<HoneyPickData[]>(initialData ?? [])
  const [loading, setLoading] = React.useState(!initialData || initialData.length === 0)
  const [error, setError] = React.useState<string | null>(null)
  const [currentPatch, setCurrentPatch] = React.useState<string>(initialPatchVersion ?? "")
  const [mobileSheet, setMobileSheet] = React.useState<{ pick: HoneyPickData; patchNote: CharacterPatchNote; changeLabel: { text: string; color: string } | null } | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  // 서버 프리페치 데이터가 있으면 초기 fetch 스킵, 필터 변경 시에만 fetch
  const isInitialRender = React.useRef(true)
  React.useEffect(() => {
    // 초기 렌더에서 서버 데이터가 있으면 스킵
    if (isInitialRender.current && initialData && initialData.length > 0) {
      isInitialRender.current = false
      setLoading(false)
      return
    }
    isInitialRender.current = false

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
  }, [patch, tier, initialData])

  const {
    currentIndex,
    setCurrentIndex,
    isTransitioning,
    setIsTransitioning,
    extendedPicks,
    activeRealIndex,
    translateX,
    cardWidth,
    cloneCount,
    dragOffset,
    isDragging,
    isHorizontalDrag,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    stopAutoSlide,
    startAutoSlide,
  } = useCarousel(picks)

  const dragDidMove = React.useRef(false)

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

  return (
    <div
      className="relative select-none"
      onMouseEnter={stopAutoSlide}
      onMouseLeave={startAutoSlide}
    >
      {/* 슬라이더 트랙 */}
      <div
        className="rounded-xl"
        style={{ touchAction: "pan-y" }}
        onMouseDown={(e) => { dragDidMove.current = false; handleDragStart(e.clientX, e.clientY) }}
        onMouseMove={(e) => { handleDragMove(e.clientX, e.clientY); if (isDragging) dragDidMove.current = true }}
        onMouseUp={() => { handleDragEnd(); }}
        onMouseLeave={() => isDragging && handleDragEnd()}
        onTouchStart={(e) => { dragDidMove.current = false; handleDragStart(e.touches[0].clientX, e.touches[0].clientY) }}
        onTouchMove={(e) => {
          handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
          if (isHorizontalDrag.current) {
            e.preventDefault()
            dragDidMove.current = true
          }
        }}
        onTouchEnd={() => { handleDragEnd(); }}
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
            const rank = ((i - cloneCount) % picks.length + picks.length) % picks.length + 1

            return (
              <HoneyPickCard
                key={`${pick.characterNum}-${i}`}
                pick={pick}
                name={name}
                weaponName={weaponName}
                halfUrl={halfUrl}
                patchNote={patchNote}
                changeLabel={changeLabel}
                isCenter={isCenter}
                rank={rank}
                cardWidth={cardWidth}
                onCardClick={() => {
                  // 드래그 후 클릭 방지
                  if (dragDidMove.current) return
                  if (isCenter) {
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
              />
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
              "flex items-center justify-center min-w-[44px] min-h-[44px] touch-manipulation",
            )}
            aria-label={`슬라이드 ${i + 1}`}
          >
            <span className={cn(
              "block h-1.5 rounded-full transition-all duration-300",
              i === activeRealIndex
                ? "w-4 bg-[var(--color-accent-gold)]"
                : "w-1.5 bg-[var(--color-border)]"
            )} />
          </button>
        ))}
      </div>

      {/* 모바일 패치내역 바텀시트 */}
      {mobileSheet && (
        <PatchNoteBottomSheet
          pick={mobileSheet.pick}
          patchNote={mobileSheet.patchNote}
          changeLabel={mobileSheet.changeLabel}
          characterName={getCharName(mobileSheet.pick.characterNum)}
          onClose={() => setMobileSheet(null)}
          onNavigate={() => {
            setMobileSheet(null)
            router.push(`/character-analysis?character=${mobileSheet.pick.characterNum}`)
          }}
        />
      )}
    </div>
  )
}
