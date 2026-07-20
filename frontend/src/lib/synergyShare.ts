import { isKnownCharacterCode } from "@/lib/characterMap";

export type SynergyShareMethod = "native" | "clipboard";

export interface SynergyShareSelection {
  ally1: number;
  ally2: number | null;
}

export function parseSynergyShareSelection(selection: string): SynergyShareSelection | null {
  const parts = selection.split("-");
  if (parts.length < 1 || parts.length > 2) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;

  const codes = parts.map((part) => Number.parseInt(part, 10));
  if (codes.some((code) => !isKnownCharacterCode(code))) return null;
  if (codes.length === 2 && codes[0] === codes[1]) return null;

  const ally1 = codes[0];
  if (ally1 == null) return null;

  return {
    ally1,
    ally2: codes[1] ?? null,
  };
}

export function createSynergyShareSelection(codes: number[]): string | null {
  if (codes.length < 1 || codes.length > 2) return null;
  if (codes.some((code) => !isKnownCharacterCode(code))) return null;
  if (codes.length === 2 && codes[0] === codes[1]) return null;
  return codes.join("-");
}

export function buildSynergyShareUrl(
  currentUrl: string,
  selectedCodes: number[],
  method: SynergyShareMethod
): string {
  const selection = createSynergyShareSelection(selectedCodes);
  if (!selection) return currentUrl;

  const url = new URL(currentUrl);
  const basePath = url.pathname.replace(/\/$/, "").replace(/\/share\/[^/]+$/, "");
  url.pathname = `${basePath}/share/${selection}`;
  url.searchParams.set("utm_source", "ergg_share");
  url.searchParams.set("utm_medium", method);
  url.searchParams.set("utm_campaign", "synergy_detail");
  return url.toString();
}

export function buildSynergyShareTargetUrl(
  currentUrl: string,
  selection: SynergyShareSelection
): string {
  const url = new URL(currentUrl);
  url.pathname = url.pathname.replace(/\/share\/[^/]+\/?$/, "") || "/synergy-detail";
  url.searchParams.set("ally1", String(selection.ally1));
  if (selection.ally2 != null) url.searchParams.set("ally2", String(selection.ally2));
  else url.searchParams.delete("ally2");
  url.searchParams.delete("a");
  url.searchParams.delete("b");
  return `${url.pathname}${url.search}${url.hash}`;
}
