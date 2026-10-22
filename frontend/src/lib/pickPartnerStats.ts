import { isWeaponAgnosticCharacter } from "@/lib/characterMap";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { comparePerformanceTierStats } from "@/lib/tierScoring";

export const PICK_PARTNER_SCOPE = "s10-s12-through-12.4";
const BASE = `/data/pick-partners/${PICK_PARTNER_SCOPE}`;
export interface PartnerTotals {
  totalGames: number;
  totalWins: number;
  totalRP: number;
  rankSum: number;
}
export interface PickPartner extends PartnerTotals {
  characterCode: number;
  weaponCode: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}
export interface PickPartnerFile {
  schemaVersion: number;
  scope: string;
  characterCode: number;
  weaponCode: number;
  baseline: PartnerTotals;
  partners: PickPartner[];
}
interface Manifest {
  scope: string;
  files: { characterCode: number; weaponCode: number; file: string }[];
}
const requests = new Map<string, Promise<PickPartnerFile>>();
let manifestRequest: Promise<Manifest> | undefined;

function summarize(totals: PartnerTotals) {
  return {
    ...totals,
    winRate: (totals.totalWins / totals.totalGames) * 100,
    averageRP: totals.totalRP / totals.totalGames / 3,
    averageRank: totals.rankSum / totals.totalGames,
  };
}

export function mergePickPartnerFiles(
  files: PickPartnerFile[],
  characterCode: number
): PickPartner[] {
  const merged = new Map<string, PickPartner>();
  for (const file of files) {
    if (
      file.schemaVersion !== 1 ||
      file.scope !== PICK_PARTNER_SCOPE ||
      file.characterCode !== characterCode
    ) {
      throw new Error("invalid_pick_partner_snapshot");
    }
    for (const partner of file.partners) {
      if (partner.characterCode === characterCode) continue;
      if (
        ![partner.totalGames, partner.totalWins, partner.totalRP, partner.rankSum].every(
          Number.isFinite
        ) ||
        partner.totalGames <= 0
      ) {
        throw new Error("invalid_pick_partner_metrics");
      }
      const weaponCode = isWeaponAgnosticCharacter(partner.characterCode) ? 0 : partner.weaponCode;
      const key = `${partner.characterCode}:${weaponCode}`;
      const previous = merged.get(key);
      const totals = {
        totalGames: (previous?.totalGames ?? 0) + partner.totalGames,
        totalWins: (previous?.totalWins ?? 0) + partner.totalWins,
        totalRP: (previous?.totalRP ?? 0) + partner.totalRP,
        rankSum: (previous?.rankSum ?? 0) + partner.rankSum,
      };
      merged.set(key, { characterCode: partner.characterCode, weaponCode, ...summarize(totals) });
    }
  }
  return [...merged.values()];
}

export async function loadPickPartners(
  characterCode: number,
  weaponCode: number | null
): Promise<PickPartner[]> {
  manifestRequest ??= fetchWithRetry<Manifest>(`${BASE}/manifest.json`).catch((error) => {
    manifestRequest = undefined;
    throw error;
  });
  const manifest = await manifestRequest;
  if (manifest.scope !== PICK_PARTNER_SCOPE) throw new Error("invalid_pick_partner_scope");
  const selectedWeapon = isWeaponAgnosticCharacter(characterCode) ? null : weaponCode;
  const entries = manifest.files.filter(
    (entry) =>
      entry.characterCode === characterCode &&
      (selectedWeapon == null || entry.weaponCode === selectedWeapon)
  );
  const files = await Promise.all(
    entries.map((entry) => {
      const url = `${BASE}/${entry.file}`;
      let request = requests.get(url);
      if (!request) {
        request = fetchWithRetry<PickPartnerFile>(url)
          .then((file) => {
            if (file.characterCode !== entry.characterCode || file.weaponCode !== entry.weaponCode)
              throw new Error("invalid_pick_partner_file");
            return file;
          })
          .catch((error) => {
            requests.delete(url);
            throw error;
          });
        requests.set(url, request);
      }
      return request;
    })
  );
  return mergePickPartnerFiles(files, characterCode);
}

export type PartnerSort = "tierScore" | "averageRP" | "winRate" | "averageRank" | "totalGames";
export function sortPickPartners(
  partners: PickPartner[],
  sort: PartnerSort,
  minimumGames: number,
  focus: { charCode: number; weaponCode: number }[]
) {
  const isFocus = (partner: PickPartner) =>
    focus.some(
      (entry) =>
        entry.charCode === partner.characterCode &&
        (entry.weaponCode === 0 ||
          partner.weaponCode === 0 ||
          entry.weaponCode === partner.weaponCode)
    );
  return partners
    .filter((partner) => partner.totalGames >= minimumGames)
    .sort((a, b) => {
      const focusDifference = Number(isFocus(b)) - Number(isFocus(a));
      if (focusDifference) return focusDifference;
      if (sort === "tierScore") return comparePerformanceTierStats(a, b);
      if (sort !== "totalGames" && a.totalGames < 10 !== b.totalGames < 10)
        return a.totalGames < 10 ? 1 : -1;
      const difference = sort === "averageRank" ? a.averageRank - b.averageRank : b[sort] - a[sort];
      return (
        difference ||
        b.totalGames - a.totalGames ||
        a.characterCode - b.characterCode ||
        a.weaponCode - b.weaponCode
      );
    });
}
