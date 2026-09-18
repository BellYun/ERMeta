/** 12.4+ 랭크 경기의 API 원본 RP 값. 입장료는 API와 같은 음수로 보존한다. */
export interface RpSourceRow {
  game_number: number;
  patch_version: string;
  team_number: number;
  character_num: number;
  mmr_before: number;
  mmr_after: number;
  mmr_gain_in_game: number;
  mmr_loss_entry_cost: number;
  mmr_gain: number;
  mmr_gain_gambit: number;
  gambit: boolean;
  kings_gambit: boolean;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`RP source missing ${field}`);
  }
  return value;
}

export function buildRpSourceRows(
  gameNumber: number,
  patchVersion: string,
  userGames: unknown,
  minCollectMMR: number,
): RpSourceRow[] {
  if (!Array.isArray(userGames) || userGames.length === 0) {
    throw new Error(`game ${gameNumber}: participants missing`);
  }

  const first = userGames[0];
  if (first.matchingMode !== 3) {
    throw new Error(`game ${gameNumber}: ranked match expected`);
  }
  const apiPatch = `${first.versionSeason}.${first.versionMajor}`;
  if (apiPatch !== patchVersion) {
    throw new Error(`game ${gameNumber}: patch mismatch ${apiPatch} != ${patchVersion}`);
  }

  const rows: RpSourceRow[] = [];
  const seen = new Set<string>();
  for (const player of userGames) {
    if (player.matchingMode !== 3) {
      throw new Error(`game ${gameNumber}: mixed matching modes`);
    }
    const mmrBefore = requiredNumber(player.mmrBefore, "mmrBefore");
    if (mmrBefore < minCollectMMR) continue;

    const teamNumber = requiredNumber(player.teamNumber, "teamNumber");
    const characterNum = requiredNumber(player.characterNum, "characterNum");
    const identity = `${teamNumber}:${characterNum}`;
    if (seen.has(identity)) {
      throw new Error(`game ${gameNumber}: duplicate participant ${identity}`);
    }
    seen.add(identity);

    const entryCost = requiredNumber(player.mmrLossEntryCost, "mmrLossEntryCost");
    if (entryCost > 0) {
      throw new Error(`game ${gameNumber}: positive entry cost ${entryCost}`);
    }
    rows.push({
      game_number: gameNumber,
      patch_version: patchVersion,
      team_number: teamNumber,
      character_num: characterNum,
      mmr_before: mmrBefore,
      mmr_after: requiredNumber(player.mmrAfter, "mmrAfter"),
      mmr_gain_in_game: requiredNumber(player.mmrGainInGame, "mmrGainInGame"),
      mmr_loss_entry_cost: entryCost,
      mmr_gain: requiredNumber(player.mmrGain, "mmrGain"),
      mmr_gain_gambit: requiredNumber(player.mmrGainGambit, "mmrGainGambit"),
      gambit: player.gambit === true,
      kings_gambit: player.kingsGambit === true,
    });
  }
  if (rows.length === 0) {
    throw new Error(`game ${gameNumber}: no collectable participants`);
  }
  return rows;
}
