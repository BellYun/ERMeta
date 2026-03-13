"use client"

import { useSyncExternalStore, useCallback } from "react"

const STORAGE_KEY = "ergg-focus-characters"
const EVENT_NAME = "focus-characters-changed"

// 참조 안정성 보장: JSON 문자열이 동일하면 같은 배열 참조 반환
let cachedRaw: string | null = null
let cachedParsed: number[] = []
const EMPTY: number[] = []

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedParsed
    cachedRaw = raw
    cachedParsed = raw ? JSON.parse(raw) : []
    return cachedParsed
  } catch {
    return EMPTY
  }
}

function getServerSnapshot(): number[] {
  return EMPTY
}

function writeFocusCharacters(chars: number[]) {
  const raw = JSON.stringify(chars)
  localStorage.setItem(STORAGE_KEY, raw)
  // 캐시 즉시 갱신 (subscribe 콜백 전에 getSnapshot이 호출될 수 있음)
  cachedRaw = raw
  cachedParsed = chars
  window.dispatchEvent(new Event(EVENT_NAME))
}

/**
 * Islands 간 focusCharacters 상태 공유 훅
 * localStorage + useSyncExternalStore 기반, React Context 없이 독립 컴포넌트 간 상태 동기화
 */
export function useFocusCharacters() {
  const chars = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setFocusCharacters = useCallback((next: number[] | ((prev: number[]) => number[])) => {
    const current = getSnapshot()
    const value = typeof next === "function" ? next(current) : next
    writeFocusCharacters(value)
  }, [])

  const toggleFocus = useCallback((code: number) => {
    const current = getSnapshot()
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    writeFocusCharacters(next)
  }, [])

  return { focusCharacters: chars, setFocusCharacters, toggleFocus } as const
}
