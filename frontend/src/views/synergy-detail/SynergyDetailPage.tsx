import { Crosshair, Sparkles, Swords, Users2 } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
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
}: {
  step: number;
  icon: ReactNode;
  label: string;
  sublabel: string;
  accentClass: string;
}) {
  return (
    <div className="metric-card flex min-h-[108px] flex-col gap-3 px-3 py-3 sm:min-h-[150px] sm:gap-5 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 sm:h-12 sm:w-12 ${accentClass}`}
        >
          {icon}
        </div>
        <span className="text-[11px] font-black tracking-[-0.04em] text-[var(--color-muted-foreground)] sm:text-sm">
          0{step}
        </span>
      </div>
      <div>
        <p className="text-[0.95rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-xl">
          {label}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
          {sublabel}
        </p>
      </div>
    </div>
  );
}

export default function SynergyDetailPage() {
  const t = useTranslations("synergyPage");

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_180px_180px_180px]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4 xl:pr-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent-gold)] sm:px-3 sm:text-sm">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.1} />
                {t("badge")}
              </span>
              <span className="rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-warning)]">
                {t("beta")}
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("dataNotice")}
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.2rem]">
              {t("title")}
            </h1>
            <p className="mt-2.5 max-w-[42rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.05rem]">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:contents">
            <FlowCard
              step={1}
              icon={<Swords className="h-5 w-5 text-[#c084fc]" strokeWidth={2} />}
              label={t("steps.pool.label")}
              sublabel={t("steps.pool.sublabel")}
              accentClass="bg-[rgba(168,85,247,0.14)] text-[#c084fc]"
            />
            <FlowCard
              step={2}
              icon={<Users2 className="h-5 w-5 text-[#60a5fa]" strokeWidth={2} />}
              label={t("steps.allies.label")}
              sublabel={t("steps.allies.sublabel")}
              accentClass="bg-[rgba(59,130,246,0.14)] text-[#60a5fa]"
            />
            <FlowCard
              step={3}
              icon={<Crosshair className="h-5 w-5 text-[#fbbf24]" strokeWidth={2} />}
              label={t("steps.analysis.label")}
              sublabel={t("steps.analysis.sublabel")}
              accentClass="bg-[rgba(251,191,36,0.14)] text-[#fbbf24]"
            />
          </div>
        </div>
      </section>

      <SynergyDetailClient />
    </div>
  );
}
