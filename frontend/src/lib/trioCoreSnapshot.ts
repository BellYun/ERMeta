import type { TrioWeaponResult } from "@/components/features/synergy-detail/types";
import { fetchSeasonSnapshot, seasonSnapshot } from "@/lib/seasonSnapshot";

type Member = [character: number, weapon: number];
type CoreRow = [number | null, number | null, number | null, number, number, number, number];
type CoreShard = Record<string, [pairMask: number, rows: CoreRow[]][]>;

const MAX_CACHED_SHARDS = 8;
const requests = new Map<number, Promise<CoreShard>>();

function trioMembers(result: TrioWeaponResult): Member[] {
  const members: Member[] = [
    [result.character1, result.weaponType1],
    [result.character2, result.weaponType2],
    [result.character3, result.weaponType3],
  ];
  return members.sort(([a, aw], [b, bw]) => a - b || aw - bw);
}

function trioKey(members: Member[]): string {
  return members.map((member) => member.join(":")).join("|");
}

export function snapshotTrioKey(result: TrioWeaponResult): string {
  return trioKey(trioMembers(result));
}

function loadShard(members: Member[]) {
  const count = seasonSnapshot.coreShardCount;
  let shard = 0;
  for (const [character, weapon] of members) {
    shard = (shard * 31 + character) % count;
    shard = (shard * 31 + weapon) % count;
  }
  const existing = requests.get(shard);
  if (existing) {
    requests.delete(shard);
    requests.set(shard, existing);
    return existing;
  }

  const request = fetchSeasonSnapshot<CoreShard>("cores/" + shard + ".json.gz")
    .then((data) => {
      if (!data) throw new Error("trio_core_snapshot_missing");
      return data;
    })
    .catch((error) => {
      if (requests.get(shard) === request) requests.delete(shard);
      throw error;
    });
  requests.set(shard, request);
  if (requests.size > MAX_CACHED_SHARDS) {
    const oldest = requests.keys().next().value;
    if (oldest != null) requests.delete(oldest);
  }
  return request;
}

export async function loadSnapshotCoreVariants(
  result: TrioWeaponResult,
  allies: { charCode: number; weaponCode: number | null }[],
  signal?: AbortSignal
): Promise<TrioWeaponResult[]> {
  const members = trioMembers(result);
  const indexes = allies.map((ally) =>
    members.findIndex(
      ([character, weapon]) =>
        character === ally.charCode && (ally.weaponCode == null || weapon === ally.weaponCode)
    )
  );
  const [first, second] = indexes;
  if (indexes.length !== 2 || first < 0 || second < 0 || first === second) return [];

  signal?.throwIfAborted();
  const shard = await loadShard(members);
  signal?.throwIfAborted();

  const pairMask = 1 << (first + second - 1);
  const [, rows] = shard[trioKey(members)]?.find(([mask]) => (mask & pairMask) !== 0) ?? [];
  if (!rows) return [];

  const [[character1, weaponType1], [character2, weaponType2], [character3, weaponType3]] = members;
  return rows
    .map(([mainCore1, mainCore2, mainCore3, totalGames, wins, rp, rank]) => ({
      character1,
      weaponType1,
      character2,
      weaponType2,
      character3,
      weaponType3,
      mainCore1,
      mainCore2,
      mainCore3,
      totalGames,
      winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
      averageRP: totalGames > 0 ? rp / totalGames / 3 : 0,
      averageRank: totalGames > 0 ? rank / totalGames : 0,
    }))
    .sort((left, right) => right.averageRP - left.averageRP);
}
