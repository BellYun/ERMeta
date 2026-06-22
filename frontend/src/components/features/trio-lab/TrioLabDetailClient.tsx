"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { getStatsPatchVersions } from "@/data/patch-notes";
import type { RouteLocale } from "@/i18n/routing";
import { getTraitGroup } from "@/utils/traitCodes";
import {
  CharacterDetailGrid,
  SimilarBlock,
  TraitComboBlock,
  type CharacterDetailData,
  type TopEquipmentBuild,
  type TopTraitBuild,
  type TraitSecondaryInfo,
  type TraitSubOption,
} from "./ComboDetailBody";
import { ComboDetailHero } from "./ComboDetailHero";
import { filterRowsByPool } from "./searchRequests";
import {
  apiRowToCombo,
  buildComboId,
  mergeApiRowsByComboId,
  parseComboId,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "./types";
import { buildTrioLabListHref, buildTrioLabQueryString, parseTrioLabUrlState } from "./urlState";

const TIER_LABEL = "다이아+";
const DETAIL_TRIO_ROW_LIMIT = "5000";
const TRAIT_MIN_SAMPLE = 20;

interface TraitMainGroupRaw {
  mainGroup: TopTraitBuild["mainGroup"];
  totalGames: number;
  groupPickRate: number;
  groupWinRate: number;
  mainCoreOptions: TraitSubOption[];
  sub1Options: TraitSubOption[];
  sub2Options: TraitSubOption[];
  secondaries?: TraitSecondaryInfo[];
}

interface TrioLabDetailData {
  combo: TrioWeaponCombo;
  trioRows: ApiTrioWeaponRow[];
  similar: TrioWeaponCombo[];
  characterDetails: CharacterDetailData[];
}

interface TrioLabDetailClientProps {
  comboId: string;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function fetchTrioWeaponRows(
  searchParams: Record<string, string>,
  signal: AbortSignal
): Promise<ApiTrioWeaponRow[]> {
  const qs = new URLSearchParams(searchParams).toString();
  const data = await fetchJson<{ results?: ApiTrioWeaponRow[] }>(
    `/api/stats/trios-weapon?${qs}`,
    signal
  );
  return data?.results ?? [];
}

function sortMembersByCharacter(members: TrioWeaponMember[]): TrioWeaponMember[] {
  return [...members].sort((a, b) => a.character - b.character);
}

function findExactMatch(
  rows: ApiTrioWeaponRow[],
  members: TrioWeaponMember[]
): TrioWeaponCombo | null {
  const wantedId = buildComboId(members);
  const row = rows.find((candidate) => apiRowToCombo(candidate).id === wantedId);
  return row ? apiRowToCombo(row) : null;
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

function pickByPick(options: TraitSubOption[]): TraitSubOption | null {
  if (options.length === 0) return null;
  return [...options].sort((a, b) => b.pickRate - a.pickRate)[0];
}

function pickByWin(options: TraitSubOption[]): TraitSubOption | null {
  if (options.length === 0) return null;
  const qualified = options.filter((option) => option.totalGames >= TRAIT_MIN_SAMPLE);
  if (qualified.length > 0) {
    return [...qualified].sort((a, b) => b.winRate - a.winRate)[0];
  }
  return pickByPick(options);
}

async function fetchTopTraitBuild(
  member: TrioWeaponMember,
  patchVersion: string,
  preferredMainCore: number | null,
  signal: AbortSignal
): Promise<TopTraitBuild | null> {
  const qs = new URLSearchParams({
    characterCode: String(member.character),
    bestWeapon: String(member.weapon),
    patchVersion,
  });
  const data = await fetchJson<{ builds?: TraitMainGroupRaw[] }>(
    `/api/builds/traits/main?${qs.toString()}`,
    signal
  );
  const groups = data?.builds ?? [];
  if (groups.length === 0) return null;

  const preferredGroup = getTraitGroup(preferredMainCore);
  const top =
    (preferredGroup !== "unknown"
      ? groups.find((group) => group.mainGroup === preferredGroup)
      : null) ?? [...groups].sort((a, b) => b.groupPickRate - a.groupPickRate)[0];

  const mainCorePopular = pickByPick(top.mainCoreOptions);
  const mainCoreBest = pickByWin(top.mainCoreOptions);
  const sub1Best = pickByWin(top.sub1Options);
  const sub2Best = pickByWin(top.sub2Options);
  const topSec =
    top.secondaries
      ?.filter((secondary) => secondary.secGroup !== top.mainGroup)
      .sort((a, b) => b.pickRate - a.pickRate)[0] ?? null;
  const subOpt1 = topSec ? pickByPick(topSec.optionTrait1Options) : null;
  const subOpt2 = topSec ? pickByPick(topSec.optionTrait2Options) : null;

  return {
    mainGroup: top.mainGroup,
    totalGames: top.totalGames,
    groupPickRate: top.groupPickRate,
    groupWinRate: top.groupWinRate,
    mainCore: mainCoreBest?.code ?? null,
    mainCorePickRate: mainCoreBest?.pickRate ?? 0,
    mainCoreWinRate: mainCoreBest?.winRate ?? 0,
    mainCoreGames: mainCoreBest?.totalGames ?? 0,
    popularCore: mainCorePopular?.code ?? null,
    popularCorePickRate: mainCorePopular?.pickRate ?? 0,
    popularCoreWinRate: mainCorePopular?.winRate ?? 0,
    sub1: sub1Best?.code ?? null,
    sub1WinRate: sub1Best?.winRate ?? 0,
    sub2: sub2Best?.code ?? null,
    sub2WinRate: sub2Best?.winRate ?? 0,
    secondaryGroup: topSec?.secGroup ?? null,
    secondaryPickRate: topSec?.pickRate ?? 0,
    secondaryWinRate: topSec?.winRate ?? 0,
    secondaryOpt1: subOpt1?.code ?? null,
    secondaryOpt1PickRate: subOpt1?.pickRate ?? 0,
    secondaryOpt1WinRate: subOpt1?.winRate ?? 0,
    secondaryOpt2: subOpt2?.code ?? null,
    secondaryOpt2PickRate: subOpt2?.pickRate ?? 0,
    secondaryOpt2WinRate: subOpt2?.winRate ?? 0,
    mainCoreOptions: top.mainCoreOptions,
    sub1Options: top.sub1Options,
    sub2Options: top.sub2Options,
    secondaries: top.secondaries?.filter(
      (secondary) => secondary.secGroup !== top.mainGroup && secondary.totalGames > 0
    ),
  };
}

async function fetchTopEquipmentBuild(
  member: TrioWeaponMember,
  patchVersion: string,
  mainCore: number | null,
  signal: AbortSignal
): Promise<TopEquipmentBuild | null> {
  const qs = new URLSearchParams({
    characterCode: String(member.character),
    bestWeapon: String(member.weapon),
    patchVersion,
    legendOnly: "1",
  });
  if (mainCore != null) qs.set("mainCore", String(mainCore));
  const data = await fetchJson<{ topBuilds?: TopEquipmentBuild[] }>(
    `/api/builds/equipment?${qs.toString()}`,
    signal
  );
  return data?.topBuilds?.[0] ?? null;
}

async function loadComboData(
  members: TrioWeaponMember[],
  traitNames: Record<number, string>,
  signal: AbortSignal
): Promise<TrioLabDetailData | null> {
  const [m1, m2, m3] = sortMembersByCharacter(members);
  const patchVersion = getStatsPatchVersions()[0];
  const normalizedId = buildComboId(members);
  const similarRows = await fetchTrioWeaponRows(
    {
      character1: String(m1.character),
      weapon1: String(m1.weapon),
      character2: String(m2.character),
      weapon2: String(m2.weapon),
      sortBy: "totalGames",
      limit: DETAIL_TRIO_ROW_LIMIT,
    },
    signal
  );
  const detailRows = filterRowsByPool(similarRows, [m1.character, m2.character, m3.character]);

  let combo = findExactMatch(detailRows, members);
  let comboRows = detailRows;
  if (!combo) {
    combo = findExactMatch(similarRows, members);
    comboRows = similarRows;
  }
  if (!combo) {
    const fallback = await fetchTrioWeaponRows(
      {
        character1: String(m1.character),
        sortBy: "totalGames",
        limit: DETAIL_TRIO_ROW_LIMIT,
      },
      signal
    );
    combo = findExactMatch(fallback, members);
    if (combo) comboRows = fallback;
  }
  if (!combo) return null;

  const topTraitRow = findTopTraitRow(comboRows, normalizedId);
  const memberDetails = await Promise.all(
    combo.members.map(async (member) => {
      const comboMainCore = getMainCoreForMember(topTraitRow, member);
      const trait = await fetchTopTraitBuild(member, patchVersion, comboMainCore, signal);
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
        member,
        patchVersion,
        comboMainCore ?? trait?.mainCore ?? null,
        signal
      );
      return { member, topTrait: displayTrait, topBuild: build };
    })
  );

  return {
    combo,
    trioRows: comboRows,
    similar: buildSimilarCombos(similarRows, normalizedId),
    characterDetails: memberDetails.map((detail) => ({
      member: detail.member,
      patchVersion,
      topTrait: detail.topTrait,
      topBuild: detail.topBuild,
      traitNames,
    })),
  };
}

function buildTraitNames(l10n: Map<string, string>) {
  const names: Record<number, string> = {};
  for (const [key, value] of l10n) {
    if (!key.startsWith("Trait/Name/")) continue;
    const code = Number(key.slice("Trait/Name/".length));
    if (Number.isFinite(code) && code > 0) names[code] = value;
  }
  return names;
}

export function TrioLabDetailClient({ comboId }: TrioLabDetailClientProps) {
  const locale = useLocale() as RouteLocale;
  const searchParams = useSearchParams();
  const { l10n } = useL10n();
  const traitNames = React.useMemo(() => buildTraitNames(l10n), [l10n]);
  const members = React.useMemo(() => parseComboId(comboId), [comboId]);
  const [data, setData] = React.useState<TrioLabDetailData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const state = React.useMemo(() => parseTrioLabUrlState(searchParams), [searchParams]);
  const listHref = React.useMemo(() => buildTrioLabListHref(state), [state]);
  const detailHrefQueryString = React.useMemo(() => buildTrioLabQueryString(state), [state]);

  React.useEffect(() => {
    if (!members) {
      setData(null);
      setLoading(false);
      setError("조합 정보를 찾을 수 없습니다.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loadComboData(members, traitNames, controller.signal)
      .then((nextData) => {
        if (!controller.signal.aborted) setData(nextData);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "조합 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [comboId, members, traitNames]);

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        <div className="h-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="dashboard-panel p-6 text-sm text-[var(--color-muted-foreground)]">
        {error ?? "조합 정보를 찾을 수 없습니다."}
      </section>
    );
  }

  return (
    <>
      <ComboDetailHero
        combo={data.combo}
        listHref={listHref}
        patchVersion={data.characterDetails[0]?.patchVersion ?? getStatsPatchVersions()[0]}
        tier={locale === "ko" ? TIER_LABEL : "Diamond+"}
      />
      <div className="flex min-w-0 flex-col gap-5">
        <CharacterDetailGrid rows={data.characterDetails} />
        <TraitComboBlock combo={data.combo} rows={data.trioRows} traitNames={traitNames} />
        <SimilarBlock
          detailHrefQueryString={detailHrefQueryString}
          listHref={listHref}
          similar={data.similar}
        />
      </div>
    </>
  );
}
