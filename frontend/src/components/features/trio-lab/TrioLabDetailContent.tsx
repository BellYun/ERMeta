import { notFound } from "next/navigation";
import {
  CharacterDetailGrid,
  MetricsBlock,
  SimilarBlock,
  StickySidebar,
  type CharacterDetailData,
} from "@/components/features/trio-lab/ComboDetailBody";
import { ComboDetailHero } from "@/components/features/trio-lab/ComboDetailHero";
import {
  fetchTopEquipmentBuild,
  fetchTopTraitBuild,
  fetchTrioWeaponRows,
} from "@/components/features/trio-lab/serverApi";
import {
  buildComboId,
  mergeApiRowsByComboId,
  parseComboId,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "@/components/features/trio-lab/types";
import { getCharacterPatchNote, getStatsPatchVersions } from "@/data/patch-notes";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { loadL10nRecord } from "@/lib/serverL10n";

const TIER_LABEL = "다이아+";

function findExactMatch(
  rows: ApiTrioWeaponRow[],
  members: TrioWeaponMember[]
): TrioWeaponCombo | null {
  const wantedId = buildComboId(members);
  return mergeApiRowsByComboId(rows).find((combo) => combo.id === wantedId) ?? null;
}

async function loadComboData(members: TrioWeaponMember[]) {
  const [m1, m2] = members;
  const trioRows = await fetchTrioWeaponRows({
    character1: String(m1.character),
    weapon1: String(m1.weapon),
    character2: String(m2.character),
    weapon2: String(m2.weapon),
    sortBy: "averageRP",
    limit: "60",
  });

  let combo = findExactMatch(trioRows, members);
  if (!combo) {
    const fallback = await fetchTrioWeaponRows({
      character1: String(m1.character),
      sortBy: "averageRP",
      limit: "200",
    });
    combo = findExactMatch(fallback, members);
  }

  return { combo, trioRows };
}

function buildSimilarCombos(rows: ApiTrioWeaponRow[], currentId: string): TrioWeaponCombo[] {
  return mergeApiRowsByComboId(rows)
    .filter((combo) => combo.id !== currentId)
    .slice(0, 4);
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

  const { combo, trioRows } = await loadComboData(members);
  if (!combo) notFound();

  const memberDetails = await Promise.all(
    combo.members.map(async (member) => {
      const trait = await fetchTopTraitBuild(member.character, member.weapon, patchVersion);
      const build = await fetchTopEquipmentBuild(
        member.character,
        member.weapon,
        patchVersion,
        trait?.mainCore ?? null
      );
      return { member, topTrait: trait, topBuild: build };
    })
  );

  const characterDetails: CharacterDetailData[] = memberDetails.map((d) => ({
    member: d.member,
    patchChanges: getCharacterPatchNote(d.member.character, patchVersion)?.changes ?? [],
    patchVersion,
    topTrait: d.topTrait,
    topBuild: d.topBuild,
    traitNames,
  }));

  const similar = buildSimilarCombos(trioRows, normalizedId);

  return (
    <>
      <ComboDetailHero
        combo={combo}
        listHref={listHref}
        patchVersion={patchVersion}
        tier={TIER_LABEL}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <MetricsBlock combo={combo} />
          <CharacterDetailGrid rows={characterDetails} />
          <SimilarBlock
            detailHrefQueryString={detailHrefQueryString}
            listHref={listHref}
            similar={similar}
          />
        </div>
        <StickySidebar combo={combo} />
      </div>
    </>
  );
}
