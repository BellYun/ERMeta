import { BalancePatchResponseTabs } from "@/app/season10-recap/BalancePatchResponseTabs";
import { getCharacterName } from "@/lib/characterMap";
import type {
  ComboTierAggregate,
  RecapPatchNote,
  SeasonAggregateEntry,
  TierRpTrend,
  TierRpTrends,
} from "@/lib/seasonRecap";
import { resolveWeaponName } from "@/lib/weaponMap";

type ResponseTier = "diamondPlus" | "mithrilPlus";

const MIN_PATCH_GAMES: Record<ResponseTier, number> = {
  diamondPlus: 1000,
  mithrilPlus: 500,
};

export interface PatchResponseEntry {
  key: string;
  patch: string;
  characterNum: number;
  weapon: number;
  characterName: string;
  weaponName: string;
  previousRelativeRp: number;
  currentRelativeRp: number;
  response: number;
  note: RecapPatchNote;
}

export interface TierPatchResponses {
  buffs: PatchResponseEntry[];
  nerfs: PatchResponseEntry[];
}

export interface PatchResponseGroup {
  patch: string;
  diamondPlus: TierPatchResponses;
  mithrilPlus: TierPatchResponses;
  totalResponses: number;
}

function getTierScope(entry: SeasonAggregateEntry, tier: ResponseTier) {
  return tier === "diamondPlus" ? entry : entry.mithrilPlus;
}

function getPatchResponse(
  scope: SeasonAggregateEntry | ComboTierAggregate | null,
  benchmark: TierRpTrend,
  patch: string,
  patches: string[],
  minimumGames: number
) {
  const patchIndex = patches.indexOf(patch);
  if (!scope || patchIndex <= 0) return null;

  const previousPatch = patches[patchIndex - 1];
  const current = scope.perPatch.find((stat) => stat.patch === patch);
  const previous = scope.perPatch.find((stat) => stat.patch === previousPatch);
  const currentBenchmark = benchmark.perPatch.find((stat) => stat.patch === patch);
  const previousBenchmark = benchmark.perPatch.find((stat) => stat.patch === previousPatch);

  if (
    !current ||
    !previous ||
    !currentBenchmark ||
    !previousBenchmark ||
    current.totalGames < minimumGames ||
    previous.totalGames < minimumGames
  ) {
    return null;
  }

  const currentRelativeRp = current.averageRP - currentBenchmark.averageRP;
  const previousRelativeRp = previous.averageRP - previousBenchmark.averageRP;
  return {
    previousRelativeRp,
    currentRelativeRp,
    response: currentRelativeRp - previousRelativeRp,
  };
}

function buildResponses(
  entries: SeasonAggregateEntry[],
  patches: string[],
  benchmark: TierRpTrend,
  tier: ResponseTier
): PatchResponseEntry[] {
  return entries.flatMap((entry) =>
    entry.patchNotes.flatMap((note) => {
      const responseData = getPatchResponse(
        getTierScope(entry, tier),
        benchmark,
        note.patch,
        patches,
        MIN_PATCH_GAMES[tier]
      );
      if (responseData == null) return [];

      return [
        {
          key: `${tier}-${entry.characterNum}-${entry.bestWeapon}-${note.patch}`,
          patch: note.patch,
          characterNum: entry.characterNum,
          weapon: entry.bestWeapon,
          characterName: getCharacterName(entry.characterNum),
          weaponName: resolveWeaponName(entry.bestWeapon),
          previousRelativeRp: responseData.previousRelativeRp,
          currentRelativeRp: responseData.currentRelativeRp,
          response: responseData.response,
          note,
        },
      ];
    })
  );
}

function buildPatchGroups(
  patches: string[],
  diamondResponses: PatchResponseEntry[],
  mithrilResponses: PatchResponseEntry[]
): PatchResponseGroup[] {
  const selectByChangeType = (
    rows: PatchResponseEntry[],
    patch: string,
    changeType: "buff" | "nerf"
  ) =>
    rows
      .filter(
        (row) =>
          row.patch === patch &&
          row.note.changes.some((change) => change.changeType === changeType) &&
          (changeType === "buff" ? row.response > 0 : row.response < 0)
      )
      .sort((a, b) => Math.abs(b.response) - Math.abs(a.response))
      .slice(0, 3);

  const groupTierResponses = (rows: PatchResponseEntry[], patch: string) => ({
    buffs: selectByChangeType(rows, patch, "buff"),
    nerfs: selectByChangeType(rows, patch, "nerf"),
  });

  return patches.slice(1).flatMap((patch) => {
    const allDiamondRows = diamondResponses.filter((row) => row.patch === patch);
    const allMithrilRows = mithrilResponses.filter((row) => row.patch === patch);
    if (allDiamondRows.length === 0 && allMithrilRows.length === 0) return [];

    return [
      {
        patch,
        diamondPlus: groupTierResponses(diamondResponses, patch),
        mithrilPlus: groupTierResponses(mithrilResponses, patch),
        totalResponses: allDiamondRows.length + allMithrilRows.length,
      },
    ];
  });
}

export function BalancePatchResponseBlock({
  entries,
  patches,
  trends,
}: {
  entries: SeasonAggregateEntry[];
  patches: string[];
  trends: TierRpTrends;
}) {
  const diamondResponses = buildResponses(entries, patches, trends.diamondPlus, "diamondPlus");
  const mithrilResponses = buildResponses(entries, patches, trends.mithrilPlus, "mithrilPlus");
  const patchGroups = buildPatchGroups(patches, diamondResponses, mithrilResponses);

  return (
    <section
      id="season-recap-balance-response"
      className="dashboard-panel scroll-mt-24 p-4 lg:scroll-mt-20"
    >
      <div className="home-section-header pb-3">
        <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          밸런스 패치 효과
        </p>
        <h2 className="dashboard-section-title mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
          패치 반응 요약
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
          패치별 상향·하향 대상 중 전체 평균 대비 RP 변화가 큰 조합을 정리했습니다. 다이아+는 패치당
          1,000게임, 미스릴+는 500게임 이상인 전후 표본만 사용합니다.
        </p>
      </div>

      <BalancePatchResponseTabs groups={patchGroups} />
    </section>
  );
}
