import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CharacterDetailGrid,
  SimilarBlock,
  TraitComboBlock,
  type CharacterDetailData,
} from "@/components/features/trio-lab/ComboDetailBody";
import { ComboDetailHero } from "@/components/features/trio-lab/ComboDetailHero";
import {
  fetchTopEquipmentBuild,
  fetchTopTraitBuild,
  fetchTrioWeaponRows,
} from "@/components/features/trio-lab/serverApi";
import {
  apiRowToCombo,
  buildComboId,
  mergeApiRowsByComboId,
  parseComboId,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "@/components/features/trio-lab/types";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { localizeRoutePath } from "@/lib/seoLocales";
import { loadL10nMap, loadL10nRecord } from "@/lib/serverL10n";
import { resolveWeaponName } from "@/lib/weaponMap";
import { getTraitGroup } from "@/utils/traitCodes";
import { filterRowsByPool } from "./searchRequests";

const TIER_LABEL = "다이아+";
const DETAIL_TRIO_ROW_LIMIT = "5000";

const DETAIL_COPY: Record<
  RouteLocale,
  {
    kicker: string;
    title: string;
    subtitle: string;
    patch: string;
    tier: string;
    matches: string;
    winRate: string;
    averageRP: string;
    averageRank: string;
    sample: string;
    members: string;
    dataNote: string;
    back: string;
  }
> = {
  ko: {
    kicker: "조합 실험실",
    title: "조합 상세",
    subtitle: "무기별 3인 조합 통계를 기반으로 핵심 성과를 정리했습니다.",
    patch: "패치",
    tier: "다이아+",
    matches: "매치",
    winRate: "승률",
    averageRP: "평균 RP",
    averageRank: "평균 순위",
    sample: "표본",
    members: "구성",
    dataNote: "선택한 무기와 다이아+ 매치 표본을 기준으로 계산한 요약입니다.",
    back: "실험실로 돌아가기",
  },
  en: {
    kicker: "Trio Lab",
    title: "Composition Detail",
    subtitle: "A compact readout of the trio's weapon-specific ranked performance.",
    patch: "Patch",
    tier: "Diamond+",
    matches: "matches",
    winRate: "Win rate",
    averageRP: "Average RP",
    averageRank: "Average place",
    sample: "Sample",
    members: "Members",
    dataNote: "Summary based on the selected weapons and Diamond+ ranked match samples.",
    back: "Back to Trio Lab",
  },
  ja: {
    kicker: "編成ラボ",
    title: "編成詳細",
    subtitle: "武器別のランク戦データから、3人編成の主要指標を整理しました。",
    patch: "パッチ",
    tier: "ダイヤ+",
    matches: "試合",
    winRate: "勝率",
    averageRP: "平均RP",
    averageRank: "平均順位",
    sample: "サンプル",
    members: "構成",
    dataNote: "選択した武器とダイヤ以上のランク戦サンプルを基準にした要約です。",
    back: "編成ラボへ戻る",
  },
  "zh-Hans": {
    kicker: "阵容实验室",
    title: "阵容详情",
    subtitle: "基于武器维度的排位数据，整理三人阵容的核心表现。",
    patch: "版本",
    tier: "钻石+",
    matches: "场",
    winRate: "胜率",
    averageRP: "平均 RP",
    averageRank: "平均名次",
    sample: "样本",
    members: "成员",
    dataNote: "基于所选武器和钻石以上排位样本计算的摘要。",
    back: "返回阵容实验室",
  },
  "zh-Hant": {
    kicker: "陣容實驗室",
    title: "陣容詳細",
    subtitle: "根據武器維度的積分資料，整理三人陣容的核心表現。",
    patch: "版本",
    tier: "鑽石+",
    matches: "場",
    winRate: "勝率",
    averageRP: "平均 RP",
    averageRank: "平均名次",
    sample: "樣本",
    members: "成員",
    dataNote: "根據所選武器與鑽石以上積分樣本計算的摘要。",
    back: "返回陣容實驗室",
  },
};

function findExactMatch(
  rows: ApiTrioWeaponRow[],
  members: TrioWeaponMember[]
): TrioWeaponCombo | null {
  const wantedId = buildComboId(members);
  const row = rows.find((candidate) => apiRowToCombo(candidate).id === wantedId);
  return row ? apiRowToCombo(row) : null;
}

function sortMembersByCharacter(members: TrioWeaponMember[]): TrioWeaponMember[] {
  return [...members].sort((a, b) => a.character - b.character);
}

async function loadComboData(members: TrioWeaponMember[]) {
  const [m1, m2, m3] = sortMembersByCharacter(members);
  const similarRows = await fetchTrioWeaponRows({
    character1: String(m1.character),
    weapon1: String(m1.weapon),
    character2: String(m2.character),
    weapon2: String(m2.weapon),
    sortBy: "totalGames",
    limit: DETAIL_TRIO_ROW_LIMIT,
  });
  const detailRows = filterRowsByPool(similarRows, [m1.character, m2.character, m3.character]);

  let combo = findExactMatch(detailRows, members);
  let comboRows = detailRows;
  if (!combo) {
    combo = findExactMatch(similarRows, members);
    comboRows = similarRows;
  }
  if (!combo) {
    const fallback = await fetchTrioWeaponRows({
      character1: String(m1.character),
      sortBy: "totalGames",
      limit: DETAIL_TRIO_ROW_LIMIT,
    });
    combo = findExactMatch(fallback, members);
    if (combo) comboRows = fallback;
  }

  return { combo, trioRows: comboRows, similarRows };
}

function buildSimilarCombos(rows: ApiTrioWeaponRow[], currentId: string): TrioWeaponCombo[] {
  return mergeApiRowsByComboId(rows)
    .filter((combo) => combo.id !== currentId)
    .slice(0, 4);
}

function findTopTraitRow(rows: ApiTrioWeaponRow[], currentId: string): ApiTrioWeaponRow | null {
  return (
    rows
      .filter((row) => apiRowToCombo(row).id === currentId)
      .sort((a, b) => b.averageRP - a.averageRP || b.totalGames - a.totalGames)[0] ?? null
  );
}

function getMainCoreForMember(row: ApiTrioWeaponRow | null, member: TrioWeaponMember) {
  if (!row) return null;
  if (row.character1 === member.character && row.weaponType1 === member.weapon)
    return row.mainCore1;
  if (row.character2 === member.character && row.weaponType2 === member.weapon)
    return row.mainCore2;
  if (row.character3 === member.character && row.weaponType3 === member.weapon)
    return row.mainCore3;
  return null;
}

function LocalizedComboSummary({
  combo,
  listHref,
  locale,
  patchVersion,
}: {
  combo: TrioWeaponCombo;
  listHref: string;
  locale: RouteLocale;
  patchVersion: string;
}) {
  const copy = DETAIL_COPY[locale];
  const l10n = loadL10nMap(LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const fallbackMap = buildFallbackMap();
  const localizedListHref = localizeRoutePath(listHref, locale);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--surface-1)] px-5 py-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
          <span>{copy.kicker}</span>
          <span aria-hidden="true">/</span>
          <span>
            {copy.patch} {patchVersion}
          </span>
          <span aria-hidden="true">/</span>
          <span>{copy.tier}</span>
          <span aria-hidden="true">/</span>
          <span>
            {combo.totalGames.toLocaleString(locale)} {copy.matches}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-[var(--color-foreground)] sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 sm:grid-cols-3">
          {combo.members.map((member) => {
            const name = resolveCharacterName(member.character, l10n, fallbackMap);
            const weapon = resolveWeaponName(member.weapon, l10n);
            return (
              <div
                key={`${member.character}-${member.weapon}`}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--surface-2)] px-4 py-4"
              >
                <div className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                  {copy.members}
                </div>
                <div className="mt-2 text-lg font-bold text-[var(--color-foreground)]">{name}</div>
                <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">{weapon}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--surface-2)] p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{copy.winRate}</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
                {combo.winRate.toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{copy.averageRP}</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
                {combo.averageRP > 0 ? "+" : ""}
                {combo.averageRP.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{copy.averageRank}</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
                #{combo.averageRank.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{copy.sample}</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
                {combo.totalGames.toLocaleString(locale)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-muted-foreground)]">{copy.dataNote}</p>
        <Link
          href={localizedListHref}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-primary-foreground)]"
        >
          {copy.back}
        </Link>
      </div>
    </section>
  );
}

interface TrioLabDetailContentProps {
  comboId: string;
  detailHrefQueryString: string;
  listHref: string;
  locale: RouteLocale;
}

export async function TrioLabDetailContent({
  comboId,
  detailHrefQueryString,
  listHref,
  locale,
}: TrioLabDetailContentProps) {
  const members = parseComboId(comboId);
  if (!members) notFound();

  const normalizedId = buildComboId(members);
  const patchVersion = getStatsPatchVersions()[0];
  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const l10nRecord = loadL10nRecord(language) ?? {};
  const traitNames: Record<number, string> = {};

  for (const key of Object.keys(l10nRecord)) {
    if (!key.startsWith("Trait/Name/")) continue;
    const code = Number(key.slice("Trait/Name/".length));
    if (Number.isFinite(code) && code > 0) {
      traitNames[code] = l10nRecord[key];
    }
  }

  const { combo, trioRows, similarRows } = await loadComboData(members);
  if (!combo) notFound();

  if (locale !== "ko") {
    return (
      <LocalizedComboSummary
        combo={combo}
        listHref={listHref}
        locale={locale}
        patchVersion={patchVersion}
      />
    );
  }

  const topTraitRow = findTopTraitRow(trioRows, normalizedId);

  const memberDetails = await Promise.all(
    combo.members.map(async (member) => {
      const comboMainCore = getMainCoreForMember(topTraitRow, member);
      const trait = await fetchTopTraitBuild(
        member.character,
        member.weapon,
        patchVersion,
        comboMainCore
      );
      const displayTrait =
        trait && comboMainCore != null
          ? {
              ...trait,
              mainGroup: getTraitGroup(comboMainCore),
              mainCore: comboMainCore,
              mainCoreSource: "combo" as const,
              mainCoreGames: topTraitRow?.totalGames ?? 0,
              mainCoreWinRate: topTraitRow?.winRate ?? 0,
              mainCorePickRate: 0,
            }
          : trait;
      const build = await fetchTopEquipmentBuild(
        member.character,
        member.weapon,
        patchVersion,
        comboMainCore ?? trait?.mainCore ?? null
      );
      return { member, topTrait: displayTrait, topBuild: build };
    })
  );

  const characterDetails: CharacterDetailData[] = memberDetails.map((d) => ({
    member: d.member,
    patchVersion,
    topTrait: d.topTrait,
    topBuild: d.topBuild,
    traitNames,
  }));

  const similar = buildSimilarCombos(similarRows, normalizedId);

  return (
    <>
      <ComboDetailHero
        combo={combo}
        listHref={listHref}
        patchVersion={patchVersion}
        tier={TIER_LABEL}
      />
      <div className="flex min-w-0 flex-col gap-5">
        <CharacterDetailGrid rows={characterDetails} />
        <TraitComboBlock combo={combo} rows={trioRows} traitNames={traitNames} />
        <SimilarBlock
          detailHrefQueryString={detailHrefQueryString}
          listHref={listHref}
          similar={similar}
        />
      </div>
    </>
  );
}
