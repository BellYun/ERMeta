import { describe, expect, it, vi } from "vitest";
import { generateMetadata as generateRoleMetadata } from "@/app/(site)/[locale]/character-lab/[role]/NewCharacterLabRolePage";
import { generateMetadata as generateListMetadata } from "@/app/(site)/[locale]/character-lab/NewCharacterLabPage";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    locale === "ko" ? href : `/${locale}${href === "/" ? "" : href}`,
}));

describe.each([
  ["ko", "/character-lab", "/character-lab/tanks", true],
  ["ja", "/ja/character-lab", "/ja/character-lab/tanks", true],
  ["en", "/en/character-lab", "/en/character-lab/tanks", false],
] as const)("character-lab %s metadata", (locale, listPath, rolePath, shouldIndex) => {
  it("uses the localized list path for canonical and Open Graph metadata", async () => {
    const metadata = await generateListMetadata({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe(listPath);
    expect((metadata.openGraph as { url?: string })?.url).toBe(listPath);
    expect((metadata.robots as { index?: boolean })?.index).toBe(shouldIndex);
  });

  it("uses the localized role path for canonical and Open Graph metadata", async () => {
    const metadata = await generateRoleMetadata({
      params: Promise.resolve({ locale, role: "tanks" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe(rolePath);
    expect((metadata.openGraph as { url?: string })?.url).toBe(rolePath);
    expect((metadata.robots as { index?: boolean })?.index).toBe(shouldIndex);
  });
});
