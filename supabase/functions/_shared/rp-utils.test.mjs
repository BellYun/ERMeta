import assert from "node:assert/strict";
import { test } from "node:test";
import { getCollectedRP } from "./rp-utils.ts";

test("12.3 and earlier retain net RP", () => {
  assert.equal(getCollectedRP("12.3", 6400, 6390, 43), -10);
  assert.equal(getCollectedRP("11.12", 6400, 6390, 43), -10);
});

test("12.4 uses the actual in-game RP even if the net result is negative", () => {
  // BSER sample: 22 earned - 86 entry cost = -64 net.
  assert.equal(getCollectedRP("12.4", 11133, 11069, 22), 22);
  assert.equal(getCollectedRP("13.1", 8669, 8674, 73), 73);
  assert.equal(getCollectedRP("12.4", 6400, 6347, 0), 0);
});

test("12.4 ignores gambit-modified net RP and requires the base in-game score", () => {
  // 기본 순 RP -4/-6이 갬빗으로 -8/-18이 되어도 기본 경기 점수를 사용한다.
  assert.equal(getCollectedRP("12.4", 5400, 5392, 46), 46);
  assert.equal(getCollectedRP("12.4", 5400, 5382, 44), 44);
  assert.equal(getCollectedRP("12.4", 5400, 5392, null), null);
});
