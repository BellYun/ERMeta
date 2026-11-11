import assert from "node:assert/strict";
import { test } from "node:test";
import { getCollectableTrioTier, TierGroup } from "./tier-utils.ts";

test("keeps the existing bucket for three players in the same tier", () => {
  assert.equal(getCollectableTrioTier([5000, 6000, 6399]), TierGroup.DIAMOND);
  assert.equal(getCollectableTrioTier([6400, 7000, 7599]), TierGroup.METEORITE);
  assert.equal(getCollectableTrioTier([7600, 9000, 12000]), TierGroup.MITHRIL);
});

test("counts mixed Diamond+ teams once in the lowest member's tier", () => {
  for (const mmrs of [
    [5000, 6400, 7600],
    [7600, 5000, 6400],
    [6400, 7600, 5000],
  ]) {
    assert.equal(getCollectableTrioTier(mmrs), TierGroup.DIAMOND);
  }
  assert.equal(getCollectableTrioTier([6400, 7600, 12000]), TierGroup.METEORITE);
});

test("excludes a trio when any member is below Diamond or has invalid MMR", () => {
  for (const mmr of [4999, 0, -1, null, undefined, NaN, Infinity]) {
    assert.equal(getCollectableTrioTier([7600, mmr, 7600]), null);
  }
});

test("requires exactly three team members", () => {
  for (const mmrs of [[], [7600], [7600, 7600], [7600, 7600, 7600, 7600]]) {
    assert.equal(getCollectableTrioTier(mmrs), null);
  }
});
