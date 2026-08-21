import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LegacyCharacterLabRolePage } from "@/app/(site)/[locale]/character-lab/[role]/LegacyCharacterLabRolePage";
import { LegacyCharacterLabPage } from "@/app/(site)/[locale]/character-lab/LegacyCharacterLabPage";

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

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

vi.mock("@/components/features/lab/LabPageContent", () => ({
  LabPageContent: () => <div>Lab content</div>,
}));

describe.each([
  ["ko", "/character-lab/tanks", "/character-lab"],
  ["en", "/en/character-lab/tanks", "/en/character-lab"],
  ["ja", "/ja/character-lab/tanks", "/ja/character-lab"],
] as const)("character-lab %s locale routes", (locale, rolePath, listPath) => {
  it("keeps the locale when opening a role", async () => {
    const page = await LegacyCharacterLabPage({
      params: Promise.resolve({ locale }),
    });

    expect(renderToStaticMarkup(page)).toContain(`href="${rolePath}"`);
  });

  it("keeps the locale when returning to the role list", async () => {
    const page = await LegacyCharacterLabRolePage({
      params: Promise.resolve({ locale, role: "tanks" }),
    });

    expect(renderToStaticMarkup(page)).toContain(`href="${listPath}"`);
  });
});
