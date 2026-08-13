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
    if (locale === "ko") return "미스릴+";
    if (locale === "zh-Hans") return "秘银以上";
    if (locale === "zh-Hant") return "秘銀以上";
    return "Mithril+";
  }
  if (tier === "METEORITE_PLUS") {
    if (locale === "ja") return "メテオライト以上";
    if (locale === "ko") return "메테오라이트 이상";
    if (locale === "zh-Hans") return "陨石以上";
    if (locale === "zh-Hant") return "隕石以上";
    return "Meteorite+";
  }
  if (tier === "DIAMOND_PLUS") {
    if (locale === "ja") return "ダイヤ以上";
    if (locale === "ko") return "다이아 이상";
    if (locale === "zh-Hans") return "钻石以上";
    if (locale === "zh-Hant") return "鑽石以上";
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
    return "순방률은 낮고 승률은 높습니다. 초중반 안정성보다 마지막 교전 전환에 지표가 쏠린 형태입니다.";
  }

  if (highTop3 && lowWin) {
    return "순방률은 높고 승률은 낮습니다. 순위 방어는 되지만 마지막 교전 전환 지표는 약합니다.";
  }

  if (lowRp && highWin) {
    return "승률은 높지만 평균 RP가 낮습니다. 이기는 판과 초중반 사출 손실의 편차가 큽니다.";
  }

  if (highRp && lowWin) {
    return "평균 RP는 높고 승률은 낮습니다. 1등 전환보다 킬과 순위 점수 쪽으로 RP가 형성됩니다.";
  }

  if (lowTop3) {
    return "순방률이 낮습니다. 초반 교전과 중반 합류 구간에서 탈락 리스크가 지표에 반영됩니다.";
  }

  if (highTop3 && highWin) {
    return "순방률과 승률이 모두 기준선 이상입니다. 순위 방어와 마지막 교전 전환이 함께 나타납니다.";
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
    return "Placement rate is low but win rate is high, so this pick depends more on closing final fights than on stable early survival.";
  }

  if (highTop3 && lowWin) {
    return "Placement rate is high but win rate is low, which suggests stable placement but difficulty closing out the final restricted-zone fight.";
  }

  if (lowRp && highWin) {
    return "Win rate is high but average RP is low, so the pick can win games but needs careful anti-elimination play to avoid losing too much RP in bad starts.";
  }

  if (highRp && lowWin) {
    return "Average RP is high but win rate is low, so the pick is closer to a kill-and-placement style than a clean first-place finisher.";
  }

  if (lowTop3) {
    return "Placement rate is low, so early fights and mid-game grouping are risky. Avoid early eliminations before forcing fights.";
  }

  if (highTop3 && highWin) {
    return "Placement rate and win rate are both above baseline, suggesting stable placement and good final-fight conversion.";
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
      ? "평균 RP가 높아 킬·순위 점수 지표가 함께 잡힙니다."
      : "평균 RP가 낮아 승리한 판과 탈락한 판의 손익 차이가 큽니다.",
    convertToWin
      ? "승률이 8팀 기준 기대값을 넘습니다."
      : "승률은 기대값보다 낮아 마무리 화력이나 한타 주도권 지표가 약합니다.",
  ].filter((point): point is string => Boolean(point));

  const metricsPoints = [
    `${tier} 기준 ${stats.totalGames.toLocaleString("ko-KR")}판 표본입니다. ${
      stable ? "표본 규모가 충분합니다." : "표본 변동성이 있어 단일 지표 해석은 제한적입니다."
    }`,
    `승률 ${formatPercent(stats.winRate)}, 픽률 ${formatPercent(stats.pickRate)}, 평균 RP ${signed(stats.averageRP)}를 함께 봐야 합니다.`,
    `${
      sample === "low"
        ? "표본 수가 낮아 승률과 RP 변동 폭이 큽니다."
        : stats.pickRate < 1
          ? "픽률이 낮아 숙련자 표본 비중이 높을 수 있습니다."
          : "표본과 픽률은 확보되어 있으며 조합과 무기 선택에 따라 결과가 갈립니다."
    }`,
    rpDelta != null && winDelta != null
      ? `이전 패치 대비 평균 RP는 ${signed(rpDelta)}, 승률은 ${signed(winDelta)}%p 변했습니다.`
      : "이전 패치 비교 데이터가 부족해 현재 패치 지표 중심으로 해석합니다.",
  ];

  const fallbackCompositionReason = weaponName
    ? concentrated
      ? `${characterName}는 ${weaponName} 선택 비중이 높아 역할이 비교적 고정됩니다. 역할 조합별 RP에서 같이 쓰인 역할군과 평균 RP를 확인할 수 있습니다.`
      : `${characterName}는 무기 선택지가 분산되어 조합에 따라 역할이 달라집니다. 역할 조합별 RP에서 강하게 나온 역할군과 약하게 나온 역할군을 나눠 볼 수 있습니다.`
    : `${characterName}는 무기별 표본이 부족해 역할 조합별 RP와 전체 실험체 지표를 함께 봐야 합니다.`;
  const compositionReason = roleComboInsight
    ? `${roleComboInsight.pickReason}${
        roleComboInsight.weakReason ? `\n\n${roleComboInsight.weakReason}` : ""
      }`
    : fallbackCompositionReason;

  const warnings = [
    sample === "low"
      ? "표본 수가 낮아 승률과 RP 변동 폭이 큽니다."
      : "표본은 확보되어 있지만 패치 직후에는 하루 단위로 지표가 흔들릴 수 있습니다.",
    stats.pickRate < 1
      ? "픽률이 낮은 선택지는 숙련자 표본 비중이 높을 수 있습니다."
      : "픽률은 확보되어 있지만 조합과 무기 선택에 따라 결과가 달라질 수 있습니다.",
    weapon && weapon.totalGames < 200
      ? "주력 무기 표본이 작아 무기별 세부 수치의 변동 폭이 큽니다."
      : "무기별 수치는 전체 실험체 지표와 함께 비교합니다.",
  ];

  return {
    patchVersion: stats.patchVersion,
    tier: stats.tier,
    sampleLabel: sample,
    headline: `${characterName} ${tier} 구간 요약`,
    fitTitle: "잘 맞는 상황",
    fitPoints,
    metricsTitle: "지표 해석",
    metricsPoints,
    compositionTitle: "픽 조건",
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
    compositionTitle: "Pick context",
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

function buildLocalizedInsight(
  stats: CharacterStatsResponse,
  previousStats: CharacterStatsResponse | null,
  characterName: string,
  weaponName: string | null,
  locale: Exclude<RouteLocale, "ko" | "en">,
  roleComboInsight: CharacterRoleComboInsight | null
): CharacterInsight {
  const tier = formatTier(locale, stats.tier);
  const sample = sampleLabel(stats.totalGames);
  const rpDelta = previousStats ? stats.averageRP - previousStats.averageRP : null;
  const concentrated = weaponSpread(stats) >= 25;
  const climbing = stats.averageRP >= 8;
  const convertToWin = stats.winRate >= 12.5;
  const sampleText = stats.totalGames.toLocaleString(locale === "ja" ? "ja-JP" : "zh-CN");

  if (locale === "ja") {
    return {
      patchVersion: stats.patchVersion,
      tier: stats.tier,
      sampleLabel: sample,
      headline: `${characterName} ${tier}帯の指標概要`,
      fitTitle: "向いている条件",
      fitPoints: [
        climbing
          ? "平均RPが高く、キルと順位点の両方が指標に出ています。"
          : "平均RPは控えめで、序盤脱落を減らす運用が重要です。",
        convertToWin
          ? "勝率は8チーム基準の期待値を上回っています。"
          : "勝率は基準より低く、終盤戦の決定力を確認する必要があります。",
      ],
      metricsTitle: "指標の読み方",
      metricsPoints: [
        `${tier}基準で${sampleText}試合のサンプルです。`,
        `勝率 ${formatPercent(stats.winRate)}、ピック率 ${formatPercent(stats.pickRate)}、平均RP ${signed(stats.averageRP)}を合わせて確認します。`,
        rpDelta != null
          ? `前パッチ比で平均RPは${signed(rpDelta)}変化しました。`
          : "前パッチ比較が不足しているため、現在パッチの指標を中心に表示します。",
      ],
      compositionTitle: "ピック条件",
      compositionReason: roleComboInsight
        ? roleComboInsight.pickReason
        : weaponName
          ? concentrated
            ? `${weaponName}の選択比率が高く、役割は比較的固定されています。`
            : "武器選択が分散しているため、選んだ武器に合わせて編成内の役割を確認します。"
          : "武器別サンプルが少ないため、キャラクター全体の指標と合わせて確認します。",
      warningsTitle: "注意点",
      warnings: [
        sample === "low"
          ? "サンプル数が少ないため、勝率とRPの変動幅が大きくなります。"
          : "パッチ直後は日ごとに指標が動く可能性があります。",
        stats.pickRate < 1
          ? "ピック率が低い場合、熟練者サンプルに寄る可能性があります。"
          : "ピック率は確保されていますが、相性と武器選択で結果が変わります。",
      ],
    };
  }

  const text =
    locale === "zh-Hant"
      ? {
          headline: `${characterName} ${tier} 指標摘要`,
          fitTitle: "適用條件",
          highRp: "平均 RP 較高，擊殺與排名分數都反映在指標中。",
          lowRp: "平均 RP 較低，降低前期出局風險更重要。",
          highWin: "勝率高於 8 隊基準期望值。",
          lowWin: "勝率低於基準，需要確認終局轉換能力。",
          metricsTitle: "指標解讀",
          sample: `${tier} 條件下共有 ${sampleText} 場樣本。`,
          metricLine: `勝率 ${formatPercent(stats.winRate)}、選取率 ${formatPercent(stats.pickRate)}、平均 RP ${signed(stats.averageRP)} 需要一起查看。`,
          delta: (value: string) => `相較上一版本，平均 RP 變化為 ${value}。`,
          noDelta: "上一版本比較資料不足，因此以目前版本指標為主。",
          compositionTitle: "選擇條件",
          concentrated: (weapon: string) => `${weapon} 的選取比率較高，角色定位相對固定。`,
          spread: "武器選擇較分散，需要依所選武器確認隊伍中的定位。",
          noWeapon: "武器樣本較少，需要與角色整體指標一起確認。",
          warningsTitle: "注意事項",
          lowSample: "樣本數較少時，勝率與 RP 變動幅度會較大。",
          patchTiming: "版本初期指標可能按日變動。",
          lowPick: "選取率低時，可能偏向熟練玩家樣本。",
          normalPick: "選取率已具參考性，但對局相性與武器選擇仍會影響結果。",
        }
      : {
          headline: `${characterName} ${tier} 指标摘要`,
          fitTitle: "适用条件",
          highRp: "平均 RP 较高，击杀与排名分数都反映在指标中。",
          lowRp: "平均 RP 较低，降低前期出局风险更重要。",
          highWin: "胜率高于 8 队基准期望值。",
          lowWin: "胜率低于基准，需要确认终局转换能力。",
          metricsTitle: "指标解读",
          sample: `${tier} 条件下共有 ${sampleText} 场样本。`,
          metricLine: `胜率 ${formatPercent(stats.winRate)}、选取率 ${formatPercent(stats.pickRate)}、平均 RP ${signed(stats.averageRP)} 需要一起查看。`,
          delta: (value: string) => `相较上一版本，平均 RP 变化为 ${value}。`,
          noDelta: "上一版本比较数据不足，因此以当前版本指标为主。",
          compositionTitle: "选择条件",
          concentrated: (weapon: string) => `${weapon} 的选取比率较高，角色定位相对固定。`,
          spread: "武器选择较分散，需要按所选武器确认队伍中的定位。",
          noWeapon: "武器样本较少，需要与角色整体指标一起确认。",
          warningsTitle: "注意事项",
          lowSample: "样本数较少时，胜率与 RP 变动幅度会较大。",
          patchTiming: "版本初期指标可能按日变动。",
          lowPick: "选取率低时，可能偏向熟练玩家样本。",
          normalPick: "选取率已具参考性，但对局相性与武器选择仍会影响结果。",
        };

  return {
    patchVersion: stats.patchVersion,
    tier: stats.tier,
    sampleLabel: sample,
    headline: text.headline,
    fitTitle: text.fitTitle,
    fitPoints: [climbing ? text.highRp : text.lowRp, convertToWin ? text.highWin : text.lowWin],
    metricsTitle: text.metricsTitle,
    metricsPoints: [
      text.sample,
      text.metricLine,
      rpDelta != null ? text.delta(signed(rpDelta)) : text.noDelta,
    ],
    compositionTitle: text.compositionTitle,
    compositionReason: roleComboInsight
      ? roleComboInsight.pickReason
      : weaponName
        ? concentrated
          ? text.concentrated(weaponName)
          : text.spread
        : text.noWeapon,
    warningsTitle: text.warningsTitle,
    warnings: [
      sample === "low" ? text.lowSample : text.patchTiming,
      stats.pickRate < 1 ? text.lowPick : text.normalPick,
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
  if (locale !== "en") {
    return buildLocalizedInsight(
      stats,
      previousStats,
      characterName,
      weaponName,
      locale,
      roleComboInsight
    );
  }
  return buildEnglishInsight(stats, previousStats, characterName, weaponName, roleComboInsight);
}
