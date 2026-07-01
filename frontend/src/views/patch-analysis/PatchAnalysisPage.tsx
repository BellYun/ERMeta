import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Swords, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
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
  type PatchRoleMetric,
} from "@/lib/patchAnalysis";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

export const dynamic = "force-static";

const ROLE_ORDER: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const AGGREGATE_ONLY_CHARACTERS = new Set([3, 13, 15, 29]);

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

interface CausalEvaluationComment {
  label: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function patchContextComment(
  body: string,
  tone: CausalEvaluationComment["tone"] = "neutral"
): CausalEvaluationComment[] {
  return [{ label: "패치 평가", tone, body }];
}

const PATCH_CONTEXT_COMMENTS: Record<string, Record<number, CausalEvaluationComment[]>> = {
  "11.5": {
    2: patchContextComment(
      "아야는 패시브 보호막 버프를 받았고, 일부 아이템 버프의 수혜도 있었으나 지표가 크게 상승하지는 않았습니다. 원거리 딜러 강세로 인해 함께 기용되던 전사 실험체들의 지표가 좋지 않은 점도 영향을 준 것으로 보입니다. 현재까지는 버프가 크게 유의미하게 반영되었다고 보기는 어렵고, 남은 패치 흐름을 더 지켜볼 필요가 있습니다."
    ),
    6: patchContextComment(
      "나딘은 너무 좋은 지표를 보여주던 석궁 무기 숙련도의 기본 공격 증폭이 너프되었습니다. 다만 일부 아이템 버프의 수혜로 인해 지표가 크게 무너지지는 않았고, 현재도 무난한 성능을 보여주고 있습니다."
    ),
    9: patchContextComment(
      "아이솔은 셈텍스 폭탄 버프와 일부 아이템 버프의 수혜를 받으며 지표가 우상향하고 있습니다. 다만 현재 메타가 원거리 딜러 중심으로 흘러가고 있어, 조합 내 역할 경쟁에서는 다소 애매한 부분이 있습니다. 버프 방향은 긍정적이며, 남은 패치 흐름에 따라 평가가 더 올라갈 수 있는 픽입니다.",
      "positive"
    ),
    17: patchContextComment(
      "아드리아나는 궁극기 저레벨 구간 피해량 버프를 받았습니다. 기존에는 서포터 조합을 상대할 때 어려움을 겪는 경우가 있었으나, 이번 패치에서 서포터 실험체와 회복 관련 요소가 약해지고 원거리 딜러 실험체가 강세를 보이면서 아드리아나를 사용하기 좋은 환경이 만들어졌습니다. 버프와 메타 변화가 모두 긍정적으로 작용한 픽입니다.",
      "positive"
    ),
    20: patchContextComment(
      "레녹스는 E 스킬의 대상 최대 체력 비례 피해량 버프를 받았으나, 픽률 상승과 함께 비숙련자 유입이 발생하면서 전체 RP 지표는 하락한 모습입니다. 레녹스는 순방 안정성이 높은 탱커라기보다는 교전 숙련도에 따라 성과가 크게 갈리는 실험체인 만큼, 비숙련자 유입이 순방률 하락에 영향을 준 것으로 보입니다.",
      "negative"
    ),
    25: patchContextComment(
      "버니스는 레벨당 공격력 버프와 W 설치 개수 개선을 받았고, 일부 아이템 버프의 수혜도 있었습니다. 다만 지표가 크게 상승하지는 않아 버프가 즉각적인 성능 개선으로 이어졌다고 보기는 어렵습니다. 남은 패치 기간 동안 추가 지표를 확인할 필요가 있습니다."
    ),
    27: patchContextComment(
      "알렉스는 근접 무기 사용 시 얻는 방어력 증가 효과가 너프되었습니다. 기본 체급을 낮추는 너프이긴 하지만, 알렉스는 여전히 높은 유틸성과 안정성을 가진 실험체입니다. 너프 이후에도 충분히 사용할 만한 픽으로 보입니다."
    ),
    30: patchContextComment(
      "일레븐은 궁극기 피해량과 회복량 버프를 받았으나, 현재 메타에서 탱커 + 전사 + 전사 조합의 평균 RP가 크게 하락한 영향을 받고 있습니다. 다만 원거리 딜러와 함께 기용되는 경우에는 좋은 지표를 보여주고 있어, 원거리 딜러가 포함된 조합에서는 버프가 유의미하게 작용하는 픽으로 볼 수 있습니다."
    ),
    31: patchContextComment(
      "리오는 활 무기 숙련도의 기본 공격 증폭 버프를 받았고, 전체적으로 좋은 지표를 보여주고 있습니다. 픽률이 급등했음에도 불구하고 RP 획득량이 안정적으로 유지되고 있어, 이번 패치에서 버프와 아이템 환경의 수혜를 크게 받은 픽으로 볼 수 있습니다.",
      "positive"
    ),
    38: patchContextComment(
      "제니는 E 스킬 피해량 버프를 받았으나, 기존에 샬럿 등 서포터와 함께 기용되던 비중이 높았던 만큼 힐링 윈드 쿨다운 증가와 더 썬 너프의 영향을 크게 받았습니다. 서포터와 함께 사용하는 조합에서는 지표가 눌릴 수 있지만, 서포터 의존도를 낮춘 조합에서는 버프 체감이 더 크게 나타날 수 있습니다."
    ),
    39: patchContextComment(
      "카밀로는 Q 스킬 피해량 너프를 받았으나, 시작 아이템인 미닛맨의 표식 버프와 일부 팔 아이템 버프의 수혜를 받았습니다. 특히 미스릴 완장 대신 운명의 주사위나 레이더를 기용하는 경우에도 좋은 지표를 보여주고 있어, 캐릭터 너프에도 불구하고 아이템 환경 덕분에 좋은 모습을 유지하고 있습니다.",
      "positive"
    ),
    41: patchContextComment(
      "요한은 아르카나 무기 숙련도, Q 강화 회복량, W 슬로우 및 쿨다운 조정이 함께 들어갔습니다. 서포터 실험체 너프의 핵심 대상 중 하나로 볼 수 있으며, RP 획득량이 음수로 떨어진 만큼 현재는 기용 부담이 큰 픽입니다.",
      "negative"
    ),
    45: patchContextComment(
      "마이는 숄 장막의 피해 감소량과 익스클루시브 회복량이 함께 너프되었습니다. 픽률은 낮아졌으나 RP 획득량은 오히려 상승한 모습인데, 이는 비숙련자 이탈 이후 숙련자 위주로 표본이 재편된 영향일 가능성이 있습니다. 너프 자체는 분명하지만, 지표 해석에는 픽률 변화까지 함께 고려할 필요가 있습니다."
    ),
    48: patchContextComment(
      "띠아는 Q 스킬 피해량 버프를 받았고, 전체적으로 높은 RP 획득량을 보여주고 있습니다. 버프가 지표에 긍정적으로 반영된 케이스로 볼 수 있으며, 현재 기준으로는 충분히 사용할 만한 픽입니다.",
      "positive"
    ),
    50: patchContextComment(
      "엘레나는 W 스킬 피해량 버프를 받았으나, 원거리 딜러 강세로 인해 기존에 전사와 함께 기용되던 조합의 평균 RP가 하락한 영향을 받고 있습니다. 반면 원거리 딜러와 함께 사용하는 경우에는 좋은 지표를 보여주고 있어, 원거리 딜러가 있는 조합에서는 버프 체감이 유의미한 픽입니다."
    ),
    54: patchContextComment(
      "칼라는 석궁 무기 숙련도 성장 버프를 받았으나, 현재 원거리 딜러 중심 메타에서는 강점을 살리기 어려운 모습입니다. 버프 자체는 장기적인 성능 보완에 가깝고, 즉각적인 지표 상승으로 이어지지는 않은 상태입니다.",
      "negative"
    ),
    58: patchContextComment(
      "헤이즈는 RQ 피해량 버프를 받았고, 픽률이 크게 상승하면서 비숙련자 유입이 예상되는 상황입니다. 그럼에도 전체 지표가 나쁘지 않게 유지되고 있어, 이번 버프는 유의미하게 작용한 것으로 보입니다.",
      "positive"
    ),
    61: patchContextComment(
      "이렘은 고양이 W 스킬 피해량 버프를 받았고, 서포터 실험체 너프의 영향으로 스킬 딜러와 함께 기용하는 조합의 RP 획득량이 크게 상승했습니다. 전체적인 지표는 개선되었으나, 지원가와 함께 기용하는 경우에는 서포터 너프의 영향을 받아 RP 획득량이 감소한 모습입니다. 지표 대비 충분히 사용할 만한 픽입니다.",
      "positive"
    ),
    68: patchContextComment(
      "알론소는 주된 피해 감소 수단인 바운싱 실드의 피해 감소량이 크게 너프되었습니다. 픽률이 빠지고 RP 획득량도 크게 감소한 만큼, 이번 너프의 체감이 매우 큰 픽으로 볼 수 있습니다.",
      "negative"
    ),
    69: patchContextComment(
      "레니는 W 스킬 이동 속도 증가량과 쿨다운, E 스킬 보호막 계수가 모두 너프되었습니다. 이번 패치에서 가장 큰 타격을 받은 서포터 중 하나이며, RP 획득량이 음수로 떨어진 만큼 현재는 기용하기 어려운 픽으로 보입니다.",
      "negative"
    ),
    71: patchContextComment(
      "케네스는 공격력 성장치와 Q 스킬 계수 버프를 받았으나, 픽률이 크게 상승하면서 비숙련자 유입의 영향을 받은 것으로 보입니다. 기존에도 원거리 딜러와의 궁합이 좋은 편은 아니었고, 현재 원거리 딜러 중심 메타에서 조합을 타는 모습이 나타나고 있습니다. 버프 자체는 유의미하지만, 지표상으로는 아직 안정적인 픽이라고 보기는 어렵습니다."
    ),
    78: patchContextComment(
      "히스이는 궁극기 추가 피해량 너프를 받았습니다. 여기에 원거리 딜러 강세와 서포터 너프가 겹치면서 기존 강점을 살리기 어려운 환경이 되었습니다. 너프와 메타 변화가 동시에 부정적으로 작용한 픽입니다.",
      "negative"
    ),
    79: patchContextComment(
      "유스티나는 궁극기 피해량 버프를 받았으나, 현재 지표만으로는 유의미한 변화라고 판단하기 어렵습니다. 표본이 더 쌓인 뒤에 평가하는 것이 적절한 픽입니다."
    ),
    81: patchContextComment(
      "니아는 W 스킬 피해량 버프를 받았으나, 원거리 딜러 강세로 인해 함께 기용되던 전사 실험체들의 지표가 좋지 않은 영향을 받은 것으로 보입니다. 버프 자체는 명확하지만, 현재 메타에서는 조합 영향을 크게 받는 픽으로 보는 것이 적절합니다."
    ),
    82: patchContextComment(
      "슈린은 패시브 회복량 버프로 인해 TTK가 긴 교전에서 이점을 얻었습니다. 특히 탱커와 함께 기용하는 경우 RP 획득량이 크게 상승한 모습입니다. 다만 다른 직업군과 함께 사용할 때는 지표가 좋지 않아, 현재는 탱커와 함께 쓰는 조합에서 강점이 뚜렷한 픽으로 보는 것이 적절합니다.",
      "positive"
    ),
    88: patchContextComment(
      "비형은 높은 픽률과 내구 지표를 이유로 기본 방어력 너프를 받았습니다. 기본 체급을 직접 낮춘 너프인 만큼 영향이 작지 않으며, 실제 지표도 크게 하락한 모습입니다. 기존처럼 안정적으로 쓰기보다는 조합과 숙련도를 더 많이 타는 픽이 된 것으로 보입니다.",
      "negative"
    ),
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
      `역할군 평균 RP 최고: ${best}. 최저: ${worst}. 승률 단독보다 평균 RP와 순방률을 함께 확인해야 합니다.`,
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
        `오늘 통계 기준으로 평균 RP가 가장 높은 역할군은 ${best}, 가장 낮은 역할군은 ${worst}입니다. 승률보다 평균 RP가 낮은 역할군은 순방/킬 보상 구조를 함께 확인해야 합니다.`,
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
      averageRP: "RP",
      deltaWinRate: "승률",
      deltaPickRate: "픽률",
      deltaTop3Rate: "순방률",
    },
    sectionCount: (count: number) => `${count}건`,
    sections: {
      buffTitle: "버프 캐릭터 지표 반응",
      buffDescription:
        "버프 대상 캐릭터를 평균 RP 상승폭 기준으로 정렬했습니다. 기존 지표와 현재 지표를 함께 비교합니다.",
      nerfTitle: "너프 캐릭터 지표 반응",
      nerfDescription:
        "너프 대상 캐릭터는 평균 RP 하락폭이 큰 순서로 정렬했습니다. 표본과 승률이 유지되는 픽은 메타 잔존 가능성이 높습니다.",
      mixedTitle: "혼합 조정 캐릭터",
      mixedDescription: "버프와 너프가 함께 들어간 캐릭터는 실제 지표 변화를 우선합니다.",
    },
    guideKicker: "판단 기준",
    guideTitle: "판단 기준",
    guideBody:
      "순방률 하락은 초중반 탈락 리스크 증가를 뜻합니다. 순방률은 낮고 승률이 높으면 마지막 금지 구역 교전 전환력이 높은 픽입니다. 평균 RP는 킬, 순방, 최종 순위를 합친 지표입니다.",
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
      averageRP: "RP",
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
      averageRP: "RP",
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
      averageRP: "RP",
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
      averageRP: "RP",
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
      ? "border-[var(--color-accent-muted)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
      : tone === "blue"
        ? "border-[var(--color-accent-muted)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
        : tone === "danger"
          ? "border-red-100 bg-red-50 text-[var(--color-danger)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]";
  const isAccent = tone === "gold" || tone === "blue";

  return (
    <div
      className="metric-card flex min-h-[104px] flex-col justify-between gap-2.5 px-3.5 py-3.5 sm:px-4"
      data-accent={isAccent ? "true" : undefined}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md border", toneClass)}>
        {icon}
      </div>
      <div>
        <p
          className={cn(
            "font-mono text-lg font-bold leading-none sm:text-xl",
            isAccent ? "text-[var(--color-accent-foreground)]" : "text-[var(--color-foreground)]"
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
        {body ? (
          <p className="mt-2 text-[0.95rem] leading-6 text-[var(--color-muted-foreground)]">
            {body}
          </p>
        ) : null}
      </div>
    </div>
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
  if (entry.weaponCodes.length > 1) {
    return entry.weaponCodes.map((weaponCode) => resolveWeaponName(weaponCode, l10n)).join(" + ");
  }
  const weaponCode = entry.weaponCodes[0];
  return weaponCode ? resolveWeaponName(weaponCode, l10n) : copy.card.aggregate;
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold tabular-nums",
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
  copy,
  locale,
  l10n,
  fallbackMap,
}: {
  entry: PatchCharacterDelta;
  copy: PatchAnalysisCopy;
  locale: RouteLocale;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  const firstChanges = entry.note.changes.slice(0, 3);
  const weaponNames =
    entry.isAggregate && !AGGREGATE_ONLY_CHARACTERS.has(entry.characterNum)
      ? getEntryWeaponNames(entry)
      : [];
  const displayName = getEntryDisplayName(entry, l10n, fallbackMap);
  const scopeLabel = getScopeLabel(entry, copy, l10n);
  const causalComments = locale === "ko" ? buildCausalEvaluationComments(entry) : [];

  return (
    <article className="metric-card grid gap-4 px-4 py-4 lg:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.35fr)] lg:items-start">
      <div className="flex flex-col gap-3">
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
                  "rounded border bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold",
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
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-medium text-[var(--color-muted-foreground)]"
                >
                  {weaponName}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DiamondMetricPanel entry={entry} copy={copy} displayName={displayName} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
          <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
            {copy.patchHistory}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {firstChanges.map((change, index) => (
              <li
                key={`${change.target}-${index}`}
                className="text-[0.95rem] leading-7 text-[var(--color-muted-foreground)]"
              >
                <span className="font-semibold text-[var(--color-foreground)]">
                  {change.target}
                </span>
                {change.valueSummary ? <PatchValueSummary value={change.valueSummary} /> : null}
              </li>
            ))}
          </ul>
        </div>

        {causalComments.length > 0 ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
            <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
              {copy.evaluation}
            </p>
            <div className="mt-2 grid gap-2">
              {causalComments.map((comment) => (
                <p
                  key={`${comment.label}-${comment.body}`}
                  className="text-[1rem] leading-7 text-[var(--color-foreground)]/88"
                >
                  {comment.body}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DiamondMetricPanel({
  entry,
  copy,
  displayName,
}: {
  entry: PatchCharacterDelta;
  copy: PatchAnalysisCopy;
  displayName: string;
}) {
  const metric = entry.tierMetrics.find((candidate) => candidate.tier === "DIAMOND_PLUS");
  if (!metric) return null;

  const hasComparableMetrics = metric.current != null && metric.previous != null;

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-[var(--color-foreground)]">다이아+</p>
        <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
          {metric.current
            ? `${formatNumber(metric.current.totalGames)}판`
            : copy.card.pending(displayName)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <DiamondMetricStat
          label={copy.card.averageRP}
          value={metric.current ? formatSigned(metric.current.averageRP, 1) : "-"}
          delta={hasComparableMetrics ? metric.deltaAverageRP : null}
        />
        <DiamondMetricStat
          label={copy.card.deltaWinRate}
          value={metric.current ? formatPercent(metric.current.winRate) : "-"}
          delta={hasComparableMetrics ? metric.deltaWinRate : null}
          suffix="%p"
        />
        <DiamondMetricStat
          label={copy.card.deltaPickRate}
          value={metric.current ? formatPercent(metric.current.pickRate) : "-"}
          delta={hasComparableMetrics ? metric.deltaPickRate : null}
          suffix="%p"
        />
        <DiamondMetricStat
          label={copy.card.deltaTop3Rate}
          value={metric.current ? formatPercent(metric.current.top3Rate) : "-"}
          delta={hasComparableMetrics ? metric.deltaTop3Rate : null}
          suffix="%p"
        />
      </div>
    </div>
  );
}

function DiamondMetricStat({
  label,
  value,
  delta,
  suffix = "",
}: {
  label: string;
  value: string;
  delta: number | null;
  suffix?: string;
}) {
  return (
    <div className="min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5">
      <p className="truncate text-[10px] font-semibold text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 text-[0.95rem] font-bold tabular-nums text-[var(--color-foreground)]">
          {value}
        </span>
        {delta == null ? (
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">
            -
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold tabular-nums",
              delta >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            )}
          >
            {formatSigned(delta, 1, suffix)}
          </span>
        )}
      </div>
    </div>
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

function getPatchContextComments(entry: PatchCharacterDelta) {
  return PATCH_CONTEXT_COMMENTS[entry.note.patch]?.[entry.characterNum] ?? [];
}

function buildCausalEvaluationComments(entry: PatchCharacterDelta) {
  return getPatchContextComments(entry);
}

function RoleTable({
  roles,
  copy,
  locale,
  showDescription = true,
}: {
  roles: PatchRoleMetric[];
  copy: PatchAnalysisCopy;
  locale: RouteLocale;
  showDescription?: boolean;
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
            <h2 className="dashboard-section-title mt-2 text-base font-bold text-[var(--color-foreground)] sm:text-lg">
              {copy.role.title}
            </h2>
            {showDescription ? (
              <p className="mt-1 text-base leading-7 text-[var(--color-muted-foreground)]">
                {copy.role.body(bestLabel, worstLabel)}
              </p>
            ) : null}
          </div>
          <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
            {copy.role.rankScope}
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm tabular-nums">
              <thead>
                <tr className="bg-[var(--color-surface-2)]">
                  <th className="border-b border-[var(--color-border)] px-4 py-2.5 text-left text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[0]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2.5 text-right text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[1]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2.5 text-right text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[2]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2.5 text-right text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[3]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2.5 text-right text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[4]}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2.5 text-right text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    {copy.role.columns[5]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role, index) => (
                  <tr key={role.role} className={index === 0 ? "data-table-highlight" : undefined}>
                    <th className="border-b border-[var(--color-border)]/30 px-4 py-2.5 text-left font-semibold text-[var(--color-foreground)]">
                      {getRoleLabel(locale, role.role)}
                    </th>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-2.5 text-right font-semibold text-[var(--color-foreground)]">
                      {formatSigned(role.averageRP, 1)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-2.5 text-right">
                      {role.deltaAverageRP == null ? (
                        <span className="text-[var(--color-muted-foreground)]">-</span>
                      ) : (
                        <DeltaBadge value={role.deltaAverageRP} />
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-2.5 text-right text-[var(--color-muted-foreground)]">
                      {formatPercent(role.winRate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-2.5 text-right text-[var(--color-muted-foreground)]">
                      {formatPercent(role.top3Rate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-4 py-2.5 text-right text-[var(--color-muted-foreground)]">
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
      <div className="home-section-header pb-3">
        <h2 className="dashboard-section-title text-base font-bold text-[var(--color-foreground)]">
          {title}
        </h2>
      </div>
      <div className="mt-4 grid gap-2">
        {entries.map((entry, index) => {
          const displayName = getEntryDisplayName(entry, l10n, fallbackMap);
          const scopeLabel = getScopeLabel(entry, copy, l10n);

          return (
            <div
              key={`${entry.characterNum}-${entry.scopeKey}-${index}`}
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
            >
              <span
                className={cn(
                  "w-6 text-center text-sm font-bold tabular-nums",
                  index < 3
                    ? "text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-muted-foreground)]"
                )}
              >
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
  copy,
  locale,
  l10n,
  fallbackMap,
}: {
  title: string;
  description?: string;
  entries: PatchCharacterDelta[];
  copy: PatchAnalysisCopy;
  locale: RouteLocale;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  if (entries.length === 0) return null;
  const groups = groupEntriesByRole(entries);

  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <div className="home-section-header flex flex-col gap-2 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="dashboard-section-title text-base font-bold text-[var(--color-foreground)] sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-base leading-7 text-[var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
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
                  copy={copy}
                  locale={locale}
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
  const analysisVersions = getPatchAnalysisVersions();
  const bestRole = data.roleMetrics[0];
  const worstRole = data.roleMetrics[data.roleMetrics.length - 1];
  const bestRoleLabel = bestRole ? getRoleLabel(locale, bestRole.role) : "";
  const worstRoleLabel = worstRole ? getRoleLabel(locale, worstRole.role) : "";
  const showDescriptions = data.currentPatch !== "11.4";
  const showRawMetrics = data.currentPatch !== "11.5";

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div
          className={cn(
            "grid gap-3",
            showRawMetrics ? "xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]" : undefined
          )}
        >
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
            {showDescriptions ? (
              <p className="mt-2 max-w-[44rem] text-base leading-7 text-[var(--color-foreground)]">
                {copy.intro}
              </p>
            ) : null}
            {showDescriptions && showRawMetrics && bestRole && worstRole ? (
              <p className="mt-3 max-w-[44rem] text-base leading-7 text-[var(--color-muted-foreground)]">
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
                    className="dashboard-tab"
                    data-active={isActive ? "true" : undefined}
                  >
                    {copy.navLabel(candidate)}
                  </Link>
                );
              })}
            </nav>
          </div>

          {showRawMetrics ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={<CalendarDays className="h-5 w-5" strokeWidth={2} />}
                label={copy.metrics.patch}
                value={`${data.currentPatch}`}
                body={showDescriptions ? copy.metrics.patchBody(data.previousPatch) : undefined}
                tone="blue"
              />
              <MetricCard
                icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
                label={copy.metrics.sample}
                value={copy.metrics.sampleValue(formatNumber(data.totalMatches))}
                body={
                  showDescriptions
                    ? copy.metrics.sampleBody(formatNumber(data.previousTotalMatches))
                    : undefined
                }
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" strokeWidth={2} />}
                label={copy.metrics.buffs}
                value={copy.metrics.count(data.buffed.length)}
                body={showDescriptions ? copy.metrics.buffBody : undefined}
                tone="gold"
              />
              <MetricCard
                icon={<Swords className="h-5 w-5" strokeWidth={2} />}
                label={copy.metrics.nerfs}
                value={copy.metrics.count(data.nerfed.length)}
                body={showDescriptions ? copy.metrics.nerfBody : undefined}
                tone="danger"
              />
            </div>
          ) : null}
        </div>
      </section>

      {showRawMetrics ? (
        <>
          <RoleTable
            roles={data.roleMetrics}
            copy={copy}
            locale={locale}
            showDescription={showDescriptions}
          />

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
        </>
      ) : null}

      {locale === "ko" ? (
        <>
          <CharacterSection
            title={showRawMetrics ? copy.sections.buffTitle : "버프 캐릭터 패치 평가"}
            description={
              showDescriptions
                ? showRawMetrics
                  ? copy.sections.buffDescription
                  : "버프 대상 캐릭터의 패치 내역과 현재 메타 맥락을 정리했습니다."
                : undefined
            }
            entries={data.buffed}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
          <CharacterSection
            title={showRawMetrics ? copy.sections.nerfTitle : "너프 캐릭터 패치 평가"}
            description={
              showDescriptions
                ? showRawMetrics
                  ? copy.sections.nerfDescription
                  : "너프 대상 캐릭터의 패치 내역과 현재 메타 맥락을 정리했습니다."
                : undefined
            }
            entries={data.nerfed}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
          <CharacterSection
            title={showRawMetrics ? copy.sections.mixedTitle : "조정 캐릭터 패치 평가"}
            description={
              showDescriptions
                ? showRawMetrics
                  ? copy.sections.mixedDescription
                  : "버프와 너프가 함께 들어간 캐릭터의 패치 내역과 현재 메타 맥락을 정리했습니다."
                : undefined
            }
            entries={data.mixed}
            copy={copy}
            locale={locale}
            l10n={l10n}
            fallbackMap={fallbackMap}
          />
        </>
      ) : null}

      {showDescriptions && showRawMetrics ? (
        <section className="dashboard-panel p-4 lg:p-6">
          <div className="flex flex-col gap-2">
            <p className="dashboard-kicker">{copy.guideKicker}</p>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              {copy.guideTitle}
            </h2>
            <p className="text-base leading-7 text-[var(--color-muted-foreground)]">
              {copy.guideBody}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
