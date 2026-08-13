/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
/* Hallmark · macrostructure: Workbench + Index-First · tone: technical-explanatory · anchor hue: mineral-blue 245° */
import { ArrowUpDown, ChevronDown, Layers, Layers3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  FullTrendExplorer,
  PartnerAffinityExplorer,
} from "@/components/features/lab/FullTrendExplorer";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import type {
  LabCombinationValidation,
  LabCharacterRecommendation,
  LabCompositionAffinityGroup,
  LabCompositionAffinityGroupData,
  LabCompositionData,
  LabConditionalType,
  LabConsensusData,
  LabRecommendationOption,
  LabTypeRecommendation,
  LabTypeCombination,
} from "@/lib/labCompositionTypes";
import { BASE_URL } from "@/lib/siteMetadata";
import consensusJson from "../../../../../public/data/lab/character-composition-types.json";
import compositionJson from "../../../../../public/data/lab/composition-types.json";
import adjustedConsensusJson from "../../../../../public/data/lab/entry-adjusted/character-composition-types.json";
import adjustedCompositionJson from "../../../../../public/data/lab/entry-adjusted/composition-types.json";
import combinedConsensusJson from "../../../../../public/data/lab/entry-sample-confidence/character-composition-types.json";
import combinedAffinityGroupsJson from "../../../../../public/data/lab/entry-sample-confidence/composition-affinity-character-groups.json";
import combinedCompositionJson from "../../../../../public/data/lab/entry-sample-confidence/composition-types.json";
import sampleConsensusJson from "../../../../../public/data/lab/sample-confidence/character-composition-types.json";
import sampleCompositionJson from "../../../../../public/data/lab/sample-confidence/composition-types.json";

interface CompositionLabPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    composition?: string;
    focus?: string;
    role?: string;
    sort?: string;
    view?: string;
    metric?: string;
  }>;
}

const DEFAULT_COMPOSITION = "전사 + 전사 + 스킬딜러";
const ROLE_ORDER = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];

function roleMultisetKey(roles: string[]) {
  return [...roles]
    .sort((left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right))
    .join(" + ");
}

function partnerRoleKey(roleComposition: string, focalRole: string) {
  const roles = roleComposition.split(" + ");
  const focalIndex = roles.indexOf(focalRole);
  if (focalIndex < 0) return null;
  roles.splice(focalIndex, 1);
  return roleMultisetKey(roles);
}

function isPositiveCompositionContext(
  context: NonNullable<LabConditionalType["trendContexts"]>[number]
) {
  return context.positiveCharacterCount === undefined
    ? context.direction === "positive"
    : context.positiveCharacterCount > 0;
}

const observedCompositionData = compositionJson as LabCompositionData;
const observedConsensusData = consensusJson as LabConsensusData;
const adjustedCompositionData = adjustedCompositionJson as LabCompositionData;
const adjustedConsensusData = adjustedConsensusJson as LabConsensusData;
const sampleCompositionData = sampleCompositionJson as LabCompositionData;
const sampleConsensusData = sampleConsensusJson as LabConsensusData;
const combinedCompositionData = combinedCompositionJson as LabCompositionData;
const combinedConsensusData = combinedConsensusJson as LabConsensusData;
const combinedAffinityGroupData =
  combinedAffinityGroupsJson as unknown as LabCompositionAffinityGroupData;

const SAMPLE_COPY: Record<
  RouteLocale,
  {
    score: string;
    description: string;
    rankedHint: string;
    insufficient: string;
    emerging: string;
    likely: string;
    repeated: string;
    seasonRepeated: string;
    seasonMixed: string;
    seasonInsufficient: string;
    entryMaintained: string;
    entryReversed: string;
  }
> = {
  ko: {
    score: "판수 근거점수",
    description:
      "관측 상승폭 × √판수로 조합과 캐릭터 후보를 다시 정렬합니다. 정확한 유의확률이 아니라, 효과 크기와 반복 판수를 함께 보는 비교용 지표입니다.",
    rankedHint:
      "관측 상승폭과 판수를 함께 반영한 상위 12개입니다. 큰 상승폭이 적은 판수에서 나온 조합보다 반복된 경향을 우선합니다.",
    insufficient: "표본 부족",
    emerging: "초기 경향",
    likely: "유력 경향",
    repeated: "반복 확인",
    seasonRepeated: "시즌 반복",
    seasonMixed: "시즌 엇갈림",
    seasonInsufficient: "시즌 표본 부족",
    entryMaintained: "입장료 보정 후 유지",
    entryReversed: "입장료 보정 후 반전",
  },
  en: {
    score: "Sample evidence",
    description:
      "Re-ranks combinations and character candidates by observed lift × √games. This is a comparison heuristic, not a p-value.",
    rankedHint: "Top combinations after balancing observed lift with repeated game volume.",
    insufficient: "Insufficient",
    emerging: "Emerging",
    likely: "Likely",
    repeated: "Repeated",
    seasonRepeated: "Repeated by season",
    seasonMixed: "Mixed by season",
    seasonInsufficient: "Season sample low",
    entryMaintained: "Holds after entry adjustment",
    entryReversed: "Reverses after entry adjustment",
  },
  ja: {
    score: "試合数根拠",
    description: "観測上昇幅 × √試合数で構成と候補を再順位付けする比較指標です。",
    rankedHint: "観測上昇幅と反復試合数を合わせて評価した上位構成です。",
    insufficient: "標本不足",
    emerging: "初期傾向",
    likely: "有力傾向",
    repeated: "反復確認",
    seasonRepeated: "シーズン反復",
    seasonMixed: "シーズン不一致",
    seasonInsufficient: "シーズン標本不足",
    entryMaintained: "入場料補正後も維持",
    entryReversed: "入場料補正後に反転",
  },
  "zh-Hans": {
    score: "场次证据分",
    description: "按观测提升 × √场次重新排序阵容与角色候选；该指标用于比较，并非 p 值。",
    rankedHint: "同时考虑观测提升与重复场次后的最佳阵容。",
    insufficient: "样本不足",
    emerging: "初步趋势",
    likely: "较强趋势",
    repeated: "重复确认",
    seasonRepeated: "赛季重复",
    seasonMixed: "赛季不一致",
    seasonInsufficient: "赛季样本不足",
    entryMaintained: "入场费校正后保持",
    entryReversed: "入场费校正后反转",
  },
  "zh-Hant": {
    score: "場次證據分",
    description: "按觀測提升 × √場次重新排序陣容與角色候選；此指標用於比較，並非 p 值。",
    rankedHint: "同時考慮觀測提升與重複場次後的最佳陣容。",
    insufficient: "樣本不足",
    emerging: "初步趨勢",
    likely: "較強趨勢",
    repeated: "重複確認",
    seasonRepeated: "賽季重複",
    seasonMixed: "賽季不一致",
    seasonInsufficient: "賽季樣本不足",
    entryMaintained: "入場費校正後保持",
    entryReversed: "入場費校正後反轉",
  },
};

const TREND_COPY: Record<
  RouteLocale,
  {
    positive: string;
    negative: string;
    neutral: string;
    contexts: string;
    samples: string;
    minGames: string;
  }
> = {
  ko: {
    positive: "상승",
    negative: "하락",
    neutral: "중립",
    contexts: "상승 경향",
    samples: "상승 경향 판수",
    minGames: "상승 경향별 최소 판수",
  },
  en: {
    positive: "Positive",
    negative: "Negative",
    neutral: "Neutral",
    contexts: "Positive trends",
    samples: "Positive-trend games",
    minGames: "Minimum games per positive trend",
  },
  ja: {
    positive: "上昇",
    negative: "下降",
    neutral: "中立",
    contexts: "上昇傾向",
    samples: "上昇傾向の試合数",
    minGames: "上昇傾向別の最低試合数",
  },
  "zh-Hans": {
    positive: "上升",
    negative: "下降",
    neutral: "中性",
    contexts: "上升趋势",
    samples: "上升趋势场次",
    minGames: "每个上升趋势最低场次",
  },
  "zh-Hant": {
    positive: "上升",
    negative: "下降",
    neutral: "中性",
    contexts: "上升趨勢",
    samples: "上升趨勢場次",
    minGames: "每個上升趨勢最低場次",
  },
};

const BOUNDARY_COPY: Record<
  RouteLocale,
  {
    title: string;
    body: string;
    none: string;
    current: string;
    alternative: string;
    own: string;
    independent: string;
    alternativeScore: string;
    margin: string;
    thresholdMargin: string;
    nearby: string;
  }
> = {
  ko: {
    title: "경계 프로필",
    body: "기존 역할군 기준을 섞지 않고 2차 역할군 세부 조합 경향만 비교합니다. 차선 유사도가 {threshold} 이상이고 분류 간격이 {margin} 이내인 경우만 표시합니다.",
    none: "현재 기준에서 두 유형 사이에 애매하게 걸친 캐릭터가 없습니다.",
    current: "현재",
    alternative: "차선",
    own: "현재 유형 유사도",
    independent: "독립형",
    alternativeScore: "차선 유사도",
    margin: "현재−차선",
    thresholdMargin: "병합 기준까지",
    nearby: "차선 유형 캐릭터",
  },
  en: {
    title: "Boundary profiles",
    body: "Compares refined-role composition trends only, without the original-role anchor. Shown when alternative similarity is at least {threshold} and the assignment margin is within {margin}.",
    none: "No characters currently sit near a type boundary.",
    current: "Current",
    alternative: "Alternative",
    own: "Current-type similarity",
    independent: "Independent",
    alternativeScore: "Alternative similarity",
    margin: "Current−alternative",
    thresholdMargin: "To merge threshold",
    nearby: "Alternative members",
  },
  ja: {
    title: "境界プロフィール",
    body: "元の役割基準を混ぜず、2次役割の詳細構成傾向のみ比較します。代替類似度{threshold}以上、分類差{margin}以内のみ表示します。",
    none: "現在の基準ではタイプ境界に近いキャラクターはいません。",
    current: "現在",
    alternative: "次点",
    own: "現在タイプ類似度",
    independent: "独立型",
    alternativeScore: "次点類似度",
    margin: "現在−次点",
    thresholdMargin: "統合基準まで",
    nearby: "次点タイプのキャラクター",
  },
  "zh-Hans": {
    title: "边界角色",
    body: "不混入原始定位基准，仅比较二级定位的详细阵容趋势。仅显示备选相似度至少{threshold}、分类差距不超过{margin}的角色。",
    none: "当前标准下没有处于类型边界的角色。",
    current: "当前",
    alternative: "备选",
    own: "当前类型相似度",
    independent: "独立型",
    alternativeScore: "备选相似度",
    margin: "当前−备选",
    thresholdMargin: "距合并标准",
    nearby: "备选类型角色",
  },
  "zh-Hant": {
    title: "邊界角色",
    body: "不混入原始定位基準，僅比較二級定位的詳細陣容趨勢。僅顯示備選相似度至少{threshold}、分類差距不超過{margin}的角色。",
    none: "目前標準下沒有處於類型邊界的角色。",
    current: "目前",
    alternative: "備選",
    own: "目前類型相似度",
    independent: "獨立型",
    alternativeScore: "備選相似度",
    margin: "目前−備選",
    thresholdMargin: "距合併標準",
    nearby: "備選類型角色",
  },
};

const COPY: Record<
  RouteLocale,
  {
    title: string;
    metadataTitle: string;
    description: string;
    kicker: string;
    compositionView: string;
    characterView: string;
    selectComposition: string;
    selectRole: string;
    apply: string;
    games: string;
    reliableTypes: string;
    conditionalSplits: string;
    topCombinations: string;
    conditionalCatalog: string;
    baseType: string;
    partnerFit: string;
    recommendations: string;
    lowSample: string;
    adjusted: string;
    consensusTitle: string;
    consensusBody: string;
    baseGroups: string;
    splitGroups: string;
    finalTypes: string;
    profiles: string;
    recurringContexts: string;
    cohesion: string;
    separation: string;
    evidence: string;
    unchanged: string;
    split: string;
    backToTypes: string;
    exploreGuide: string;
    roleFocus: string;
    roleFocusHint: string;
    sortBy: string;
    sortFit: string;
    sortGames: string;
    sortName: string;
    typeCount: string;
    openEvidence: string;
    fitGuide: string;
    rankedHint: string;
    rpAverage: string;
    groupOverview: string;
    consensusHint: string;
    showAllRanked: string;
    differentPairs: string;
    checkedCompositions: string;
    confidenceLow: string;
    confidenceMedium: string;
    confidenceHigh: string;
    characterIndexTitle: string;
    characterIndexBody: string;
    characterProfile: string;
    firstOrderGroup: string;
    groupMembers: string;
    profileCount: string;
    compositionGroupKeys: string;
    compositionGroupCount: string;
    sameGroupProfiles: string;
    noCompositionGroups: string;
  }
> = {
  ko: {
    title: "캐릭터 조합 분석",
    metadataTitle: "캐릭터 조합 분석 - 시즌 10·11",
    description: "시즌 10·11에서 역할 조합마다 잘 맞았던 캐릭터 유형과 예시를 보여줍니다.",
    kicker: "시즌 10·11 전적 기준",
    compositionView: "조합별 보기",
    characterView: "조합 성향 그룹 모아보기",
    selectComposition: "역할 조합 선택",
    selectRole: "역할 선택",
    apply: "보기",
    games: "판수",
    reliableTypes: "판수 충분한 조합",
    conditionalSplits: "조합 성향 그룹",
    topCombinations: "성적이 좋았던 내부 역할 조합",
    conditionalCatalog: "이 조합에서 고르기 좋은 캐릭터 유형",
    baseType: "원래 분류",
    partnerFit: "전체 조합 경향",
    recommendations: "해당 캐릭터",
    lowSample: "판수 부족",
    adjusted: "조합 상승폭",
    consensusTitle: "1차 유형별 조합 성향 그룹",
    consensusBody:
      "1차 전투 기능은 고정하고, 선택한 역할 조합에서 어떤 1차 동료 유형과 함께할 때 상승하는지를 비교해 조합 성향 그룹을 만들었습니다.",
    baseGroups: "1차 유형",
    splitGroups: "복수 성향 유형",
    finalTypes: "조합 성향 그룹",
    profiles: "캐릭터·무기 수",
    recurringContexts: "전체 조합 경향",
    cohesion: "같이 묶인 비율",
    separation: "따로 묶인 비율",
    evidence: "확인한 짝",
    unchanged: "그대로",
    split: "나눠 봄",
    backToTypes: "캐릭터 유형 분석",
    exploreGuide:
      "먼저 역할 조합을 고르세요. 보고 싶은 역할을 누르면 어울리는 유형과 캐릭터가 나옵니다. 더 궁금한 항목만 펼쳐 판수를 확인할 수 있습니다.",
    roleFocus: "보고 싶은 역할",
    roleFocusHint: "같은 역할 안에서 어떤 유형이 이 조합에 더 어울리는지 비교합니다.",
    sortBy: "보는 순서",
    sortFit: "잘 맞는 순",
    sortGames: "많이 나온 순",
    sortName: "이름순",
    typeCount: "개",
    openEvidence: "캐릭터와 판수 보기",
    fitGuide:
      "조합 상승폭은 각 캐릭터가 평소보다 이 조합에서 얼마나 더 좋은 성적을 냈는지 보여줍니다. 판수가 적으면 참고만 하세요.",
    rankedHint: "이 역할 조합에서 성적이 좋았던 내부 역할 조합 12개입니다. 판수도 함께 확인하세요.",
    rpAverage: "평균 RP",
    groupOverview: "역할별 유형",
    consensusHint:
      "항목을 펼치면 선호하는 핵심 동료 유형, 해당 성향을 보인 캐릭터, 같이 좋았던 나머지 동료 유형 순서로 확인할 수 있습니다.",
    showAllRanked: "4–12위 더 보기",
    differentPairs: "다르게 묶인 짝",
    checkedCompositions: "확인한 조합",
    confidenceLow: "판수 적음",
    confidenceMedium: "판수 보통",
    confidenceHigh: "판수 충분",
    characterIndexTitle: "실험체별 2차 성향군과 단일 동료 참고 키",
    characterIndexBody:
      "주·보조 2차 성향군은 정확한 동료 A × B 조합으로 계산했습니다. 아래 펼침 목록은 더 넓은 흐름을 보는 단일 동료 참고 키이며 2차 성향군 분류에는 사용하지 않습니다.",
    characterProfile: "실험체 · 무기",
    firstOrderGroup: "1차 역할군",
    groupMembers: "같은 역할군",
    profileCount: "프로필",
    compositionGroupKeys: "단일 동료 참고 키 · 분류 미사용",
    compositionGroupCount: "개 참고 키",
    sameGroupProfiles: "동일 키 프로필",
    noCompositionGroups: "조건을 통과한 조합 그룹이 없습니다.",
  },
  en: {
    title: "Character Composition Analysis",
    metadataTitle: "Character Composition Analysis - Seasons 10–11",
    description: "Global character types built from all Season 10–11 composition trends.",
    kicker: "Seasons 10–11 · global composition trends",
    compositionView: "By composition",
    characterView: "Composition affinity groups",
    selectComposition: "Role composition",
    selectRole: "Role",
    apply: "View",
    games: "Games",
    reliableTypes: "Reliable types",
    conditionalSplits: "Composition affinity groups",
    topCombinations: "Top internal type combinations",
    conditionalCatalog: "Recommended types for this composition",
    baseType: "Base type",
    partnerFit: "All composition trends",
    recommendations: "Character examples",
    lowSample: "Low sample",
    adjusted: "Adjusted fit",
    consensusTitle: "Composition affinities by first-order type",
    consensusBody:
      "First-order combat types stay fixed while the selected role composition is analyzed for preferred first-order partner types.",
    baseGroups: "First-order types",
    splitGroups: "Multi-affinity types",
    finalTypes: "Affinity groups",
    profiles: "Character-weapon profiles",
    recurringContexts: "All composition trends",
    cohesion: "Within agreement",
    separation: "Outside agreement",
    evidence: "Evidence",
    unchanged: "Kept",
    split: "Split",
    backToTypes: "Character type analysis",
    exploreGuide:
      "Choose a role composition, compare one role at a time, then expand only the types whose character and game evidence you need.",
    roleFocus: "Role to analyze",
    roleFocusHint: "Compare which internal type is the best pick within the same role.",
    sortBy: "Sort by",
    sortFit: "Best fit",
    sortGames: "Most games",
    sortName: "Type name",
    typeCount: "types",
    openEvidence: "View character and game evidence",
    fitGuide:
      "Adjusted fit is the additional lift observed in this composition after accounting for a character’s baseline. Read it with game volume.",
    rankedHint: "The top 12 type combinations, showing game volume and adjusted fit together.",
    rpAverage: "Average RP",
    groupOverview: "Type group overview",
    consensusHint:
      "Expand a type to see its preferred core partner, matching characters, and the remaining partner types that performed well with it.",
    showAllRanked: "Show ranks 4–12",
    differentPairs: "Different pairings",
    checkedCompositions: "Compositions checked",
    confidenceLow: "Few games",
    confidenceMedium: "Moderate games",
    confidenceHigh: "Enough games",
    characterIndexTitle: "Secondary affinities and single-partner reference keys",
    characterIndexBody:
      "Primary and auxiliary affinities use exact partner A × B contexts. Expanded single-partner keys are broad references and are not used for secondary grouping.",
    characterProfile: "Character · weapon",
    firstOrderGroup: "First-order group",
    groupMembers: "Group members",
    profileCount: "profiles",
    compositionGroupKeys: "Single-partner references · not classified",
    compositionGroupCount: "reference keys",
    sameGroupProfiles: "profiles with this key",
    noCompositionGroups: "No composition group passed the current criteria.",
  },
  ja: {
    title: "キャラクター構成分析",
    metadataTitle: "キャラクター構成分析 - シーズン10・11",
    description: "シーズン10・11の全構成傾向から共通キャラクタータイプを分類した分析です。",
    kicker: "シーズン10・11 · 全体構成傾向",
    compositionView: "構成別タイプ",
    characterView: "構成相性グループ",
    selectComposition: "ロール構成",
    selectRole: "ロール",
    apply: "表示",
    games: "試合数",
    reliableTypes: "信頼タイプ",
    conditionalSplits: "構成相性グループ",
    topCombinations: "上位内部タイプ構成",
    conditionalCatalog: "この構成に適したタイプ",
    baseType: "基本タイプ",
    partnerFit: "全構成の傾向",
    recommendations: "キャラクター例",
    lowSample: "少数サンプル",
    adjusted: "補正適合度",
    consensusTitle: "1次タイプ別の構成相性グループ",
    consensusBody:
      "1次戦闘タイプを固定し、選択したロール構成で相性の良い味方の1次タイプを比較します。",
    baseGroups: "1次タイプ",
    splitGroups: "複数相性タイプ",
    finalTypes: "相性グループ",
    profiles: "キャラクター・武器",
    recurringContexts: "全構成の傾向",
    cohesion: "内部一致率",
    separation: "外部一致率",
    evidence: "比較根拠",
    unchanged: "維持",
    split: "再分割",
    backToTypes: "キャラクタータイプ分析",
    exploreGuide:
      "ロール構成を選び、ロールごとに比較してください。必要なタイプだけ開いてキャラクターと試合数の根拠を確認できます。",
    roleFocus: "分析するロール",
    roleFocusHint: "同じロール内でどの内部タイプが適しているかを比較します。",
    sortBy: "並び順",
    sortFit: "適合順",
    sortGames: "試合数順",
    sortName: "タイプ名順",
    typeCount: "タイプ",
    openEvidence: "キャラクター・試合数の根拠を見る",
    fitGuide:
      "補正適合度は基本成績を除いた、この構成での追加上昇分です。試合数と合わせて確認してください。",
    rankedHint: "試合数と補正適合度を一緒に確認できる上位12タイプ構成です。",
    rpAverage: "平均RP",
    groupOverview: "タイプ群の概要",
    consensusHint:
      "開くと優先する味方タイプ、該当キャラクター、相性の良い残りの味方タイプを確認できます。",
    showAllRanked: "4～12位を見る",
    differentPairs: "異なる組み合わせ",
    checkedCompositions: "確認した構成",
    confidenceLow: "試合数少",
    confidenceMedium: "試合数中",
    confidenceHigh: "試合数十分",
    characterIndexTitle: "キャラクター別の二次傾向と単独味方参照キー",
    characterIndexBody:
      "主・補助の二次傾向は正確な味方A × Bで計算します。展開する単独味方キーは参照用で、二次分類には使用しません。",
    characterProfile: "キャラクター・武器",
    firstOrderGroup: "1次ロールグループ",
    groupMembers: "同じグループ",
    profileCount: "プロフィール",
    compositionGroupKeys: "単独味方の参照キー・分類未使用",
    compositionGroupCount: "参照キー",
    sameGroupProfiles: "同じキーのプロフィール",
    noCompositionGroups: "条件を満たす構成グループはありません。",
  },
  "zh-Hans": {
    title: "角色阵容分析",
    metadataTitle: "角色阵容分析 - 第10、11赛季",
    description: "根据第10、11赛季全部阵容趋势划分统一角色类型。",
    kicker: "第10、11赛季 · 全局阵容趋势",
    compositionView: "按阵容查看",
    characterView: "阵容倾向组",
    selectComposition: "定位阵容",
    selectRole: "定位",
    apply: "查看",
    games: "场次",
    reliableTypes: "可信组合",
    conditionalSplits: "阵容倾向组",
    topCombinations: "最佳内部类型组合",
    conditionalCatalog: "适合该阵容的类型",
    baseType: "原类型",
    partnerFit: "全部阵容趋势",
    recommendations: "角色示例",
    lowSample: "样本较少",
    adjusted: "校正适配度",
    consensusTitle: "按一级类型查看阵容倾向",
    consensusBody: "固定一级战斗类型，并在所选定位阵容中比较更适配的队友一级类型。",
    baseGroups: "一级类型",
    splitGroups: "多倾向类型",
    finalTypes: "倾向组",
    profiles: "角色·武器档案",
    recurringContexts: "全部阵容趋势",
    cohesion: "组内一致率",
    separation: "组外一致率",
    evidence: "比较依据",
    unchanged: "保留",
    split: "拆分",
    backToTypes: "角色类型分析",
    exploreGuide: "选择定位阵容后逐个比较定位。仅展开需要的类型，查看角色与场次依据。",
    roleFocus: "分析定位",
    roleFocusHint: "比较同一定位中更适合选择的内部类型。",
    sortBy: "排序",
    sortFit: "适配优先",
    sortGames: "场次优先",
    sortName: "类型名称",
    typeCount: "个类型",
    openEvidence: "查看角色与场次依据",
    fitGuide: "校正适配度是排除角色基础成绩后，在该阵容中出现的额外提升。请结合场次判断。",
    rankedHint: "同时展示场次和校正适配度的前12个内部类型组合。",
    rpAverage: "平均RP",
    groupOverview: "类型组概览",
    consensusHint: "展开后可查看偏好的核心队友类型、对应角色及更适配的另一名队友类型。",
    showAllRanked: "查看第4–12名",
    differentPairs: "不同分组配对",
    checkedCompositions: "已检查阵容",
    confidenceLow: "场次较少",
    confidenceMedium: "场次适中",
    confidenceHigh: "场次充足",
    characterIndexTitle: "按角色查看二级倾向与单队友参考键",
    characterIndexBody:
      "主要与辅助二级倾向使用精确队友A × B计算；展开的单队友键仅供参考，不参与二级分组。",
    characterProfile: "角色·武器",
    firstOrderGroup: "一级定位组",
    groupMembers: "同组角色",
    profileCount: "个档案",
    compositionGroupKeys: "单队友参考键・不参与分组",
    compositionGroupCount: "个参考键",
    sameGroupProfiles: "同键档案",
    noCompositionGroups: "没有符合当前条件的阵容组。",
  },
  "zh-Hant": {
    title: "角色陣容分析",
    metadataTitle: "角色陣容分析 - 第10、11賽季",
    description: "根據第10、11賽季全部陣容趨勢劃分統一角色類型。",
    kicker: "第10、11賽季 · 全域陣容趨勢",
    compositionView: "按陣容查看",
    characterView: "陣容傾向組",
    selectComposition: "定位陣容",
    selectRole: "定位",
    apply: "查看",
    games: "場次",
    reliableTypes: "可信組合",
    conditionalSplits: "陣容傾向組",
    topCombinations: "最佳內部類型組合",
    conditionalCatalog: "適合該陣容的類型",
    baseType: "原類型",
    partnerFit: "全部陣容趨勢",
    recommendations: "角色示例",
    lowSample: "樣本較少",
    adjusted: "校正適配度",
    consensusTitle: "按一級類型查看陣容傾向",
    consensusBody: "固定一級戰鬥類型，並在所選定位陣容中比較更適配的隊友一級類型。",
    baseGroups: "一級類型",
    splitGroups: "多傾向類型",
    finalTypes: "傾向組",
    profiles: "角色·武器檔案",
    recurringContexts: "全部陣容趨勢",
    cohesion: "組內一致率",
    separation: "組外一致率",
    evidence: "比較依據",
    unchanged: "保留",
    split: "拆分",
    backToTypes: "角色類型分析",
    exploreGuide: "選擇定位陣容後逐個比較定位。僅展開需要的類型，查看角色與場次依據。",
    roleFocus: "分析定位",
    roleFocusHint: "比較同一定位中更適合選擇的內部類型。",
    sortBy: "排序",
    sortFit: "適配優先",
    sortGames: "場次優先",
    sortName: "類型名稱",
    typeCount: "個類型",
    openEvidence: "查看角色與場次依據",
    fitGuide: "校正適配度是排除角色基礎成績後，在該陣容中出現的額外提升。請結合場次判斷。",
    rankedHint: "同時展示場次和校正適配度的前12個內部類型組合。",
    rpAverage: "平均RP",
    groupOverview: "類型組概覽",
    consensusHint: "展開後可查看偏好的核心隊友類型、對應角色及更適配的另一名隊友類型。",
    showAllRanked: "查看第4–12名",
    differentPairs: "不同分組配對",
    checkedCompositions: "已檢查陣容",
    confidenceLow: "場次較少",
    confidenceMedium: "場次適中",
    confidenceHigh: "場次充足",
    characterIndexTitle: "按角色查看二級傾向與單隊友參考鍵",
    characterIndexBody:
      "主要與輔助二級傾向使用精確隊友A × B計算；展開的單隊友鍵僅供參考，不參與二級分組。",
    characterProfile: "角色·武器",
    firstOrderGroup: "一級定位組",
    groupMembers: "同組角色",
    profileCount: "個檔案",
    compositionGroupKeys: "單隊友參考鍵・不參與分組",
    compositionGroupCount: "個參考鍵",
    sameGroupProfiles: "同鍵檔案",
    noCompositionGroups: "沒有符合目前條件的陣容組。",
  },
};

const AFFINITY_COPY: Record<
  RouteLocale,
  {
    title: string;
    body: string;
    combinedBasis: string;
    coreGroups: string;
    independentGroups: string;
    primaryMembers: string;
    auxiliaryMembers: string;
    signatureTrends: string;
    threshold: string;
    cohesion: string;
    minimumContexts: string;
    primaryAffinity: string;
    auxiliaryAffinity: string;
    openIndependent: string;
    noCoreGroups: string;
    repeatedValidation: string;
    converged: string;
    isolated: string;
    relocated: string;
  }
> = {
  ko: {
    title: "전역 2차 조합 성향군",
    body: "56개 역할 조합에서 두 동료의 내부 역할군을 A × B 한 세트로 고정해 모든 상승·하락을 비교했습니다. 한 동료만 같은 경우는 같은 문맥으로 보지 않으며, 같은 직업 안에서 정확한 동료 2인 조합의 방향·상승폭이 반복되는 캐릭터만 묶었습니다.",
    combinedBasis: "입장료 보정 + 판수 신뢰 보정 · 시즌 10·11",
    coreGroups: "핵심 성향군",
    independentGroups: "독립 성향",
    primaryMembers: "주 소속",
    auxiliaryMembers: "조건부 보조 소속",
    signatureTrends: "공통 상승 근거",
    threshold: "직업 경계",
    cohesion: "그룹 평균 유사도",
    minimumContexts: "최소 공통 문맥",
    primaryAffinity: "2차 주 성향군",
    auxiliaryAffinity: "보조 성향군",
    openIndependent: "독립형 펼치기",
    noCoreGroups: "경계를 안정적으로 넘은 핵심군이 없어 모든 프로필을 독립형으로 유지했습니다.",
    repeatedValidation: "반복 검증",
    converged: "소속 수렴",
    isolated: "격리",
    relocated: "이동",
  },
  en: {
    title: "Global secondary composition affinities",
    body: "Across 56 role compositions, both partner subtypes are fixed as one A × B context. Profiles are regrouped only when the direction and lift of the same exact two-partner contexts repeat within a role.",
    combinedBasis: "Entry adjustment + sample confidence · Seasons 10–11",
    coreGroups: "Core affinities",
    independentGroups: "Independent profiles",
    primaryMembers: "Primary members",
    auxiliaryMembers: "Conditional secondary members",
    signatureTrends: "Shared positive evidence",
    threshold: "Role threshold",
    cohesion: "Mean group similarity",
    minimumContexts: "Minimum shared contexts",
    primaryAffinity: "Secondary primary affinity",
    auxiliaryAffinity: "Auxiliary affinities",
    openIndependent: "Open independent profiles",
    noCoreGroups: "No pair cleared the stability boundary, so every profile remains independent.",
    repeatedValidation: "Repeated validation",
    converged: "Assignments converged",
    isolated: "Isolated",
    relocated: "Relocated",
  },
  ja: {
    title: "グローバル二次構成傾向グループ",
    body: "56種の役割構成で、味方2人の内部タイプをA × Bの一組として固定し、同じ正確な2人構成の方向と上昇幅で再分類しました。",
    combinedBasis: "参加費補正＋試合数信頼補正・シーズン10–11",
    coreGroups: "主要傾向群",
    independentGroups: "独立傾向",
    primaryMembers: "主所属",
    auxiliaryMembers: "条件付き補助所属",
    signatureTrends: "共通上昇根拠",
    threshold: "職別境界",
    cohesion: "群平均類似度",
    minimumContexts: "最小共通文脈",
    primaryAffinity: "二次主傾向群",
    auxiliaryAffinity: "補助傾向群",
    openIndependent: "独立型を開く",
    noCoreGroups: "安定境界を超えた組がないため、全プロフィールを独立型として維持しました。",
    repeatedValidation: "反復検証",
    converged: "所属収束",
    isolated: "分離",
    relocated: "移動",
  },
  "zh-Hans": {
    title: "全局二级阵容倾向组",
    body: "在56种职责阵容中，将两名队友的内部类型固定为A × B整体，仅按完全相同的双队友语境、方向和提升幅度重新分组。",
    combinedBasis: "入场费校正＋场次置信校正・赛季10–11",
    coreGroups: "核心倾向组",
    independentGroups: "独立倾向",
    primaryMembers: "主要成员",
    auxiliaryMembers: "条件性辅助成员",
    signatureTrends: "共同上升证据",
    threshold: "职责边界",
    cohesion: "组内平均相似度",
    minimumContexts: "最少共享语境",
    primaryAffinity: "二级主要倾向组",
    auxiliaryAffinity: "辅助倾向组",
    openIndependent: "展开独立类型",
    noCoreGroups: "没有组合稳定越过边界，因此全部档案保持独立。",
    repeatedValidation: "重复验证",
    converged: "归属收敛",
    isolated: "隔离",
    relocated: "移动",
  },
  "zh-Hant": {
    title: "全局二級陣容傾向組",
    body: "在56種職責陣容中，將兩名隊友的內部類型固定為A × B整體，只按完全相同的雙隊友語境、方向和提升幅度重新分組。",
    combinedBasis: "入場費校正＋場次信賴校正・賽季10–11",
    coreGroups: "核心傾向組",
    independentGroups: "獨立傾向",
    primaryMembers: "主要成員",
    auxiliaryMembers: "條件性輔助成員",
    signatureTrends: "共同上升證據",
    threshold: "職責邊界",
    cohesion: "組內平均相似度",
    minimumContexts: "最少共享語境",
    primaryAffinity: "二級主要傾向組",
    auxiliaryAffinity: "輔助傾向組",
    openIndependent: "展開獨立類型",
    noCoreGroups: "沒有組合穩定越過邊界，因此全部檔案保持獨立。",
    repeatedValidation: "重複驗證",
    converged: "歸屬收斂",
    isolated: "隔離",
    relocated: "移動",
  },
};

const VALIDATION_COPY: Record<
  RouteLocale,
  {
    title: string;
    hint: string;
    open: string;
    agreement: string;
    checked: string;
    exceptions: string;
    insufficient: string;
    consistent: string;
    mixed: string;
    actual: string;
    noActual: string;
    character: string;
    result: string;
    evidence: string;
    reference: string;
    checkedEvidence: string;
    strong: string;
    unobserved: string;
    aligned: string;
    opposite: string;
  }
> = {
  ko: {
    title: "세부 조합 검증",
    hint: "실제 3인 조합 30판부터 표시하고, 캐릭터별 방향 일치는 100판부터 판정합니다. 분산 자료가 없어 유의확률이 아닌 판수 기반 경향 검증입니다.",
    open: "상대 유형별 검증 보기",
    agreement: "방향 일치",
    checked: "확인",
    exceptions: "반대 예외",
    insufficient: "판정 보류",
    consistent: "그룹 경향 일치",
    mixed: "그룹 내 혼재",
    actual: "검증용 실제 캐릭터 조합",
    noActual: "30판 이상 실제 조합이 없습니다.",
    character: "캐릭터",
    result: "조합 상승폭",
    evidence: "판수 근거",
    reference: "참고",
    checkedEvidence: "확인",
    strong: "강한 근거",
    unobserved: "30판 미만",
    aligned: "같은 방향",
    opposite: "반대 방향",
  },
  en: {
    title: "Detailed composition validation",
    hint: "Exact trios appear from 30 games; member direction is judged from 100 games. This is game-volume evidence, not a p-value.",
    open: "Validate partner types",
    agreement: "Direction match",
    checked: "Checked",
    exceptions: "Exceptions",
    insufficient: "Pending",
    consistent: "Group trend holds",
    mixed: "Mixed group",
    actual: "Observed character trios",
    noActual: "No exact trio reached 30 games.",
    character: "Character",
    result: "Composition lift",
    evidence: "Evidence",
    reference: "Reference",
    checkedEvidence: "Checked",
    strong: "Strong",
    unobserved: "Under 30",
    aligned: "Aligned",
    opposite: "Opposite",
  },
  ja: {
    title: "詳細構成検証",
    hint: "実際の3人構成は30試合、メンバー方向判定は100試合から表示します。p値ではなく試合数ベースの傾向です。",
    open: "相手タイプ別の検証",
    agreement: "方向一致",
    checked: "確認",
    exceptions: "例外",
    insufficient: "保留",
    consistent: "グループ傾向一致",
    mixed: "グループ内混在",
    actual: "実際のキャラクター構成",
    noActual: "30試合以上の構成がありません。",
    character: "キャラクター",
    result: "構成上昇幅",
    evidence: "試合数根拠",
    reference: "参考",
    checkedEvidence: "確認",
    strong: "強い根拠",
    unobserved: "30未満",
    aligned: "同方向",
    opposite: "逆方向",
  },
  "zh-Hans": {
    title: "详细阵容验证",
    hint: "实际三人阵容从30场起显示，成员方向从100场起判断。这是场次趋势，并非p值。",
    open: "按搭档类型验证",
    agreement: "方向一致",
    checked: "已验证",
    exceptions: "例外",
    insufficient: "待判断",
    consistent: "组内趋势一致",
    mixed: "组内混合",
    actual: "实际角色阵容",
    noActual: "没有达到30场的实际阵容。",
    character: "角色",
    result: "阵容提升",
    evidence: "场次证据",
    reference: "参考",
    checkedEvidence: "已验证",
    strong: "强证据",
    unobserved: "少于30场",
    aligned: "同向",
    opposite: "反向",
  },
  "zh-Hant": {
    title: "詳細陣容驗證",
    hint: "實際三人陣容從30場起顯示，成員方向從100場起判斷。這是場次趨勢，並非p值。",
    open: "按搭檔類型驗證",
    agreement: "方向一致",
    checked: "已驗證",
    exceptions: "例外",
    insufficient: "待判斷",
    consistent: "組內趨勢一致",
    mixed: "組內混合",
    actual: "實際角色陣容",
    noActual: "沒有達到30場的實際陣容。",
    character: "角色",
    result: "陣容提升",
    evidence: "場次證據",
    reference: "參考",
    checkedEvidence: "已驗證",
    strong: "強證據",
    unobserved: "少於30場",
    aligned: "同向",
    opposite: "反向",
  },
};

function formatNumber(value: number, locale: RouteLocale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function confidenceLabel(value: string, copy: (typeof COPY)[RouteLocale]) {
  if (value === "high") return copy.confidenceHigh;
  if (value === "medium") return copy.confidenceMedium;
  return copy.confidenceLow;
}

function typeLabel(type: { role: string; fitRole: string }) {
  return `${type.role} · ${type.fitRole}`;
}

function formatSignedRp(value: number | null) {
  if (value === null) return "—";
  return (value >= 0 ? "+" : "") + value.toFixed(2) + " RP";
}

function sampleEvidenceLabel(games: number, locale: RouteLocale) {
  const copy = SAMPLE_COPY[locale];
  if (games >= 300) return copy.repeated;
  if (games >= 200) return copy.likely;
  if (games >= 100) return copy.emerging;
  return copy.insufficient;
}

function sampleScore(lift: number | null, games: number) {
  return lift === null ? null : lift * Math.sqrt(games);
}

function seasonConsistencyLabel(
  value: LabTypeCombination["seasonConsistency"],
  locale: RouteLocale
) {
  if (value === "both-positive") return SAMPLE_COPY[locale].seasonRepeated;
  if (value === "mixed" || value === "both-negative") return SAMPLE_COPY[locale].seasonMixed;
  return SAMPLE_COPY[locale].seasonInsufficient;
}

function AffinityGroupCard({
  group,
  locale,
}: {
  group: LabCompositionAffinityGroup;
  locale: RouteLocale;
}) {
  const copy = AFFINITY_COPY[locale];
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
            {group.kind === "core" ? copy.coreGroups : copy.independentGroups}
          </p>
          <h4 className="mt-1 text-sm font-bold leading-5 text-[var(--color-foreground)]">
            {group.label}
          </h4>
        </div>
        <span
          className={
            "rounded-full border px-2 py-1 text-[9px] font-bold " +
            (group.seasonConsistency === "both-positive"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : group.seasonConsistency === "mixed"
                ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-[var(--color-border)] text-[var(--color-muted-foreground)]")
          }
        >
          {seasonConsistencyLabel(group.seasonConsistency, locale)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded border border-[var(--color-border)] px-2 py-1.5">
          <dt className="text-[var(--color-muted-foreground)]">{copy.cohesion}</dt>
          <dd className="mt-0.5 font-mono font-bold text-[var(--color-foreground)]">
            {formatRate(group.cohesion)}
          </dd>
        </div>
        <div className="rounded border border-[var(--color-border)] px-2 py-1.5">
          <dt className="text-[var(--color-muted-foreground)]">{copy.threshold}</dt>
          <dd className="mt-0.5 font-mono font-bold text-[var(--color-foreground)]">
            {formatRate(group.threshold)}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <p className="text-[10px] font-bold text-[var(--color-muted-foreground)]">
          {copy.primaryMembers} · {group.primaryMembers.length}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {group.primaryMembers.map((member) => (
            <li
              key={member.profileKey}
              className="rounded border border-[var(--color-accent)]/35 bg-[var(--color-accent-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--color-accent-foreground)]"
              title={`${member.firstOrderType} · ${formatRate(member.similarity)}`}
            >
              {member.characterName} · {member.weaponName}
            </li>
          ))}
        </ul>
      </div>

      {group.auxiliaryMembers.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-[var(--color-muted-foreground)]">
            {copy.auxiliaryMembers} · {group.auxiliaryMembers.length}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {group.auxiliaryMembers.map((member) => (
              <li
                key={member.profileKey}
                className="rounded border border-dashed border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-muted-foreground)]"
              >
                {member.characterName} · {member.weaponName} · {formatRate(member.similarity)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {group.signatureContexts.length > 0 ? (
        <details className="group/evidence mt-3 border-t border-[var(--color-border)] pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-[var(--color-muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
            {copy.signatureTrends} · {group.signatureContexts.length}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/evidence:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ol className="mt-2 space-y-2">
            {group.signatureContexts.map((signature) => (
              <li
                key={signature.key}
                className="rounded border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-2 text-[10px]"
              >
                <p className="font-semibold leading-4 text-[var(--color-foreground)]">
                  {signature.roleComposition} ·{" "}
                  {signature.partnerTypes
                    .map((partner) => `${partner.role} ${partner.fitRole}`)
                    .join(" × ")}
                </p>
                <p className="mt-1 font-mono tabular-nums text-[var(--color-muted-foreground)]">
                  {signature.positiveMembers}/{signature.memberCount} ·{" "}
                  {formatSignedRp(signature.adjustedResidual)} ·{" "}
                  {formatNumber(signature.games, locale)}
                </p>
                <p className="mt-1 text-[9px] text-[var(--color-muted-foreground)]">
                  {signature.seasonSignals
                    .map(
                      (signal) =>
                        `S${signal.season} ${signal.observedMembers > 0 ? `${signal.positiveMembers}/${signal.observedMembers}` : "—"}`
                    )
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}

function characterProfileKey(character: { characterCode: number; weapon: number }) {
  return `${character.characterCode}:${character.weapon}`;
}

function RankedCombinationRow({
  combination,
  index,
  locale,
  copy,
  showSampleConfidence,
}: {
  combination: LabTypeCombination;
  index: number;
  locale: RouteLocale;
  copy: (typeof COPY)[RouteLocale];
  showSampleConfidence: boolean;
}) {
  return (
    <li className="grid min-w-0 gap-3 px-4 py-3.5 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(17rem,auto)] sm:items-center sm:px-5">
      <span className="font-mono text-xs font-bold tabular-nums text-[var(--color-muted-foreground)]">
        {String(index + 1).padStart(2, "0")}
        {showSampleConfidence ? (
          <>
            <em className="mt-1 block whitespace-nowrap font-sans text-[9px] font-bold not-italic text-[var(--color-accent-foreground)]">
              {sampleEvidenceLabel(combination.games, locale)}
            </em>
            <em
              className={`mt-0.5 block whitespace-nowrap font-sans text-[9px] font-bold not-italic ${combination.seasonConsistency === "both-positive" ? "text-[var(--color-accent-foreground)]" : "text-[var(--color-warning)]"}`}
            >
              {seasonConsistencyLabel(combination.seasonConsistency, locale)}
            </em>
          </>
        ) : null}
      </span>
      <ul className="flex min-w-0 flex-wrap gap-1.5">
        {combination.types.map((type, typeIndex) => (
          <li
            key={type.role + ":" + type.fitRole + ":" + typeIndex}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[11px] font-semibold text-[var(--color-foreground)]"
          >
            <span className="text-[var(--color-muted-foreground)]">{type.role}</span> ·{" "}
            {type.fitRole}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-2 sm:text-right">
        <div>
          <dt className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {copy.games}
          </dt>
          <dd className="mt-0.5 font-mono text-xs font-bold tabular-nums">
            {formatNumber(combination.games, locale)}
          </dd>
        </div>
        {showSampleConfidence ? (
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {copy.adjusted}
            </dt>
            <dd className="mt-0.5 font-mono text-xs font-bold tabular-nums">
              {combination.rawLift >= 0 ? "+" : ""}
              {combination.rawLift.toFixed(2)}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {copy.rpAverage}
            </dt>
            <dd className="mt-0.5 font-mono text-xs font-bold tabular-nums">
              {combination.avgRp >= 0 ? "+" : ""}
              {combination.avgRp.toFixed(2)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[9px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {showSampleConfidence ? SAMPLE_COPY[locale].score : copy.adjusted}
          </dt>
          <dd className="mt-0.5 font-mono text-xs font-bold tabular-nums text-[var(--color-accent-foreground)]">
            {showSampleConfidence
              ? (
                  combination.sampleScore ??
                  sampleScore(combination.rawLift, combination.games) ??
                  0
                ).toFixed(1)
              : `${combination.adjustedLift >= 0 ? "+" : ""}${combination.adjustedLift.toFixed(2)}`}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function validationEvidenceLabel(
  evidence: "insufficient" | "reference" | "checked" | "strong",
  locale: RouteLocale
) {
  const copy = VALIDATION_COPY[locale];
  if (evidence === "strong") return copy.strong;
  if (evidence === "checked") return copy.checkedEvidence;
  if (evidence === "reference") return copy.reference;
  return copy.unobserved;
}

function DetailedCombinationValidation({
  option,
  validation,
  locale,
  gamesLabel,
}: {
  option: LabRecommendationOption;
  validation: LabCombinationValidation;
  locale: RouteLocale;
  gamesLabel: string;
}) {
  const copy = VALIDATION_COPY[locale];
  return (
    <details className="group/validation border-t border-[var(--color-border)] first:border-t-0">
      <summary className="grid min-h-12 cursor-pointer list-none gap-2 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-bold leading-5 text-[var(--color-foreground)]">
            {option.partners.map(typeLabel).join(" + ")}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
            {formatSignedRp(option.adjustedLift)} · {formatNumber(option.games, locale)}{" "}
            {gamesLabel}
          </span>
        </span>
        <span className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-accent-foreground)]">
          {copy.open}
          <ChevronDown className="h-4 w-4 transition-transform group-open/validation:rotate-180 motion-reduce:transition-none" />
        </span>
      </summary>

      <div className="space-y-4 border-t border-[var(--color-border)] bg-[var(--color-muted)]/10 px-3 py-4">
        <p className="text-[11px] leading-5 text-[var(--color-muted-foreground)]">{copy.hint}</p>

        <div className="grid gap-3 xl:grid-cols-2">
          {validation.groupChecks.map((group) => {
            const statusLabel =
              group.status === "consistent"
                ? copy.consistent
                : group.status === "mixed"
                  ? copy.mixed
                  : copy.insufficient;
            return (
              <section
                key={`${group.role}:${group.fitRole}`}
                className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)]"
              >
                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)] px-3 py-3">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-foreground)]">
                      {typeLabel(group)}
                      {group.slots > 1 ? ` ×${group.slots}` : ""}
                    </h4>
                    <p className="mt-1 font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
                      {copy.checked} {group.checkedMembers}/{group.expectedMembers} ·{" "}
                      {copy.exceptions} {group.exceptionMembers}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                      group.status === "consistent"
                        ? "border-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                        : group.status === "mixed"
                          ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                          : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {statusLabel} · {copy.agreement} {formatRate(group.directionAgreement)}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-[11px]">
                    <thead className="text-[10px] text-[var(--color-muted-foreground)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{copy.character}</th>
                        <th className="px-3 py-2 text-right font-semibold">{gamesLabel}</th>
                        <th className="px-3 py-2 text-right font-semibold">{copy.result}</th>
                        <th className="px-3 py-2 text-right font-semibold">{copy.evidence}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {group.members.map((member) => (
                        <tr key={`${member.characterCode}:${member.weapon}`}>
                          <td className="px-3 py-2 font-semibold text-[var(--color-foreground)]">
                            {member.characterName}{" "}
                            <span className="font-normal text-[var(--color-muted-foreground)]">
                              {member.weaponName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                            {formatNumber(member.games, locale)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono font-bold tabular-nums ${
                              member.aligned === false
                                ? "text-[var(--color-warning)]"
                                : "text-[var(--color-foreground)]"
                            }`}
                          >
                            {formatSignedRp(member.adjustedLift)}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--color-muted-foreground)]">
                            {validationEvidenceLabel(member.evidence, locale)}
                            {member.aligned == null
                              ? ""
                              : ` · ${member.aligned ? copy.aligned : copy.opposite}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        <section>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
            {copy.actual} · {validation.exactCombinationCount}
          </h4>
          {validation.actualCombinations.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
              <table className="w-full min-w-[42rem] text-left text-[11px]">
                <thead className="text-[10px] text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{copy.actual}</th>
                    <th className="px-3 py-2 text-right font-semibold">{gamesLabel}</th>
                    <th className="px-3 py-2 text-right font-semibold">{copy.result}</th>
                    <th className="px-3 py-2 text-right font-semibold">{copy.evidence}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {validation.actualCombinations.map((combination, index) => (
                    <tr key={`${combination.members.map(characterProfileKey).join("|")}:${index}`}>
                      <td className="px-3 py-2 font-semibold text-[var(--color-foreground)]">
                        {combination.members
                          .map((member) => `${member.characterName} ${member.weaponName}`)
                          .join(" + ")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                        {formatNumber(combination.games, locale)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold tabular-nums ${
                          combination.aligned === false
                            ? "text-[var(--color-warning)]"
                            : "text-[var(--color-foreground)]"
                        }`}
                      >
                        {formatSignedRp(combination.adjustedLift)}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-muted-foreground)]">
                        {validationEvidenceLabel(combination.evidence ?? "reference", locale)}
                        {combination.aligned == null
                          ? ""
                          : ` · ${combination.aligned ? copy.aligned : copy.opposite}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.noActual}</p>
          )}
        </section>
      </div>
    </details>
  );
}

function ConditionalTypeRow({
  item,
  locale,
  copy,
  showSampleConfidence,
  entryAdjustedFitByCharacter,
  recommendation,
  validationByKey,
}: {
  item: LabConditionalType;
  locale: RouteLocale;
  copy: (typeof COPY)[RouteLocale];
  showSampleConfidence: boolean;
  entryAdjustedFitByCharacter: Map<string, number | null>;
  recommendation?: LabTypeRecommendation;
  validationByKey: Map<string, LabCombinationValidation>;
}) {
  const characters = showSampleConfidence
    ? item.characters.toSorted(
        (left, right) =>
          (sampleScore(right.fitResidual, right.fitGames) ?? Number.NEGATIVE_INFINITY) -
            (sampleScore(left.fitResidual, left.fitGames) ?? Number.NEGATIVE_INFINITY) ||
          right.fitGames - left.fitGames
      )
    : item.characters;
  const trendContexts = item.trendContexts ?? [];
  const affinityGroups = item.affinityGroups ?? [];
  const positiveTrendContexts = trendContexts.filter((context) => context.direction === "positive");
  const positiveAffinityGroups = affinityGroups.filter((group) => group.positiveCharacterCount > 0);
  const positiveTrendCount =
    affinityGroups.length > 0 ? positiveAffinityGroups.length : positiveTrendContexts.length;
  const trendSampleGames =
    affinityGroups.length > 0
      ? positiveAffinityGroups.reduce((sum, group) => sum + group.groupGames, 0)
      : positiveTrendContexts.reduce((sum, context) => sum + context.games, 0);
  const detailedTrendCohesion =
    item.trendRefinedCohesion === undefined ? item.trendCohesion : item.trendRefinedCohesion;
  const detailedTrendSharedPairs =
    item.trendRefinedSharedPairs === undefined
      ? item.trendSharedPairs
      : item.trendRefinedSharedPairs;
  const trendCopy = TREND_COPY[locale];

  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(9rem,0.55fr)] lg:items-start">
        <header className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-base font-bold text-[var(--color-foreground)]">
              {item.fitRole}
            </h3>
            <span
              className={
                "shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold " +
                (item.conditionalSplit || item.roleIsolated
                  ? "border-[var(--color-warning)] bg-[var(--color-muted)]/20 text-[var(--color-warning)]"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)]")
              }
            >
              {item.roleIsolated
                ? "전투 기능 격리"
                : item.conditionalSplit
                  ? copy.split
                  : copy.unchanged}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {copy.baseType} · {item.baseFitRole}
          </p>
          {item.classificationBasis === "full-composition-trend-profile" ? (
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-accent-foreground)]">
              세부 조합 경향 100% 기준
              {detailedTrendCohesion == null
                ? " · 비교 자료 부족"
                : ` · 평균 유사도 ${(detailedTrendCohesion * 100).toFixed(0)}% · 비교 ${detailedTrendSharedPairs ?? 0}쌍`}
            </p>
          ) : item.classificationBasis === "first-order-composition-affinity-profile" ? (
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-accent-foreground)]">
              1차 유형 고정 · 상승 조합 그룹 {positiveTrendCount}개
            </p>
          ) : null}
          {item.roleIsolationReason ? (
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-warning)]">
              {item.roleIsolationReason}
            </p>
          ) : null}
        </header>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
            {copy.partnerFit}
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--color-foreground)]">
            <span className="text-[var(--color-accent-foreground)]">
              {trendCopy.positive} {positiveTrendCount}
            </span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
            {characters.slice(0, 3).map((character) => (
              <li key={character.characterCode + ":" + character.weapon}>
                <strong className="font-semibold text-[var(--color-foreground)]">
                  {character.characterName}
                </strong>{" "}
                {character.weaponName}
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:text-right">
          <div>
            <dt className="text-[10px] text-[var(--color-muted-foreground)]">
              {trendCopy.contexts}
            </dt>
            <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-[var(--color-accent-foreground)]">
              {formatNumber(positiveTrendCount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-[var(--color-muted-foreground)]">
              {trendCopy.samples}
            </dt>
            <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
              {formatNumber(trendSampleGames, locale)}
            </dd>
          </div>
        </dl>
      </div>

      <details className="group mt-3 border-t border-[var(--color-border)] pt-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-xs font-bold text-[var(--color-accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
          <span>{copy.openEvidence}</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div className="space-y-5 pb-1 pt-2">
          {affinityGroups.length > 0 ? (
            <PartnerAffinityExplorer
              groups={affinityGroups}
              locale={locale}
              minGames={item.trendContextMinGames ?? 100}
              labels={{
                title: trendCopy.contexts,
                positive: trendCopy.positive,
                minGames: trendCopy.minGames,
              }}
            />
          ) : (
            <FullTrendExplorer
              contexts={trendContexts}
              locale={locale}
              minGames={item.trendContextMinGames ?? 100}
              labels={{
                title: trendCopy.contexts,
                positive: trendCopy.positive,
                minGames: trendCopy.minGames,
              }}
            />
          )}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              {copy.recommendations}
            </p>
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {characters.map((character) => {
                const entryAdjustedFit = entryAdjustedFitByCharacter.get(
                  characterProfileKey(character)
                );
                return (
                  <li
                    key={character.characterCode + ":" + character.weapon}
                    className="grid gap-1 py-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <span className="min-w-0 font-semibold text-[var(--color-foreground)]">
                      {character.characterName}{" "}
                      <span className="font-normal text-[var(--color-muted-foreground)]">
                        {character.weaponName}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-[var(--color-muted-foreground)] sm:text-right">
                      {character.adjustedFit === null
                        ? "—"
                        : (character.adjustedFit >= 0 ? "+" : "") +
                          character.adjustedFit.toFixed(2) +
                          " RP"}{" "}
                      · {formatNumber(character.fitGames, locale)} {copy.games}
                      {!character.fitReliable ? (
                        <em className="ml-1 not-italic text-[var(--color-warning)]">
                          · {copy.lowSample}
                        </em>
                      ) : null}
                      {showSampleConfidence ? (
                        <>
                          <em className="ml-1 not-italic text-[var(--color-accent-foreground)]">
                            · {sampleEvidenceLabel(character.fitGames, locale)}
                          </em>
                          {entryAdjustedFit !== undefined && entryAdjustedFit !== null ? (
                            <em
                              className={`ml-1 not-italic ${entryAdjustedFit > 0 ? "text-[var(--color-accent-foreground)]" : "text-[var(--color-warning)]"}`}
                            >
                              ·{" "}
                              {entryAdjustedFit > 0
                                ? SAMPLE_COPY[locale].entryMaintained
                                : SAMPLE_COPY[locale].entryReversed}
                            </em>
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          {recommendation?.options.some(
            (option) => option.combinationKey && validationByKey.has(option.combinationKey)
          ) ? (
            <section className="mt-5">
              <div className="mb-2">
                <h4 className="text-xs font-bold text-[var(--color-foreground)]">
                  {VALIDATION_COPY[locale].title}
                </h4>
                <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[var(--color-muted-foreground)]">
                  {VALIDATION_COPY[locale].hint}
                </p>
              </div>
              <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
                {recommendation.options.map((option) => {
                  if (!option.combinationKey) return null;
                  const validation = validationByKey.get(option.combinationKey);
                  return validation ? (
                    <DetailedCombinationValidation
                      key={option.combinationKey}
                      option={option}
                      validation={validation}
                      locale={locale}
                      gamesLabel={copy.games}
                    />
                  ) : null;
                })}
              </div>
            </section>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function BoundaryProfilesPanel({
  profiles,
  role,
  locale,
  alternativeThreshold,
  assignmentMargin,
}: {
  profiles: Array<{
    character: LabCharacterRecommendation;
    currentType: LabConditionalType;
    alternativeType?: LabConditionalType;
  }>;
  role: string;
  locale: RouteLocale;
  alternativeThreshold: number;
  assignmentMargin: number;
}) {
  const boundaryCopy = BOUNDARY_COPY[locale];
  const boundaryDescription = boundaryCopy.body
    .replace("{threshold}", `${(alternativeThreshold * 100).toFixed(0)}%`)
    .replace("{margin}", `${(assignmentMargin * 100).toFixed(0)}%p`);
  return (
    <section className="dashboard-panel overflow-hidden">
      <header className="border-b border-[var(--color-border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              {boundaryCopy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--color-muted-foreground)]">
              {boundaryDescription}
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-accent-foreground)]">
            {role} · {formatNumber(profiles.length, locale)}
          </span>
        </div>
      </header>
      {profiles.length > 0 ? (
        <ul className="divide-y divide-[var(--color-border)]">
          {profiles.map(({ character, currentType, alternativeType }) => {
            const assignmentMargin = character.trendAssignmentMargin ?? 0;
            const ownSimilarity = character.trendOwnSimilarity;
            return (
              <li
                key={characterProfileKey(character)}
                className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[var(--color-foreground)]">
                    {character.characterName}{" "}
                    <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                      {character.weaponName}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                    <strong className="font-semibold text-[var(--color-foreground)]">
                      {boundaryCopy.current}
                    </strong>{" "}
                    {currentType.fitRole}
                    {alternativeType ? (
                      <>
                        {" → "}
                        <strong className="font-semibold text-[var(--color-foreground)]">
                          {boundaryCopy.alternative}
                        </strong>{" "}
                        {alternativeType.fitRole}
                      </>
                    ) : null}
                  </p>
                  {(character.trendAlternativeCharacters?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted-foreground)]">
                      {boundaryCopy.nearby} ·{" "}
                      {character.trendAlternativeCharacters
                        ?.slice(0, 4)
                        .map((member) => `${member.characterName} ${member.weaponName}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="rounded-md border border-[var(--color-border)] p-2.5">
                    <dt className="text-[var(--color-muted-foreground)]">{boundaryCopy.own}</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-foreground)]">
                      {ownSimilarity == null ? boundaryCopy.independent : formatRate(ownSimilarity)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-[var(--color-border)] p-2.5">
                    <dt className="text-[var(--color-muted-foreground)]">
                      {boundaryCopy.alternativeScore}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-accent-foreground)]">
                      {formatRate(character.trendAlternativeSimilarity ?? null)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-[var(--color-border)] p-2.5">
                    <dt className="text-[var(--color-muted-foreground)]">
                      {ownSimilarity == null ? boundaryCopy.thresholdMargin : boundaryCopy.margin}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-warning)]">
                      {assignmentMargin >= 0 ? "+" : ""}
                      {(assignmentMargin * 100).toFixed(1)}%p
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-5 text-xs text-[var(--color-muted-foreground)] sm:px-5">
          {boundaryCopy.none}
        </p>
      )}
    </section>
  );
}

export async function generateMetadata({ params }: CompositionLabPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const copy = COPY[locale];
  return {
    metadataBase: new URL(BASE_URL),
    title: copy.metadataTitle,
    description: copy.description,
    openGraph: {
      title: copy.metadataTitle,
      description: copy.description,
      url: "/composition-lab",
    },
    twitter: { title: copy.metadataTitle, description: copy.description },
    robots: { index: true, follow: true },
  };
}

export default async function CompositionLabPage({
  params,
  searchParams,
}: CompositionLabPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  const copy = COPY[locale];
  // 전역 2차 성향군은 시즌 10·11 고정 분석 스냅샷으로 보관합니다.
  // 사용자 페이지에서는 조합 추천 분석만 제공합니다.
  const view = "compositions" as "compositions" | "characters";
  const metricMode =
    query.metric === "entry" || query.metric === "sample" || query.metric === "combined"
      ? query.metric
      : view === "characters"
        ? "combined"
        : null;
  const isEntryAdjusted = metricMode === "entry";
  const isSampleConfidence = metricMode === "sample";
  const isCombinedConfidence = metricMode === "combined";
  const compositionData = isCombinedConfidence
    ? combinedCompositionData
    : isEntryAdjusted
      ? adjustedCompositionData
      : isSampleConfidence
        ? sampleCompositionData
        : observedCompositionData;
  const consensusData = isCombinedConfidence
    ? combinedConsensusData
    : isEntryAdjusted
      ? adjustedConsensusData
      : isSampleConfidence
        ? sampleConsensusData
        : observedConsensusData;
  const selectedComposition =
    compositionData.roleCompositions.find((item) => item.roleComposition === query.composition) ??
    compositionData.roleCompositions.find((item) => item.roleComposition === DEFAULT_COMPOSITION) ??
    compositionData.roleCompositions[0];
  const selectedCompositionRoles = selectedComposition.roleComposition.split(" + ");
  const adjustedSelectedComposition =
    adjustedCompositionData.roleCompositions.find(
      (item) => item.roleComposition === selectedComposition.roleComposition
    ) ?? null;
  const entryAdjustedFitByCharacter = new Map(
    (adjustedSelectedComposition?.typeCatalog ?? []).flatMap((item) =>
      item.characters.map(
        (character) =>
          [characterProfileKey(character), character.adjustedFit] as [string, number | null]
      )
    )
  );
  const requestedRole = ROLE_ORDER.includes(query.role ?? "") ? query.role! : "전사";
  const selectedAffinityRole = requestedRole;
  const affinityRoleSummary = combinedAffinityGroupData.roles.find(
    (role) => role.role === selectedAffinityRole
  );
  const selectedAffinityGroups = combinedAffinityGroupData.groups
    .filter((group) => group.role === selectedAffinityRole)
    .toSorted(
      (left, right) =>
        Number(right.kind === "core") - Number(left.kind === "core") ||
        right.primaryMembers.length - left.primaryMembers.length ||
        left.label.localeCompare(right.label, locale)
    );
  const coreAffinityGroups = selectedAffinityGroups.filter((group) => group.kind === "core");
  const independentAffinityGroups = selectedAffinityGroups.filter(
    (group) => group.kind === "independent"
  );
  const affinityAssignmentsByProfile = new Map<
    string,
    {
      primary: LabCompositionAffinityGroup | null;
      auxiliary: LabCompositionAffinityGroup[];
    }
  >();
  for (const group of combinedAffinityGroupData.groups) {
    for (const member of group.primaryMembers) {
      const assignment = affinityAssignmentsByProfile.get(member.profileKey) ?? {
        primary: null,
        auxiliary: [],
      };
      assignment.primary = group;
      affinityAssignmentsByProfile.set(member.profileKey, assignment);
    }
    for (const member of group.auxiliaryMembers) {
      const assignment = affinityAssignmentsByProfile.get(member.profileKey) ?? {
        primary: null,
        auxiliary: [],
      };
      assignment.auxiliary.push(group);
      affinityAssignmentsByProfile.set(member.profileKey, assignment);
    }
  }
  const selectedRole = selectedCompositionRoles.includes(requestedRole)
    ? requestedRole
    : selectedCompositionRoles[0];
  const selectedPartnerRoleKey = partnerRoleKey(selectedComposition.roleComposition, selectedRole);
  const globalCatalogByKey = new Map(
    (compositionData.globalSecondOrderTypeCatalog ?? []).map((item) => [typeLabel(item), item])
  );
  const compositionOrder = new Map(
    compositionData.roleCompositions.map((composition, index) => [
      composition.roleComposition,
      index,
    ])
  );
  const compositionMembershipsByCharacter = new Map<
    string,
    Array<{
      key: string;
      roleComposition: string;
      anchorRole: string;
      anchorFitRole: string;
      games: number;
      adjustedResidual: number;
    }>
  >();
  const compositionGroupMembers = new Map<string, Set<string>>();
  for (const type of compositionData.globalSecondOrderTypeCatalog ?? []) {
    for (const group of type.affinityGroups ?? []) {
      const roleComposition = roleMultisetKey([type.role, ...group.partnerRoles]);
      const key = `${roleComposition} / ${type.role} 관점 / ${group.anchorType.role} · ${group.anchorType.fitRole} 선호군`;
      for (const character of group.characters) {
        if (character.direction !== "positive") continue;
        const profileKey = `${character.characterCode}:${character.weapon}`;
        const memberships = compositionMembershipsByCharacter.get(profileKey) ?? [];
        memberships.push({
          key,
          roleComposition,
          anchorRole: group.anchorType.role,
          anchorFitRole: group.anchorType.fitRole,
          games: character.games,
          adjustedResidual: character.adjustedResidual,
        });
        compositionMembershipsByCharacter.set(profileKey, memberships);
        const members = compositionGroupMembers.get(key) ?? new Set<string>();
        members.add(profileKey);
        compositionGroupMembers.set(key, members);
      }
    }
  }
  const characterRoleRows = (compositionData.globalSecondOrderTypeCatalog ?? [])
    .flatMap((type) => {
      const groupMembers = type.characters
        .map((character) => ({
          characterCode: character.characterCode,
          characterName: character.characterName,
          weapon: character.weapon,
          weaponName: character.weaponName,
        }))
        .toSorted(
          (left, right) =>
            left.characterName.localeCompare(right.characterName, locale) ||
            left.weaponName.localeCompare(right.weaponName, locale)
        );
      return type.characters.map((character) => {
        const profileKey = `${character.characterCode}:${character.weapon}`;
        const affinityAssignment = affinityAssignmentsByProfile.get(profileKey);
        const memberships = (compositionMembershipsByCharacter.get(profileKey) ?? []).toSorted(
          (left, right) =>
            (compositionOrder.get(left.roleComposition) ?? 99) -
              (compositionOrder.get(right.roleComposition) ?? 99) ||
            ROLE_ORDER.indexOf(left.anchorRole) - ROLE_ORDER.indexOf(right.anchorRole) ||
            left.anchorFitRole.localeCompare(right.anchorFitRole, locale)
        );
        const compositionGroups = [
          ...new Set(memberships.map((membership) => membership.roleComposition)),
        ].map((roleComposition) => ({
          roleComposition,
          memberships: memberships.filter(
            (membership) => membership.roleComposition === roleComposition
          ),
        }));
        return {
          characterCode: character.characterCode,
          characterName: character.characterName,
          weapon: character.weapon,
          weaponName: character.weaponName,
          role: type.role,
          fitRole: type.fitRole,
          groupMembers,
          compositionGroups,
          compositionGroupCount: memberships.length,
          primaryAffinityGroup: affinityAssignment?.primary ?? null,
          auxiliaryAffinityGroups: affinityAssignment?.auxiliary ?? [],
        };
      });
    })
    .toSorted(
      (left, right) =>
        left.characterName.localeCompare(right.characterName, locale) ||
        left.weaponName.localeCompare(right.weaponName, locale) ||
        ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role)
    );
  const filterSelectedCompositionContexts = (contexts: LabConditionalType["trendContexts"] = []) =>
    contexts.filter(
      (context) =>
        selectedPartnerRoleKey != null &&
        roleMultisetKey(context.partnerTypes.map((type) => type.role)) === selectedPartnerRoleKey
    );
  const filterSelectedAffinityGroups = (groups: LabConditionalType["affinityGroups"] = []) =>
    groups.filter(
      (group) =>
        selectedPartnerRoleKey != null &&
        roleMultisetKey(group.partnerRoles) === selectedPartnerRoleKey
    );
  const consensusGroups = consensusData.groups
    .filter((group) => group.role === selectedRole)
    .map((group) => {
      if (compositionData.combinationGroupingBasis !== "fixed-first-order-composition-contexts") {
        return group;
      }
      const types = group.types.map((type) => {
        const catalogType = globalCatalogByKey.get(
          typeLabel({ role: group.role, fitRole: type.label })
        );
        const affinityGroups = filterSelectedAffinityGroups(catalogType?.affinityGroups);
        const trendSharedPairs =
          affinityGroups.length > 0
            ? affinityGroups.filter((group) => group.positiveCharacterCount > 0).length
            : filterSelectedCompositionContexts(catalogType?.trendContexts).filter(
                isPositiveCompositionContext
              ).length;
        return { ...type, trendSharedPairs };
      });
      const reliablePairCount = types.reduce((sum, type) => sum + (type.trendSharedPairs ?? 0), 0);
      return {
        ...group,
        types,
        reliablePairCount,
        split: reliablePairCount > 1,
      };
    })
    .toSorted(
      (a, b) => Number(b.split) - Number(a.split) || b.conflictPairCount - a.conflictPairCount
    );
  const selectedCompositionGroupCount = consensusGroups.reduce(
    (sum, group) => sum + group.reliablePairCount,
    0
  );
  const selectedCompositionProfileCount = new Set(
    consensusGroups.flatMap((group) =>
      group.types.flatMap((type) =>
        type.characters.map((character) => `${character.characterCode}:${character.weapon}`)
      )
    )
  ).size;
  const globalTypeByCharacterKey = new Map(
    (compositionData.globalSecondOrderTypeCatalog ?? []).flatMap((item) =>
      item.characters.map((character) => [characterProfileKey(character), item] as const)
    )
  );
  const ambiguousProfiles = (compositionData.globalSecondOrderTypeCatalog ?? [])
    .filter((item) => item.role === selectedRole)
    .flatMap((item) =>
      item.characters
        .filter((character) =>
          character.trendRefinedAmbiguous === undefined
            ? character.trendAmbiguous
            : character.trendRefinedAmbiguous
        )
        .map((character) => {
          const refinedAlternativeCharacters =
            character.trendRefinedAlternativeCharacters ??
            character.trendAlternativeCharacters ??
            [];
          const alternativeCharacter = refinedAlternativeCharacters[0];
          const alternativeType = alternativeCharacter
            ? globalTypeByCharacterKey.get(characterProfileKey(alternativeCharacter))
            : undefined;
          return {
            character: {
              ...character,
              trendOwnSimilarity:
                character.trendRefinedOwnSimilarity === undefined
                  ? character.trendOwnSimilarity
                  : character.trendRefinedOwnSimilarity,
              trendOwnSharedPairs:
                character.trendRefinedOwnSharedPairs === undefined
                  ? character.trendOwnSharedPairs
                  : character.trendRefinedOwnSharedPairs,
              trendAlternativeSimilarity:
                character.trendRefinedAlternativeSimilarity === undefined
                  ? character.trendAlternativeSimilarity
                  : character.trendRefinedAlternativeSimilarity,
              trendAlternativeMinimum:
                character.trendRefinedAlternativeMinimum === undefined
                  ? character.trendAlternativeMinimum
                  : character.trendRefinedAlternativeMinimum,
              trendAlternativeSharedPairs:
                character.trendRefinedAlternativeSharedPairs === undefined
                  ? character.trendAlternativeSharedPairs
                  : character.trendRefinedAlternativeSharedPairs,
              trendAssignmentMargin:
                character.trendRefinedAssignmentMargin === undefined
                  ? character.trendAssignmentMargin
                  : character.trendRefinedAssignmentMargin,
              trendAmbiguous: character.trendRefinedAmbiguous ?? character.trendAmbiguous,
              trendAlternativeCharacters: refinedAlternativeCharacters,
            },
            currentType: item,
            alternativeType,
          };
        })
    )
    .toSorted(
      (left, right) =>
        (left.character.trendAssignmentMargin ?? Number.POSITIVE_INFINITY) -
          (right.character.trendAssignmentMargin ?? Number.POSITIVE_INFINITY) ||
        right.character.games - left.character.games
    );
  const selectedTypeCatalog = selectedComposition.typeCatalog.map((item) => {
    const globalType = globalCatalogByKey.get(typeLabel(item));
    return globalType
      ? {
          ...item,
          trendContexts: filterSelectedCompositionContexts(globalType.trendContexts),
          affinityGroups: filterSelectedAffinityGroups(globalType.affinityGroups),
          trendContextMinGames: globalType.trendContextMinGames,
        }
      : item;
  });
  const catalogByRole = ROLE_ORDER.map((role) => ({
    role,
    items: selectedTypeCatalog.filter((item) => item.role === role),
  })).filter((group) => group.items.length > 0);
  const availableRoles = catalogByRole.map((group) => group.role);
  const selectedFocusRole = availableRoles.includes(query.focus ?? "")
    ? query.focus!
    : (availableRoles[0] ?? "");
  const sortMode = query.sort === "games" || query.sort === "name" ? query.sort : "fit";
  const rankedCombinations =
    isSampleConfidence || isCombinedConfidence
      ? (selectedComposition.sampleRankedCombinations ??
        selectedComposition.topCombinations.toSorted(
          (left, right) =>
            (sampleScore(right.rawLift, right.games) ?? Number.NEGATIVE_INFINITY) -
              (sampleScore(left.rawLift, left.games) ?? Number.NEGATIVE_INFINITY) ||
            right.games - left.games
        ))
      : selectedComposition.topCombinations;
  const selectedCatalogItems = selectedTypeCatalog
    .filter((item) => item.role === selectedFocusRole)
    .toSorted((a, b) => {
      if (sortMode === "games") return b.bestPartnerGames - a.bestPartnerGames;
      if (sortMode === "name") return a.fitRole.localeCompare(b.fitRole, locale);
      if (isSampleConfidence || isCombinedConfidence) {
        return (
          (sampleScore(b.bestPartnerResidual, b.bestPartnerGames) ?? Number.NEGATIVE_INFINITY) -
            (sampleScore(a.bestPartnerResidual, a.bestPartnerGames) ?? Number.NEGATIVE_INFINITY) ||
          b.bestPartnerGames - a.bestPartnerGames
        );
      }
      return (
        (b.bestPartnerResidual ?? Number.NEGATIVE_INFINITY) -
          (a.bestPartnerResidual ?? Number.NEGATIVE_INFINITY) ||
        b.bestPartnerGames - a.bestPartnerGames
      );
    });
  const typeRecommendationByKey = new Map(
    (selectedComposition.recommendations ?? []).map((recommendation) => [
      typeLabel(recommendation.focal),
      recommendation,
    ])
  );
  const validationByKey = new Map(
    (selectedComposition.validations ?? []).map((validation) => [
      validation.combinationKey,
      validation,
    ])
  );

  return (
    <main className="page-shell mx-auto flex max-w-7xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8">
      <header className="dashboard-panel flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">{copy.kicker}</span>
        </div>
        <h1 className="dashboard-section-title text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
          {copy.title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
          {copy.description}
        </p>
        <nav
          className="mt-1 grid gap-2 border-t border-[var(--color-border)] pt-3 sm:grid-cols-2"
          aria-label="Character analysis pages"
        >
          <Link
            href="/character-lab"
            className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--color-border)] px-3 py-2.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            <Layers className="h-4 w-4" />
            <span>
              <span className="block text-[10px] font-bold">1</span>
              <span className="block text-xs font-bold">{copy.backToTypes}</span>
            </span>
          </Link>
          <Link
            href="/composition-lab"
            aria-current="page"
            className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-3 py-2.5 text-[var(--color-accent-foreground)]"
          >
            <Layers3 className="h-4 w-4" />
            <span>
              <span className="block text-[10px] font-bold">2</span>
              <span className="block text-xs font-bold">{copy.title}</span>
            </span>
          </Link>
        </nav>
        <nav className="flex gap-2" aria-label="Composition analysis views">
          <Link
            href={{
              pathname: "/composition-lab",
              query: metricMode ? { metric: metricMode } : undefined,
            }}
            className={`flex min-h-11 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold ${view === "compositions" ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}
          >
            <Layers3 className="mr-1.5 inline h-3.5 w-3.5" />
            {copy.compositionView}
          </Link>
        </nav>
        {locale === "ko" ? (
          <nav
            aria-label="분류 지표 선택"
            className="grid grid-cols-2 gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 sm:grid-cols-4 sm:w-fit sm:min-w-[720px]"
          >
            {[
              { label: "1. 관측 RP", detail: "기존 분류", metric: undefined },
              { label: "2. 입장료 보정", detail: "티어 차이 반영", metric: "entry" },
              { label: "3. 판수 신뢰 보정", detail: "상승폭 × √판수", metric: "sample" },
              { label: "4. 입장료+판수 보정", detail: "두 보정 동시 적용", metric: "combined" },
            ].map((item) => {
              const active = item.metric === (metricMode ?? undefined);
              return (
                <Link
                  key={item.label}
                  href={{
                    pathname: "/composition-lab",
                    query: {
                      ...(view === "characters" ? { view: "characters" } : {}),
                      ...(query.composition ? { composition: query.composition } : {}),
                      ...(query.focus ? { focus: query.focus } : {}),
                      ...(query.role ? { role: query.role } : {}),
                      ...(query.sort ? { sort: query.sort } : {}),
                      ...(item.metric ? { metric: item.metric } : {}),
                    },
                  }}
                  aria-current={active ? "page" : undefined}
                  className={
                    "min-w-0 rounded px-3 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] " +
                    (active
                      ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:bg-[var(--color-surface)]/70")
                  }
                >
                  <span className="block truncate text-xs font-bold">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[10px]">{item.detail}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
        {locale === "ko" && isEntryAdjusted ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            다이아 +48 · 메테오 +54.5 · 미스릴 +60 RP를 복원해 조합 유형과 캐릭터 내부 역할군을
            별도로 다시 계산했습니다.
          </p>
        ) : null}
        {isSampleConfidence ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            {SAMPLE_COPY[locale].description}
          </p>
        ) : null}
        {isCombinedConfidence ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            티어별 입장료를 복원한 상승폭에 √판수 신뢰 가중을 적용해 전역 역할군과 조합 순위를 함께
            다시 계산했습니다.
          </p>
        ) : null}
      </header>

      {view === "compositions" ? (
        <>
          <section className="dashboard-panel flex flex-col gap-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                {copy.selectComposition}
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                {copy.exploreGuide}
              </p>
            </div>
            <form
              action={`/${locale}/composition-lab`}
              method="get"
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              {metricMode ? <input type="hidden" name="metric" value={metricMode} /> : null}
              <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
                {copy.selectComposition}
                <select
                  name="composition"
                  defaultValue={selectedComposition.roleComposition}
                  className="h-11 min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  {compositionData.roleCompositions.map((item) => (
                    <option key={item.roleComposition} value={item.roleComposition}>
                      {item.roleComposition}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-11 whitespace-nowrap rounded-md bg-[var(--color-accent)] px-5 text-xs font-bold text-[var(--color-accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                {copy.apply}
              </button>
            </form>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              [copy.games, formatNumber(selectedComposition.totalGames, locale)],
              [
                copy.reliableTypes,
                formatNumber(selectedComposition.reliableTypeCombinations, locale),
              ],
              [
                copy.conditionalSplits,
                formatNumber(
                  compositionData.globalSecondOrderTypeCatalog?.length ??
                    selectedComposition.conditionalSplitBaseTypes,
                  locale
                ),
              ],
            ].map(([label, value], index) => (
              <div
                key={label}
                className="metric-card p-4"
                data-accent={index === 1 ? "true" : undefined}
              >
                <p className="text-[11px] text-[var(--color-muted-foreground)]">{label}</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="dashboard-panel overflow-hidden">
            <header className="border-b border-[var(--color-border)] p-4 sm:p-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  {copy.topCombinations}
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {isSampleConfidence || isCombinedConfidence
                    ? SAMPLE_COPY[locale].rankedHint
                    : copy.rankedHint}
                </p>
              </div>
            </header>
            <ol className="divide-y divide-[var(--color-border)]">
              {rankedCombinations.slice(0, 3).map((combination, index) => (
                <RankedCombinationRow
                  key={combination.types.map(typeLabel).join("|") + ":" + index}
                  combination={combination}
                  index={index}
                  locale={locale}
                  copy={copy}
                  showSampleConfidence={isSampleConfidence || isCombinedConfidence}
                />
              ))}
            </ol>
            {rankedCombinations.length > 3 ? (
              <details className="group border-t border-[var(--color-border)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 bg-[var(--color-muted)]/20 px-4 py-2 text-xs font-bold text-[var(--color-accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span>{copy.showAllRanked}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <ol className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  {rankedCombinations.slice(3, 12).map((combination, localIndex) => (
                    <RankedCombinationRow
                      key={combination.types.map(typeLabel).join("|") + ":" + localIndex}
                      combination={combination}
                      index={localIndex + 3}
                      locale={locale}
                      copy={copy}
                      showSampleConfidence={isSampleConfidence || isCombinedConfidence}
                    />
                  ))}
                </ol>
              </details>
            ) : null}
          </section>

          <section className="dashboard-panel overflow-hidden">
            <header className="flex flex-col gap-4 border-b border-[var(--color-border)] p-4 sm:p-5">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  {copy.conditionalCatalog}
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {copy.roleFocusHint}
                </p>
              </div>
              <form
                action={"/" + locale + "/composition-lab"}
                method="get"
                className="grid gap-2 sm:grid-cols-[minmax(11rem,1fr)_auto] sm:items-end"
              >
                {metricMode ? <input type="hidden" name="metric" value={metricMode} /> : null}
                <input
                  type="hidden"
                  name="composition"
                  value={selectedComposition.roleComposition}
                />
                <input type="hidden" name="focus" value={selectedFocusRole} />
                <label className="flex flex-col gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
                  {copy.sortBy}
                  <select
                    name="sort"
                    defaultValue={sortMode}
                    className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                  >
                    <option value="fit">{copy.sortFit}</option>
                    <option value="games">{copy.sortGames}</option>
                    <option value="name">{copy.sortName}</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="h-11 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-xs font-bold text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <ArrowUpDown className="mr-1.5 inline h-3.5 w-3.5" />
                  {copy.apply}
                </button>
              </form>
            </header>

            <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 sm:px-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                {copy.roleFocus}
              </p>
              <nav className="flex flex-wrap gap-2" aria-label={copy.roleFocus}>
                {catalogByRole.map((group) => (
                  <Link
                    key={group.role}
                    href={{
                      pathname: "/composition-lab",
                      query: {
                        composition: selectedComposition.roleComposition,
                        focus: group.role,
                        sort: sortMode,
                        ...(metricMode ? { metric: metricMode } : {}),
                      },
                    }}
                    aria-current={group.role === selectedFocusRole ? "page" : undefined}
                    className={
                      "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] " +
                      (group.role === selectedFocusRole
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]")
                    }
                  >
                    {group.role}
                    <span className="font-mono text-[10px] font-normal">{group.items.length}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
              <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                {selectedFocusRole}
              </h3>
              <p className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                {selectedCatalogItems.length} {copy.typeCount}
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {selectedCatalogItems.map((item) => (
                <ConditionalTypeRow
                  key={item.role + ":" + item.baseFitRole + ":" + item.fitRole}
                  item={item}
                  locale={locale}
                  copy={copy}
                  showSampleConfidence={isSampleConfidence || isCombinedConfidence}
                  entryAdjustedFitByCharacter={entryAdjustedFitByCharacter}
                  recommendation={typeRecommendationByKey.get(typeLabel(item))}
                  validationByKey={validationByKey}
                />
              ))}
            </div>
            <p className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-[11px] leading-5 text-[var(--color-muted-foreground)] sm:px-5">
              {copy.fitGuide}
            </p>
          </section>
        </>
      ) : (
        <>
          <section className="dashboard-panel flex flex-col gap-4 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-foreground)]">
                {copy.consensusTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
                {copy.consensusBody}
              </p>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                {copy.consensusHint}
              </p>
              {compositionData.globalSecondOrderIterations ? (
                <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-[var(--color-foreground)]">
                  {locale === "ko"
                    ? compositionData.combinationGroupingBasis ===
                      "fixed-first-order-composition-contexts"
                      ? `1차 유형 고정 · 모든 역할 조합 동시 분석 · 핵심 동료 1차 유형별 ${compositionData.displayedSimilarityMinGames ?? 100}판 이상 · 보정 상승폭 +${(compositionData.compositionAffinityMinLift ?? 0.5).toFixed(1)} RP 이상 · 나머지 동료 유형 세부 검증 · 캐릭터 중복 소속 허용`
                      : `전역 역할군 재계산 ${compositionData.globalSecondOrderIterations}회 · ${compositionData.globalSecondOrderConverged ? "소속 수렴 완료" : compositionData.globalSecondOrderCycleDetected ? "역할군 순환 감지" : "반복 상한 도달"}`
                    : compositionData.combinationGroupingBasis ===
                        "fixed-first-order-composition-contexts"
                      ? `Fixed first-order types · all role compositions · core partner affinities with at least ${compositionData.displayedSimilarityMinGames ?? 100} games · detailed companion evidence · multi-membership allowed`
                      : `Global role recalculation ×${compositionData.globalSecondOrderIterations}`}
                </p>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [copy.baseGroups, consensusGroups.length],
                [copy.splitGroups, consensusGroups.filter((group) => group.split).length],
                [copy.finalTypes, selectedCompositionGroupCount],
                [copy.profiles, selectedCompositionProfileCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-[var(--color-border)] p-3">
                  <dt className="text-[10px] text-[var(--color-muted-foreground)]">{label}</dt>
                  <dd className="mt-1 font-mono text-xl font-bold tabular-nums text-[var(--color-foreground)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <form
              action={`/${locale}/composition-lab`}
              method="get"
              className="grid gap-2 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_auto] sm:items-end"
            >
              <input type="hidden" name="view" value="characters" />
              {metricMode ? <input type="hidden" name="metric" value={metricMode} /> : null}
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
                {copy.selectComposition}
                <select
                  name="composition"
                  defaultValue={selectedComposition.roleComposition}
                  className="h-11 min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  {compositionData.roleCompositions.map((composition) => (
                    <option key={composition.roleComposition} value={composition.roleComposition}>
                      {composition.roleComposition}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
                {copy.selectRole}
                <select
                  name="role"
                  defaultValue={selectedRole}
                  className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  {[...new Set(selectedCompositionRoles)].map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-11 whitespace-nowrap rounded-md bg-[var(--color-accent)] px-4 text-xs font-bold text-[var(--color-accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                {copy.apply}
              </button>
            </form>
          </section>

          <section className="dashboard-panel overflow-hidden">
            <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent-foreground)]">
                    {AFFINITY_COPY[locale].combinedBasis}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
                    {AFFINITY_COPY[locale].title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                    {AFFINITY_COPY[locale].body}
                  </p>
                </div>
                {affinityRoleSummary ? (
                  <div>
                    <dl className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="rounded border border-[var(--color-border)] px-3 py-2">
                        <dt className="text-[var(--color-muted-foreground)]">
                          {AFFINITY_COPY[locale].threshold}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-foreground)]">
                          {formatRate(affinityRoleSummary.threshold)}
                        </dd>
                      </div>
                      <div className="rounded border border-[var(--color-border)] px-3 py-2">
                        <dt className="text-[var(--color-muted-foreground)]">
                          {AFFINITY_COPY[locale].minimumContexts}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-foreground)]">
                          {affinityRoleSummary.minimumSharedContexts}
                        </dd>
                      </div>
                      <div className="rounded border border-[var(--color-border)] px-3 py-2">
                        <dt className="text-[var(--color-muted-foreground)]">
                          {AFFINITY_COPY[locale].coreGroups}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-bold text-[var(--color-foreground)]">
                          {affinityRoleSummary.coreGroups}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-right font-mono text-[10px] text-[var(--color-muted-foreground)]">
                      {AFFINITY_COPY[locale].repeatedValidation} {affinityRoleSummary.iterations}회
                      · {AFFINITY_COPY[locale].isolated} {affinityRoleSummary.isolatedProfiles} ·{" "}
                      {AFFINITY_COPY[locale].relocated} {affinityRoleSummary.relocatedProfiles} ·{" "}
                      {affinityRoleSummary.converged
                        ? AFFINITY_COPY[locale].converged
                        : "검토 필요"}
                    </p>
                  </div>
                ) : null}
              </div>

              <nav
                aria-label={copy.selectRole}
                className="mt-4 flex gap-2 overflow-x-auto border-t border-[var(--color-border)] pt-4"
              >
                {ROLE_ORDER.map((role) => (
                  <Link
                    key={role}
                    href={{
                      pathname: `/${locale}/composition-lab`,
                      query: {
                        view: "characters",
                        metric: "combined",
                        composition: selectedComposition.roleComposition,
                        role,
                      },
                    }}
                    aria-current={role === selectedAffinityRole ? "page" : undefined}
                    className={
                      "flex min-h-10 shrink-0 items-center rounded-md border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] " +
                      (role === selectedAffinityRole
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                        : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]")
                    }
                  >
                    {role}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  {selectedAffinityRole} · {AFFINITY_COPY[locale].coreGroups}
                </h3>
                <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                  {coreAffinityGroups.length}
                </span>
              </div>
              {coreAffinityGroups.length > 0 ? (
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  {coreAffinityGroups.map((group) => (
                    <AffinityGroupCard key={group.id} group={group} locale={locale} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-[var(--color-border)] p-4 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {AFFINITY_COPY[locale].noCoreGroups}
                </p>
              )}

              {independentAffinityGroups.length > 0 ? (
                <details className="group/independent mt-5 border-t border-[var(--color-border)] pt-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 text-xs font-bold text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
                    <span>
                      {AFFINITY_COPY[locale].openIndependent} · {independentAffinityGroups.length}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open/independent:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {independentAffinityGroups.map((group) => (
                      <AffinityGroupCard key={group.id} group={group} locale={locale} />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </section>

          <details className="dashboard-panel group overflow-hidden" open>
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] sm:p-5 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  {copy.characterIndexTitle}
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {copy.characterIndexBody}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs font-bold text-[var(--color-accent-foreground)]">
                {characterRoleRows.length} {copy.profileCount}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </span>
            </summary>
            <div className="border-t border-[var(--color-border)]">
              <div className="hidden grid-cols-[minmax(10rem,0.75fr)_minmax(7rem,0.45fr)_minmax(12rem,0.85fr)_minmax(20rem,2fr)] gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] lg:grid">
                <span>{copy.characterProfile}</span>
                <span>{copy.selectRole}</span>
                <span>{copy.firstOrderGroup}</span>
                <span>{copy.compositionGroupKeys}</span>
              </div>
              <ol className="divide-y divide-[var(--color-border)]">
                {characterRoleRows.map((row) => (
                  <li
                    key={`${row.characterCode}:${row.weapon}:${row.role}:${row.fitRole}`}
                    className="grid gap-3 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(10rem,0.75fr)_minmax(7rem,0.45fr)_minmax(12rem,0.85fr)_minmax(20rem,2fr)] lg:items-start"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-foreground)]">
                        {row.characterName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                        {row.weaponName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] lg:hidden">
                        {copy.selectRole}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--color-foreground)] lg:mt-0">
                        {row.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] lg:hidden">
                        {copy.firstOrderGroup}
                      </p>
                      <p className="mt-0.5 text-xs font-bold leading-5 text-[var(--color-accent-foreground)] lg:mt-0">
                        {row.fitRole}
                      </p>
                      <details className="group/members mt-1">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[10px] text-[var(--color-muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
                          {copy.groupMembers} {row.groupMembers.length}
                          <ChevronDown className="h-3 w-3 transition-transform group-open/members:rotate-180 motion-reduce:transition-none" />
                        </summary>
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {row.groupMembers.map((member) => {
                            const isCurrent =
                              member.characterCode === row.characterCode &&
                              member.weapon === row.weapon;
                            return (
                              <li
                                key={`${member.characterCode}:${member.weapon}`}
                                className={
                                  "rounded border px-1.5 py-0.5 text-[9px] " +
                                  (isCurrent
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] font-bold text-[var(--color-accent-foreground)]"
                                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)]")
                                }
                              >
                                {member.characterName} {member.weaponName}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                      {row.primaryAffinityGroup ? (
                        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                          <p className="text-[9px] font-bold text-[var(--color-muted-foreground)]">
                            {AFFINITY_COPY[locale].primaryAffinity}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[var(--color-foreground)]">
                            {row.primaryAffinityGroup.label}
                          </p>
                          {row.auxiliaryAffinityGroups.length > 0 ? (
                            <p className="mt-1 text-[9px] leading-4 text-[var(--color-muted-foreground)]">
                              {AFFINITY_COPY[locale].auxiliaryAffinity}:{" "}
                              {row.auxiliaryAffinityGroups.map((group) => group.label).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] lg:hidden">
                        {copy.compositionGroupKeys}
                      </p>
                      {row.compositionGroupCount > 0 ? (
                        <details className="group/keys mt-1 overflow-hidden rounded-md border border-[var(--color-border)] lg:mt-0">
                          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 bg-[var(--color-muted)]/15 px-3 py-2 text-[11px] font-bold text-[var(--color-accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
                            <span>
                              {row.compositionGroupCount} {copy.compositionGroupCount} ·{" "}
                              {row.compositionGroups.length} 역할 조합
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/keys:rotate-180 motion-reduce:transition-none" />
                          </summary>
                          <div className="max-h-[34rem] space-y-4 overflow-y-auto border-t border-[var(--color-border)] p-3">
                            {row.compositionGroups.map((compositionGroup) => (
                              <section key={compositionGroup.roleComposition}>
                                <h4 className="sticky top-0 bg-[var(--color-background)] py-1 text-[10px] font-bold text-[var(--color-foreground)]">
                                  {compositionGroup.roleComposition}
                                </h4>
                                <ul className="mt-1.5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                                  {compositionGroup.memberships.map((membership) => (
                                    <li
                                      key={membership.key}
                                      className="grid gap-1 py-2 text-[10px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                                    >
                                      <span className="font-semibold leading-4 text-[var(--color-foreground)]">
                                        {membership.key}
                                      </span>
                                      <span className="font-mono tabular-nums text-[var(--color-muted-foreground)] sm:text-right">
                                        <strong className="text-[var(--color-accent-foreground)]">
                                          {formatSignedRp(membership.adjustedResidual)}
                                        </strong>{" "}
                                        · {formatNumber(membership.games, locale)} ·{" "}
                                        {copy.sameGroupProfiles}{" "}
                                        {compositionGroupMembers.get(membership.key)?.size ?? 1}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)] lg:mt-0">
                          {copy.noCompositionGroups}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </details>

          {compositionData.combinationGroupingBasis !== "fixed-first-order-composition-contexts" ? (
            <BoundaryProfilesPanel
              profiles={ambiguousProfiles}
              role={selectedRole}
              locale={locale}
              alternativeThreshold={compositionData.globalSecondOrderAmbiguousAverage ?? 0.64}
              assignmentMargin={compositionData.globalSecondOrderAmbiguousMargin ?? 0.05}
            />
          ) : null}

          <section className="dashboard-panel overflow-hidden">
            <header className="border-b border-[var(--color-border)] p-4 sm:p-5">
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                {copy.groupOverview}
              </h2>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  {selectedComposition.roleComposition} · {selectedRole}
                </h3>
                <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                  {consensusGroups.length} {copy.baseGroups}
                </span>
              </div>
            </header>
            <div className="divide-y divide-[var(--color-border)]">
              {consensusGroups.map((group) => (
                <details
                  key={group.role + ":" + group.baseFitRole}
                  className="group"
                  open={group.split}
                >
                  <summary className="grid min-h-16 cursor-pointer list-none gap-3 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                          {group.baseFitRole}
                        </h3>
                        <span
                          className={
                            "shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold " +
                            (group.split
                              ? "border-[var(--color-warning)] bg-[var(--color-muted)]/20 text-[var(--color-warning)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)]")
                          }
                        >
                          {compositionData.combinationGroupingBasis ===
                          "fixed-first-order-composition-contexts"
                            ? group.reliablePairCount > 0
                              ? "조합 성향 있음"
                              : "상승 성향 없음"
                            : group.split
                              ? copy.split
                              : copy.unchanged}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                        {compositionData.combinationGroupingBasis ===
                        "fixed-first-order-composition-contexts" ? (
                          <>
                            상승 조합 그룹 {group.reliablePairCount} · 소속 캐릭터{" "}
                            {group.types.reduce((sum, type) => sum + type.characters.length, 0)}
                          </>
                        ) : (
                          <>
                            {copy.finalTypes} {group.types.length} · {copy.evidence}{" "}
                            {group.reliablePairCount} · {copy.differentPairs}{" "}
                            {group.conflictPairCount}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                        {copy.checkedCompositions} {group.relevantCompositions}/
                        {consensusData.roleCompositionCount}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                    </div>
                  </summary>
                  <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-muted)]/10">
                    {group.types.map((type) => (
                      <section
                        key={type.id}
                        className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(16rem,1.15fr)]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-[var(--color-foreground)]">
                                {type.label}
                              </h4>
                              {type.roleIsolated ? (
                                <p className="mt-1 text-[10px] font-bold text-[var(--color-warning)]">
                                  전투 기능 격리
                                </p>
                              ) : null}
                            </div>
                            <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                              {confidenceLabel(type.confidence, copy)}
                            </span>
                          </div>
                          {type.roleIsolationReason ? (
                            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted-foreground)]">
                              {type.roleIsolationReason}
                            </p>
                          ) : null}
                          <dl className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <dt className="text-[var(--color-muted-foreground)]">
                                {type.classificationBasis ===
                                "first-order-composition-affinity-profile"
                                  ? "상승 조합 그룹"
                                  : type.classificationBasis === "full-composition-trend-profile"
                                    ? "세부 조합 유사도"
                                    : copy.cohesion}
                              </dt>
                              <dd className="mt-0.5 font-mono text-sm font-bold">
                                {type.classificationBasis ===
                                "first-order-composition-affinity-profile"
                                  ? (type.trendSharedPairs ?? 0)
                                  : formatRate(type.cohesion)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[var(--color-muted-foreground)]">
                                {type.classificationBasis ===
                                "first-order-composition-affinity-profile"
                                  ? "소속 캐릭터"
                                  : type.classificationBasis === "full-composition-trend-profile"
                                    ? "비교한 캐릭터 쌍"
                                    : copy.separation}
                              </dt>
                              <dd className="mt-0.5 font-mono text-sm font-bold">
                                {type.classificationBasis ===
                                "first-order-composition-affinity-profile"
                                  ? type.characters.length
                                  : type.classificationBasis === "full-composition-trend-profile"
                                    ? (type.trendSharedPairs ?? 0)
                                    : formatRate(type.separation)}
                              </dd>
                            </div>
                          </dl>
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {type.characters.map((character) => (
                              <li
                                key={character.characterCode + ":" + character.weapon}
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[11px] font-semibold text-[var(--color-foreground)]"
                              >
                                {character.characterName}{" "}
                                <span className="font-normal text-[var(--color-muted-foreground)]">
                                  {character.weaponName}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-t border-[var(--color-border)] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                            {copy.recurringContexts}
                          </p>
                          {(() => {
                            const catalogType = globalCatalogByKey.get(
                              typeLabel({ role: group.role, fitRole: type.label })
                            );
                            return (
                              <div className="mt-2">
                                {(catalogType?.affinityGroups?.length ?? 0) > 0 ? (
                                  <PartnerAffinityExplorer
                                    groups={filterSelectedAffinityGroups(
                                      catalogType?.affinityGroups
                                    )}
                                    locale={locale}
                                    minGames={catalogType?.trendContextMinGames ?? 100}
                                    labels={{
                                      title: TREND_COPY[locale].contexts,
                                      positive: TREND_COPY[locale].positive,
                                      minGames: TREND_COPY[locale].minGames,
                                    }}
                                  />
                                ) : (
                                  <FullTrendExplorer
                                    contexts={filterSelectedCompositionContexts(
                                      catalogType?.trendContexts
                                    )}
                                    locale={locale}
                                    minGames={catalogType?.trendContextMinGames ?? 100}
                                    labels={{
                                      title: TREND_COPY[locale].contexts,
                                      positive: TREND_COPY[locale].positive,
                                      minGames: TREND_COPY[locale].minGames,
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </section>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
