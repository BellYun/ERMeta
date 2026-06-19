import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Swords, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import {
  type CharacterRole,
  buildFallbackMap,
  getCharacterImageUrl,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import {
  getPatchAnalysisData,
  getPatchAnalysisVersions,
  type PatchCharacterDelta,
  type PatchCharacterMetric,
  type PatchRoleMetric,
} from "@/lib/patchAnalysis";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

export const dynamic = "force-static";

const ROLE_ORDER: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const AGGREGATE_ONLY_CHARACTERS = new Set([3, 13, 15, 29]);
const EVALUATED_CHARACTER_NUMS = [
  3, 5, 6, 8, 13, 15, 17, 18, 21, 29, 33, 35, 38, 45, 47, 51, 52, 55, 56, 59, 61, 63, 66, 69, 70,
  71, 72, 73, 74, 77, 83, 84, 87, 88,
];

interface PatchAnalysisPageProps {
  version?: string;
  locale?: RouteLocale;
}

const ROLE_LABELS: Record<RouteLocale, Record<string, string>> = {
  ko: {
    탱커: "탱커",
    전사: "전사",
    암살자: "암살자",
    스킬딜러: "스킬딜러",
    "원거리 딜러": "원거리 딜러",
    지원가: "지원가",
    "직업군 미분류": "직업군 미분류",
  },
  en: {
    탱커: "Tank",
    전사: "Bruiser",
    암살자: "Assassin",
    스킬딜러: "Skill DPS",
    "원거리 딜러": "Ranged DPS",
    지원가: "Support",
    "직업군 미분류": "Unclassified",
  },
  ja: {
    탱커: "タンク",
    전사: "ファイター",
    암살자: "アサシン",
    스킬딜러: "スキルアタッカー",
    "원거리 딜러": "遠距離アタッカー",
    지원가: "サポート",
    "직업군 미분류": "未分類",
  },
  "zh-Hans": {
    탱커: "坦克",
    전사: "战士",
    암살자: "刺客",
    스킬딜러: "技能输出",
    "원거리 딜러": "远程输出",
    지원가: "辅助",
    "직업군 미분류": "未分类",
  },
  "zh-Hant": {
    탱커: "坦克",
    전사: "戰士",
    암살자: "刺客",
    스킬딜러: "技能輸出",
    "원거리 딜러": "遠程輸出",
    지원가: "輔助",
    "직업군 미분류": "未分類",
  },
};

const PATCH_ANALYSIS_COPY = {
  ko: {
    kicker: "패치 메타 리포트",
    asOf: "기준",
    title: (patch: string) => `${patch} 패치 메타 분석`,
    intro:
      "다이아 이상 랭크 통계를 기준으로 최신 패치와 직전 패치의 평균 RP, 승률, 픽률, 순방률을 비교했습니다. 버프와 너프 대상의 지표 반응, 역할군별 랭크 상승 효율을 함께 정리합니다.",
    roleSummary: (best: string, worst: string) =>
      `현재 역할군 평균 RP는 ${best}이 가장 높고 ${worst}이 가장 낮습니다. 승률보다 평균 RP와 순방률을 함께 보는 편이 패치 흐름을 판단하기 쉽습니다.`,
    navAria: "패치 분석 버전 선택",
    navLabel: (patch: string) => `${patch} 분석`,
    metrics: {
      patch: "분석 패치",
      patchBody: (patch: string) => `${patch} 대비 변화`,
      sample: "현재 표본",
      sampleValue: (count: string) => `${count}판`,
      sampleBody: (count: string) => `이전 ${count}판`,
      buffs: "버프 추적",
      nerfs: "너프 추적",
      count: (count: number) => `${count}건`,
      buffBody: "패치노트 기준 버프 대상",
      nerfBody: "패치노트 기준 너프 대상",
    },
    role: {
      kicker: "역할군 지표",
      title: "역할군 평균 RP",
      body: (best: string, worst: string) =>
        `오늘 통계 기준으로는 ${best}의 평균 RP가 가장 높고, ${worst}의 평균 RP가 가장 낮습니다. 승률보다 평균 RP가 낮은 역할군은 순방/킬 보상 구조를 함께 확인해야 합니다.`,
      rankScope: "DIAMOND+ · IN1000 제외",
      columns: ["역할군", "평균 RP", "이전 대비", "승률", "순방률", "표본"],
    },
    rankingUp: "평균 RP 상승폭 주요 캐릭터",
    rankingDown: "평균 RP 하락폭 주요 캐릭터",
    patchHistory: "패치 내역",
    evaluation: "패치 평가",
    changeLabels: { buff: "버프", nerf: "너프", adjust: "조정" },
    card: {
      pending: (name: string) => `${name} 표본 확인 중`,
      summary: (count: string, winRate: string, rp: string) =>
        `${count}판 · 승률 ${winRate} · RP ${rp}`,
      aggregate: "통합",
      deltaWinRate: "승률",
      deltaPickRate: "픽률",
      deltaTop3Rate: "순방률",
    },
    sectionCount: (count: number) => `${count}건`,
    sections: {
      buffTitle: "버프 캐릭터 지표 반응",
      buffDescription:
        "버프 대상 캐릭터를 평균 RP 상승폭 기준으로 정렬했습니다. 기존 지표와 현재 지표를 함께 봐야 실제 패치 반응을 판단할 수 있습니다.",
      nerfTitle: "너프 캐릭터 지표 반응",
      nerfDescription:
        "너프 대상 캐릭터는 평균 RP 하락폭이 큰 순서로 정렬했습니다. 너프 후에도 표본과 승률이 유지되면 여전히 메타 픽으로 볼 수 있습니다.",
      mixedTitle: "혼합 조정 캐릭터",
      mixedDescription:
        "버프와 너프가 함께 들어간 캐릭터는 단일 방향보다 실제 지표 변화로 해석하는 편이 안전합니다.",
    },
    guideKicker: "해석 기준",
    guideTitle: "해석 기준",
    guideBody:
      "순방률이 낮으면 초중반 탈락 리스크가 높고, 순방률은 낮지만 승률이 높으면 마지막 금지 구역 교전 전환력이 좋은 픽으로 볼 수 있습니다. 평균 RP는 킬, 순방, 최종 순위가 함께 반영된 지표로 해석합니다.",
  },
  en: {
    kicker: "Patch Meta Report",
    asOf: "as of",
    title: (patch: string) => `Patch ${patch} Meta Analysis`,
    intro:
      "This report compares average RP, win rate, pick rate, and placement rate between the current and previous high-tier ranked patches. It summarizes buff and nerf reactions alongside role-level RP efficiency.",
    roleSummary: (best: string, worst: string) =>
      `${best} has the highest role average RP, while ${worst} has the lowest. Average RP and placement rate usually explain the patch trend better than win rate alone.`,
    navAria: "Select patch analysis version",
    navLabel: (patch: string) => `${patch} analysis`,
    metrics: {
      patch: "Analysis patch",
      patchBody: (patch: string) => `Compared with ${patch}`,
      sample: "Current sample",
      sampleValue: (count: string) => `${count} games`,
      sampleBody: (count: string) => `Previous ${count} games`,
      buffs: "Buff tracking",
      nerfs: "Nerf tracking",
      count: (count: number) => `${count} entries`,
      buffBody: "Buff targets from patch notes",
      nerfBody: "Nerf targets from patch notes",
    },
    role: {
      kicker: "Role Metrics",
      title: "Role Average RP",
      body: (best: string, worst: string) =>
        `${best} currently has the highest average RP, while ${worst} has the lowest. Roles with lower RP than win rate need a closer look at placement and kill reward structure.`,
      rankScope: "DIAMOND+ · excludes IN1000",
      columns: ["Role", "Avg RP", "Change", "Win rate", "Placement", "Sample"],
    },
    rankingUp: "Largest Average RP Gains",
    rankingDown: "Largest Average RP Drops",
    patchHistory: "Patch Changes",
    evaluation: "Patch Read",
    changeLabels: { buff: "Buff", nerf: "Nerf", adjust: "Adjust" },
    card: {
      pending: (name: string) => `${name} sample pending`,
      summary: (count: string, winRate: string, rp: string) =>
        `${count} games · win rate ${winRate} · RP ${rp}`,
      aggregate: "Combined",
      deltaWinRate: "Win rate",
      deltaPickRate: "Pick rate",
      deltaTop3Rate: "Placement",
    },
    sectionCount: (count: number) => `${count} entries`,
    sections: {
      buffTitle: "Buffed Character Metrics",
      buffDescription:
        "Buff targets are sorted by average RP gain. Compare previous and current metrics before reading the patch reaction.",
      nerfTitle: "Nerfed Character Metrics",
      nerfDescription:
        "Nerf targets are sorted by average RP drop. If sample size and win rate remain stable after a nerf, the pick may still be viable.",
      mixedTitle: "Mixed Adjustment Characters",
      mixedDescription:
        "Characters with both buffs and nerfs are better read through actual metric movement than a single direction label.",
    },
    guideKicker: "Reading Guide",
    guideTitle: "Reading Guide",
    guideBody:
      "Low placement rate usually means higher early-exit risk. A low placement rate with a high win rate can indicate strong final-zone conversion. Average RP should be read as a combined signal across kills, placement, and final rank.",
  },
  ja: {
    kicker: "パッチメタレポート",
    asOf: "時点",
    title: (patch: string) => `${patch} パッチメタ分析`,
    intro:
      "ダイヤ以上のランク統計を基準に、現パッチと直前パッチの平均RP、勝率、ピック率、入賞率を比較します。バフ・ナーフ対象の指標反応と役割別のRP効率を整理します。",
    roleSummary: (best: string, worst: string) =>
      `役割別平均RPは${best}が最も高く、${worst}が最も低い状態です。勝率だけでなく平均RPと入賞率を合わせて見ると、パッチ傾向を判断しやすくなります。`,
    navAria: "パッチ分析バージョン選択",
    navLabel: (patch: string) => `${patch} 分析`,
    metrics: {
      patch: "分析パッチ",
      patchBody: (patch: string) => `${patch} との比較`,
      sample: "現在のサンプル",
      sampleValue: (count: string) => `${count}試合`,
      sampleBody: (count: string) => `前回 ${count}試合`,
      buffs: "バフ追跡",
      nerfs: "ナーフ追跡",
      count: (count: number) => `${count}件`,
      buffBody: "パッチノート基準のバフ対象",
      nerfBody: "パッチノート基準のナーフ対象",
    },
    role: {
      kicker: "役割指標",
      title: "役割別平均RP",
      body: (best: string, worst: string) =>
        `現在の統計では${best}の平均RPが最も高く、${worst}が最も低い状態です。勝率より平均RPが低い役割は、入賞やキル報酬の構造も確認する必要があります。`,
      rankScope: "DIAMOND+ · IN1000除外",
      columns: ["役割", "平均RP", "前回比", "勝率", "入賞率", "サンプル"],
    },
    rankingUp: "平均RP上昇幅の大きいキャラクター",
    rankingDown: "平均RP下落幅の大きいキャラクター",
    patchHistory: "パッチ内容",
    evaluation: "パッチ評価",
    changeLabels: { buff: "バフ", nerf: "ナーフ", adjust: "調整" },
    card: {
      pending: (name: string) => `${name} サンプル確認中`,
      summary: (count: string, winRate: string, rp: string) =>
        `${count}試合 · 勝率 ${winRate} · RP ${rp}`,
      aggregate: "統合",
      deltaWinRate: "勝率",
      deltaPickRate: "ピック率",
      deltaTop3Rate: "入賞率",
    },
    sectionCount: (count: number) => `${count}件`,
    sections: {
      buffTitle: "バフキャラクターの指標反応",
      buffDescription:
        "バフ対象を平均RP上昇幅で並べています。既存指標と現在指標を合わせて見る必要があります。",
      nerfTitle: "ナーフキャラクターの指標反応",
      nerfDescription:
        "ナーフ対象を平均RP下落幅で並べています。ナーフ後もサンプルと勝率が維持される場合、まだ使用可能な選択肢です。",
      mixedTitle: "混合調整キャラクター",
      mixedDescription:
        "バフとナーフが同時に入ったキャラクターは、単一方向ではなく実際の指標変化で読む方が適切です。",
    },
    guideKicker: "解釈基準",
    guideTitle: "解釈基準",
    guideBody:
      "入賞率が低い場合は序盤脱落リスクが高く、入賞率が低くても勝率が高い場合は終盤戦の転換力が高い可能性があります。平均RPはキル、入賞、最終順位を合わせた指標として見ます。",
  },
  "zh-Hans": {
    kicker: "版本 Meta 报告",
    asOf: "基准",
    title: (patch: string) => `${patch} 版本 Meta 分析`,
    intro:
      "基于钻石以上排位统计，比较当前版本与上一版本的平均 RP、胜率、选取率和前三率，并整理增强、削弱目标的指标反应与各角色定位的 RP 效率。",
    roleSummary: (best: string, worst: string) =>
      `当前角色定位平均 RP 最高的是${best}，最低的是${worst}。结合平均 RP 和前三率，比只看胜率更容易判断版本趋势。`,
    navAria: "选择版本分析",
    navLabel: (patch: string) => `${patch} 分析`,
    metrics: {
      patch: "分析版本",
      patchBody: (patch: string) => `相对 ${patch} 的变化`,
      sample: "当前样本",
      sampleValue: (count: string) => `${count} 场`,
      sampleBody: (count: string) => `上一版本 ${count} 场`,
      buffs: "增强追踪",
      nerfs: "削弱追踪",
      count: (count: number) => `${count} 项`,
      buffBody: "基于版本说明的增强目标",
      nerfBody: "基于版本说明的削弱目标",
    },
    role: {
      kicker: "定位指标",
      title: "定位平均 RP",
      body: (best: string, worst: string) =>
        `按当前统计，${best}的平均 RP 最高，${worst}最低。胜率与平均 RP 不一致的定位，需要同时查看前三率和击杀奖励结构。`,
      rankScope: "DIAMOND+ · 不含 IN1000",
      columns: ["定位", "平均 RP", "变化", "胜率", "前三率", "样本"],
    },
    rankingUp: "平均 RP 上升较多的角色",
    rankingDown: "平均 RP 下降较多的角色",
    patchHistory: "版本改动",
    evaluation: "版本解读",
    changeLabels: { buff: "增强", nerf: "削弱", adjust: "调整" },
    card: {
      pending: (name: string) => `${name} 样本确认中`,
      summary: (count: string, winRate: string, rp: string) =>
        `${count} 场 · 胜率 ${winRate} · RP ${rp}`,
      aggregate: "综合",
      deltaWinRate: "胜率",
      deltaPickRate: "选取率",
      deltaTop3Rate: "前三率",
    },
    sectionCount: (count: number) => `${count} 项`,
    sections: {
      buffTitle: "增强角色指标反应",
      buffDescription: "增强目标按平均 RP 上升幅度排序。需要同时比较旧版本与当前版本数据。",
      nerfTitle: "削弱角色指标反应",
      nerfDescription:
        "削弱目标按平均 RP 下降幅度排序。若削弱后样本和胜率仍稳定，仍可能是可用选择。",
      mixedTitle: "混合调整角色",
      mixedDescription: "同时包含增强和削弱的角色，更适合根据实际指标变化解读。",
    },
    guideKicker: "解读标准",
    guideTitle: "解读标准",
    guideBody:
      "前三率低通常代表前中期出局风险更高；前三率低但胜率高，可能代表终局转换能力较强。平均 RP 应作为击杀、前三率和最终名次的综合信号解读。",
  },
  "zh-Hant": {
    kicker: "版本 Meta 報告",
    asOf: "基準",
    title: (patch: string) => `${patch} 版本 Meta 分析`,
    intro:
      "基於鑽石以上牌位統計，比較目前版本與上一版本的平均 RP、勝率、選取率和前三率，並整理強化、削弱目標的指標反應與各角色定位的 RP 效率。",
    roleSummary: (best: string, worst: string) =>
      `目前角色定位平均 RP 最高的是${best}，最低的是${worst}。結合平均 RP 和前三率，比只看勝率更容易判斷版本趨勢。`,
    navAria: "選擇版本分析",
    navLabel: (patch: string) => `${patch} 分析`,
    metrics: {
      patch: "分析版本",
      patchBody: (patch: string) => `相對 ${patch} 的變化`,
      sample: "目前樣本",
      sampleValue: (count: string) => `${count} 場`,
      sampleBody: (count: string) => `上一版本 ${count} 場`,
      buffs: "強化追蹤",
      nerfs: "削弱追蹤",
      count: (count: number) => `${count} 項`,
      buffBody: "基於版本說明的強化目標",
      nerfBody: "基於版本說明的削弱目標",
    },
    role: {
      kicker: "定位指標",
      title: "定位平均 RP",
      body: (best: string, worst: string) =>
        `按目前統計，${best}的平均 RP 最高，${worst}最低。勝率與平均 RP 不一致的定位，需要同時查看前三率和擊殺獎勵結構。`,
      rankScope: "DIAMOND+ · 不含 IN1000",
      columns: ["定位", "平均 RP", "變化", "勝率", "前三率", "樣本"],
    },
    rankingUp: "平均 RP 上升較多的角色",
    rankingDown: "平均 RP 下降較多的角色",
    patchHistory: "版本改動",
    evaluation: "版本解讀",
    changeLabels: { buff: "強化", nerf: "削弱", adjust: "調整" },
    card: {
      pending: (name: string) => `${name} 樣本確認中`,
      summary: (count: string, winRate: string, rp: string) =>
        `${count} 場 · 勝率 ${winRate} · RP ${rp}`,
      aggregate: "綜合",
      deltaWinRate: "勝率",
      deltaPickRate: "選取率",
      deltaTop3Rate: "前三率",
    },
    sectionCount: (count: number) => `${count} 項`,
    sections: {
      buffTitle: "強化角色指標反應",
      buffDescription: "強化目標按平均 RP 上升幅度排序。需要同時比較舊版本與目前版本數據。",
      nerfTitle: "削弱角色指標反應",
      nerfDescription:
        "削弱目標按平均 RP 下降幅度排序。若削弱後樣本和勝率仍穩定，仍可能是可用選擇。",
      mixedTitle: "混合調整角色",
      mixedDescription: "同時包含強化和削弱的角色，更適合根據實際指標變化解讀。",
    },
    guideKicker: "解讀標準",
    guideTitle: "解讀標準",
    guideBody:
      "前三率低通常代表前中期出局風險更高；前三率低但勝率高，可能代表終局轉換能力較強。平均 RP 應作為擊殺、前三率和最終名次的綜合訊號解讀。",
  },
} as const;

type PatchAnalysisCopy = (typeof PATCH_ANALYSIS_COPY)[RouteLocale];

function getRoleLabel(locale: RouteLocale, role: string) {
  return ROLE_LABELS[locale][role] ?? role;
}

export async function generateMetadata(version?: string): Promise<Metadata> {
  const data = await getPatchAnalysisData(version);
  const pathname = `/patch-analysis/${data.currentPatch}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: `패치 메타 분석 - ${data.currentPatch} 통계 변화`,
    description: `이터널리턴 최신 패치 기준 다이아 이상 통계 분석. ${data.currentPatch}과 ${data.previousPatch}의 평균 RP, 승률, 픽률, 순방률 변화를 비교합니다.`,
    alternates: { canonical: pathname },
    openGraph: {
      title: "패치 메타 분석",
      description:
        "버프/너프 이후 캐릭터 지표 변화와 역할군 평균 RP를 오늘 통계 기준으로 정리합니다.",
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(digits)}%`;
}

function formatSigned(value: number, digits = 1, suffix = "") {
  if (!Number.isFinite(value)) return `0.0${suffix}`;
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

function MetricCard({
  icon,
  label,
  value,
  body,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  body?: string;
  tone?: "default" | "gold" | "blue" | "danger";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[var(--color-border)] bg-white text-[var(--color-foreground)]"
      : tone === "blue"
        ? "border-[var(--color-border)] bg-white text-[var(--color-foreground)]"
        : tone === "danger"
          ? "border-[var(--color-border)] bg-white text-[var(--color-foreground)]"
          : "border-[var(--color-border)] bg-white text-[var(--color-foreground)]";

  return (
    <div className="metric-card flex min-h-[120px] flex-col justify-between gap-3 px-4 py-4 sm:px-5">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md border", toneClass)}>
        {icon}
      </div>
      <div>
        <p className="text-[1.3rem] font-bold text-[var(--color-foreground)] sm:text-[1.6rem]">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
        {body ? (
          <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">{body}</p>
        ) : null}
      </div>
    </div>
  );
}

function metricLabel(
  metric: PatchCharacterMetric | null,
  fallbackName: string,
  copy: PatchAnalysisCopy
) {
  if (!metric) return copy.card.pending(fallbackName);
  return copy.card.summary(
    formatNumber(metric.totalGames),
    formatPercent(metric.winRate),
    formatSigned(metric.averageRP, 1)
  );
}

function getEntryDisplayName(
  entry: PatchCharacterDelta,
  l10n: Map<string, string>,
  fallbackMap: Map<number, string>
) {
  return resolveCharacterName(entry.characterNum, l10n, fallbackMap);
}

function getScopeLabel(
  entry: PatchCharacterDelta,
  copy: PatchAnalysisCopy,
  l10n: Map<string, string>
) {
  if (entry.isAggregate) return copy.card.aggregate;
  const weaponCode = entry.weaponCodes[0];
  return weaponCode ? resolveWeaponName(weaponCode, l10n) : copy.card.aggregate;
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        positive
          ? "border-[var(--color-border)] text-[var(--color-success)]"
          : "border-[var(--color-border)] text-[var(--color-danger)]"
      )}
    >
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatSigned(value, 1, suffix)}
    </span>
  );
}

function CharacterDeltaCard({
  entry,
  evaluations,
  copy,
  l10n,
  fallbackMap,
}: {
  entry: PatchCharacterDelta;
  evaluations: Record<number, string>;
  copy: PatchAnalysisCopy;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  const firstChanges = entry.note.changes.slice(0, 3);
  const weaponNames =
    entry.isAggregate && !AGGREGATE_ONLY_CHARACTERS.has(entry.characterNum)
      ? getEntryWeaponNames(entry)
      : [];
  const evaluation = evaluations[entry.characterNum];
  const displayName = getEntryDisplayName(entry, l10n, fallbackMap);
  const scopeLabel = getScopeLabel(entry, copy, l10n);

  return (
    <article className="metric-card grid gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.55fr)] lg:items-start">
      <div className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <Image
              src={getCharacterMiniWebpUrl(entry.characterNum)}
              alt={displayName}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-foreground)]">{displayName}</h3>
              {entry.changeTypes.map((type) => (
                <ChangeTypeBadgeStatic
                  key={type}
                  type={type}
                  label={
                    type === "buff"
                      ? copy.changeLabels.buff
                      : type === "nerf"
                        ? copy.changeLabels.nerf
                        : copy.changeLabels.adjust
                  }
                />
              ))}
              <span
                className={cn(
                  "rounded border bg-white px-2 py-1 text-[10px] font-semibold",
                  entry.isAggregate
                    ? "border-[var(--color-border)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                )}
              >
                {scopeLabel}
              </span>
              {weaponNames.map((weaponName) => (
                <span
                  key={weaponName}
                  className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-muted-foreground)]"
                >
                  {weaponName}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {metricLabel(entry.previous, displayName, copy)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-foreground)]">
              → {metricLabel(entry.current, displayName, copy)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DeltaMetric label="RP" value={entry.deltaAverageRP} />
          <DeltaMetric label={copy.card.deltaWinRate} value={entry.deltaWinRate} suffix="%p" />
          <DeltaMetric label={copy.card.deltaPickRate} value={entry.deltaPickRate} suffix="%p" />
          <DeltaMetric label={copy.card.deltaTop3Rate} value={entry.deltaTop3Rate} suffix="%p" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-3">
          <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
            {copy.patchHistory}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {firstChanges.map((change, index) => (
              <li
                key={`${change.target}-${index}`}
                className="text-xs leading-5 text-[var(--color-muted-foreground)]"
              >
                <span className="font-semibold text-[var(--color-foreground)]">
                  {change.target}
                </span>
                {change.valueSummary ? <PatchValueSummary value={change.valueSummary} /> : null}
              </li>
            ))}
          </ul>
        </div>

        {evaluation ? (
          <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-3">
            <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
              {copy.evaluation}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-foreground)]/86">{evaluation}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

const NUMERIC_VALUE_PATTERN = /[+-]?\d+(?:\.\d+)?%?/g;

function PatchValueSummary({ value }: { value: string }) {
  const [before, after] = value.split("→").map((part) => part.trim());

  if (!after) {
    return <span> · {value}</span>;
  }

  return (
    <span>
      {" · "}
      <span>{before}</span>
      <span className="px-1 text-[var(--color-muted-foreground)]">→</span>
      <HighlightedChangedValue before={before} after={after} />
    </span>
  );
}

function HighlightedChangedValue({ before, after }: { before: string; after: string }) {
  const beforeValues = before.match(NUMERIC_VALUE_PATTERN) ?? [];
  let valueIndex = 0;
  let cursor = 0;
  const parts: ReactNode[] = [];

  for (const match of after.matchAll(NUMERIC_VALUE_PATTERN)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > cursor) {
      parts.push(after.slice(cursor, index));
    }

    const changed = beforeValues[valueIndex] !== token;
    parts.push(
      <span
        key={`${index}-${token}`}
        className={changed ? "font-semibold text-[var(--color-foreground)]" : undefined}
      >
        {token}
      </span>
    );

    valueIndex += 1;
    cursor = index + token.length;
  }

  if (cursor < after.length) {
    parts.push(after.slice(cursor));
  }

  return <span>{parts}</span>;
}

function DeltaMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          value >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
        )}
      >
        {formatSigned(value, 1, suffix)}
      </p>
    </div>
  );
}

function RoleTable({
  roles,
  copy,
  locale,
}: {
  roles: PatchRoleMetric[];
  copy: PatchAnalysisCopy;
  locale: RouteLocale;
}) {
  const best = roles[0];
  const worst = roles[roles.length - 1];
  const bestLabel = best ? getRoleLabel(locale, best.role) : "Role";
  const worstLabel = worst ? getRoleLabel(locale, worst.role) : "Role";

  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="dashboard-kicker">{copy.role.kicker}</p>
            <h2 className="mt-2 text-[1.3rem] font-bold text-[var(--color-foreground)] sm:text-[1.6rem]">
              {copy.role.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {copy.role.body(bestLabel, worstLabel)}
            </p>
          </div>
          <span className="rounded border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
            {copy.role.rankScope}
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)]/60">
                  <th className="border-b border-[var(--color-border)] px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[0]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[1]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[2]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[3]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[4]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    {copy.role.columns[5]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.role}>
                    <th className="border-b border-[var(--color-border)]/30 px-4 py-3 text-left font-semibold text-[var(--color-foreground)]">
                      {getRoleLabel(locale, role.role)}
                    </th>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatSigned(role.averageRP, 1)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right">
                      {role.deltaAverageRP == null ? (
                        <span className="text-[var(--color-muted-foreground)]">-</span>
                      ) : (
                        <DeltaBadge value={role.deltaAverageRP} />
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPercent(role.winRate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPercent(role.top3Rate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatNumber(role.totalGames)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeltaRanking({
  title,
  entries,
  tone,
  copy,
  l10n,
  fallbackMap,
}: {
  title: string;
  entries: PatchCharacterDelta[];
  tone: "up" | "down";
  copy: PatchAnalysisCopy;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <h2 className="text-[1.25rem] font-bold text-[var(--color-foreground)]">{title}</h2>
      <div className="mt-4 grid gap-2">
        {entries.map((entry, index) => {
          const displayName = getEntryDisplayName(entry, l10n, fallbackMap);
          const scopeLabel = getScopeLabel(entry, copy, l10n);

          return (
            <div
              key={`${entry.characterNum}-${entry.scopeKey}-${index}`}
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-white px-3 py-3"
            >
              <span className="w-6 text-center text-sm font-bold text-[var(--color-muted-foreground)] tabular-nums">
                {index + 1}
              </span>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <Image
                  src={getCharacterImageUrl(entry.characterNum)}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                  {displayName}
                  <span className="ml-1 font-medium text-[var(--color-muted-foreground)]">
                    {scopeLabel}
                  </span>
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {entry.previous ? formatSigned(entry.previous.averageRP, 1) : "-"} →{" "}
                  {entry.current ? formatSigned(entry.current.averageRP, 1) : "-"}
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  tone === "up" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                )}
              >
                {formatSigned(entry.deltaAverageRP, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CharacterSection({
  title,
  description,
  entries,
  evaluations,
  copy,
  locale,
  l10n,
  fallbackMap,
}: {
  title: string;
  description: string;
  entries: PatchCharacterDelta[];
  evaluations: Record<number, string>;
  copy: PatchAnalysisCopy;
  locale: RouteLocale;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  if (entries.length === 0) return null;
  const groups = groupEntriesByRole(entries);

  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.3rem] font-bold text-[var(--color-foreground)] sm:text-[1.6rem]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
            {description}
          </p>
        </div>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {copy.sectionCount(entries.length)}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.role} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                {getRoleLabel(locale, group.role)}
              </h3>
              <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                {copy.sectionCount(group.entries.length)}
              </span>
            </div>
            <div className="grid gap-3">
              {group.entries.map((entry) => (
                <CharacterDeltaCard
                  key={`${group.role}-${entry.characterNum}-${entry.scopeKey}`}
                  entry={entry}
                  evaluations={evaluations}
                  copy={copy}
                  l10n={l10n}
                  fallbackMap={fallbackMap}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupEntriesByRole(entries: PatchCharacterDelta[]) {
  const map = new Map<string, PatchCharacterDelta[]>();

  for (const entry of entries) {
    const roles = getEntryRoles(entry);
    for (const role of roles.length > 0 ? roles : ["직업군 미분류"]) {
      const group = map.get(role) ?? [];
      group.push(entry);
      map.set(role, group);
    }
  }

  return [...map.entries()]
    .map(([role, groupEntries]) => ({ role, entries: groupEntries }))
    .sort((a, b) => {
      const aIndex = ROLE_ORDER.indexOf(a.role as CharacterRole);
      const bIndex = ROLE_ORDER.indexOf(b.role as CharacterRole);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

function getEntryWeaponNames(entry: PatchCharacterDelta) {
  return Array.isArray(entry.weaponNames) ? entry.weaponNames : [];
}

function getEntryRoles(entry: PatchCharacterDelta) {
  return Array.isArray(entry.roles) ? entry.roles : [];
}

export default async function PatchAnalysisPage({
  version,
  locale = "ko",
}: PatchAnalysisPageProps = {}) {
  const data = await getPatchAnalysisData(version);
  const copy = PATCH_ANALYSIS_COPY[locale];
  const l10n = loadL10nMap(LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const fallbackMap = buildFallbackMap();
  const tEvaluations = await getTranslations("patchAnalysis.evaluations");
  const analysisVersions = getPatchAnalysisVersions();
  const evaluations = Object.fromEntries(
    EVALUATED_CHARACTER_NUMS.map((characterNum) => [
      characterNum,
      tEvaluations(String(characterNum)),
    ])
  );
  const bestRole = data.roleMetrics[0];
  const worstRole = data.roleMetrics[data.roleMetrics.length - 1];
  const bestRoleLabel = bestRole ? getRoleLabel(locale, bestRole.role) : "";
  const worstRoleLabel = worstRole ? getRoleLabel(locale, worstRole.role) : "";

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker">{copy.kicker}</span>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {data.previousPatch} → {data.currentPatch}
              </span>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {data.asOf} {copy.asOf}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {copy.title(data.currentPatch)}
            </h1>
            <p className="mt-2 max-w-[44rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
              {copy.intro}
            </p>
            {bestRole && worstRole ? (
              <p className="mt-3 max-w-[44rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
                {copy.roleSummary(bestRoleLabel, worstRoleLabel)}
              </p>
            ) : null}

            <nav className="mt-5 flex flex-wrap gap-2" aria-label={copy.navAria}>
              {analysisVersions.map((candidate) => {
                const isActive = candidate === data.currentPatch;
                return (
                  <Link
                    key={candidate}
                    href={`/patch-analysis/${candidate}`}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-semibold ",
                      isActive
                        ? "border-[var(--color-border-light)] bg-white text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    {copy.navLabel(candidate)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              icon={<CalendarDays className="h-5 w-5" strokeWidth={2} />}
              label={copy.metrics.patch}
              value={`${data.currentPatch}`}
              body={copy.metrics.patchBody(data.previousPatch)}
              tone="blue"
            />
            <MetricCard
              icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
              label={copy.metrics.sample}
              value={copy.metrics.sampleValue(formatNumber(data.totalMatches))}
              body={copy.metrics.sampleBody(formatNumber(data.previousTotalMatches))}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" strokeWidth={2} />}
              label={copy.metrics.buffs}
              value={copy.metrics.count(data.buffed.length)}
              body={copy.metrics.buffBody}
              tone="gold"
            />
            <MetricCard
              icon={<Swords className="h-5 w-5" strokeWidth={2} />}
              label={copy.metrics.nerfs}
              value={copy.metrics.count(data.nerfed.length)}
              body={copy.metrics.nerfBody}
              tone="danger"
            />
          </div>
        </div>
      </section>

      <RoleTable roles={data.roleMetrics} copy={copy} locale={locale} />

      <div className="grid gap-5 xl:grid-cols-2">
        <DeltaRanking
          title={copy.rankingUp}
          entries={data.rising}
          tone="up"
          copy={copy}
          l10n={l10n}
          fallbackMap={fallbackMap}
        />
        <DeltaRanking
          title={copy.rankingDown}
          entries={data.falling}
          tone="down"
          copy={copy}
          l10n={l10n}
          fallbackMap={fallbackMap}
        />
      </div>

      {locale === "ko" ? (
        <>
          <CharacterSection
            title={copy.sections.buffTitle}
            description={copy.sections.buffDescription}
            entries={data.buffed}
            evaluations={evaluations}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
          <CharacterSection
            title={copy.sections.nerfTitle}
            description={copy.sections.nerfDescription}
            entries={data.nerfed}
            evaluations={evaluations}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
          <CharacterSection
            title={copy.sections.mixedTitle}
            description={copy.sections.mixedDescription}
            entries={data.mixed}
            evaluations={evaluations}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
        </>
      ) : null}

      <section className="dashboard-panel p-4 lg:p-6">
        <div className="flex flex-col gap-2">
          <p className="dashboard-kicker">{copy.guideKicker}</p>
          <h2 className="text-[1.25rem] font-bold text-[var(--color-foreground)]">
            {copy.guideTitle}
          </h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.guideBody}</p>
        </div>
      </section>
    </main>
  );
}
