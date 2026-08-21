import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LabPageContent } from "@/components/features/lab/LabPageContent";
import type { LabData } from "@/components/features/lab/types";

const japaneseL10n = new Map([
  ["Character/Name/76", "ガーネット"],
  ["WeaponType/Bat", "バット"],
]);

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-image-alt={alt} />,
}));

vi.mock("@/components/L10nProvider", () => ({
  useL10n: () => ({ l10n: japaneseL10n }),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    locale === "ko" ? href : `/${locale}${href === "/" ? "" : href}`,
}));

const data: LabData = {
  role: "탱커",
  roleSlug: "tanks",
  groupK: 1,
  minGames: 30,
  cumulative: true,
  generatedAt: "2026-08-12",
  groups: [
    {
      id: 0,
      label: "탱커·스킬딜러 연계형",
      curated: false,
      topPartnerRoles: ["탱커", "스킬딜러"],
      characterKeys: ["76_3"],
    },
  ],
  characters: [
    {
      characterCode: 76,
      characterName: "가넷",
      weapon: 3,
      weaponName: "방망이",
      totalGames: 1_234,
      ownMeanRP: 0.4,
      groupId: 0,
      classification: {
        method: "test",
        archetype: "선봉 브루저 탱커",
        roles: ["탱커"],
        traits: ["engage"],
        partnerRoles: ["탱커", "스킬딜러"],
        fitRole: "전열 유지",
        fitReason: "한국어 생성 설명",
        metricRole: "전열 유지 · 후열 화력 보장",
        metricSummary: "대표 조합 평균 +0.85 RP",
        metricCohesion: null,
        metricClusterSize: 1,
        partnerDelta: 0.85,
        partnerGames: 380,
        partnerGameShare: 0.268,
        confidence: "high",
      },
      strong: [{ multiset: "탱커 + 스킬딜러 + 지원가", delta: 1.2, games: 120 }],
      weak: [{ multiset: "전사 + 전사 + 전사", delta: -0.8, games: 80 }],
    },
  ],
};

describe("localized character-lab detail content", () => {
  it("renders Japanese UI, game data names, routes, and generated summaries", () => {
    const markup = renderToStaticMarkup(<LabPageContent data={data} locale="ja" />);

    expect(markup).toContain("キャラクター名を検索");
    expect(markup).toContain("ガーネット");
    expect(markup).toContain("バット");
    expect(markup).toContain('href="/ja/character/76"');
    expect(markup).toContain("タンク・スキルダメージ連携");
    expect(markup).toContain("相性の良い構成");
    expect(markup).not.toContain("한국어 생성 설명");
    expect(markup).not.toContain("전열 유지");
    expect(markup).not.toContain("대표 조합 평균");
  });
});
