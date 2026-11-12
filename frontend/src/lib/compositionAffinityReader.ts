import type { RouteLocale } from "@/i18n/routing";
import {
  buildCompositionAffinityKey,
  type CompositionAffinityEvidence,
  type CompositionAffinityMemberEvidence,
  type CompositionAffinityMemberInput,
  type CompositionAffinityTrendEvidence,
  type GoodCompositionPrototypeEvidence,
} from "@/lib/characterAffinityComposition";
import { compositionTypeSimilarity } from "@/lib/compositionTypeSemantics";

interface GoodCompositionPrototype {
  key: string;
  roleComposition: string;
  members: Array<{ role: string; type: string }>;
  observations: number;
  supportingProfiles: number;
  reliableObservations: number;
  reliableRate: number;
  contextGames: number;
  adjustedResidual: number;
}

interface CompositionAffinityProfile {
  characterName: string;
  weaponName: string;
  classification: NonNullable<CompositionAffinityMemberEvidence["classification"]>;
  groupNameKo: string;
  trends: Record<string, CompositionAffinityTrendEvidence>;
}

export interface CompositionAffinitySnapshot {
  profiles: Record<string, CompositionAffinityProfile>;
  prototypes: GoodCompositionPrototype[];
}

export function compositionPartnerTypesKey(partnerTypes: Array<{ role: string; fitRole: string }>) {
  return partnerTypes
    .map((partner) => `${partner.role}:${partner.fitRole}`)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join("|");
}

const MEMBER_ASSIGNMENTS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

function indexPrototypes(prototypes: GoodCompositionPrototype[]) {
  const prototypesByKey = new Map(prototypes.map((prototype) => [prototype.key, prototype]));
  const prototypesByRoleComposition = new Map<string, GoodCompositionPrototype[]>();
  for (const prototype of prototypes) {
    const candidates = prototypesByRoleComposition.get(prototype.roleComposition) ?? [];
    candidates.push(prototype);
    prototypesByRoleComposition.set(prototype.roleComposition, candidates);
  }
  const similarities = new Map<string, number>();
  function typeSimilarity(source: string, target: string) {
    const key = source + "\0" + target;
    const cached = similarities.get(key);
    if (cached !== undefined) return cached;
    const score = compositionTypeSimilarity(source, target);
    similarities.set(key, score);
    return score;
  }
  return { prototypesByKey, prototypesByRoleComposition, typeSimilarity };
}

function classifiedPrototypeKey(members: Array<{ role: string; firstOrderType: string }>) {
  return members
    .map((member) => `${member.role}:${member.firstOrderType}`)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join("|");
}

function classifiedRoleComposition(members: Array<{ role: string }>) {
  return members
    .map((member) => member.role)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join(" + ");
}

function matchPrototypeMembers(
  sources: Array<{
    characterCode: number;
    weapon: number;
    role: string;
    firstOrderType: string;
  }>,
  prototype: GoodCompositionPrototype,
  typeSimilarity: typeof compositionTypeSimilarity
) {
  let best:
    | {
        assignment: (typeof MEMBER_ASSIGNMENTS)[number];
        similarities: number[];
        average: number;
        minimum: number;
      }
    | undefined;

  for (const assignment of MEMBER_ASSIGNMENTS) {
    const valid = sources.every(
      (source, sourceIndex) => source.role === prototype.members[assignment[sourceIndex]]?.role
    );
    if (!valid) continue;
    const similarities = sources.map((source, sourceIndex) =>
      typeSimilarity(source.firstOrderType, prototype.members[assignment[sourceIndex]].type)
    );
    const average = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
    const minimum = Math.min(...similarities);
    if (!best || average > best.average || (average === best.average && minimum > best.minimum)) {
      best = { assignment, similarities, average, minimum };
    }
  }
  return best;
}

function prototypeEvidenceScore(
  prototype: GoodCompositionPrototype,
  similarity: number,
  minimumSimilarity: number
) {
  const supportStrength = Math.min(1, prototype.supportingProfiles / 10);
  const evidenceStrength = supportStrength * 0.55 + prototype.reliableRate * 0.45;
  return similarity * 0.8 + minimumSimilarity * 0.1 + evidenceStrength * 0.1;
}

function getGoodCompositionPrototype(
  members: Array<{
    characterCode: number;
    weapon: number;
    role: string;
    firstOrderType: string;
  }>,
  {
    prototypesByKey,
    prototypesByRoleComposition,
    typeSimilarity,
  }: ReturnType<typeof indexPrototypes>
): GoodCompositionPrototypeEvidence | null {
  if (members.length !== 3) return null;
  const exactKey = classifiedPrototypeKey(members);
  const exact = prototypesByKey.get(exactKey);
  const candidates = exact
    ? [exact]
    : (prototypesByRoleComposition.get(classifiedRoleComposition(members)) ?? []);

  let selected:
    | {
        prototype: GoodCompositionPrototype;
        match: NonNullable<ReturnType<typeof matchPrototypeMembers>>;
        score: number;
      }
    | undefined;
  for (const prototype of candidates) {
    const match = matchPrototypeMembers(members, prototype, typeSimilarity);
    if (!match) continue;
    const score = prototypeEvidenceScore(prototype, match.average, match.minimum);
    if (!selected || score > selected.score) selected = { prototype, match, score };
  }

  if (!selected) return null;
  const matchType = selected.prototype.key === exactKey ? "exact" : "nearest";
  if (matchType === "nearest" && (selected.match.average < 0.58 || selected.match.minimum < 0.2)) {
    return null;
  }

  const { prototype, match } = selected;
  return {
    match: matchType,
    key: prototype.key,
    roleComposition: prototype.roleComposition,
    members: prototype.members,
    memberMatches: members.map((member, memberIndex) => {
      const prototypeMember = prototype.members[match.assignment[memberIndex]];
      return {
        characterCode: member.characterCode,
        weapon: member.weapon,
        sourceType: member.firstOrderType,
        role: prototypeMember.role,
        type: prototypeMember.type,
        similarity: Number(match.similarities[memberIndex].toFixed(4)),
      };
    }),
    similarity: Number(match.average.toFixed(4)),
    minimumSimilarity: Number(match.minimum.toFixed(4)),
    observations: prototype.observations,
    supportingProfiles: prototype.supportingProfiles,
    reliableObservations: prototype.reliableObservations,
    reliableRate: prototype.reliableRate,
    contextGames: prototype.contextGames,
    adjustedResidual: prototype.adjustedResidual,
  };
}

export function createCompositionAffinityReader(snapshot: CompositionAffinitySnapshot) {
  const prototypes = indexPrototypes(snapshot.prototypes);

  return (
    members: CompositionAffinityMemberInput[],
    locale: RouteLocale
  ): CompositionAffinityEvidence => {
    const profiles = members.map(
      (member) => snapshot.profiles[member.characterCode + ":" + member.weapon]
    );
    const evidenceMembers = members.map((member, memberIndex) => {
      const profile = profiles[memberIndex];
      if (!profile) {
        return { ...member, characterName: "", weaponName: "", classification: null, trend: null };
      }

      const partners = profiles.filter(
        (candidate, index) => index !== memberIndex && candidate != null
      );
      const partnerKey =
        partners.length === 2
          ? compositionPartnerTypesKey(
              partners.map(({ classification }) => ({
                role: classification.role,
                fitRole: classification.firstOrderType,
              }))
            )
          : null;

      return {
        ...member,
        characterName: profile.characterName,
        weaponName: profile.weaponName,
        classification: {
          ...profile.classification,
          groupName: locale === "ko" ? profile.groupNameKo : profile.classification.groupName,
        },
        trend: partnerKey ? (profile.trends[partnerKey] ?? null) : null,
      };
    });
    const classifiedMembers = evidenceMembers.flatMap((member) =>
      member.classification
        ? [
            {
              characterCode: member.characterCode,
              weapon: member.weapon,
              role: member.classification.role,
              firstOrderType: member.classification.firstOrderType,
            },
          ]
        : []
    );

    return {
      key: buildCompositionAffinityKey(members),
      classifiedMembers: classifiedMembers.length,
      matchedMembers: evidenceMembers.filter((member) => member.trend != null).length,
      members: evidenceMembers,
      prototype: getGoodCompositionPrototype(classifiedMembers, prototypes),
    };
  };
}
