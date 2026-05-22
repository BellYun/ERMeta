import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
  apiRowToCombo,
  buildComboId,
  characterDisplayName,
  parseComboId,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
  type TrioWeaponMember,
} from "@/components/features/trio-lab/types";
import { getCharacterPatchNote, getStatsPatchVersions } from "@/data/patch-notes";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface PageProps {
  params: Promise<{ locale: string; comboId: string }>;
}

const TIER_LABEL = "다이아+";

function findExactMatch(
  rows: ApiTrioWeaponRow[],
  members: TrioWeaponMember[]
): TrioWeaponCombo | null {
  const wanted = members
    .map((m) => `${m.character}-${m.weapon}`)
    .sort()
    .join("|");
  for (const row of rows) {
    const rowKey = [
      `${row.character1}-${row.weaponType1}`,
      `${row.character2}-${row.weaponType2}`,
      `${row.character3}-${row.weaponType3}`,
    ]
      .sort()
      .join("|");
    if (rowKey === wanted) return apiRowToCombo(row);
  }
  return null;
}

async function loadComboData(members: TrioWeaponMember[]) {
  const [m1, m2] = members;
  const trioRows = await fetchTrioWeaponRows({
    character1: String(m1.character),
    weapon1: String(m1.weapon),
    character2: String(m2.character),
    weapon2: String(m2.weapon),
    sortBy: "recommended",
    limit: "60",
  });

  let combo = findExactMatch(trioRows, members);
  if (!combo) {
    const fallback = await fetchTrioWeaponRows({
      character1: String(m1.character),
      sortBy: "recommended",
      limit: "200",
    });
    combo = findExactMatch(fallback, members);
  }

  return { combo, trioRows };
}

function buildSimilarCombos(rows: ApiTrioWeaponRow[], currentId: string): TrioWeaponCombo[] {
  const seen = new Set<string>([currentId]);
  const out: TrioWeaponCombo[] = [];
  for (const row of rows) {
    const c = apiRowToCombo(row);
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= 4) break;
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  const members = parseComboId(comboId);
  if (!members) return { title: "조합 정보를 찾을 수 없습니다 | ER&GG" };
  const trioName = members.map((m) => characterDisplayName(m.character)).join(" + ");
  const title = `${trioName} — trio-weapon 조합 상세 | ER&GG`;
  const description = `이터널리턴 trio-weapon 통계 기반 조합 분석. 캐릭터별 추천 장비 빌드, 최근 패치 변동, 비슷한 조합을 한 페이지에서 확인하세요.`;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: `/trio-lab/${comboId}` },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function TrioLabDetailPage({ params }: PageProps) {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const members = parseComboId(comboId);
  if (!members) notFound();
  const normalizedId = buildComboId(members);

  const patchVersion = getStatsPatchVersions()[0];

  const { combo, trioRows } = await loadComboData(members);
  if (!combo) {
    notFound();
  }

  // 각 (캐릭터, 무기) 별로 특성 → 그 코어 기준 아이템 순차 fetch (병렬)
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
  }));

  const similar = buildSimilarCombos(trioRows, normalizedId);

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <ComboDetailHero combo={combo} patchVersion={patchVersion} tier={TIER_LABEL} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <MetricsBlock combo={combo} />
          <CharacterDetailGrid rows={characterDetails} />
          <SimilarBlock similar={similar} />
        </div>
        <StickySidebar combo={combo} />
      </div>
    </main>
  );
}
