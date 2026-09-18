import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRpSourceRows } from "./rp-source.ts";

const player = (overrides = {}) => ({
  gameId: 65387249,
  matchingMode: 3,
  versionSeason: 12,
  versionMajor: 4,
  teamNumber: 1,
  characterNum: 72,
  mmrBefore: 5400,
  mmrAfter: 5392,
  mmrGainInGame: 46,
  mmrLossEntryCost: -50,
  mmrGain: -4,
  mmrGainGambit: -8,
  gambit: true,
  kingsGambit: false,
  ...overrides,
});

test("12.4 RP source keeps earned score, entry cost and actual gambit change separate", () => {
  const [row] = buildRpSourceRows(65387249, "12.4", [player()], 5000);
  assert.equal(row.mmr_gain_in_game, 46);
  assert.equal(row.mmr_loss_entry_cost, -50);
  assert.equal(row.mmr_gain, -4);
  assert.equal(row.mmr_gain_gambit, -8);
  assert.equal(row.mmr_after - row.mmr_before, -8);
  assert.equal(row.gambit, true);
});

test("promotion bonus is preserved in actual RP without assuming a multiplier formula", () => {
  const [row] = buildRpSourceRows(65387249, "12.4", [player({
    mmrBefore: 6350,
    mmrAfter: 6724,
    mmrGainInGame: 212,
    mmrLossEntryCost: -50,
    mmrGain: 162,
    mmrGainGambit: 374,
  })], 5000);
  assert.equal(row.mmr_gain, 162);
  assert.equal(row.mmr_gain_gambit, 374);
  assert.equal(row.mmr_after - row.mmr_before, 374);
});

test("filters players below collection MMR and rejects missing entry cost", () => {
  const rows = buildRpSourceRows(65387249, "12.4", [
    player({ mmrBefore: 4500, characterNum: 5 }),
    player(),
  ], 5000);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].character_num, 72);
  assert.throws(() => buildRpSourceRows(65387249, "12.4", [
    player({ mmrLossEntryCost: undefined }),
  ], 5000), /mmrLossEntryCost/);
});
