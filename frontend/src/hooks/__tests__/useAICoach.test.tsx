import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AICoachWidget } from "@/components/features/ai-coach/AICoachWidget";
import {
  AI_COACH_MESSAGE_MAX_LENGTH,
  AI_COACH_NICKNAME_MAX_LENGTH,
  parseEvent,
} from "../useAICoach";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
}));

describe("useAICoach - parseEvent", () => {
  it("단일 라인 token 이벤트를 올바르게 파싱한다", () => {
    const frame = 'event: token\ndata: {"text":"안녕"}';
    const result = parseEvent(frame);
    expect(result.event).toBe("token");
    expect(result.data).toBe('{"text":"안녕"}');
  });

  it("CRLF 줄바꿈이 포함된 session 이벤트를 올바르게 파싱한다", () => {
    const frame = 'event: session\r\ndata: {"sessionId":"sess-123"}';
    const result = parseEvent(frame);
    expect(result.event).toBe("session");
    expect(result.data).toBe('{"sessionId":"sess-123"}');
  });

  it("여러 줄의 data가 포함된 이벤트를 올바르게 합친다", () => {
    const frame = "event: token\ndata: line1\ndata: line2";
    const result = parseEvent(frame);
    expect(result.event).toBe("token");
    expect(result.data).toBe("line1\nline2");
  });

  it("done 이벤트를 올바르게 파싱한다", () => {
    const frame = "event: done\ndata: {}";
    const result = parseEvent(frame);
    expect(result.event).toBe("done");
  });

  it("상수 제한값이 올바르게 정의되어 있다", () => {
    expect(AI_COACH_MESSAGE_MAX_LENGTH).toBe(500);
    expect(AI_COACH_NICKNAME_MAX_LENGTH).toBe(32);
  });
});

describe("AICoachWidget - render", () => {
  it("초기 상태에서 닫힌 플로팅 버튼을 렌더링한다", () => {
    const html = renderToStaticMarkup(<AICoachWidget />);
    expect(html).toContain("💬");
    expect(html).toContain("button");
  });
});
