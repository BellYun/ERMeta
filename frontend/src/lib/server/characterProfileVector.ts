import "server-only";
import {
  CHARACTER_ATTRIBUTES_TABLE_HASH,
  OFFICIAL_CONTROL_DIFFICULTY_BY_CHARACTER,
  OFFICIAL_CONTROL_DIFFICULTY_BY_PROFILE,
} from "@/generated/characterControlDifficulty";
import { COMPOSITION_CAPABILITY_HINTS } from "@/generated/compositionCapabilityHints";
import {
  PROFILE_AXES,
  type CharacterProfileAxis,
  type CharacterProfileVector,
  type CharacterProfileVectorEvidence,
} from "@/lib/characterProfileAxes";
import type { CompositionTraitKey } from "@/lib/synergyComposition";

interface OfficialCapabilityHint {
  skillNames: readonly string[];
  skillCount: number;
  hints: {
    hardControl: number;
    softControl: number;
    persistentZone: number;
    allyProtection: number;
    projectileDenial: number;
    mobility: number;
    untargetable: number;
    selfSustain: number;
    repeatedPressure: number;
    executePressure: number;
    visionControl: number;
  };
}

const ROLE_DIFFICULTY_BASELINE: Record<string, number> = {
  탱커: 0.28,
  전사: 0.38,
  암살자: 0.52,
  스킬딜러: 0.44,
  "원거리 딜러": 0.4,
  지원가: 0.34,
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function deriveControlDifficulty(input: {
  characterCode: number;
  weapon: number | null;
  role: string;
  typeName: string;
  traits: CompositionTraitKey[];
  officialHint: OfficialCapabilityHint | null;
}) {
  const officialRating =
    (OFFICIAL_CONTROL_DIFFICULTY_BY_PROFILE as Record<string, number>)[
      `${input.characterCode}:${input.weapon}`
    ] ??
    (OFFICIAL_CONTROL_DIFFICULTY_BY_CHARACTER as Record<number, number>)[input.characterCode] ??
    null;
  if (officialRating != null) {
    return {
      score: (officialRating - 1) / 4,
      rating: officialRating,
      evidence: {
        source: "officialCharacterAttributes" as const,
        version: "nimble-neuron-character-attributes-v1" as const,
        tableHash: CHARACTER_ATTRIBUTES_TABLE_HASH,
      },
    };
  }

  const hint = input.officialHint;
  let score = ROLE_DIFFICULTY_BASELINE[input.role] ?? 0.4;

  if (hint) {
    const extraSkillForms = Math.max(0, hint.skillNames.length - 5);
    const signalDiversity = [
      hint.hints.mobility,
      hint.hints.untargetable,
      hint.hints.persistentZone,
      hint.hints.allyProtection,
      hint.hints.projectileDenial,
      hint.hints.executePressure,
      hint.hints.visionControl,
    ].filter((value) => value > 0).length;

    // This is an input-load proxy, not a character power score. Extra skill forms,
    // repeated inputs and mobility timing raise the estimated learning burden.
    score += Math.min(0.14, extraSkillForms * 0.045);
    score += normalized(hint.hints.mobility, 5) * 0.13;
    score += normalized(hint.hints.repeatedPressure, 5) * 0.08;
    score += normalized(hint.hints.untargetable, 5) * 0.05;
    score += normalized(signalDiversity, 7) * 0.07;
  }

  if (input.traits.includes("dive")) score += 0.04;
  if (input.traits.includes("zoneControl")) score += 0.025;
  if (/연속|연계|전환|변칙|리셋|소환|설치|운영|태세/.test(input.typeName)) score += 0.07;

  return {
    score: clamp(score, 0.2, 0.92),
    rating: null,
    evidence: {
      source: hint?.skillCount
        ? ("officialSkillTextProxy" as const)
        : ("roleTypeFallback" as const),
      version: "control-difficulty-v1" as const,
      tableHash: null,
    },
  };
}

const ROLE_BASELINES: Record<string, Partial<CharacterProfileVector>> = {
  탱커: {
    engage: 0.58,
    frontline: 0.9,
    chase: 0.28,
    disrupt: 0.62,
    finish: 0.2,
    zone: 0.5,
    peel: 0.5,
    burst: 0.25,
    sustainedDps: 0.28,
    mobility: 0.32,
    crowdControl: 0.72,
    selfSustain: 0.7,
    rangePressure: 0.18,
  },
  전사: {
    engage: 0.48,
    frontline: 0.68,
    chase: 0.58,
    disrupt: 0.4,
    finish: 0.55,
    zone: 0.25,
    peel: 0.24,
    burst: 0.55,
    sustainedDps: 0.65,
    mobility: 0.58,
    crowdControl: 0.42,
    selfSustain: 0.62,
    rangePressure: 0.2,
  },
  암살자: {
    engage: 0.35,
    frontline: 0.2,
    chase: 0.88,
    disrupt: 0.3,
    finish: 0.92,
    zone: 0.12,
    peel: 0.08,
    burst: 0.92,
    sustainedDps: 0.4,
    mobility: 0.92,
    crowdControl: 0.28,
    selfSustain: 0.28,
    rangePressure: 0.24,
  },
  스킬딜러: {
    engage: 0.25,
    frontline: 0.18,
    chase: 0.25,
    disrupt: 0.45,
    finish: 0.5,
    zone: 0.62,
    peel: 0.3,
    burst: 0.72,
    sustainedDps: 0.68,
    mobility: 0.35,
    crowdControl: 0.6,
    selfSustain: 0.3,
    rangePressure: 0.78,
  },
  "원거리 딜러": {
    engage: 0.12,
    frontline: 0.12,
    chase: 0.48,
    disrupt: 0.18,
    finish: 0.55,
    zone: 0.22,
    peel: 0.18,
    burst: 0.45,
    sustainedDps: 0.95,
    mobility: 0.55,
    crowdControl: 0.22,
    selfSustain: 0.28,
    rangePressure: 0.95,
  },
  지원가: {
    engage: 0.38,
    frontline: 0.38,
    chase: 0.18,
    disrupt: 0.5,
    finish: 0.12,
    zone: 0.55,
    peel: 0.92,
    burst: 0.12,
    sustainedDps: 0.18,
    mobility: 0.35,
    crowdControl: 0.8,
    selfSustain: 0.45,
    rangePressure: 0.62,
  },
};

const TRAIT_BOOSTS: Record<CompositionTraitKey, Partial<CharacterProfileVector>> = {
  engage: { engage: 0.92, crowdControl: 0.65 },
  dive: { chase: 0.84, finish: 0.8, mobility: 0.8 },
  peel: { peel: 0.92, crowdControl: 0.78 },
  protect: { peel: 0.94 },
  poke: { rangePressure: 0.92 },
  burst: { burst: 0.92, finish: 0.8 },
  sustain: { sustainedDps: 0.78 },
  zoneControl: { disrupt: 0.8, zone: 0.94, crowdControl: 0.84 },
};

function emptyVector(): CharacterProfileVector {
  return Object.fromEntries(PROFILE_AXES.map((axis) => [axis, 0])) as CharacterProfileVector;
}

function applyBoost(vector: CharacterProfileVector, boost: Partial<CharacterProfileVector>) {
  for (const [axis, value] of Object.entries(boost) as Array<
    [CharacterProfileAxis, number | undefined]
  >) {
    if (value == null) continue;
    vector[axis] = Math.max(vector[axis], Math.min(1, value));
  }
}

function applyTraitBoost(vector: CharacterProfileVector, trait: CompositionTraitKey, role: string) {
  applyBoost(vector, TRAIT_BOOSTS[trait]);

  // `sustain` means very different things for a carry and a frontliner. A ranged
  // carry's sustained damage must not be read as durability or frontline value.
  if (trait === "sustain") {
    if (role === "탱커" || role === "전사") {
      applyBoost(vector, { frontline: 0.75, selfSustain: 0.82 });
    } else if (role === "원거리 딜러" || role === "스킬딜러") {
      applyBoost(vector, { sustainedDps: 0.9 });
    }
  }

  if (trait === "protect" && (role === "탱커" || role === "전사")) {
    applyBoost(vector, { frontline: 0.72 });
  }
}

function normalized(value: number, ceiling: number) {
  return Math.min(1, value / ceiling);
}

function getOfficialHint(characterCode: number): OfficialCapabilityHint | null {
  return (
    (COMPOSITION_CAPABILITY_HINTS as Record<number, OfficialCapabilityHint>)[characterCode] ?? null
  );
}

export function deriveCharacterProfileVector(input: {
  characterCode: number;
  weapon: number | null;
  role: string;
  typeName: string;
  traits: CompositionTraitKey[];
}): {
  vector: CharacterProfileVector;
  evidence: CharacterProfileVectorEvidence;
  controlDifficulty: ReturnType<typeof deriveControlDifficulty>;
} {
  const vector = emptyVector();
  applyBoost(vector, ROLE_BASELINES[input.role] ?? {});
  for (const trait of input.traits) applyTraitBoost(vector, trait, input.role);

  const typeName = input.typeName;
  if (/교전 개시|강제 진입|선봉 진입/.test(typeName)) {
    applyBoost(vector, { engage: 0.96, crowdControl: 0.72 });
  }
  if (/전열 유지|선봉 지속|받아치기 유지/.test(typeName)) {
    applyBoost(vector, { frontline: 0.9, selfSustain: 0.82 });
  }
  if (/추격/.test(typeName)) applyBoost(vector, { chase: 0.96, mobility: 0.82 });
  if (/교란|진형 붕괴|압박/.test(typeName)) applyBoost(vector, { disrupt: 0.92 });
  if (/마무리|암살/.test(typeName)) applyBoost(vector, { finish: 0.94 });
  if (/폭딜|점사|누킹/.test(typeName)) applyBoost(vector, { burst: 0.94 });
  if (/장악|억제|지역|제어/.test(typeName)) {
    applyBoost(vector, { zone: 0.94, disrupt: 0.78, crowdControl: 0.86 });
  }
  if (/보호|받아치기|진입 차단/.test(typeName)) {
    applyBoost(vector, { peel: 0.94, crowdControl: 0.78 });
  }
  if (/포킹|견제|사거리 압박/.test(typeName)) applyBoost(vector, { rangePressure: 0.94 });
  if (/진입|측면/.test(typeName)) applyBoost(vector, { mobility: 0.75 });
  if (/지속|장기전/.test(typeName)) applyBoost(vector, { sustainedDps: 0.82 });

  const officialHint = getOfficialHint(input.characterCode);
  if (officialHint?.skillCount) {
    const hints = officialHint.hints;
    const hardControl = normalized(hints.hardControl, officialHint.skillCount * 2);
    const softControl = normalized(hints.softControl, officialHint.skillCount * 2);
    const mobility = normalized(hints.mobility, 3);
    const persistentZone = normalized(
      hints.persistentZone * 2 + hints.visionControl + hints.projectileDenial,
      5
    );
    const protection = normalized(hints.allyProtection * 2 + hints.projectileDenial, 5);
    const selfSustain = normalized(hints.selfSustain + hints.untargetable, 4);
    const repeatedPressure = normalized(hints.repeatedPressure, 5);
    const executePressure = normalized(hints.executePressure, 4);
    const isFrontliner = input.role === "탱커" || input.role === "전사";
    const isInitiator = isFrontliner || input.traits.includes("engage");
    const isDisruptor =
      input.role === "탱커" ||
      input.role === "지원가" ||
      input.traits.some((trait) => trait === "engage" || trait === "zoneControl");
    const isPeeler =
      input.role === "탱커" ||
      input.role === "지원가" ||
      input.traits.some((trait) => trait === "peel" || trait === "protect");

    applyBoost(vector, {
      engage: isInitiator
        ? 0.25 + hardControl * 0.45 + mobility * 0.2
        : 0.12 + hardControl * 0.12 + mobility * 0.08,
      frontline: isFrontliner
        ? 0.25 + selfSustain * 0.5 + hardControl * 0.12
        : 0.12 + selfSustain * 0.2,
      chase: 0.15 + mobility * 0.55 + softControl * 0.12,
      disrupt: isDisruptor
        ? hardControl * 0.35 + softControl * 0.2 + persistentZone * 0.4
        : hardControl * 0.18 + softControl * 0.1 + persistentZone * 0.2,
      finish: executePressure * 0.75 + mobility * 0.15,
      zone: isDisruptor
        ? persistentZone * 0.8 + hardControl * 0.12
        : persistentZone * 0.4 + hardControl * 0.08,
      peel: isPeeler
        ? protection * 0.7 + hardControl * 0.18
        : protection * 0.35 + hardControl * 0.08,
      sustainedDps: repeatedPressure * 0.9,
      mobility,
      crowdControl: 0.1 + hardControl * 0.45 + softControl * 0.25,
      selfSustain,
    });
  }

  return {
    vector,
    evidence: {
      source: officialHint?.skillCount ? "officialSkillText" : "roleTypeFallback",
      skillCount: officialHint?.skillCount ?? 0,
    },
    controlDifficulty: deriveControlDifficulty({
      characterCode: input.characterCode,
      weapon: input.weapon,
      role: input.role,
      typeName: input.typeName,
      traits: input.traits,
      officialHint,
    }),
  };
}
