import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LabPageContent } from "@/components/features/lab/LabPageContent";
import type { LabData } from "@/components/features/lab/types";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { localizeRoutePath } from "@/lib/seoLocales";
import assassinsData from "../../../../../../public/data/lab/assassins.json";
import rangersData from "../../../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../../public/data/lab/warriors.json";

const SUPPORTED_ROLES = [
  "rangers",
  "skilldealers",
  "tanks",
  "warriors",
  "assassins",
  "supports",
] as const;
type SupportedRole = (typeof SUPPORTED_ROLES)[number];

const LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: rangersData as LabData,
  skilldealers: skilldealersData as LabData,
  tanks: tanksData as LabData,
  warriors: warriorsData as LabData,
  assassins: assassinsData as LabData,
  supports: supportsData as LabData,
};

const ROLE_LABELS: Record<RouteLocale, Record<SupportedRole, string>> = {
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
    back: "실험체 유형 분석",
    title: (role: string) => `${role} 시너지 그룹`,
    badge: "패치 무관 누적 통계 · 시즌 전체 기준",
    body: (games: string) =>
      `실험체마다 어떤 3인 조합에서 평균 RP가 잘 나오는지 누적 통계로 정리합니다. 표본 ${games}판 미만 조합은 제외합니다.`,
  },
  en: {
    back: "Role Groups",
    title: (role: string) => `${role} Synergy Groups`,
    badge: "Cumulative data across tracked patches",
    body: (games: string) =>
      `This overview uses cumulative ranked samples. Groups below ${games} games are excluded from the source data.`,
  },
  ja: {
    back: "ロールグループ",
    title: (role: string) => `${role} 相性グループ`,
    badge: "追跡パッチ累積データ",
    body: (games: string) =>
      `累積ランクサンプルを基準にしています。元データでは${games}試合未満の編成を除外しています。`,
  },
  "zh-Hans": {
    back: "角色分组",
    title: (role: string) => `${role} 协同分组`,
    badge: "追踪版本累计数据",
    body: (games: string) => `基于累计排位样本。源数据会排除低于 ${games} 场的阵容。`,
  },
  "zh-Hant": {
    back: "角色分組",
    title: (role: string) => `${role} 協同分組`,
    badge: "追蹤版本累計資料",
    body: (games: string) => `基於累計牌位樣本。來源資料會排除低於 ${games} 場的陣容。`,
  },
} as const;

interface LegacyCharacterLabRolePageProps {
  params: Promise<{ locale: string; role: string }>;
}

export async function LegacyCharacterLabRolePage({ params }: LegacyCharacterLabRolePageProps) {
  const { locale, role } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  if (!SUPPORTED_ROLES.includes(role as SupportedRole)) notFound();

  const supportedRole = role as SupportedRole;
  const data = LAB_DATA[supportedRole];
  const copy = COPY[locale];
  const roleLabel = ROLE_LABELS[locale][supportedRole];
  const minGames = data.minGames.toLocaleString("ko-KR");

  return (
    <main className="page-shell mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href={localizeRoutePath("/character-lab", locale)}
          className="dashboard-tab inline-flex items-center gap-1 px-2 py-1"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          {copy.back}
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="text-[var(--color-foreground)]">{roleLabel}</span>
      </nav>

      <header className="dashboard-panel mb-5 flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="dashboard-section-title text-xl font-bold text-[var(--color-foreground)]">
            {copy.title(roleLabel)}
          </h1>
          <span className="rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-accent-foreground)]">
            {copy.badge}
          </span>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{copy.body(minGames)}</p>
      </header>

      {locale === "ko" ? (
        <LabPageContent data={data} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="metric-card px-4 py-4" data-accent="true">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.back}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-accent-foreground)]">
              {data.characters.length}
            </p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.title(roleLabel)}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">{data.groupK}</p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.badge}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
              {data.minGames}+
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
