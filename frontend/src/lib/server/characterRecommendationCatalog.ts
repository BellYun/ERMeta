import "server-only";

import {
  effectiveCharacterAffinityGroups,
  getCharacterAffinitySubtype,
} from "@/lib/characterAffinity";
import { getCompositionTypeTraits } from "@/lib/compositionTypeSemantics";
import type { PoolProfile } from "@/lib/poolGapAnalysis";
import { deriveCharacterProfileVector } from "@/lib/server/characterProfileVector";
import { getPoolRoleContextEvidence } from "@/lib/server/poolRoleContextEvidence";
import { getCharacterCompositionTraits } from "@/lib/synergyComposition";

const roleContextEvidence = getPoolRoleContextEvidence();

const characterRecommendationCatalog = [
  ...new Map(
    effectiveCharacterAffinityGroups.flatMap((group) => {
      const evidence = group.signatureContexts.toSorted(
        (left, right) => right.adjustedResidual - left.adjustedResidual || right.games - left.games
      )[0];

      return group.primaryMembers.map((member) => {
        // Group labels describe partner contexts in some clusters. Recommendation
        // vectors must describe the selected character and weapon themselves.
        const typeName = getCharacterAffinitySubtype(member);
        const traits = [
          ...new Set([
            ...getCharacterCompositionTraits({
              character: member.characterCode,
              weapon: member.weapon ?? 0,
            }),
            ...getCompositionTypeTraits(typeName),
          ]),
        ];
        const profileModel = deriveCharacterProfileVector({
          characterCode: member.characterCode,
          weapon: member.weapon,
          role: member.role,
          typeName,
          traits,
        });
        const profile: PoolProfile = {
          profileKey: member.profileKey,
          characterCode: member.characterCode,
          characterName: member.characterName,
          weapon: member.weapon,
          weaponName: member.weaponName,
          role: member.role,
          typeName,
          traits,
          profileVector: profileModel.vector,
          vectorEvidence: profileModel.evidence,
          controlDifficulty: profileModel.controlDifficulty.score,
          difficultyRating: profileModel.controlDifficulty.rating,
          difficultyEvidence: profileModel.controlDifficulty.evidence,
          synergyContexts: roleContextEvidence[member.profileKey] ?? [],
          evidenceGames: evidence?.games ?? 0,
          evidenceRp: evidence?.adjustedResidual ?? null,
          seasonConsistency: group.seasonConsistency,
        };

        return [member.profileKey, profile] as const;
      });
    })
  ).values(),
].sort(
  (left, right) =>
    left.characterName.localeCompare(right.characterName, "ko") ||
    left.weaponName.localeCompare(right.weaponName, "ko")
);

export function getCharacterRecommendationCatalog() {
  return characterRecommendationCatalog;
}
