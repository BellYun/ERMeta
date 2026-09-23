import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolSynergyContext } from "@/lib/poolGapAnalysis";

interface RawComboEntry {
  multiset: string;
  delta: number;
  games: number;
}

interface RawLabCharacter {
  characterCode: number;
  weapon: number | null;
  strong: RawComboEntry[];
  weak: RawComboEntry[];
}

interface RawLabData {
  role: string;
  characters: RawLabCharacter[];
}

const ROLE_FILES = [
  "tanks",
  "warriors",
  "assassins",
  "skilldealers",
  "rangers",
  "supports",
] as const;

let cachedEvidence: Record<string, PoolSynergyContext[]> | null = null;

function resolveDataDirectory() {
  const relativePath = join("public", "data", "lab", "sample-confidence");
  const candidates = [
    join(process.cwd(), relativePath),
    join(process.cwd(), "frontend", relativePath),
  ];
  return candidates.find(existsSync) ?? null;
}

function getPartnerRoles(multiset: string, ownRole: string): [string, string] | null {
  const roles = multiset
    .split("+")
    .map((role) => role.trim())
    .filter(Boolean);
  const ownRoleIndex = roles.indexOf(ownRole);
  if (ownRoleIndex < 0) return null;
  roles.splice(ownRoleIndex, 1);
  if (roles.length !== 2) return null;
  return roles.sort((left, right) => left.localeCompare(right, "ko")) as [string, string];
}

export function getPoolRoleContextEvidence(): Record<string, PoolSynergyContext[]> {
  if (cachedEvidence) return cachedEvidence;

  const dataDirectory = resolveDataDirectory();
  if (!dataDirectory) {
    cachedEvidence = {};
    return cachedEvidence;
  }

  const result: Record<string, PoolSynergyContext[]> = {};
  for (const roleFile of ROLE_FILES) {
    const data = JSON.parse(
      readFileSync(join(dataDirectory, `${roleFile}.json`), "utf8")
    ) as RawLabData;

    for (const profile of data.characters) {
      const profileKey = `${profile.characterCode}:${profile.weapon ?? "null"}`;
      result[profileKey] = [...profile.strong, ...profile.weak].flatMap((context) => {
        if (context.games < 100) return [];
        const partnerRoles = getPartnerRoles(context.multiset, data.role);
        if (!partnerRoles) return [];
        return [
          {
            key: partnerRoles.join("|"),
            partnerRoles,
            games: context.games,
            adjustedRp: context.delta,
          } satisfies PoolSynergyContext,
        ];
      });
    }
  }

  cachedEvidence = result;
  return result;
}
