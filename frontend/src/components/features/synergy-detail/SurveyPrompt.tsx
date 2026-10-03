"use client";

import { useEffect, useRef, useState } from "react";
import { analytics, type SurveyPromptContext } from "@/lib/analytics";

const SURVEY_URL = "https://forms.gle/rJFyE7CDBRXMUQce7";
const MIN_VISIBLE_RATIO = 0.5;
const MIN_VISIBLE_MS = 1000;

function createImpressionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function SurveyPrompt({
  resultCount,
  selectionCount,
}: {
  resultCount: number;
  selectionCount: number;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const renderedTracked = useRef(false);
  const viewedTracked = useRef(false);
  const [impressionId] = useState(createImpressionId);
  const contextRef = useRef<SurveyPromptContext>({ impressionId, resultCount, selectionCount });

  useEffect(() => {
    contextRef.current = { impressionId, resultCount, selectionCount };
  }, [impressionId, resultCount, selectionCount]);

  useEffect(() => {
    if (renderedTracked.current) return;
    renderedTracked.current = true;
    analytics.surveyPromptRendered(contextRef.current);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let isIntersecting = false;
    let viewTimer: ReturnType<typeof setTimeout> | null = null;

    const clearViewTimer = () => {
      if (viewTimer === null) return;
      clearTimeout(viewTimer);
      viewTimer = null;
    };

    const updateViewTimer = () => {
      clearViewTimer();
      if (!isIntersecting || document.visibilityState !== "visible" || viewedTracked.current)
        return;
      viewTimer = setTimeout(() => {
        viewTimer = null;
        if (!isIntersecting || document.visibilityState !== "visible" || viewedTracked.current)
          return;
        viewedTracked.current = true;
        analytics.surveyPromptViewed(contextRef.current);
        observer.disconnect();
        document.removeEventListener("visibilitychange", updateViewTimer);
      }, MIN_VISIBLE_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = Boolean(
          entry?.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE_RATIO
        );
        updateViewTimer();
      },
      { threshold: [0, MIN_VISIBLE_RATIO, 1] }
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", updateViewTimer);

    return () => {
      clearViewTimer();
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateViewTimer);
    };
  }, []);

  return (
    <aside
      ref={rootRef}
      aria-label="이리와지지 사용 경험 설문"
      className="mb-4 flex flex-col gap-4 rounded-lg border border-[var(--color-accent)] border-l-4 bg-[var(--color-accent-muted)] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="mb-1 text-xs font-bold text-[var(--color-accent-foreground)]">사용자 설문</p>
        <p className="text-base font-bold text-[var(--color-foreground)]">
          이리와지지, 어떻게 사용하고 계신가요?
        </p>
        <p className="mt-1 text-sm leading-5 text-[var(--color-muted-foreground)]">
          도움이 된 점과 아쉬웠던 점을 알려주세요.
        </p>
      </div>
      <a
        href={SURVEY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => analytics.surveyPromptClicked(contextRef.current)}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-ink)] transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        설문 참여하기
        <span aria-hidden="true">↗</span>
        <span className="sr-only"> (새 탭에서 열림)</span>
      </a>
    </aside>
  );
}
