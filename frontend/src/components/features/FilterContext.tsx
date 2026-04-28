"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  DEFAULT_HOME_TIER,
  buildHomeFiltersQuery,
  normalizeHomePatch,
  normalizeHomeTier,
} from "@/lib/homeFilters";

interface FilterState {
  patch: string;
  tier: string;
  patches: string[];
  setPatch: (patch: string) => void;
  setTier: (tier: string) => void;
}

const FilterContext = React.createContext<FilterState | null>(null);

interface FilterProviderProps {
  initialPatches: string[];
  initialPatch?: string;
  initialTier?: string;
  children: React.ReactNode;
}

export function FilterProvider({
  initialPatches,
  initialPatch,
  initialTier = DEFAULT_HOME_TIER,
  children,
}: FilterProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultPatch = initialPatch ?? initialPatches[0] ?? "";
  const [patch, setPatchState] = React.useState(defaultPatch);
  const [tier, setTierState] = React.useState(initialTier);
  const pendingQueryRef = React.useRef<string | null>(null);

  const replaceUrl = React.useCallback(
    (nextPatch: string, nextTier: string) => {
      const currentQuery = searchParams.toString();
      const nextQuery = buildHomeFiltersQuery({
        currentQuery,
        patch: nextPatch,
        tier: nextTier,
        defaultPatch,
        defaultTier: initialTier,
      });

      if (nextQuery === currentQuery) {
        return;
      }

      pendingQueryRef.current = nextQuery;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [defaultPatch, initialTier, pathname, router, searchParams]
  );

  const setPatch = React.useCallback(
    (nextPatch: string) => {
      setPatchState(nextPatch);
      replaceUrl(nextPatch, tier);
    },
    [replaceUrl, tier]
  );

  const setTier = React.useCallback(
    (nextTier: string) => {
      setTierState(nextTier);
      replaceUrl(patch, nextTier);
    },
    [patch, replaceUrl]
  );

  React.useEffect(() => {
    const currentQuery = searchParams.toString();
    if (pendingQueryRef.current !== null) {
      if (currentQuery === pendingQueryRef.current) {
        pendingQueryRef.current = null;
      } else {
        return;
      }
    }

    const nextPatch = normalizeHomePatch(
      searchParams.get("patch") ?? undefined,
      initialPatches,
      defaultPatch
    );
    const nextTier = normalizeHomeTier(searchParams.get("tier") ?? undefined, initialTier);

    setPatchState((current) => (current === nextPatch ? current : nextPatch));
    setTierState((current) => (current === nextTier ? current : nextTier));

    const canonicalQuery = buildHomeFiltersQuery({
      currentQuery,
      patch: nextPatch,
      tier: nextTier,
      defaultPatch,
      defaultTier: initialTier,
    });

    if (canonicalQuery !== currentQuery) {
      pendingQueryRef.current = canonicalQuery;
      router.replace(canonicalQuery ? `${pathname}?${canonicalQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [defaultPatch, initialPatches, initialTier, pathname, router, searchParams]);

  const value = React.useMemo(
    () => ({ patch, tier, patches: initialPatches, setPatch, setTier }),
    [patch, tier, initialPatches, setPatch, setTier]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter(): FilterState {
  const ctx = React.useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within FilterProvider");
  return ctx;
}
