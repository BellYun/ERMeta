"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";
import { analytics, type SynergySelectionSource } from "@/lib/analytics";

export interface AllySelection {
  charCode: number;
  weaponCode: number | null;
}

export type AllySelectionPair = [AllySelection | null, AllySelection | null];

interface SearchParamsReader {
  get(name: string): string | null;
}

export function parseAllyFromParams(
  params: SearchParamsReader,
  allyKey: string,
  weaponKey: string,
  legacyAllyKey?: string,
  legacyWeaponKey?: string
): AllySelection | null {
  const charStr = params.get(allyKey) ?? (legacyAllyKey ? params.get(legacyAllyKey) : null);
  if (!charStr) return null;
  const charCode = parseInt(charStr, 10);
  if (isNaN(charCode)) return null;
  const weaponStr = params.get(weaponKey) ?? (legacyWeaponKey ? params.get(legacyWeaponKey) : null);
  const weaponCode = weaponStr ? parseInt(weaponStr, 10) : null;
  return {
    charCode,
    weaponCode: weaponCode && !isNaN(weaponCode) ? weaponCode : null,
  };
}

function isSameAlly(left: AllySelection | null, right: AllySelection | null) {
  return (
    left?.charCode === right?.charCode && (left?.weaponCode ?? null) === (right?.weaponCode ?? null)
  );
}

function isSamePair(left: AllySelectionPair, right: AllySelectionPair) {
  return isSameAlly(left[0], right[0]) && isSameAlly(left[1], right[1]);
}

interface SynergyDetailSelectionState {
  allies: AllySelectionPair;
  selectionSource: SynergySelectionSource | null;
  analyticsEnabled: boolean;
  setAllies: (next: AllySelectionPair, source?: SynergySelectionSource) => void;
}

interface SynergyDetailSelectionStoreOptions {
  selectionSource?: SynergySelectionSource | null;
  analyticsEnabled?: boolean;
}

export function buildSynergyFunnelContext(
  allies: AllySelectionPair,
  selectionSource: SynergySelectionSource
) {
  return {
    ally1Code: allies[0]?.charCode ?? null,
    ally2Code: allies[1]?.charCode ?? null,
    ally1WeaponCode: allies[0]?.weaponCode ?? null,
    ally2WeaponCode: allies[1]?.weaponCode ?? null,
    selectionCount: allies.filter(Boolean).length,
    selectionSource,
    isWeaponScope: true,
  } as const;
}

export function createSynergyDetailSelectionStore(
  initialAllies: AllySelectionPair,
  options: SynergyDetailSelectionStoreOptions = {}
) {
  return createStore<SynergyDetailSelectionState>()((set) => ({
    allies: initialAllies,
    selectionSource: options.selectionSource ?? null,
    analyticsEnabled: options.analyticsEnabled ?? true,
    setAllies: (next, source) =>
      set((current) => {
        return isSamePair(current.allies, next)
          ? current
          : {
              allies: next,
              selectionSource: source ?? current.selectionSource,
            };
      }),
  }));
}

type SynergyDetailSelectionStore = ReturnType<typeof createSynergyDetailSelectionStore>;

const SynergyDetailSelectionContext = React.createContext<SynergyDetailSelectionStore | null>(null);

export function SynergyDetailPreviewProvider({ children }: React.PropsWithChildren) {
  const [store] = React.useState(() =>
    createSynergyDetailSelectionStore(
      [
        { charCode: 6, weaponCode: null },
        { charCode: 33, weaponCode: null },
      ],
      { analyticsEnabled: false }
    )
  );
  return (
    <SynergyDetailSelectionContext.Provider value={store}>
      {children}
    </SynergyDetailSelectionContext.Provider>
  );
}

export function SynergyDetailSelectionProvider({ children }: React.PropsWithChildren) {
  const searchParams = useSearchParams();
  const urlAlly1 = React.useMemo(
    () => parseAllyFromParams(searchParams, "ally1", "w1", "a"),
    [searchParams]
  );
  const urlAlly2 = React.useMemo(
    () => parseAllyFromParams(searchParams, "ally2", "w2", "b"),
    [searchParams]
  );
  const [store] = React.useState(() => {
    const initialAllies: AllySelectionPair = [urlAlly1, urlAlly2];
    return createSynergyDetailSelectionStore(initialAllies, {
      selectionSource: initialAllies.some(Boolean) ? "url_restore" : null,
    });
  });
  const trackedInitialRestoreRef = React.useRef(false);

  React.useEffect(() => {
    if (trackedInitialRestoreRef.current) return;
    trackedInitialRestoreRef.current = true;
    const { allies, selectionSource, analyticsEnabled } = store.getState();
    if (!analyticsEnabled || selectionSource !== "url_restore" || !allies.some(Boolean)) return;
    analytics.synergySearchStarted(buildSynergyFunnelContext(allies, selectionSource));
  }, [store]);

  React.useEffect(() => {
    const nextAllies: AllySelectionPair = [urlAlly1, urlAlly2];
    const current = store.getState();
    const changed = !isSamePair(current.allies, nextAllies);
    current.setAllies(nextAllies, "url_restore");
    if (changed && current.analyticsEnabled && nextAllies.some(Boolean)) {
      analytics.synergySearchStarted(buildSynergyFunnelContext(nextAllies, "url_restore"));
    }
  }, [store, urlAlly1, urlAlly2]);

  return (
    <SynergyDetailSelectionContext.Provider value={store}>
      {children}
    </SynergyDetailSelectionContext.Provider>
  );
}

export function useSynergyDetailSelectionStoreApi(): StoreApi<SynergyDetailSelectionState> {
  const store = React.useContext(SynergyDetailSelectionContext);
  if (!store) {
    throw new Error("useSynergyDetailSelectionStoreApi must be used inside its provider");
  }
  return store;
}

export function useSynergyDetailSelection<T>(
  selector: (state: SynergyDetailSelectionState) => T
): T {
  return useStore(useSynergyDetailSelectionStoreApi(), selector);
}

export function useSelectedAllies(): AllySelection[] {
  const pair = useSynergyDetailSelection((state) => state.allies);
  return React.useMemo(() => pair.filter(Boolean) as AllySelection[], [pair]);
}
