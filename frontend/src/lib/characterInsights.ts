import { type RouteLocale } from "@/i18n/routing";
import type { CharacterStatsResponse, WeaponStatItem } from "@/lib/characterStats";

export interface CharacterInsight {
  patchVersion: string;
  tier: string;
  sampleLabel: "high" | "medium" | "low";
  headline: string;
  fitTitle: string;
  fitPoints: string[];
  metricsTitle: string;
  metricsPoints: string[];
  compositionTitle: string;
  compositionReason: string;
  warningsTitle: string;
  warnings: string[];
}

export interface CharacterRoleComboInsight {
  pickReason: string;
  weakReason?: string;
}

function signed(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatTier(locale: RouteLocale, tier: string) {
  if (tier === "MITHRIL_PLUS") {
    if (locale === "ja") return "ミスリル以上";
    if (locale === "ko") return "미스릴 이상";
    return "Mithril+";
  }
  if (tier === "METEORITE_PLUS") {
    if (locale === "ja") return "メテオライト以上";
    if (locale === "ko") return "메테오라이트 이상";
    return "Meteorite+";
  }
  if (tier === "DIAMOND_PLUS") {
    if (locale === "ja") return "ダイヤ以上";
    if (locale === "ko") return "다이아 이상";
    return "Diamond+";
  }
  return tier;
}

function sampleLabel(totalGames: number): CharacterInsight["sampleLabel"] {
  if (totalGames >= 1000) return "high";
  if (totalGames >= 300) return "medium";
  return "low";
}

function bestWeapon(stats: CharacterStatsResponse): WeaponStatItem | null {
  return stats.weapons[0] ?? null;
}

function weaponSpread(stats: CharacterStatsResponse) {
  if (stats.weapons.length < 2) return 0;
  return stats.weapons[0].pickRate - stats.weapons[1].pickRate;
}

function buildKoreanTempoRead(stats: CharacterStatsResponse) {
  const lowTop3 = stats.top3Rate < 37.5;
  const highTop3 = stats.top3Rate >= 40;
  const highWin = stats.winRate >= 12.5;
  const lowWin = stats.winRate < 12.5;
  const lowRp = stats.averageRP < 3;
  const highRp = stats.averageRP >= 8;

  if (lowTop3 && highWin) {
    return "Top 3 비율은 낮지만 승률이 높아, 초반부터 안정적으로 순방하는 픽이라기보다 마지막 금지 구역 교전에서 1등으로 전환하는 힘이 있는 편입니다.";
  }

  if (highTop3 && lowWin) {
    return "Top 3 비율은 높지만 승률이 낮아, 순방은 잘하지만 마지막 금지 구역 교전에서 마무리 구도가 어려울 수 있습니다.";
  }

  if (lowRp && highWin) {
    return "승률은 높지만 평균 RP가 낮아, 이기는 판은 확실히 가져가도 초중반 사출 손실이 누적될 수 있습니다. 사출을 줄이는 운영이 중요합니다.";
  }

  if (highRp && lowWin) {
    return "평균 RP는 높지만 승률이 낮아, 킬과 순위 점수로 랭크를 올리는 운영에 가깝습니다. 마지막 교전 전까지 성장과 처치 관여를 확보하는 쪽이 좋습니다.";
  }

  if (lowTop3) {
    return "Top 3 비율이 낮아 초반 교전이나 중반 합류 구간에서 사출 위험이 있습니다. 첫 교전은 무리하지 말고 성장과 합류 타이밍을 맞추는 운영이 필요합니다.";
  }

  if (highTop3 && highWin) {
    return "Top 3 비율과 승률이 모두 기준선 이상이라, 순방과 마지막 교전 전환이 함께 잡힌 안정적인 픽입니다.";
  }

  return null;
}

function buildEnglishTempoRead(stats: CharacterStatsResponse) {
  const lowTop3 = stats.top3Rate < 37.5;
  const highTop3 = stats.top3Rate >= 40;
  const highWin = stats.winRate >= 12.5;
  const lowWin = stats.winRate < 12.5;
  const lowRp = stats.averageRP < 3;
  const highRp = stats.averageRP >= 8;

  if (lowTop3 && highWin) {
    return "Top 3 rate is low but win rate is high, so the pick is less about stable early survival and more about converting final restricted-zone fights into wins.";
  }

  if (highTop3 && lowWin) {
    return "Top 3 rate is high but win rate is low, which suggests stable placement but difficulty closing out the final restricted-zone fight.";
  }

  if (lowRp && highWin) {
    return "Win rate is high but average RP is low, so the pick can win games but needs careful anti-elimination play to avoid losing too much RP in bad starts.";
  }

  if (highRp && lowWin) {
    return "Average RP is high but win rate is low, so the pick is closer to a kill-and-placement style than a clean first-place finisher.";
  }

  if (lowTop3) {
    return "Top 3 rate is low, so early fights and mid-game grouping are risky. Avoid early eliminations before forcing fights.";
  }

  if (highTop3 && highWin) {
    return "Top 3 rate and win rate are both above baseline, suggesting both stable placement and good final-fight conversion.";
  }

  return null;
}

function buildKoreanInsight(
  stats: CharacterStatsResponse,
  previousStats: CharacterStatsResponse | null,
  characterName: string,
  weaponName: string | null,
  roleComboInsight: CharacterRoleComboInsight | null
): CharacterInsight {
  const tier = formatTier("ko", stats.tier);
  const sample = sampleLabel(stats.totalGames);
  const weapon = bestWeapon(stats);
  const rpDelta = previousStats ? stats.averageRP - previousStats.averageRP : null;
  const winDelta = previousStats ? stats.winRate - previousStats.winRate : null;
  const concentrated = weaponSpread(stats) >= 25;
  const stable = stats.totalGames >= 1000;
  const climbing = stats.averageRP >= 8;
  const convertToWin = stats.winRate >= 12.5;

  const tempoRead = buildKoreanTempoRead(stats);
  const fitPoints = [
    tempoRead,
    climbing
      ? "평균 RP가 높아 킬·순위 점수를 챙기는 운영에서 랭크 상승 기대값이 있습니다."
      : "평균 RP가 낮은 편이라 이기는 판보다 사출을 줄이는 운영이 더 중요합니다.",
    convertToWin
      ? "승률이 8팀 기준 기대값을 넘어서 1등 전환력도 확인됩니다."
      : "승률은 기대값보다 낮아 마무리 화력이나 한타 주도권을 보완하는 팀원이 좋습니다.",
  ].filter((point): point is string => Boolean(point));

  const metricsPoints = [
    `${tier} 기준 ${stats.totalGames.toLocaleString("ko-KR")}판 표본입니다. ${
      stable
        ? "표본 안정성은 충분한 편입니다."
        : "표본 변동성이 있으므로 단일 지표만 보기는 어렵습니다."
    }`,
    `승률 ${formatPercent(stats.winRate)}, 픽률 ${formatPercent(stats.pickRate)}, 평균 RP ${signed(stats.averageRP)}를 함께 봐야 합니다.`,
    `${
      sample === "low"
        ? "표본 수가 낮아 승률과 RP가 실제 성능보다 크게 흔들릴 수 있습니다."
        : stats.pickRate < 1
          ? "픽률이 낮아 숙련자 표본에 치우쳤을 가능성이 있습니다."
          : "표본과 픽률은 확보되어 있지만 조합과 무기 선택에 따라 결과가 달라질 수 있습니다."
    }`,
    rpDelta != null && winDelta != null
      ? `이전 패치 대비 평균 RP는 ${signed(rpDelta)}, 승률은 ${signed(winDelta)}%p 변했습니다.`
      : "이전 패치 비교 데이터가 부족해 현재 패치 지표 중심으로 해석합니다.",
  ];

  const fallbackCompositionReason = weaponName
    ? concentrated
      ? `${characterName}는 ${weaponName} 선택 비중이 높아 역할이 비교적 명확합니다. 아래 역할 조합별 RP에서 평균 RP가 높은 역할군이 이미 팀에 있을 때 성과가 좋은지 확인하는 편이 좋습니다.`
      : `${characterName}는 무기 선택지가 분산되어 있어 조합에 따라 역할이 달라질 수 있습니다. 아래 역할 조합별 RP에서 강하게 나온 역할군과 함께 고르고, 약하게 나온 역할군이 겹치면 다른 픽을 검토하는 편이 좋습니다.`
    : `${characterName}는 무기별 표본이 충분하지 않아 아래 역할 조합별 RP와 전체 캐릭터 지표를 함께 보고 선택하는 것이 안전합니다.`;
  const compositionReason = roleComboInsight
    ? `${roleComboInsight.pickReason}${
        roleComboInsight.weakReason ? `\n\n${roleComboInsight.weakReason}` : ""
      }`
    : fallbackCompositionReason;

  const warnings = [
    sample === "low"
      ? "표본 수가 낮아 승률과 RP가 실제 성능보다 크게 흔들릴 수 있습니다."
      : "표본은 확보되어 있지만 패치 직후에는 하루 단위로 지표가 흔들릴 수 있습니다.",
    stats.pickRate < 1
      ? "픽률이 낮은 선택지는 숙련자 표본에 치우쳤을 가능성이 있습니다."
      : "픽률이 있는 편이라 범용성은 확인되지만, 조합과 무기 선택에 따라 결과가 달라질 수 있습니다.",
    weapon && weapon.totalGames < 200
      ? "주력 무기 표본도 크지 않으므로 무기별 세부 수치는 보수적으로 해석하세요."
      : "무기별 수치는 전체 캐릭터 지표와 함께 비교해야 합니다.",
  ];

  return {
    patchVersion: stats.patchVersion,
    tier: stats.tier,
    sampleLabel: sample,
    headline: `${characterName}는 ${tier} 구간에서 ${climbing ? "랭크 상승 기대값이 있는" : "조합 보완이 필요한"} 픽입니다.`,
    fitTitle: "잘 맞는 상황",
    fitPoints,
    metricsTitle: "지표 해석",
    metricsPoints,
    compositionTitle: "언제 뽑으면 좋은가",
    compositionReason,
    warningsTitle: "주의할 점",
    warnings,
  };
}

function buildEnglishInsight(
  stats: CharacterStatsResponse,
  previousStats: CharacterStatsResponse | null,
  characterName: string,
  weaponName: string | null,
  roleComboInsight: CharacterRoleComboInsight | null
): CharacterInsight {
  const tier = formatTier("en", stats.tier);
  const sample = sampleLabel(stats.totalGames);
  const rpDelta = previousStats ? stats.averageRP - previousStats.averageRP : null;
  const concentrated = weaponSpread(stats) >= 25;
  const climbing = stats.averageRP >= 8;
  const convertToWin = stats.winRate >= 12.5;

  return {
    patchVersion: stats.patchVersion,
    tier: stats.tier,
    sampleLabel: sample,
    headline: `${characterName} is ${climbing ? "a positive-RP option" : "a conditional option"} in ${tier}.`,
    fitTitle: "Best-fit situations",
    fitPoints: [
      buildEnglishTempoRead(stats),
      climbing
        ? "High average RP makes this pick suitable for kill-and-placement ranked climbing."
        : "Average RP is limited, so reducing early eliminations matters more than forcing fights.",
      convertToWin
        ? "Win rate is above the eight-team baseline, so first-place conversion is visible."
        : "Win rate is below baseline, so finishing power or teamfight control is important.",
    ].filter((point): point is string => Boolean(point)),
    metricsTitle: "How to read the stats",
    metricsPoints: [
      `${stats.totalGames.toLocaleString("en-US")} matches are included for ${tier}.`,
      `Win rate ${formatPercent(stats.winRate)}, pick rate ${formatPercent(stats.pickRate)}, average RP ${signed(stats.averageRP)} should be read together.`,
      sample === "low"
        ? "Low sample size can move win rate and RP sharply."
        : stats.pickRate < 1
          ? "Low pick rate can indicate specialist bias."
          : "Sample size and pick rate are usable, but weapon and team composition still change the result.",
      rpDelta != null
        ? `Average RP changed by ${signed(rpDelta)} compared with the previous patch.`
        : "Previous-patch comparison is unavailable, so current-patch data is emphasized.",
    ],
    compositionTitle: "When to pick",
    compositionReason: roleComboInsight
      ? `${roleComboInsight.pickReason}${
          roleComboInsight.weakReason ? `\n\n${roleComboInsight.weakReason}` : ""
        }`
      : weaponName
        ? concentrated
          ? `${weaponName} is the dominant weapon choice, so the role is clear. Partners that provide engage, frontline stability, or finishing damage are the most natural fit.`
          : `Weapon choices are more distributed, so the composition should fill whichever role the selected weapon leaves open.`
        : "Weapon samples are limited, so composition reads should lean on the character-level stats.",
    warningsTitle: "Cautions",
    warnings: [
      sample === "low"
        ? "Low sample size can exaggerate win rate and RP."
        : "Patch timing can still move the numbers day by day.",
      stats.pickRate < 1
        ? "Low pick rate can indicate specialist bias."
        : "A usable pick rate suggests broader adoption, but matchups still matter.",
      "Use weapon and trio data together instead of relying on one metric.",
    ],
  };
}

export function buildCharacterInsight({
  stats,
  previousStats,
  characterName,
  weaponName,
  locale,
  roleComboInsight = null,
}: {
  stats: CharacterStatsResponse | null;
  previousStats: CharacterStatsResponse | null;
  characterName: string;
  weaponName: string | null;
  locale: RouteLocale;
  roleComboInsight?: CharacterRoleComboInsight | null;
}): CharacterInsight | null {
  if (!stats || stats.totalGames <= 0) return null;
  if (locale === "ko") {
    return buildKoreanInsight(stats, previousStats, characterName, weaponName, roleComboInsight);
  }
  return buildEnglishInsight(stats, previousStats, characterName, weaponName, roleComboInsight);
}
