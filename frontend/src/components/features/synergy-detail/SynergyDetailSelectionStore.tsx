"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";

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
  setAllies: (next: AllySelectionPair) => void;
}

export function createSynergyDetailSelectionStore(initialAllies: AllySelectionPair) {
  return createStore<SynergyDetailSelectionState>()((set) => ({
    allies: initialAllies,
    setAllies: (next) =>
      set((current) => {
        return isSamePair(current.allies, next) ? current : { allies: next };
      }),
  }));
}

type SynergyDetailSelectionStore = ReturnType<typeof createSynergyDetailSelectionStore>;

const SynergyDetailSelectionContext = React.createContext<SynergyDetailSelectionStore | null>(null);

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
  const [store] = React.useState(() => createSynergyDetailSelectionStore([urlAlly1, urlAlly2]));

  React.useEffect(() => {
    store.getState().setAllies([urlAlly1, urlAlly2]);
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
