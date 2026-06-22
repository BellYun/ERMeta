"use client";

import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { NoIndexMeta } from "@/components/seo/NoIndexMeta";
import { Link } from "@/i18n/navigation";
import { captureException } from "@/lib/sentry-client";

export default function SynergyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("pageError");

  useEffect(() => {
    captureException(error, {
      tags: { errorBoundary: "page", page: "synergy-detail" },
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <NoIndexMeta />
      <AlertTriangle className="h-10 w-10 text-[var(--color-danger)]" />
      <h2 className="dashboard-section-title text-base font-semibold text-[var(--color-foreground)]">
        {t("synergyDetailLoadFailed")}
      </h2>
      <p className="text-xs text-[var(--color-muted-foreground)] max-w-sm">{t("description")}</p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={reset}
          className="dashboard-tab inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
          data-active="true"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("retry")}
        </button>
        <Link href="/" className="dashboard-tab inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
