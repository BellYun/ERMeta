"use client"

import { useSyncExternalStore, useCallback } from "react"

const STORAGE_KEY = "ergg-focus-characters"
const EVENT_NAME = "focus-characters-changed"

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback)
  // localStorage 변경은 다른 탭에서도 감지
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot(): number[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function getServerSnapshot(): number[] {
  return []
}

function writeFocusCharacters(chars: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars))
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
