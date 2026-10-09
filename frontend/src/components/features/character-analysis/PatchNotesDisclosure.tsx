"use client";

import { useLocale } from "next-intl";
import * as React from "react";

const LABELS: Record<string, [string, string]> = {
  ko: ["더보기", "접기"],
  en: ["Show more", "Show less"],
  ja: ["もっと見る", "閉じる"],
  "zh-Hans": ["显示更多", "收起"],
  "zh-Hant": ["顯示更多", "收起"],
};

interface VisibleLayout {
  clipHeight: number | null;
  hasMore: boolean;
}

export function PatchNotesDisclosure({
  comparisonRef,
  children,
}: {
  comparisonRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const [more, less] = LABELS[locale] ?? LABELS.en;
  const contentRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const [page, setPage] = React.useState(1);
  const [layout, setLayout] = React.useState<VisibleLayout>({ clipHeight: null, hasMore: false });

  React.useLayoutEffect(() => {
    const comparison = comparisonRef.current;
    const content = contentRef.current;
    const root = rootRef.current;
    if (!comparison || !content || !root) return;
    const measure = () => {
      const available = Math.floor(comparison.getBoundingClientRect().height);
      if (available <= 0) return;
      const cards = Array.from(content.querySelectorAll<HTMLElement>("[data-patch-history-card]"));
      // 한 번에 비교 패널 높이만큼 확장하고, 패치 카드 경계에서만 끊는다.
      const budget = available * page;
      if (cards.length === 0 || content.getBoundingClientRect().height <= budget + 1) {
        setLayout((current) =>
          current.clipHeight === null && !current.hasMore
            ? current
            : { clipHeight: null, hasMore: false }
        );
        return;
      }

      const gap = parseFloat(getComputedStyle(root).rowGap) || 0;
      const actionsHeight = actionsRef.current?.getBoundingClientRect().height || 44;
      const contentLimit = budget - actionsHeight - gap;
      const contentTop = content.getBoundingClientRect().top;
      const intro = content.querySelector<HTMLElement>("[data-patch-history-intro]");
      let clipHeight = intro ? intro.getBoundingClientRect().bottom - contentTop : 0;
      let visibleCount = 0;

      for (const card of cards) {
        const cardBottom = card.getBoundingClientRect().bottom - contentTop;
        if (cardBottom > contentLimit + 1) break;
        clipHeight = cardBottom;
        visibleCount += 1;
      }

      const next: VisibleLayout =
        visibleCount === cards.length
          ? { clipHeight: null, hasMore: false }
          : { clipHeight: Math.ceil(clipHeight), hasMore: true };
      setLayout((current) =>
        current.clipHeight === next.clipHeight && current.hasMore === next.hasMore
          ? current
          : next
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(comparison);
    observer.observe(content);
    if (actionsRef.current) observer.observe(actionsRef.current);
    measure();
    return () => observer.disconnect();
  }, [comparisonRef, page, layout.hasMore]);

  return (
    <div ref={rootRef} className="patch-notes-disclosure">
      <div
        id={id}
        className="patch-notes-disclosure__viewport"
        data-clipped={layout.clipHeight != null || undefined}
        style={layout.clipHeight != null ? { height: layout.clipHeight } : undefined}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {layout.hasMore || page > 1 ? (
        <div ref={actionsRef} className="patch-notes-disclosure__actions">
          {layout.hasMore && (
            <button
              type="button"
              className="patch-notes-disclosure__toggle"
              aria-controls={id}
              onClick={() => setPage((current) => current + 1)}
            >
              {more}
              <span aria-hidden="true">+</span>
            </button>
          )}
          {page > 1 && (
            <button
              type="button"
              className="patch-notes-disclosure__toggle"
              aria-controls={id}
              onClick={() => {
                if ((rootRef.current?.getBoundingClientRect().top ?? 0) < 0) {
                  rootRef.current?.scrollIntoView({ block: "start" });
                }
                setPage(1);
              }}
            >
              {less}
              <span aria-hidden="true">−</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
