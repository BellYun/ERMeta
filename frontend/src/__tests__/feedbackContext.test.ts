import { describe, expect, it } from "vitest";
import {
  FeedbackBreadcrumbBuffer,
  sanitizeFeedbackContext,
  sanitizeFeedbackUrl,
} from "../lib/feedbackContext";

describe("feedback context capsule", () => {
  it("최근 시간창과 최대 개수 안의 breadcrumb만 유지한다", () => {
    const buffer = new FeedbackBreadcrumbBuffer(2, 60_000);

    buffer.add({ type: "interaction", name: "first" }, 1_000);
    buffer.add({ type: "interaction", name: "second" }, 50_000);
    buffer.add({ type: "interaction", name: "third" }, 55_000);

    expect(buffer.snapshot(60_000)).toEqual([
      { ageMs: 10_000, type: "interaction", name: "second" },
      { ageMs: 5_000, type: "interaction", name: "third" },
    ]);

    expect(buffer.snapshot(120_001)).toEqual([]);
  });

  it("breadcrumb 메타데이터의 이메일과 긴 토큰을 마스킹한다", () => {
    const buffer = new FeedbackBreadcrumbBuffer();
    buffer.add(
      {
        type: "error",
        name: "request_failed",
        metadata: {
          message: "user@example.com token abcdefghijklmnopqrstuvwxyz123456",
        },
      },
      1_000
    );

    expect(buffer.snapshot(1_001)[0]?.metadata).toEqual({
      message: "[email] token [token]",
    });
  });

  it("허용된 필터만 URL에 남기고 검색어나 해시는 제거한다", () => {
    expect(
      sanitizeFeedbackUrl(
        "https://erwagg.com/ko/character/12?patch=11.4&tier=MITHRIL_PLUS&nickname=secret#build"
      )
    ).toEqual({
      path: "/ko/character/12",
      query: { patch: "11.4", tier: "MITHRIL_PLUS" },
    });

    expect(sanitizeFeedbackUrl("https://erwagg.com/ko/search/홍길동").path).toBe(
      "/ko/search/[redacted]"
    );
    expect(sanitizeFeedbackUrl("https://erwagg.com/ko/search/jane-doe").path).toBe(
      "/ko/search/[redacted]"
    );
  });

  it("서버 경계에서 알 수 없는 필드를 버리고 payload 크기를 제한한다", () => {
    const breadcrumbs = Array.from({ length: 35 }, (_, index) => ({
      ageMs: index * 1_000,
      type: "interaction",
      name: `click_${index}`,
      metadata: { email: "person@example.com", unsafe: { nested: true } },
      unexpected: "drop-me",
    }));

    const result = sanitizeFeedbackContext({
      schemaVersion: 1,
      capsuleId: "550e8400-e29b-41d4-a716-446655440000",
      capturedAt: "2026-09-02T01:02:03.000Z",
      page: {
        path: "/ko/character/12",
        query: { tier: "MITHRIL_PLUS", nickname: "private-name" },
      },
      client: {
        locale: "ko",
        viewportWidth: 1440,
        viewportHeight: 900,
        devicePixelRatio: 2,
        online: true,
        visibility: "visible",
      },
      release: "a1b2c3d4e5f67890",
      sessionAgeMs: 72_000,
      state: {
        global_filter: { patch: "11.4", tier: "MITHRIL_PLUS", nested: { drop: true } },
      },
      webVitals: {
        LCP: { value: 1234.5, rating: "good", unexpected: true },
      },
      breadcrumbs,
      unexpected: "drop-me",
    });

    expect(result).not.toBeNull();
    expect(result?.page).toEqual({
      path: "/ko/character/12",
      query: { tier: "MITHRIL_PLUS" },
    });
    expect(result?.breadcrumbs).toHaveLength(30);
    expect(result?.breadcrumbs[0]?.name).toBe("click_5");
    expect(result?.breadcrumbs[0]?.metadata).toEqual({ email: "[email]" });
    expect(result?.state.global_filter).toEqual({ patch: "11.4", tier: "MITHRIL_PLUS" });
    expect(result?.webVitals).toEqual({ LCP: { value: 1234.5, rating: "good" } });
    expect(result).not.toHaveProperty("unexpected");
  });

  it("스키마 버전이 다르거나 필수 정보가 없으면 context를 폐기한다", () => {
    expect(sanitizeFeedbackContext({ schemaVersion: 2 })).toBeNull();
    expect(sanitizeFeedbackContext({ schemaVersion: 1, page: {}, client: {} })).toBeNull();
  });
});
