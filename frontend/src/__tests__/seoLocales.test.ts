import { describe, expect, it } from "vitest";
import { localizeRoutePath } from "@/lib/seoLocales";

describe("localized route paths", () => {
  it("keeps the default Korean locale unprefixed", () => {
    expect(localizeRoutePath("/", "ko")).toBe("/");
    expect(localizeRoutePath("/rankings", "ko")).toBe("/rankings");
    expect(localizeRoutePath("/patch-forecast/12.4", "ko")).toBe("/patch-forecast/12.4");
  });

  it("preserves prefixes for non-default languages", () => {
    expect(localizeRoutePath("/", "en")).toBe("/en");
    expect(localizeRoutePath("/rankings", "en")).toBe("/en/rankings");
    expect(localizeRoutePath("/rankings", "ja")).toBe("/ja/rankings");
  });
});
