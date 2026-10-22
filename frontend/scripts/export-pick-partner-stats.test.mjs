import assert from "node:assert/strict";
import test from "node:test";
import { addTrioRow, metrics } from "./export-pick-partner-stats.mjs";

function row(third, games, wins, rp, ranks) {
  return {
    id: third,
    ally1_char: 1,
    ally1_weapon: 15,
    ally2_char: 2,
    ally2_weapon: 6,
    third_char: third,
    third_weapon: 8,
    total_games: games,
    total_wins: wins,
    total_rp: rp,
    rank_sum: ranks,
  };
}

test("weights pair results by games across different third members and cores", () => {
  const members = new Map();
  addTrioRow(members, row(3, 10, 2, 300, 40));
  addTrioRow(members, row(4, 90, 9, 5400, 450));
  const pair = metrics(members.get("1:15").partners.get("2:6").totals);
  assert.equal(pair.totalGames, 100);
  assert.equal(pair.averageRP, 19);
  assert.equal(pair.winRate, 11);
  assert.equal(pair.averageRank, 4.9);
  assert.equal(members.get("1:15").partners.get("3:8").totals.totalGames, 10);
  // Separate source core rows for the same trio must contribute additively.
  addTrioRow(members, row(3, 5, 1, 150, 20));
  assert.equal(members.get("1:15").partners.get("3:8").totals.totalGames, 15);
});

test("preserves reverse pair equality and counts each trio once per member", () => {
  const members = new Map();
  addTrioRow(members, row(3, 10, 2, 300, 40));
  assert.deepEqual(
    members.get("1:15").partners.get("2:6").totals,
    members.get("2:6").partners.get("1:15").totals
  );
  assert.equal(
    [...members.values()].reduce((sum, m) => sum + m.baseline.totalGames, 0),
    30
  );
  assert(!members.get("1:15").partners.has("1:15"));
});

test("keeps weapons separate and retains small samples and negative RP", () => {
  const members = new Map();
  addTrioRow(members, row(3, 2, 1, -12, 9));
  addTrioRow(members, { ...row(3, 3, 0, 18, 18), ally1_weapon: 18 });
  assert.equal(metrics(members.get("1:15").baseline).averageRP, -2);
  assert.equal(members.get("1:18").baseline.totalGames, 3);
  assert.equal(members.get("2:6").partners.size, 3);
});

test("rejects invalid source ordering and impossible win counts", () => {
  assert.throws(() => addTrioRow(new Map(), row(1, 10, 2, 300, 40)), /noncanonical/);
  assert.throws(() => addTrioRow(new Map(), row(3, 10, 11, 300, 40)));
});
