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
import { loadL10nRecord } from "@/lib/serverL10n";
import { getTraitGroup } from "@/utils/traitCodes";
import { filterRowsByPool } from "./searchRequests";

const TIER_LABEL = "다이아+";
const DETAIL_TRIO_ROW_LIMIT = "5000";
const DETAIL_FETCH_REVALIDATE_SEC = 3600;

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
  const similarRows = await fetchTrioWeaponRows(
    {
      character1: String(m1.character),
      weapon1: String(m1.weapon),
      character2: String(m2.character),
      weapon2: String(m2.weapon),
      sortBy: "totalGames",
      limit: DETAIL_TRIO_ROW_LIMIT,
    },
    { revalidate: DETAIL_FETCH_REVALIDATE_SEC }
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
      { revalidate: DETAIL_FETCH_REVALIDATE_SEC }
    );
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

interface TrioLabDetailContentProps {
  comboId: string;
  locale: RouteLocale;
}

export async function TrioLabDetailContent({ comboId, locale }: TrioLabDetailContentProps) {
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
  const topTraitRow = findTopTraitRow(trioRows, normalizedId);

  const memberDetails = await Promise.all(
    combo.members.map(async (member) => {
      const comboMainCore = getMainCoreForMember(topTraitRow, member);
      const trait = await fetchTopTraitBuild(
        member.character,
        member.weapon,
        patchVersion,
        comboMainCore,
        { revalidate: DETAIL_FETCH_REVALIDATE_SEC }
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
        comboMainCore ?? trait?.mainCore ?? null,
        { revalidate: DETAIL_FETCH_REVALIDATE_SEC }
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
      <ComboDetailHero combo={combo} patchVersion={patchVersion} tier={TIER_LABEL} />
      <div className="flex min-w-0 flex-col gap-5">
        <CharacterDetailGrid rows={characterDetails} />
        <TraitComboBlock combo={combo} rows={trioRows} traitNames={traitNames} />
        <SimilarBlock similar={similar} />
      </div>
    </>
  );
}
