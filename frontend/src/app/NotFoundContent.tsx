"use client";

import { ArrowLeft, Compass, Home, Network, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NotFoundContent.module.css";

const COPY = {
  ko: {
    code: "404",
    title: "페이지를 찾을 수 없습니다",
    body: "주소가 변경되었거나 더 이상 제공하지 않는 페이지입니다.",
    pathLabel: "요청 경로",
    routesLabel: "이동 가능한 주요 경로",
    home: "홈으로 돌아가기",
    back: "이전 페이지",
    character: "캐릭터 분석",
    characterBody: "캐릭터별 통계와 무기 데이터를 확인합니다.",
    synergy: "조합 데이터",
    synergyBody: "내 캐릭터 풀 기준으로 조합 성과를 탐색합니다.",
    patch: "패치 분석",
    patchBody: "최신 패치 메타 변화를 다시 확인합니다.",
  },
  en: {
    code: "404",
    title: "Page Not Found",
    body: "This address has changed or the page is no longer available.",
    pathLabel: "Requested path",
    routesLabel: "Useful destinations",
    home: "Back to Home",
    back: "Previous Page",
    character: "Character Analysis",
    characterBody: "Review character stats and weapon data.",
    synergy: "Team Data",
    synergyBody: "Explore team results around your character pool.",
    patch: "Patch Analysis",
    patchBody: "Check the latest meta shifts by patch.",
  },
  ja: {
    code: "404",
    title: "ページが見つかりません",
    body: "URLが変更されたか、現在は提供されていないページです。",
    pathLabel: "リクエストされたパス",
    routesLabel: "主な移動先",
    home: "ホームへ戻る",
    back: "前のページ",
    character: "キャラクター分析",
    characterBody: "キャラクター別の統計と武器データを確認します。",
    synergy: "編成データ",
    synergyBody: "キャラクタープールを基準に編成結果を探索します。",
    patch: "パッチ分析",
    patchBody: "最新パッチのメタ変化を確認します。",
  },
  "zh-Hans": {
    code: "404",
    title: "找不到页面",
    body: "该地址已变更，或页面不再提供。",
    pathLabel: "请求路径",
    routesLabel: "常用入口",
    home: "返回首页",
    back: "上一页",
    character: "角色分析",
    characterBody: "查看角色统计和武器数据。",
    synergy: "阵容数据",
    synergyBody: "围绕你的角色池探索阵容表现。",
    patch: "版本分析",
    patchBody: "查看最新版本环境变化。",
  },
  "zh-Hant": {
    code: "404",
    title: "找不到頁面",
    body: "此地址已變更，或頁面已不再提供。",
    pathLabel: "請求路徑",
    routesLabel: "常用入口",
    home: "返回首頁",
    back: "上一頁",
    character: "角色分析",
    characterBody: "查看角色統計和武器資料。",
    synergy: "陣容資料",
    synergyBody: "依你的角色池探索陣容表現。",
    patch: "版本分析",
    patchBody: "查看最新版本環境變化。",
  },
} as const;

function getLocaleState(pathname: string | null) {
  if (pathname?.startsWith("/ko")) return { copy: COPY.ko, prefix: "/ko" };
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
  const requestedPath = pathname || "/";
  const routeLinks = [
    {
      href: withPrefix("/character/89"),
      icon: Search,
      title: copy.character,
      body: copy.characterBody,
      image: "/characters/mini/89.webp",
    },
    {
      href: withPrefix("/synergy-detail"),
      icon: Network,
      title: copy.synergy,
      body: copy.synergyBody,
      image: "/characters/mini/88.webp",
    },
    {
      href: withPrefix("/patch-analysis"),
      icon: Compass,
      title: copy.patch,
      body: copy.patchBody,
      image: "/characters/mini/76.webp",
    },
  ];

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        <div className={styles.grid}>
          <div className={styles.primary}>
            <div>
              <span className={styles.kicker}>{copy.code}</span>
              <div className={styles.headerRow}>
                <div className={styles.copyBlock}>
                  <h1 className={styles.title}>{copy.title}</h1>
                  <p className={styles.body}>{copy.body}</p>
                </div>

                <div aria-hidden="true" className={styles.codeMark}>
                  404
                </div>
              </div>
            </div>

            <div className={styles.pathBox}>
              <p className={styles.pathLabel}>{copy.pathLabel}</p>
              <p className={styles.pathValue}>{requestedPath}</p>
            </div>

            <div className={styles.actions}>
              <Link href={withPrefix("/")} className={styles.primaryAction}>
                <Home size={16} aria-hidden="true" />
                {copy.home}
              </Link>
              <button
                type="button"
                onClick={() => window.history.back()}
                className={styles.secondaryAction}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {copy.back}
              </button>
            </div>
          </div>

          <nav aria-label={copy.routesLabel} className={styles.routes}>
            <p className={styles.routesLabel}>{copy.routesLabel}</p>
            {routeLinks.map(({ href, icon: Icon, title, body, image }) => (
              <Link key={href} href={href} className={styles.routeLink}>
                <span className={styles.imageWrap}>
                  <Image src={image} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
                </span>
                <span className={styles.routeCopy}>
                  <span className={styles.routeTitle}>{title}</span>
                  <span className={styles.routeBody}>{body}</span>
                </span>
                <span className={styles.routeIcon}>
                  <Icon size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
