import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";
import assassinsData from "../../../../../public/data/lab/assassins.json";
import rangersData from "../../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../public/data/lab/warriors.json";

export const dynamic = "force-static";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const ROLES = [
  { slug: "rangers", data: rangersData },
  { slug: "skilldealers", data: skilldealersData },
  { slug: "tanks", data: tanksData },
  { slug: "warriors", data: warriorsData },
  { slug: "assassins", data: assassinsData },
  { slug: "supports", data: supportsData },
] as const;

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
      "이터널리턴 캐릭터를 시너지 패턴별로 묶어 직업군마다 잘 맞는 조합과 맞지 않는 조합을 누적 통계로 보여줍니다.",
    kicker: "누적 통계 기준",
    subtitle: "ER&GG는 캐릭터별 시너지 패턴을 누적 랭크 데이터로 다시 묶어 보여줍니다.",
    body: "비슷한 시너지를 가진 캐릭터끼리 묶었습니다. 그룹별로 어떤 조합에서 잘 나오고 어떤 조합에서 못 나오는지 보세요.",
    analyzedCharacters: "분석 캐릭터",
    roles: "직업군",
    totalGroups: "총 시너지 그룹",
    sectionTitle: "직업군 클러스터링",
    sectionMeta: "주요 패치 10 기준 누적",
    groupType: "유형 그룹",
    characterCount: (count: number) => `캐릭터 ${count}종`,
    groupCount: (count: number) => `시너지 그룹 ${count}개`,
    curated: (count: number) => `큐레이팅 ${count}`,
    minSample: "최소 표본",
    gamesPlus: (count: number) => `${count}판+`,
  },
  en: {
    title: "Role Groups",
    metadataTitle: "Role Groups - character synergy clusters",
    description: "Character role groups based on cumulative Eternal Return synergy patterns.",
    kicker: "Cumulative data",
    subtitle: "ER&GG groups characters by recurring synergy patterns in ranked data.",
    body: "Use this overview to compare role groups before opening detailed Korean-source cluster data.",
    analyzedCharacters: "Characters",
    roles: "Roles",
    totalGroups: "Synergy groups",
    sectionTitle: "Role Clusters",
    sectionMeta: "Cumulative across tracked patches",
    groupType: "Role group",
    characterCount: (count: number) => `${count} characters`,
    groupCount: (count: number) => `${count} groups`,
    curated: (count: number) => `${count} curated`,
    minSample: "Minimum sample",
    gamesPlus: (count: number) => `${count}+ games`,
  },
  ja: {
    title: "ロールグループ",
    metadataTitle: "ロールグループ - キャラクター相性クラスタ",
    description: "Eternal Return の累積相性パターンを基準にしたキャラクターグループです。",
    kicker: "累積データ基準",
    subtitle: "ER&GGはランクデータの相性パターンでキャラクターを分類します。",
    body: "詳細クラスタを見る前に、ロール別の規模とサンプル基準を確認できます。",
    analyzedCharacters: "分析キャラクター",
    roles: "ロール",
    totalGroups: "相性グループ",
    sectionTitle: "ロールクラスタ",
    sectionMeta: "追跡パッチ累積",
    groupType: "ロールグループ",
    characterCount: (count: number) => `${count}体`,
    groupCount: (count: number) => `${count}グループ`,
    curated: (count: number) => `整理済み ${count}`,
    minSample: "最小サンプル",
    gamesPlus: (count: number) => `${count}試合+`,
  },
  "zh-Hans": {
    title: "角色分组",
    metadataTitle: "角色分组 - 角色协同聚类",
    description: "基于 Eternal Return 累积协同模式的角色分组。",
    kicker: "累计数据基准",
    subtitle: "ER&GG 会按排位数据中的协同模式重新整理角色。",
    body: "在查看详细聚类前，可以先比较各定位的规模和样本基准。",
    analyzedCharacters: "分析角色",
    roles: "定位",
    totalGroups: "协同分组",
    sectionTitle: "定位聚类",
    sectionMeta: "追踪版本累计",
    groupType: "定位分组",
    characterCount: (count: number) => `${count} 名角色`,
    groupCount: (count: number) => `${count} 个分组`,
    curated: (count: number) => `已整理 ${count}`,
    minSample: "最小样本",
    gamesPlus: (count: number) => `${count} 场+`,
  },
  "zh-Hant": {
    title: "角色分組",
    metadataTitle: "角色分組 - 角色協同聚類",
    description: "基於 Eternal Return 累積協同模式的角色分組。",
    kicker: "累計資料基準",
    subtitle: "ER&GG 會按牌位資料中的協同模式重新整理角色。",
    body: "在查看詳細聚類前，可以先比較各定位的規模與樣本基準。",
    analyzedCharacters: "分析角色",
    roles: "定位",
    totalGroups: "協同分組",
    sectionTitle: "定位聚類",
    sectionMeta: "追蹤版本累計",
    groupType: "定位分組",
    characterCount: (count: number) => `${count} 名角色`,
    groupCount: (count: number) => `${count} 個分組`,
    curated: (count: number) => `已整理 ${count}`,
    minSample: "最小樣本",
    gamesPlus: (count: number) => `${count} 場+`,
  },
} as const;

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

export default async function CharacterLabPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  const copy = COPY[locale];
  const roleLabels = ROLE_LABELS[locale];

  const totalCharacters = ROLES.reduce((sum, r) => sum + r.data.characters.length, 0);
  const totalGroups = ROLES.reduce((sum, r) => sum + r.data.groupK, 0);

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
        </dl>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
            {copy.sectionTitle}
          </h2>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">{copy.sectionMeta}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(({ slug, data }, index) => {
            const curatedGroups = data.groups.filter((g) => g.curated).length;
            return (
              <li key={slug}>
                <Link
                  href={`/character-lab/${slug}`}
                  className="char-card group flex h-full flex-col gap-3 p-5 transition-colors"
                  data-accent={index === 0 ? "true" : undefined}
                >
                  <header className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      {copy.groupType}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-accent-foreground)]"
                      strokeWidth={2.2}
                    />
                  </header>
                  <div>
                    <p className="text-lg font-bold leading-tight tracking-tight text-[var(--color-foreground)]">
                      {roleLabels[slug]}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {copy.characterCount(data.characters.length)} · {copy.groupCount(data.groupK)}
                      {curatedGroups > 0 ? ` (${copy.curated(curatedGroups)})` : ""}
                    </p>
                  </div>
                  <dl className="mt-auto border-t border-[var(--color-border)] pt-3 text-[11px]">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-[var(--color-muted-foreground)]">{copy.minSample}</dt>
                      <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
                        {copy.gamesPlus(data.minGames)}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
