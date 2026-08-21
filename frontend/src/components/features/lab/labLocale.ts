import type { ActiveRouteLocale } from "@/i18n/routing";
import type { LabCharacter, LabGroup } from "./types";

const NUMBER_LOCALE: Record<ActiveRouteLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

const ROLE_LABELS: Record<string, Record<ActiveRouteLocale, string>> = {
  탱커: { ko: "탱커", en: "Tank", ja: "タンク" },
  전사: { ko: "전사", en: "Fighter", ja: "ファイター" },
  암살자: { ko: "암살자", en: "Assassin", ja: "アサシン" },
  스킬딜러: { ko: "스킬딜러", en: "Skill Damage", ja: "スキルダメージ" },
  "원거리 딜러": { ko: "원거리 딜러", en: "Ranged Carry", ja: "遠距離キャリー" },
  지원가: { ko: "지원가", en: "Support", ja: "サポート" },
};

export const LAB_COPY = {
  ko: {
    searchPlaceholder: "실험체 이름 검색...",
    unclassified: "미분류",
    flexibleProfile: "유연 연계",
    flexibleReason: "전투 상황에 맞춰 유연하게 보완합니다.",
    noMetricSummary: "지표 검증 정보 없음",
    memberCount: (count: number) => `${count}명`,
    noResults: (query: string) => `“${query}”에 해당하는 실험체가 없습니다.`,
    profileLabel: (index: number) => `연계 유형 ${index}`,
    profileReason: (roles: string) => `${roles} 조합에서 자주 관측된 역할 유형입니다.`,
    metricSummary: (delta: string, share: string) =>
      `대표 조합 평균 ${delta} RP · 평균 비중 ${share}`,
    analysisLink: (name: string) => `${name} 분석 페이지로 이동`,
    connection: "연계",
    sample: "표본",
    games: (count: string) => `${count}판`,
    gameAria: (count: string) => `${count}게임`,
    strong: "강한 조합",
    weak: "약한 조합",
    insufficientSample: "표본 부족",
    comboTrend: (label: string) => `${label}과 잘 맞는 실험체 조합 경향`,
    risingTrend: (label: string) => `${label} 조합에서 상승하는 경향이 있습니다.`,
    insufficientProfile: "세부 실험체 유형은 아직 표본이 부족합니다.",
    internalRole: "내부 역할군",
    characters: "해당 실험체",
    entireType: "유형 전체",
    average: "평균",
    adjustedLift: "보정 상승",
    confidence: "신뢰",
    noReliableSample: "신뢰 표본 부족",
    actualResults: "확인된 실제 3인 성적",
    noTopCombination: (games: string) => `${games} 이상 상위 상승 조합에 없음`,
    trendBasis: (games: string) => `시즌 10·11 · ${games} 이상 내부 유형 기준`,
    viewTrend: "조합 경향 보기",
    confidenceLabel: { high: "높음", medium: "보통", low: "낮음" },
  },
  en: {
    searchPlaceholder: "Search characters...",
    unclassified: "Unclassified",
    flexibleProfile: "Flexible synergy",
    flexibleReason: "Adapts to the current team composition.",
    noMetricSummary: "No metric summary available",
    memberCount: (count: number) => `${count} characters`,
    noResults: (query: string) => `No characters match “${query}”.`,
    profileLabel: (index: number) => `Synergy profile ${index}`,
    profileReason: (roles: string) => `Frequently observed with ${roles} compositions.`,
    metricSummary: (delta: string, share: string) =>
      `Representative average ${delta} RP · ${share} share`,
    analysisLink: (name: string) => `Open ${name} analysis`,
    connection: "synergy",
    sample: "Sample",
    games: (count: string) => `${count} games`,
    gameAria: (count: string) => `${count} games`,
    strong: "Strong compositions",
    weak: "Weak compositions",
    insufficientSample: "Insufficient sample",
    comboTrend: (label: string) => `Composition trends that work well with ${label}`,
    risingTrend: (label: string) => `Shows a positive trend with ${label} compositions.`,
    insufficientProfile: "There is not enough data for detailed character profiles yet.",
    internalRole: "Internal profile",
    characters: "Characters",
    entireType: "Full profile",
    average: "Average",
    adjustedLift: "Adjusted lift",
    confidence: "Confidence",
    noReliableSample: "Insufficient reliable sample",
    actualResults: "Observed three-character results",
    noTopCombination: (games: string) => `No top positive composition above ${games}`,
    trendBasis: (games: string) => `Seasons 10–11 · profiles with at least ${games}`,
    viewTrend: "View composition trend",
    confidenceLabel: { high: "High", medium: "Medium", low: "Low" },
  },
  ja: {
    searchPlaceholder: "キャラクター名を検索...",
    unclassified: "未分類",
    flexibleProfile: "柔軟な連携",
    flexibleReason: "チーム構成に合わせて柔軟に補完します。",
    noMetricSummary: "指標の要約はありません",
    memberCount: (count: number) => `${count}体`,
    noResults: (query: string) => `「${query}」に一致するキャラクターはいません。`,
    profileLabel: (index: number) => `連携タイプ ${index}`,
    profileReason: (roles: string) => `${roles}構成で多く観測された役割タイプです。`,
    metricSummary: (delta: string, share: string) =>
      `代表構成の平均 ${delta} RP · 平均比率 ${share}`,
    analysisLink: (name: string) => `${name}の分析ページを開く`,
    connection: "連携",
    sample: "サンプル",
    games: (count: string) => `${count}試合`,
    gameAria: (count: string) => `${count}試合`,
    strong: "相性の良い構成",
    weak: "相性の悪い構成",
    insufficientSample: "サンプル不足",
    comboTrend: (label: string) => `${label}と相性の良い構成傾向`,
    risingTrend: (label: string) => `${label}構成で上昇傾向があります。`,
    insufficientProfile: "詳細なキャラクタータイプはまだサンプル不足です。",
    internalRole: "内部タイプ",
    characters: "該当キャラクター",
    entireType: "タイプ全体",
    average: "平均",
    adjustedLift: "補正上昇",
    confidence: "信頼度",
    noReliableSample: "信頼できるサンプル不足",
    actualResults: "確認された3人構成の成績",
    noTopCombination: (games: string) => `${games}以上の上位上昇構成なし`,
    trendBasis: (games: string) => `シーズン10・11 · ${games}以上の内部タイプ基準`,
    viewTrend: "構成傾向を見る",
    confidenceLabel: { high: "高", medium: "中", low: "低" },
  },
} as const;

export function formatLabNumber(value: number, locale: ActiveRouteLocale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(value);
}

export function localizeLabRoleText(value: string, locale: ActiveRouteLocale): string {
  if (locale === "ko") return value;

  return Object.entries(ROLE_LABELS)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (localized, [source, labels]) => localized.replaceAll(source, labels[locale]),
      value
    );
}

export function getLocalizedLabGroupLabel(
  group: LabGroup | null,
  locale: ActiveRouteLocale
): string {
  if (!group) return LAB_COPY[locale].unclassified;
  if (locale === "ko") return group.label;

  const roles = (group.topPartnerRoles ?? []).map((role) => localizeLabRoleText(role, locale));
  if (roles.length === 0) return LAB_COPY[locale].profileLabel(group.id + 1);
  return locale === "ja" ? `${roles.join("・")}連携` : `${roles.join(" + ")} synergy`;
}

export function getLocalizedProfileCopy(
  character: LabCharacter,
  index: number,
  locale: ActiveRouteLocale
): { label: string; reason: string; metricSummary: string } {
  const classification = character.classification;
  if (locale === "ko") {
    return {
      label: classification?.metricRole ?? classification?.fitRole ?? LAB_COPY.ko.flexibleProfile,
      reason: classification?.fitReason ?? LAB_COPY.ko.flexibleReason,
      metricSummary: classification?.metricSummary ?? LAB_COPY.ko.noMetricSummary,
    };
  }

  const roles = (classification?.partnerRoles ?? [])
    .map((role) => localizeLabRoleText(role, locale))
    .join(" + ");
  const delta = classification?.partnerDelta;
  const share = classification?.partnerGameShare;

  return {
    label: LAB_COPY[locale].profileLabel(index),
    reason: roles ? LAB_COPY[locale].profileReason(roles) : LAB_COPY[locale].flexibleReason,
    metricSummary:
      delta != null && share != null
        ? LAB_COPY[locale].metricSummary(
            `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`,
            `${(share * 100).toFixed(1)}%`
          )
        : LAB_COPY[locale].noMetricSummary,
  };
}
