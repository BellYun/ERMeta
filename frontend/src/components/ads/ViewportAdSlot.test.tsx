import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getMinViewportWidthQuery,
  ViewportAdSlot,
} from "@/components/ads/ViewportAdSlot";

vi.mock("@/components/ads/AdSlot", () => ({
  AdSlot: ({ slotName }: { slotName: string }) => <div data-ad-slot-name={slotName} />,
}));

describe("ViewportAdSlot", () => {
  it("뷰포트 최소 폭을 media query로 변환한다", () => {
    expect(getMinViewportWidthQuery(1280)).toBe("(min-width: 1280px)");
    expect(getMinViewportWidthQuery(1700)).toBe("(min-width: 1700px)");
  });

  it("서버 렌더링에서는 광고 슬롯을 DOM에 만들지 않는다", () => {
    const markup = renderToStaticMarkup(
      <ViewportAdSlot
        minViewportWidth={1280}
        slot="left-rail"
        slotName="site_rail_left"
      />
    );

    expect(markup).toBe("");
  });
});
