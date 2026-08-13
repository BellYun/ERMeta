import { describe, expect, it } from "vitest";
import {
  formatGameDescription,
  formatItemDescription,
  formatItemStats,
} from "@/components/character/shared/GameDataTooltip";

describe("formatGameDescription", () => {
  it("게임 전용 색상 마크업과 수치 플레이스홀더를 정리한다", () => {
    expect(
      formatGameDescription(
        "<color=red>전용 효과</color>\n<color=#fff>피해량 {2}</color>\n\n\n추가 설명"
      )
    ).toBe("전용 효과\n피해량 —\n\n추가 설명");
  });

  it("문자열로 남은 줄바꿈도 복원한다", () => {
    expect(formatGameDescription("첫 줄\\n둘째 줄")).toBe("첫 줄\n둘째 줄");
  });

  it("고유 효과가 있으면 능력치 아래에 함께 표시한다", () => {
    expect(
      formatItemDescription(
        { attackPower: 60, attackSpeedRatio: 0.2 },
        "열정\n기본 공격 적중 시 공격 속도가 증가합니다.",
        "Korean"
      )
    ).toBe("공격력 +60\n공격 속도 +20%\n\n열정\n기본 공격 적중 시 공격 속도가 증가합니다.");
  });
});

describe("formatItemStats", () => {
  it("아이템 능력치를 실제 표시 단위로 변환한다", () => {
    expect(
      formatItemStats({ attackPower: 60, attackSpeedRatio: 0.2, cooldownReduction: 15 }, "Korean")
    ).toBe("공격력 +60\n공격 속도 +20%\n쿨다운 감소 +15%");
  });
});
