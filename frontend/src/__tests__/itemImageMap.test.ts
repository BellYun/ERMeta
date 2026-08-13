import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import itemGradeMap from "@/../const/itemGradeMap.json";
import itemImageMap from "@/../const/itemImageMap.json";
import { encodePublicAssetPath } from "@/components/character/shared/item-utils";

const KNOWN_ITEM_CODES_WITHOUT_IMAGE = [
  103506, 103507, 109503, 120408, 120503, 131101, 131102, 201111, 201112,
];

describe("itemImageMap", () => {
  it("모든 매칭 경로에 실제 이미지가 있다", () => {
    const missingFiles = Object.entries(itemImageMap).filter(([, imageUrl]) => {
      const relativePath = imageUrl.replace(/^\//, "");
      return !fs.existsSync(path.resolve(process.cwd(), "public", relativePath));
    });

    expect(missingFiles).toEqual([]);
  });

  it("등급 아이템 중 이미지 미보유 코드를 명시적으로 관리한다", () => {
    const missingCodes = Object.keys(itemGradeMap)
      .filter((code) => !(code in itemImageMap))
      .map(Number)
      .sort((a, b) => a - b);

    expect(missingCodes).toEqual(KNOWN_ITEM_CODES_WITHOUT_IMAGE);
  });

  it("공개 이미지 경로의 예약 문자를 경로 구간별로 인코딩한다", () => {
    expect(
      encodePublicAssetPath("/Item/02. Armor/03. Arm, Accessory/033. Cube Watch #1_큐브 워치.png")
    ).toBe(
      "/Item/02.%20Armor/03.%20Arm%2C%20Accessory/033.%20Cube%20Watch%20%231_%ED%81%90%EB%B8%8C%20%EC%9B%8C%EC%B9%98.png"
    );
  });
});
