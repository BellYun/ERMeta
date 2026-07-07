import { Crosshair, Swords, Users2 } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
  canRenderAdSlot,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import { SynergyDetailClient } from "@/components/features/synergy-detail/SynergyDetailClient";
import { getCharacterName } from "@/lib/characterMap";
import { BASE_URL } from "@/lib/siteMetadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseAllyCode(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const code = Number.parseInt(value, 10);
  return Number.isFinite(code) && code > 0 ? code : null;
}

function getFirstParam(
  params: Record<string, string | string[] | undefined>,
  ...keys: string[]
): string | string[] | undefined {
  for (const key of keys) {
    const value = params[key];
    if (value != null) return value;
  }
  return undefined;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const t = await getTranslations("synergyDetailMetadata");
  const ally1 = parseAllyCode(getFirstParam(params, "ally1", "a"));
  const ally2 = parseAllyCode(getFirstParam(params, "ally2", "b"));

  const name1 = ally1 ? getCharacterName(ally1) : null;
  const name2 = ally2 ? getCharacterName(ally2) : null;

  const headline =
    name1 && name2
      ? t("headlinePair", { name1, name2 })
      : name1
        ? t("headlineSingle", { name1 })
        : t("headlineFallback");

  const description =
    name1 && name2
      ? t("descriptionPair", { name1, name2 })
      : name1
        ? t("descriptionSingle", { name1 })
        : t("descriptionFallback");

  const ogQuery = new URLSearchParams();
  if (ally1) ogQuery.set("ally1", String(ally1));
  if (ally2) ogQuery.set("ally2", String(ally2));
  const ogImageUrl = `/synergy-detail/opengraph-image${ogQuery.size ? `?${ogQuery.toString()}` : ""}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: t("title", { headline }),
    description,
    keywords: [
      t("keywords.brand"),
      t("keywords.app"),
      t("keywords.synergy"),
      t("keywords.weapon"),
      t("keywords.trait"),
      t("keywords.detail"),
      ...(name1 ? [t("keywords.character", { name: name1 })] : []),
      ...(name2 ? [t("keywords.character", { name: name2 })] : []),
    ],
    openGraph: {
      title: t("socialTitle", { headline }),
      description,
      url: "/synergy-detail",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("socialTitle", { headline }),
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: "/synergy-detail" },
  };
}

function FlowCard({
  step,
  icon,
  label,
  sublabel,
  accentClass,
  stepClass,
  edgeClass,
}: {
  step: number;
  icon: ReactNode;
  label: string;
  sublabel: string;
  accentClass: string;
  stepClass: string;
  edgeClass: string;
}) {
  return (
    <div
      className={`metric-card px-3 py-3 ${edgeClass}`}
      data-accent={step === 1 ? "true" : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md border ${accentClass}`}
        >
          {icon}
        </div>
        <span className={`text-xs font-semibold ${stepClass}`}>0{step}</span>
      </div>
      <div>
        <p className="mt-2 text-sm font-bold text-[var(--color-foreground)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">{sublabel}</p>
      </div>
    </div>
  );
}

export default function SynergyDetailPage() {
  const t = useTranslations("synergyPage");

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_180px_180px_180px]">
          <div className="flex flex-col justify-center xl:pr-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker">{t("badge")}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("dataNotice")}
              </span>
            </div>

            <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-[42rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
              {t("subtitle")}
            </p>
            <p className="mt-1.5 max-w-[42rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:contents">
            <FlowCard
              step={1}
              icon={
                <Swords
                  className="h-4 w-4 text-[var(--color-muted-foreground)]"
                  strokeWidth={2.2}
                />
              }
              label={t("steps.pool.label")}
              sublabel={t("steps.pool.sublabel")}
              accentClass="border-[var(--color-accent-muted)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
              stepClass="text-[var(--color-accent-foreground)]"
              edgeClass="border-l-2 border-l-[var(--color-accent)]"
            />
            <FlowCard
              step={2}
              icon={
                <Users2
                  className="h-4 w-4 text-[var(--color-muted-foreground)]"
                  strokeWidth={2.2}
                />
              }
              label={t("steps.allies.label")}
              sublabel={t("steps.allies.sublabel")}
              accentClass="border-[var(--color-border)] text-[var(--color-muted-foreground)]"
              stepClass="text-[var(--color-muted-foreground)]"
              edgeClass="border-l-2 border-l-[var(--color-border)]"
            />
            <FlowCard
              step={3}
              icon={
                <Crosshair
                  className="h-4 w-4 text-[var(--color-muted-foreground)]"
                  strokeWidth={2.2}
                />
              }
              label={t("steps.analysis.label")}
              sublabel={t("steps.analysis.sublabel")}
              accentClass="border-[var(--color-border)] text-[var(--color-muted-foreground)]"
              stepClass="text-[var(--color-muted-foreground)]"
              edgeClass="border-l-2 border-l-[var(--color-border)]"
            />
          </div>
        </div>
      </section>

      {canRenderAdSlot(ADSENSE_SLOTS.synergyDetail) ? (
        <AdSlot
          slot={ADSENSE_SLOTS.synergyDetail}
          slotName="synergy_detail_top"
          className="dashboard-panel px-3 py-2.5 sm:px-4"
          reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
        />
      ) : null}

      <SynergyDetailClient />
    </div>
  );
}
