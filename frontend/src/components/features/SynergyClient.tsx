"use client"

import * as React from "react"
import Image from "next/image"
import { X, Users } from "lucide-react"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface CharacterBasic {
  code: number
  name: string
  imageUrl: string
}

interface SynergyCombo {
  id: number
  characters: [CharacterBasic, CharacterBasic, CharacterBasic]
  tier: Tier
  winRate: number
  pickRate: number
  avgRank: number
}

// ─── 더미 데이터 ──────────────────────────────────────────────────────────────

const allCharacters: CharacterBasic[] = [
  { code: 1,  name: "나딘",   imageUrl: "/characters/placeholder.png" },
  { code: 2,  name: "재키",   imageUrl: "/characters/placeholder.png" },
  { code: 3,  name: "레나",   imageUrl: "/characters/placeholder.png" },
  { code: 4,  name: "아이솔", imageUrl: "/characters/placeholder.png" },
  { code: 5,  name: "한",     imageUrl: "/characters/placeholder.png" },
  { code: 6,  name: "피오라", imageUrl: "/characters/placeholder.png" },
  { code: 7,  name: "루크",   imageUrl: "/characters/placeholder.png" },
  { code: 8,  name: "비앙카", imageUrl: "/characters/placeholder.png" },
  { code: 9,  name: "에스메", imageUrl: "/characters/placeholder.png" },
  { code: 10, name: "실비아", imageUrl: "/characters/placeholder.png" },
]

const c = (code: number) => allCharacters.find((ch) => ch.code === code)!

// 전체 추천 트리오 (선택 없을 때 기본 노출)
const defaultCombos: SynergyCombo[] = [
  { id: 1,  characters: [c(1), c(2), c(5)],  tier: "S", winRate: 62.4, pickRate: 8.3,  avgRank: 2.8 },
  { id: 2,  characters: [c(1), c(3), c(8)],  tier: "S", winRate: 60.1, pickRate: 6.9,  avgRank: 3.1 },
  { id: 3,  characters: [c(2), c(5), c(7)],  tier: "A", winRate: 57.8, pickRate: 5.4,  avgRank: 3.4 },
  { id: 4,  characters: [c(1), c(4), c(9)],  tier: "A", winRate: 56.2, pickRate: 4.8,  avgRank: 3.7 },
  { id: 5,  characters: [c(3), c(5), c(8)],  tier: "A", winRate: 55.9, pickRate: 4.1,  avgRank: 3.9 },
  { id: 6,  characters: [c(2), c(4), c(6)],  tier: "A", winRate: 54.3, pickRate: 3.7,  avgRank: 4.2 },
  { id: 7,  characters: [c(1), c(6), c(10)], tier: "B", winRate: 52.7, pickRate: 3.2,  avgRank: 4.5 },
  { id: 8,  characters: [c(3), c(4), c(7)],  tier: "B", winRate: 51.4, pickRate: 2.9,  avgRank: 4.8 },
  { id: 9,  characters: [c(5), c(6), c(9)],  tier: "B", winRate: 50.8, pickRate: 2.5,  avgRank: 5.0 },
  { id: 10, characters: [c(7), c(8), c(10)], tier: "C", winRate: 47.3, pickRate: 1.8,  avgRank: 5.6 },
]

// 선택된 캐릭터 조합에 맞는 결과 필터링
function getFilteredCombos(selected: CharacterBasic[]): SynergyCombo[] {
  if (selected.length === 0) return defaultCombos
  return defaultCombos
    .filter((combo) =>
      selected.every((sel) => combo.characters.some((ch) => ch.code === sel.code))
    )
    .concat(
      // 결과가 없으면 선택 캐릭터 1명이라도 포함된 것
      selected.length === 2 && defaultCombos.filter((combo) =>
        selected.every((sel) => combo.characters.some((ch) => ch.code === sel.code))
      ).length === 0
        ? defaultCombos.filter((combo) =>
            combo.characters.some((ch) => ch.code === selected[0].code)
          ).slice(0, 5)
        : []
    )
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function SlotEmpty({ index }: { index: number }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-border)]">
        <Users className="h-5 w-5" />
      </div>
      <span className="text-sm text-[var(--color-border)]">캐릭터 {index + 1} 선택</span>
    </div>
  )
}

function SlotFilled({
  char,
  onRemove,
}: {
  char: CharacterBasic
  onRemove: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-4 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image src={char.imageUrl} alt={char.name} fill className="object-cover" sizes="40px" />
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">{char.name}</span>
      <button
        onClick={onRemove}
        className="rounded-md p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function ComboCard({ combo, rank }: { combo: SynergyCombo; rank: number }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
      {/* 순위 */}
      <span className="w-6 shrink-0 text-center text-sm font-medium text-[var(--color-muted-foreground)]">
        {rank}
      </span>

      {/* 3캐릭터 */}
      <div className="flex items-center gap-1.5">
        {combo.characters.map((char, i) => (
          <React.Fragment key={char.code}>
            <div className="flex flex-col items-center gap-1">
              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                <Image src={char.imageUrl} alt={char.name} fill className="object-cover" sizes="40px" />
              </div>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">{char.name}</span>
            </div>
            {i < 2 && (
              <span className="mb-3 text-xs text-[var(--color-border)]">+</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 티어 */}
      <div className="ml-2">
        <TierBadge tier={combo.tier} />
      </div>

      {/* 스탯 */}
      <div className="ml-auto flex items-center gap-6 text-right">
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
          <span className={cn(
            "text-sm font-semibold",
            combo.winRate >= 60 ? "text-[var(--color-accent-gold)]"
              : combo.winRate >= 55 ? "text-[var(--color-foreground)]"
              : "text-[var(--color-muted-foreground)]"
          )}>
            {combo.winRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">픽률</span>
          <span className="text-sm text-[var(--color-muted-foreground)]">{combo.pickRate.toFixed(1)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
          <span className="text-sm text-[var(--color-muted-foreground)]">#{combo.avgRank.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function SynergyClient() {
  const [selected, setSelected] = React.useState<CharacterBasic[]>([])

  const toggle = (char: CharacterBasic) => {
    if (selected.some((s) => s.code === char.code)) {
      setSelected(selected.filter((s) => s.code !== char.code))
    } else if (selected.length < 2) {
      setSelected([...selected, char])
    }
  }

  const remove = (code: number) => setSelected(selected.filter((s) => s.code !== code))

  const combos = getFilteredCombos(selected)

  return (
    <div className="flex gap-4 items-start">
      {/* 좌측: 캐릭터 그리드 */}
      <div className="w-[228px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">캐릭터 선택 (최대 2명)</p>
        <div className="grid grid-cols-3 gap-1">
          {allCharacters.map((char) => {
            const isSelected = selected.some((s) => s.code === char.code)
            const isDisabled = !isSelected && selected.length >= 2
            return (
              <button
                key={char.code}
                onClick={() => toggle(char)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                  isSelected
                    ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                    : isDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-[var(--color-surface-2)]"
                )}
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                  <Image src={char.imageUrl} alt={char.name} fill className="object-cover" sizes="40px" />
                </div>
                <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
                  {char.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 우측: 선택 슬롯 + 결과 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 선택 슬롯 */}
        <div className="flex gap-3">
          {selected[0]
            ? <SlotFilled char={selected[0]} onRemove={() => remove(selected[0].code)} />
            : <SlotEmpty index={0} />}
          {selected[1]
            ? <SlotFilled char={selected[1]} onRemove={() => remove(selected[1].code)} />
            : <SlotEmpty index={1} />}
        </div>

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            {selected.length === 0
              ? "인기 3인 조합"
              : selected.length === 1
              ? `${selected[0].name} 포함 추천 조합`
              : `${selected[0].name} + ${selected[1].name} 조합`}
          </h2>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        {/* 결과 목록 */}
        {combos.length > 0 ? (
          <div className="flex flex-col gap-2">
            {combos.map((combo, i) => (
              <ComboCard key={combo.id} combo={combo} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">해당 조합 데이터가 없습니다</p>
            <button
              onClick={() => setSelected([])}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              초기화하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
