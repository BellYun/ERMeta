import { Crosshair, Sparkles, Swords, Users2 } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SynergyDetailClient } from "@/components/features/synergy-detail/SynergyDetailClient";
import { getCharacterName } from "@/lib/characterMap";

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
    <div className="metric-card flex min-h-[150px] flex-col gap-5 px-5 py-5">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 ${accentClass}`}
        >
          {icon}
        </div>
        <span className="text-sm font-black tracking-[-0.04em] text-[var(--color-muted-foreground)]">
          0{step}
        </span>
      </div>
      <div>
        <p className="text-xl font-black tracking-[-0.04em] text-[var(--color-foreground)]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{sublabel}</p>
      </div>
    </div>
  );
}

export default function SynergyDetailPage() {
  const t = useTranslations("synergyPage");

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-4 py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_180px_180px_180px]">
          <div className="flex flex-col justify-center px-2 py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-3 py-1 text-sm font-semibold text-[var(--color-accent-gold)]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.1} />
                {t("badge")}
              </span>
              <span className="rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-warning)]">
                {t("beta")}
              </span>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {t("dataNotice")}
              </span>
            </div>

            <h1 className="mt-4 text-[2.2rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] lg:text-[3.2rem]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-[42rem] text-base leading-7 text-[var(--color-foreground)]/88 lg:text-[1.05rem]">
              {t("subtitle")}
            </p>
          </div>

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
      </section>

      <SynergyDetailClient />
    </div>
  );
}
