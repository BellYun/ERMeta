"use client"

import { useSyncExternalStore, useCallback } from "react"

const STORAGE_KEY = "ergg-focus-char-weapons"
const EVENT_NAME = "focus-char-weapons-changed"

/** "charCode:weaponCode" 형식. weaponCode=0이면 전체 무기 */
export interface FocusCharWeapon {
  charCode: number
  weaponCode: number
}

function encode(item: FocusCharWeapon): string {
  return `${item.charCode}:${item.weaponCode}`
}

function decode(key: string): FocusCharWeapon {
  const [c, w] = key.split(":")
  return { charCode: parseInt(c, 10), weaponCode: parseInt(w, 10) || 0 }
}

let cachedRaw: string | null = null
let cachedParsed: FocusCharWeapon[] = []
const EMPTY: FocusCharWeapon[] = []

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot(): FocusCharWeapon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedParsed
    cachedRaw = raw
    cachedParsed = raw ? (JSON.parse(raw) as string[]).map(decode) : []
    return cachedParsed
  } catch {
    return EMPTY
  }
}

function getServerSnapshot(): FocusCharWeapon[] {
  return EMPTY
}

function write(items: FocusCharWeapon[]) {
  const raw = JSON.stringify(items.map(encode))
  localStorage.setItem(STORAGE_KEY, raw)
  cachedRaw = raw
  cachedParsed = items
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function useFocusCharWeapons() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setFocusCharWeapons = useCallback(
    (next: FocusCharWeapon[] | ((prev: FocusCharWeapon[]) => FocusCharWeapon[])) => {
      const current = getSnapshot()
      const value = typeof next === "function" ? next(current) : next
      write(value)
    },
    []
  )

  const toggleFocus = useCallback((charCode: number, weaponCode: number) => {
    const current = getSnapshot()
    const key = encode({ charCode, weaponCode })
    const exists = current.some((i) => encode(i) === key)
    const next = exists
      ? current.filter((i) => encode(i) !== key)
      : [...current, { charCode, weaponCode }]
    write(next)
  }, [])

  /** charCode 목록 (중복 제거, 기존 SynergyResults 호환용) */
  const focusCharCodes = items.map((i) => i.charCode).filter((v, i, a) => a.indexOf(v) === i)

  return { focusCharWeapons: items, focusCharCodes, setFocusCharWeapons, toggleFocus } as const
}
