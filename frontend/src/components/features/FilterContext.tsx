"use client"

import * as React from "react"

interface FilterState {
  patch: string
  tier: string
  patches: string[]
  isLoading: boolean
  setPatch: (patch: string) => void
  setTier: (tier: string) => void
}

const FilterContext = React.createContext<FilterState | null>(null)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [patches, setPatches] = React.useState<string[]>([])
  const [patch, setPatch] = React.useState("")
  const [tier, setTier] = React.useState("MITHRIL")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    setIsLoading(true)
    fetch("/api/patches/history?limit=10")
      .then((res) => res.json())
      .then((data: { patches?: string[] }) => {
        const list = data.patches ?? []
        setPatches(list)
        if (list.length > 0 && !patch) {
          setPatch(list[0])
        }
      })
      .catch(() => setPatches([]))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <FilterContext.Provider value={{ patch, tier, patches, isLoading, setPatch, setTier }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter(): FilterState {
  const ctx = React.useContext(FilterContext)
  if (!ctx) throw new Error("useFilter must be used within FilterProvider")
  return ctx
}
