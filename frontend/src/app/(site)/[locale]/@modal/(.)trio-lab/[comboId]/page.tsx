import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TrioLabDetailContent } from "@/components/features/trio-lab/TrioLabDetailContent";
import { TrioLabDetailModalShell } from "@/components/features/trio-lab/TrioLabDetailModalShell";
import {
  buildTrioLabListHref,
  buildTrioLabQueryString,
  parseTrioLabUrlState,
} from "@/components/features/trio-lab/urlState";
import { isRouteLocale } from "@/i18n/routing";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface ModalPageProps {
  params: Promise<{ locale: string; comboId: string }>;
  searchParams: SearchParams;
}

export default async function TrioLabDetailModalPage({ params, searchParams }: ModalPageProps) {
  const [{ locale, comboId }, query] = await Promise.all([params, searchParams]);

  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const state = parseTrioLabUrlState(query);
  const listHref = buildTrioLabListHref(state);
  const detailHrefQueryString = buildTrioLabQueryString(state);

  return (
    <TrioLabDetailModalShell closeHref={listHref}>
      <TrioLabDetailContent
        comboId={comboId}
        detailHrefQueryString={detailHrefQueryString}
        listHref={listHref}
        locale={locale}
      />
    </TrioLabDetailModalShell>
  );
}
