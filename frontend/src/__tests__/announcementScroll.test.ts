import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_COLLAPSE_SCROLL_Y,
  ANNOUNCEMENT_EXPAND_SCROLL_Y,
  resolveAnnouncementCollapsed,
} from "@/components/layout/announcementScroll";

describe("resolveAnnouncementCollapsed", () => {
  it("keeps an expanded announcement open inside the collapse threshold", () => {
    expect(
      resolveAnnouncementCollapsed({
        currentlyCollapsed: false,
        scrollY: ANNOUNCEMENT_COLLAPSE_SCROLL_Y,
        hasFocus: false,
      })
    ).toBe(false);
  });

  it("keeps a collapsed announcement closed after scroll anchoring reduces scrollY", () => {
    expect(
      resolveAnnouncementCollapsed({
        currentlyCollapsed: true,
        scrollY: ANNOUNCEMENT_COLLAPSE_SCROLL_Y - 44,
        hasFocus: false,
      })
    ).toBe(true);
  });

  it("expands again only near the top of the page", () => {
    expect(
      resolveAnnouncementCollapsed({
        currentlyCollapsed: true,
        scrollY: ANNOUNCEMENT_EXPAND_SCROLL_Y,
        hasFocus: false,
      })
    ).toBe(false);
  });

  it("stays expanded while the announcement contains focus", () => {
    expect(
      resolveAnnouncementCollapsed({
        currentlyCollapsed: true,
        scrollY: 500,
        hasFocus: true,
      })
    ).toBe(false);
  });
});
