"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COPY = {
  ko: {
    title: "페이지를 찾을 수 없습니다",
    body: "요청하신 페이지가 존재하지 않습니다.",
    home: "홈으로 돌아가기",
  },
  en: {
    title: "Page Not Found",
    body: "The page you requested does not exist.",
    home: "Back to Home",
  },
  ja: {
    title: "ページが見つかりません",
    body: "指定されたページは存在しません。",
    home: "ホームへ戻る",
  },
  "zh-Hans": {
    title: "找不到页面",
    body: "请求的页面不存在。",
    home: "返回首页",
  },
  "zh-Hant": {
    title: "找不到頁面",
    body: "要求的頁面不存在。",
    home: "返回首頁",
  },
} as const;

function getCopy(pathname: string | null) {
  if (pathname?.startsWith("/en")) return COPY.en;
  if (pathname?.startsWith("/ja")) return COPY.ja;
  if (pathname?.startsWith("/zh-Hans")) return COPY["zh-Hans"];
  if (pathname?.startsWith("/zh-Hant")) return COPY["zh-Hant"];
  return COPY.ko;
}

export function NotFoundContent() {
  const pathname = usePathname();
  const copy = getCopy(pathname);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{copy.title}</h2>
      <p className="text-sm text-[var(--color-muted-foreground)]">{copy.body}</p>
      <Link
        href="/"
        className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-foreground)]"
      >
        {copy.home}
      </Link>
    </div>
  );
}
