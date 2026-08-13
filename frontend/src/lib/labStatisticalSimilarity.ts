import type { LabCharacter, LabData } from "@/components/features/lab/types";

export const LAB_SIMILARITY_THRESHOLDS = {
  minimumGames: 100,
  minimumGameShare: 0.01,
  minimumSharedCompositions: 4,
  minimumSignAgreement: 0.55,
  maximumRelativeGap: 0.6,
} as const;

export interface StatisticalProfileComparison {
  sharedCompositions: number;
  signAgreement: number;
  liftGap: number;
  shareGap: number;
  compatible: boolean;
}

export interface CrossGroupStatisticalPair extends StatisticalProfileComparison {
  fitRole: string;
  left: LabCharacter;
  right: LabCharacter;
}

function reliableMetricProfile(character: LabCharacter): Map<string, number> {
  const minimumGames = Math.max(
    LAB_SIMILARITY_THRESHOLDS.minimumGames,
    Math.ceil(character.totalGames * LAB_SIMILARITY_THRESHOLDS.minimumGameShare)
  );

  return new Map(
    [...character.strong, ...character.weak]
      .filter((entry) => entry.games >= minimumGames)
      .map((entry) => [entry.multiset, entry.delta])
  );
}

function relativeGap(left: number, right: number): number {
  const largest = Math.max(Math.abs(left), Math.abs(right));
  return largest > 0 ? Math.abs(left - right) / largest : 0;
}

export function compareCharacterStatisticalProfiles(
  left: LabCharacter,
  right: LabCharacter
): StatisticalProfileComparison {
  const leftProfile = reliableMetricProfile(left);
  const rightProfile = reliableMetricProfile(right);
  const sharedKeys = [...leftProfile.keys()].filter((key) => rightProfile.has(key));
  const signAgreement =
    sharedKeys.length > 0
      ? sharedKeys.filter(
          (key) => Math.sign(leftProfile.get(key) ?? 0) === Math.sign(rightProfile.get(key) ?? 0)
        ).length / sharedKeys.length
      : 0;
  const liftGap = relativeGap(
    left.classification?.partnerDelta ?? 0,
    right.classification?.partnerDelta ?? 0
  );
  const shareGap = relativeGap(
    left.classification?.partnerGameShare ?? 0,
    right.classification?.partnerGameShare ?? 0
  );

  return {
    sharedCompositions: sharedKeys.length,
    signAgreement,
    liftGap,
    shareGap,
    compatible:
      sharedKeys.length >= LAB_SIMILARITY_THRESHOLDS.minimumSharedCompositions &&
      signAgreement >= LAB_SIMILARITY_THRESHOLDS.minimumSignAgreement &&
      liftGap <= LAB_SIMILARITY_THRESHOLDS.maximumRelativeGap &&
      shareGap <= LAB_SIMILARITY_THRESHOLDS.maximumRelativeGap,
  };
}

export function findCrossGroupStatisticalPairs(data: LabData): CrossGroupStatisticalPair[] {
  const pairs: CrossGroupStatisticalPair[] = [];

  for (let leftIndex = 0; leftIndex < data.characters.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < data.characters.length; rightIndex += 1) {
      const left = data.characters[leftIndex];
      const right = data.characters[rightIndex];
      const leftFitRole = left.classification?.fitRole;
      const rightFitRole = right.classification?.fitRole;
      const leftMetricGroupKey = left.classification?.metricGroupKey;
      const rightMetricGroupKey = right.classification?.metricGroupKey;

      if (
        left.groupId === null ||
        right.groupId === null ||
        left.groupId === right.groupId ||
        leftMetricGroupKey != null ||
        rightMetricGroupKey != null ||
        !leftFitRole ||
        !rightFitRole
      ) {
        continue;
      }

      const comparison = compareCharacterStatisticalProfiles(left, right);
      if (!comparison.compatible) continue;

      pairs.push({
        fitRole: leftFitRole === rightFitRole ? leftFitRole : `${leftFitRole} ↔ ${rightFitRole}`,
        left,
        right,
        ...comparison,
      });
    }
  }

  return pairs.sort(
    (left, right) =>
      right.signAgreement - left.signAgreement ||
      right.sharedCompositions - left.sharedCompositions ||
      left.liftGap + left.shareGap - (right.liftGap + right.shareGap) ||
      `${left.left.characterName}:${left.right.characterName}`.localeCompare(
        `${right.left.characterName}:${right.right.characterName}`,
        "ko"
      )
  );
}
