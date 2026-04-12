"use client"

import * as React from "react"

interface FilterState {
  patch: string
  tier: string
  patches: string[]
  setPatch: (patch: string) => void
  setTier: (tier: string) => void
}

const FilterContext = React.createContext<FilterState | null>(null)

interface FilterProviderProps {
  initialPatches: string[]
  children: React.ReactNode
}

export function FilterProvider({ initialPatches, children }: FilterProviderProps) {
  const [patch, setPatch] = React.useState(initialPatches[0] ?? "")
  const [tier, setTier] = React.useState("MITHRIL")

  const value = React.useMemo(
    () => ({ patch, tier, patches: initialPatches, setPatch, setTier }),
    [patch, tier, initialPatches, setPatch, setTier]
  )

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter(): FilterState {
  const ctx = React.useContext(FilterContext)
  if (!ctx) throw new Error("useFilter must be used within FilterProvider")
  return ctx
}
