/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 · macrostructure: Index-First · tone: technical · anchor hue: 245° */
import { ArrowRight, Layers, Layers3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { LabCharacter, LabData } from "@/components/features/lab/types";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { findCrossGroupStatisticalPairs } from "@/lib/labStatisticalSimilarity";
import { BASE_URL } from "@/lib/siteMetadata";
import assassinsData from "../../../../../public/data/lab/assassins.json";
import adjustedAssassinsData from "../../../../../public/data/lab/entry-adjusted/assassins.json";
import adjustedRangersData from "../../../../../public/data/lab/entry-adjusted/rangers.json";
import adjustedSkilldealersData from "../../../../../public/data/lab/entry-adjusted/skilldealers.json";
import adjustedSupportsData from "../../../../../public/data/lab/entry-adjusted/supports.json";
import adjustedTanksData from "../../../../../public/data/lab/entry-adjusted/tanks.json";
import adjustedWarriorsData from "../../../../../public/data/lab/entry-adjusted/warriors.json";
import rangersData from "../../../../../public/data/lab/rangers.json";
import sampleAssassinsData from "../../../../../public/data/lab/sample-confidence/assassins.json";
import sampleRangersData from "../../../../../public/data/lab/sample-confidence/rangers.json";
import sampleSkilldealersData from "../../../../../public/data/lab/sample-confidence/skilldealers.json";
import sampleSupportsData from "../../../../../public/data/lab/sample-confidence/supports.json";
import sampleTanksData from "../../../../../public/data/lab/sample-confidence/tanks.json";
import sampleWarriorsData from "../../../../../public/data/lab/sample-confidence/warriors.json";
import skilldealersData from "../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../public/data/lab/warriors.json";
import { LegacyCharacterLabPage } from "./LegacyCharacterLabPage";

export const dynamic = "force-dynamic";

const PUBLIC_CHARACTER_LAB_VERSION: string = "legacy";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metric?: string }>;
}

type MetricMode = "observed" | "entry" | "sample";

const ROLES = [
  {
    slug: "rangers",
    observed: rangersData as LabData,
    entry: adjustedRangersData as LabData,
    sample: sampleRangersData as LabData,
  },
  {
    slug: "skilldealers",
    observed: skilldealersData as LabData,
    entry: adjustedSkilldealersData as LabData,
    sample: sampleSkilldealersData as LabData,
  },
  {
    slug: "tanks",
    observed: tanksData as LabData,
    entry: adjustedTanksData as LabData,
    sample: sampleTanksData as LabData,
  },
  {
    slug: "warriors",
    observed: warriorsData as LabData,
    entry: adjustedWarriorsData as LabData,
    sample: sampleWarriorsData as LabData,
  },
  {
    slug: "assassins",
    observed: assassinsData as LabData,
    entry: adjustedAssassinsData as LabData,
    sample: sampleAssassinsData as LabData,
  },
  {
    slug: "supports",
    observed: supportsData as LabData,
    entry: adjustedSupportsData as LabData,
    sample: sampleSupportsData as LabData,
  },
] as const;

type SupportedRole = (typeof ROLES)[number]["slug"];

function getMetricMode(metric?: string): MetricMode {
  if (metric === "entry" || metric === "sample") return metric;
  return "observed";
}

function metricHref(metric: MetricMode): string {
  return metric === "observed" ? "/character-lab" : `/character-lab?metric=${metric}`;
}

function roleHref(role: SupportedRole, metric: MetricMode): string {
  const base = `/character-lab/${role}`;
  return metric === "observed" ? base : `${base}?metric=${metric}`;
}

function internalRoleGroups(characters: LabCharacter[]) {
  const groups = new Map<string, { label: string; summary: string; characters: LabCharacter[] }>();

  for (const character of characters) {
    const label = character.classification?.metricRole ?? "세부 유형 미분류";
    const summary = character.classification?.metricSummary ?? "지표 요약 없음";
    const key = label;
    const existing = groups.get(key);
    if (existing) {
      existing.characters.push(character);
    } else {
      groups.set(key, { label, summary, characters: [character] });
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.characters.length - a.characters.length || a.label.localeCompare(b.label, "ko")
  );
}

const ROLE_LABELS: Record<RouteLocale, Record<string, string>> = {
  ko: {
    rangers: "원거리 딜러",
    skilldealers: "스킬딜러",
    tanks: "탱커",
    warriors: "전사",
    assassins: "암살자",
    supports: "지원가",
  },
  en: {
    rangers: "Ranged Carries",
    skilldealers: "Skill Damage",
    tanks: "Tanks",
    warriors: "Bruisers",
    assassins: "Assassins",
    supports: "Supports",
  },
  ja: {
    rangers: "遠距離キャリー",
    skilldealers: "スキルダメージ",
    tanks: "タンク",
    warriors: "ファイター",
    assassins: "アサシン",
    supports: "サポート",
  },
  "zh-Hans": {
    rangers: "远程输出",
    skilldealers: "技能输出",
    tanks: "坦克",
    warriors: "战士",
    assassins: "刺客",
    supports: "辅助",
  },
  "zh-Hant": {
    rangers: "遠程輸出",
    skilldealers: "技能輸出",
    tanks: "坦克",
    warriors: "戰士",
    assassins: "刺客",
    supports: "輔助",
  },
};

const COPY = {
  ko: {
    title: "캐릭터 유형 분석",
    metadataTitle: "캐릭터 유형 분석 - 시너지 그룹",
    description:
      "이터널리턴 캐릭터를 시즌 10·11에서 실제 RP가 높았던 파트너 역할 조합별로 묶어 보여줍니다.",
    kicker: "시즌 10·11 조합 적합도",
    subtitle:
      "캐릭터마다 RP 상승과 실제 판수 경향을 함께 반영해 잘 맞는 두 역할 조합을 찾았습니다.",
    body: "반복해서 많이 성립한 조합에 가중치를 두고, 특성 역할군 중 지표가 실제로 어긋나는 후보만 선별해 다시 나눕니다.",
    analyzedCharacters: "분석 캐릭터",
    roles: "직업군",
    totalGroups: "총 시너지 그룹",
    sectionTitle: "잘 맞는 조합별 분류",
    sectionMeta: "시즌 10·11 통합",
    groupType: "연계 그룹",
    characterCount: (count: number) => `캐릭터 ${count}종`,
    groupCount: (count: number) => `시너지 그룹 ${count}개`,
    curated: (count: number) => `큐레이팅 ${count}`,
    minSample: "최소 표본",
    gamesPlus: (count: number) => `${count}판+`,
    compositionLinkTitle: "캐릭터 조합 분석",
    compositionLinkBody: "역할 조합을 고정하고 내부 역할군과 추천 캐릭터를 다시 비교합니다.",
  },
  en: {
    title: "Role Groups",
    metadataTitle: "Role Groups - character synergy clusters",
    description:
      "Characters grouped by the partner-role combinations with the strongest Season 10–11 RP lift.",
    kicker: "Season 10–11 composition fit",
    subtitle:
      "Each character is grouped by the two partner roles favored by both RP lift and observed game volume.",
    body: "Frequently repeated compositions receive more weight; only combat-function groups with clear metric disagreement are split again.",
    analyzedCharacters: "Characters",
    roles: "Roles",
    totalGroups: "Synergy groups",
    sectionTitle: "Best-Fit Compositions",
    sectionMeta: "Combined Seasons 10 and 11",
    groupType: "Fit group",
    characterCount: (count: number) => `${count} characters`,
    groupCount: (count: number) => `${count} groups`,
    curated: (count: number) => `${count} curated`,
    minSample: "Minimum sample",
    gamesPlus: (count: number) => `${count}+ games`,
    compositionLinkTitle: "Character composition analysis",
    compositionLinkBody:
      "Fix a role composition, then compare its internal types and character picks.",
  },
  ja: {
    title: "ロールグループ",
    metadataTitle: "ロールグループ - キャラクター相性クラスタ",
    description: "シーズン10・11でRP上昇が安定した味方ロール構成別のキャラクター分類です。",
    kicker: "シーズン10・11の構成適性",
    subtitle: "各キャラクターと相性の良い2つの味方ロールをサンプル補正指標で分類します。",
    body: "相性の良い構成を優先し、進入・ポーク・保護などの特性は補助情報として表示します。",
    analyzedCharacters: "分析キャラクター",
    roles: "ロール",
    totalGroups: "相性グループ",
    sectionTitle: "相性の良い構成別分類",
    sectionMeta: "シーズン10・11統合",
    groupType: "構成グループ",
    characterCount: (count: number) => `${count}体`,
    groupCount: (count: number) => `${count}グループ`,
    curated: (count: number) => `整理済み ${count}`,
    minSample: "最小サンプル",
    gamesPlus: (count: number) => `${count}試合+`,
    compositionLinkTitle: "キャラクター構成分析",
    compositionLinkBody: "ロール構成を固定し、内部タイプとキャラクター候補を比較します。",
  },
  "zh-Hans": {
    title: "角色分组",
    metadataTitle: "角色分组 - 角色协同聚类",
    description: "按第10、11赛季中RP提升最稳定的队友定位组合进行角色分组。",
    kicker: "第10、11赛季阵容适配",
    subtitle: "依据样本校正指标，为每个角色找出最合适的两个队友定位。",
    body: "优先展示适配阵容，进场、消耗和保护等特性作为辅助信息。",
    analyzedCharacters: "分析角色",
    roles: "定位",
    totalGroups: "协同分组",
    sectionTitle: "适配阵容分组",
    sectionMeta: "第10、11赛季合并",
    groupType: "阵容分组",
    characterCount: (count: number) => `${count} 名角色`,
    groupCount: (count: number) => `${count} 个分组`,
    curated: (count: number) => `已整理 ${count}`,
    minSample: "最小样本",
    gamesPlus: (count: number) => `${count} 场+`,
    compositionLinkTitle: "角色阵容分析",
    compositionLinkBody: "固定定位阵容后，比较内部类型与推荐角色。",
  },
  "zh-Hant": {
    title: "角色分組",
    metadataTitle: "角色分組 - 角色協同聚類",
    description: "按第10、11賽季中RP提升最穩定的隊友定位組合進行角色分組。",
    kicker: "第10、11賽季陣容適配",
    subtitle: "依據樣本校正指標，為每個角色找出最合適的兩個隊友定位。",
    body: "優先展示適配陣容，進場、消耗和保護等特性作為輔助資訊。",
    analyzedCharacters: "分析角色",
    roles: "定位",
    totalGroups: "協同分組",
    sectionTitle: "適配陣容分組",
    sectionMeta: "第10、11賽季合併",
    groupType: "陣容分組",
    characterCount: (count: number) => `${count} 名角色`,
    groupCount: (count: number) => `${count} 個分組`,
    curated: (count: number) => `已整理 ${count}`,
    minSample: "最小樣本",
    gamesPlus: (count: number) => `${count} 場+`,
    compositionLinkTitle: "角色陣容分析",
    compositionLinkBody: "固定定位陣容後，比較內部類型與推薦角色。",
  },
} as const;

const INDEX_COPY: Record<
  RouteLocale,
  {
    metricTitle: string;
    metricDescription: Record<MetricMode, string>;
    metricTabs: Record<MetricMode, { label: string; detail: string }>;
    allTypesTitle: string;
    allTypesBody: string;
    outerGroups: string;
    internalTypes: string;
    profiles: string;
    characters: string;
    viewDetail: string;
    representativeFit: string;
    crossGroupTitle: string;
    crossGroupBody: string;
    similarPairs: string;
    sharedCompositions: string;
    signAgreement: string;
    liftGap: string;
    shareGap: string;
  }
> = {
  ko: {
    metricTitle: "분석 기준",
    metricDescription: {
      observed: "실제 RP 상승폭으로 역할군과 내부 유형을 나눈 기본 분류입니다.",
      entry: "티어별 입장료 차이를 반영한 RP로 역할군과 내부 유형을 다시 계산했습니다.",
      sample: "RP 상승폭에 판수 신뢰도를 함께 반영해 반복해서 확인된 조합을 우선했습니다.",
    },
    metricTabs: {
      observed: { label: "1. 관측 RP", detail: "기존 분류" },
      entry: { label: "2. 입장료 보정", detail: "티어 차이 반영" },
      sample: { label: "3. 판수 신뢰", detail: "상승폭 × √판수" },
    },
    allTypesTitle: "모든 캐릭터 유형",
    allTypesBody: "6개 역할의 조합 적합군, 내부 역할군, 소속 캐릭터를 한 화면에 모두 표시합니다.",
    outerGroups: "조합 적합군",
    internalTypes: "내부 유형",
    profiles: "프로필",
    characters: "소속 캐릭터",
    viewDetail: "상세 분석",
    representativeFit: "대표 연계",
    crossGroupTitle: "교차 그룹 통계 유사도",
    crossGroupBody:
      "전투 기능과 관계없이 다른 1차 그룹 중 공통 4조합 이상, 방향 일치 55% 이상, 상승폭·비중 차이 60% 이하인 모든 쌍을 표시합니다.",
    similarPairs: "유사 쌍",
    sharedCompositions: "공통 조합",
    signAgreement: "방향 일치",
    liftGap: "상승폭 차이",
    shareGap: "비중 차이",
  },
  en: {
    metricTitle: "Analysis metric",
    metricDescription: {
      observed: "Base grouping by observed RP lift.",
      entry: "Role and internal groups recalculated after tier entry-cost adjustment.",
      sample: "Repeated compositions rank higher after weighting RP lift by game volume.",
    },
    metricTabs: {
      observed: { label: "1. Observed RP", detail: "Base groups" },
      entry: { label: "2. Entry adjusted", detail: "Tier costs" },
      sample: { label: "3. Sample confidence", detail: "Lift × √games" },
    },
    allTypesTitle: "All character types",
    allTypesBody: "See composition-fit groups, internal types, and every member across six roles.",
    outerGroups: "Fit groups",
    internalTypes: "Internal types",
    profiles: "Profiles",
    characters: "Characters",
    viewDetail: "View details",
    representativeFit: "Primary partners",
    crossGroupTitle: "Cross-group similarity",
    crossGroupBody:
      "Shows every pair across different fit groups with 4+ shared comps, 55%+ direction match, and lift/share gaps up to 60%, regardless of combat function.",
    similarPairs: "similar pairs",
    sharedCompositions: "Shared comps",
    signAgreement: "Direction match",
    liftGap: "Lift gap",
    shareGap: "Share gap",
  },
  ja: {
    metricTitle: "分析基準",
    metricDescription: {
      observed: "実測RP上昇値による基本分類です。",
      entry: "ティア別入場料を反映してロールと内部タイプを再計算しました。",
      sample: "RP上昇と試合数を合わせ、繰り返し確認された構成を優先します。",
    },
    metricTabs: {
      observed: { label: "1. 実測RP", detail: "基本分類" },
      entry: { label: "2. 入場料補正", detail: "ティア差反映" },
      sample: { label: "3. サンプル信頼", detail: "上昇 × √試合数" },
    },
    allTypesTitle: "全キャラクタータイプ",
    allTypesBody: "6ロールの構成適性グループ、内部タイプ、所属キャラクターを一画面に表示します。",
    outerGroups: "構成適性グループ",
    internalTypes: "内部タイプ",
    profiles: "プロフィール",
    characters: "所属キャラクター",
    viewDetail: "詳細分析",
    representativeFit: "主な連携",
    crossGroupTitle: "グループ横断統計類似度",
    crossGroupBody:
      "戦闘機能を問わず、別グループのうち共通4構成以上、方向一致55%以上、上昇幅・比率差60%以下の全ペアを表示します。",
    similarPairs: "類似ペア",
    sharedCompositions: "共通構成",
    signAgreement: "方向一致",
    liftGap: "上昇幅差",
    shareGap: "比率差",
  },
  "zh-Hans": {
    metricTitle: "分析指标",
    metricDescription: {
      observed: "依据实际RP提升划分的基础分类。",
      entry: "计入段位入场费后重新计算定位与内部类型。",
      sample: "结合RP提升与场次可信度，优先展示反复出现的阵容。",
    },
    metricTabs: {
      observed: { label: "1. 实测RP", detail: "基础分类" },
      entry: { label: "2. 入场费校正", detail: "计入段位差" },
      sample: { label: "3. 样本可信度", detail: "提升 × √场次" },
    },
    allTypesTitle: "全部角色类型",
    allTypesBody: "在一个页面查看六种定位的阵容适配组、内部类型与全部成员。",
    outerGroups: "阵容适配组",
    internalTypes: "内部类型",
    profiles: "配置",
    characters: "所属角色",
    viewDetail: "详细分析",
    representativeFit: "主要搭配",
    crossGroupTitle: "跨组统计相似度",
    crossGroupBody:
      "不考虑战斗功能，显示不同适配组中共同阵容不少于4个、方向一致不低于55%且提升与占比差距不超过60%的全部组合。",
    similarPairs: "相似组合",
    sharedCompositions: "共同阵容",
    signAgreement: "方向一致",
    liftGap: "提升差距",
    shareGap: "占比差距",
  },
  "zh-Hant": {
    metricTitle: "分析指標",
    metricDescription: {
      observed: "依據實際RP提升劃分的基礎分類。",
      entry: "計入段位入場費後重新計算定位與內部類型。",
      sample: "結合RP提升與場次可信度，優先顯示反覆出現的陣容。",
    },
    metricTabs: {
      observed: { label: "1. 實測RP", detail: "基礎分類" },
      entry: { label: "2. 入場費校正", detail: "計入段位差" },
      sample: { label: "3. 樣本可信度", detail: "提升 × √場次" },
    },
    allTypesTitle: "全部角色類型",
    allTypesBody: "在一個頁面查看六種定位的陣容適配組、內部類型與全部成員。",
    outerGroups: "陣容適配組",
    internalTypes: "內部類型",
    profiles: "配置",
    characters: "所屬角色",
    viewDetail: "詳細分析",
    representativeFit: "主要搭配",
    crossGroupTitle: "跨組統計相似度",
    crossGroupBody:
      "不考慮戰鬥功能，顯示不同適配組中共同陣容4個以上、方向一致55%以上且提升與占比差距不超過60%的全部組合。",
    similarPairs: "相似組合",
    sharedCompositions: "共同陣容",
    signAgreement: "方向一致",
    liftGap: "提升差距",
    shareGap: "占比差距",
  },
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const copy = COPY[locale];
  const title = copy.metadataTitle;
  const description = copy.description;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/character-lab" },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CharacterLabPage({ params, searchParams }: LocalePageProps) {
  if (PUBLIC_CHARACTER_LAB_VERSION === "legacy") {
    return <LegacyCharacterLabPage params={params} />;
  }

  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  const copy = COPY[locale];
  const indexCopy = INDEX_COPY[locale];
  const roleLabels = ROLE_LABELS[locale];
  const metricMode = getMetricMode(query.metric);
  const activeRoles = ROLES.map((role) => ({
    slug: role.slug,
    data: role[metricMode],
    statisticalPairs: findCrossGroupStatisticalPairs(role[metricMode]),
  }));

  const totalCharacters = activeRoles.reduce((sum, role) => sum + role.data.characters.length, 0);
  const totalGroups = activeRoles.reduce((sum, role) => sum + role.data.groupK, 0);
  const totalInternalGroups = activeRoles.reduce(
    (sum, role) =>
      sum + (role.data.internalGroupK ?? internalRoleGroups(role.data.characters).length),
    0
  );

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-panel flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">{copy.kicker}</span>
        </div>
        <h1 className="dashboard-section-title text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
          {copy.title}
        </h1>
        <p className="max-w-[46rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
          {copy.subtitle}
        </p>
        <p className="max-w-[46rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
          {copy.body}
        </p>
        <dl className="mt-2 flex flex-wrap gap-4 text-xs">
          <div className="flex items-baseline gap-2 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-1">
            <dt className="text-[var(--color-muted-foreground)]">{copy.analyzedCharacters}</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-accent-foreground)]">
              {totalCharacters}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">{copy.roles}</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {ROLES.length}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">{copy.totalGroups}</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {totalGroups}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">{indexCopy.internalTypes}</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {totalInternalGroups}
            </dd>
          </div>
        </dl>
      </header>

      <nav className="grid gap-2 sm:grid-cols-2" aria-label="Character analysis pages">
        <Link
          href={metricHref(metricMode)}
          aria-current="page"
          className="char-card flex items-center gap-3 border-[var(--color-accent)] p-4"
          data-accent="true"
        >
          <span className="rounded-md bg-[var(--color-accent-muted)] p-2 text-[var(--color-accent-foreground)]">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold text-[var(--color-accent-foreground)]">1</p>
            <p className="text-sm font-bold text-[var(--color-foreground)]">{copy.title}</p>
          </div>
        </Link>
        <Link
          href={
            metricMode === "observed" ? "/composition-lab" : `/composition-lab?metric=${metricMode}`
          }
          className="char-card group flex items-center justify-between gap-4 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-[var(--color-border)] p-2 text-[var(--color-muted-foreground)]">
              <Layers3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-muted-foreground)]">2</p>
              <p className="text-sm font-bold text-[var(--color-foreground)]">
                {copy.compositionLinkTitle}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {copy.compositionLinkBody}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-accent-foreground)]" />
        </Link>
      </nav>

      <section className="dashboard-panel flex flex-col gap-3 p-4" aria-labelledby="metric-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="metric-title"
              className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]"
            >
              {indexCopy.metricTitle}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {indexCopy.metricDescription[metricMode]}
            </p>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{copy.sectionMeta}</p>
        </div>

        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={indexCopy.metricTitle}>
          {(["observed", "entry", "sample"] as const).map((metric) => {
            const isActive = metricMode === metric;
            return (
              <Link
                key={metric}
                href={metricHref(metric)}
                aria-current={isActive ? "page" : undefined}
                className="char-card flex min-h-11 min-w-0 items-center justify-between gap-3 px-3 py-2.5"
                data-accent={isActive ? "true" : undefined}
              >
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-bold text-[var(--color-foreground)]">
                    {indexCopy.metricTabs[metric].label}
                  </span>
                  <span className="hidden text-xs text-[var(--color-muted-foreground)] lg:block">
                    {indexCopy.metricTabs[metric].detail}
                  </span>
                </span>
                <span
                  className="font-mono text-[11px] font-bold text-[var(--color-accent-foreground)]"
                  aria-hidden="true"
                >
                  {isActive ? "●" : "○"}
                </span>
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="all-types-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="all-types-title"
              className="dashboard-section-title text-base font-bold text-[var(--color-foreground)]"
            >
              {indexCopy.allTypesTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {indexCopy.allTypesBody}
            </p>
          </div>
          <p className="whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
            {totalCharacters} {indexCopy.profiles} · {totalInternalGroups} {indexCopy.internalTypes}
          </p>
        </div>

        <nav
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
          aria-label={copy.roles}
        >
          {activeRoles.map(({ slug, data }) => (
            <a
              key={slug}
              href={`#role-${slug}`}
              className="char-card flex min-h-11 min-w-0 items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-[var(--color-foreground)]"
            >
              <span className="truncate whitespace-nowrap">{roleLabels[slug]}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                {data.internalGroupK ?? internalRoleGroups(data.characters).length}
              </span>
            </a>
          ))}
        </nav>
      </section>

      <div className="flex flex-col gap-5">
        {activeRoles.map(({ slug, data, statisticalPairs }) => (
          <section
            key={slug}
            id={`role-${slug}`}
            className="dashboard-panel scroll-mt-40 overflow-hidden"
            aria-labelledby={`role-title-${slug}`}
          >
            <header className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2
                  id={`role-title-${slug}`}
                  className="text-lg font-bold tracking-tight text-[var(--color-foreground)]"
                >
                  {roleLabels[slug]}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {data.groupK} {indexCopy.outerGroups} · {data.internalGroupK ?? 0}{" "}
                  {indexCopy.internalTypes} · {data.characters.length} {indexCopy.profiles} ·{" "}
                  {statisticalPairs.length} {indexCopy.similarPairs}
                </p>
              </div>
              <Link
                href={roleHref(slug, metricMode)}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start whitespace-nowrap text-sm font-bold text-[var(--color-accent-foreground)] sm:self-auto"
              >
                {indexCopy.viewDetail}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </header>

            {statisticalPairs.length > 0 ? (
              <details className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <summary className="min-h-11 cursor-pointer px-4 py-3 text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]">
                  <span className="font-bold">{indexCopy.crossGroupTitle}</span>
                  <span className="ms-2 text-xs tabular-nums text-[var(--color-accent-foreground)]">
                    {statisticalPairs.length} {indexCopy.similarPairs}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-muted-foreground)]">
                    {indexCopy.crossGroupBody}
                  </span>
                </summary>

                <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                  {statisticalPairs.map((pair) => {
                    const leftGroup = data.groups.find((group) => group.id === pair.left.groupId);
                    const rightGroup = data.groups.find((group) => group.id === pair.right.groupId);

                    return (
                      <li
                        key={`${pair.left.characterCode}-${pair.left.weapon ?? "none"}-${pair.right.characterCode}-${pair.right.weapon ?? "none"}`}
                        className="grid min-w-0 gap-3 px-4 py-3 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,1.25fr)] lg:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--color-accent-foreground)]">
                            {pair.fitRole}
                          </p>
                          <p className="mt-1 break-words text-sm leading-5 text-[var(--color-foreground)]">
                            <strong>{pair.left.characterName}</strong>{" "}
                            <span className="text-[var(--color-muted-foreground)]">
                              {pair.left.weaponName}
                            </span>{" "}
                            ↔ <strong>{pair.right.characterName}</strong>{" "}
                            <span className="text-[var(--color-muted-foreground)]">
                              {pair.right.weaponName}
                            </span>
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                            {leftGroup?.label ?? "—"} ↔ {rightGroup?.label ?? "—"}
                          </p>
                        </div>

                        <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                          <div>
                            <dt className="text-[var(--color-muted-foreground)]">
                              {indexCopy.sharedCompositions}
                            </dt>
                            <dd className="mt-0.5 font-bold tabular-nums text-[var(--color-foreground)]">
                              {pair.sharedCompositions}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--color-muted-foreground)]">
                              {indexCopy.signAgreement}
                            </dt>
                            <dd className="mt-0.5 font-bold tabular-nums text-[var(--color-foreground)]">
                              {Math.round(pair.signAgreement * 100)}%
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--color-muted-foreground)]">
                              {indexCopy.liftGap}
                            </dt>
                            <dd className="mt-0.5 font-bold tabular-nums text-[var(--color-foreground)]">
                              {Math.round(pair.liftGap * 100)}%
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--color-muted-foreground)]">
                              {indexCopy.shareGap}
                            </dt>
                            <dd className="mt-0.5 font-bold tabular-nums text-[var(--color-foreground)]">
                              {Math.round(pair.shareGap * 100)}%
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}

            <div className="divide-y divide-[var(--color-border)]">
              {data.groups.map((group) => {
                const groupCharacters = data.characters.filter(
                  (character) => character.groupId === group.id
                );
                const internalGroups = internalRoleGroups(groupCharacters);

                return (
                  <section
                    key={group.id}
                    className="grid min-w-0 gap-3 p-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6"
                  >
                    <header className="min-w-0">
                      <h3 className="break-words text-sm font-bold leading-5 text-[var(--color-foreground)]">
                        {group.label}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {internalGroups.length} {indexCopy.internalTypes} · {groupCharacters.length}{" "}
                        {indexCopy.profiles}
                      </p>
                      {group.topPartnerRoles && group.topPartnerRoles.length > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                          <span className="font-bold text-[var(--color-foreground)]">
                            {indexCopy.representativeFit}
                          </span>{" "}
                          · {group.topPartnerRoles.join(" + ")}
                        </p>
                      ) : null}
                    </header>

                    <ul className="min-w-0 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                      {internalGroups.map((internalGroup) => (
                        <li
                          key={internalGroup.label}
                          className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.5fr)] sm:gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <h4 className="text-sm font-bold leading-5 text-[var(--color-foreground)]">
                                {internalGroup.label}
                              </h4>
                              <span className="font-mono text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                                {internalGroup.characters.length}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                              {internalGroup.summary}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="sr-only">{indexCopy.characters}</p>
                            <ul className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5">
                              {internalGroup.characters
                                .slice()
                                .sort((a, b) =>
                                  a.characterName.localeCompare(b.characterName, "ko")
                                )
                                .map((character) => (
                                  <li
                                    key={`${character.characterCode}-${character.weapon ?? "none"}`}
                                    className="min-w-0 text-xs leading-5"
                                  >
                                    <span className="font-bold text-[var(--color-foreground)]">
                                      {character.characterName}
                                    </span>{" "}
                                    <span className="text-[var(--color-muted-foreground)]">
                                      {character.weaponName}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
