"use client";

import { ArrowLeft, Home, Network, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COPY = {
  ko: {
    code: "404",
    title: "페이지를 찾을 수 없습니다",
    body: "주소가 변경되었거나 더 이상 제공하지 않는 페이지입니다.",
    home: "홈으로 돌아가기",
    back: "이전 페이지",
    character: "캐릭터 분석",
    synergy: "조합 데이터",
  },
  en: {
    code: "404",
    title: "Page Not Found",
    body: "This address has changed or the page is no longer available.",
    home: "Back to Home",
    back: "Previous Page",
    character: "Character Analysis",
    synergy: "Team Data",
  },
  ja: {
    code: "404",
    title: "ページが見つかりません",
    body: "URLが変更されたか、現在は提供されていないページです。",
    home: "ホームへ戻る",
    back: "前のページ",
    character: "キャラクター分析",
    synergy: "編成データ",
  },
  "zh-Hans": {
    code: "404",
    title: "找不到页面",
    body: "该地址已变更，或页面不再提供。",
    home: "返回首页",
    back: "上一页",
    character: "角色分析",
    synergy: "阵容数据",
  },
  "zh-Hant": {
    code: "404",
    title: "找不到頁面",
    body: "此地址已變更，或頁面已不再提供。",
    home: "返回首頁",
    back: "上一頁",
    character: "角色分析",
    synergy: "陣容資料",
  },
} as const;

function getLocaleState(pathname: string | null) {
  if (pathname?.startsWith("/en")) return { copy: COPY.en, prefix: "/en" };
  if (pathname?.startsWith("/ja")) return { copy: COPY.ja, prefix: "/ja" };
  if (pathname?.startsWith("/zh-Hans")) return { copy: COPY["zh-Hans"], prefix: "/zh-Hans" };
  if (pathname?.startsWith("/zh-Hant")) return { copy: COPY["zh-Hant"], prefix: "/zh-Hant" };
  return { copy: COPY.ko, prefix: "" };
}

export function NotFoundContent() {
  const pathname = usePathname();
  const { copy, prefix } = getLocaleState(pathname);
  const withPrefix = (href: string) => `${prefix}${href}`;

  return (
    <main className="page-shell mx-auto flex min-h-[min(720px,calc(100vh-7rem))] max-w-5xl items-center px-3 py-8 sm:px-5">
      <section className="dashboard-panel w-full p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="min-w-0">
            <span className="dashboard-kicker">{copy.code}</span>
            <h1 className="dashboard-section-title mt-3 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-[44rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem]">
              {copy.body}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={withPrefix("/")} className="dashboard-tab gap-2" data-active="true">
                <Home className="h-4 w-4" aria-hidden="true" />
                {copy.home}
              </Link>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="dashboard-tab gap-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.back}
              </button>
            </div>
          </div>

          <nav
            aria-label={copy.title}
            className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
          >
            <Link
              href={withPrefix("/character/1")}
              className="group grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-transparent px-2.5 py-2.5 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="truncate text-sm font-bold text-[var(--color-foreground)]">
                {copy.character}
              </span>
            </Link>
            <Link
              href={withPrefix("/synergy-detail")}
              className="group grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-transparent px-2.5 py-2.5 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]">
                <Network className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="truncate text-sm font-bold text-[var(--color-foreground)]">
                {copy.synergy}
              </span>
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
