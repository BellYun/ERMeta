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
  const id = React.useId();
  const [height, setHeight] = React.useState<number | null>(null);
  const [overflows, setOverflows] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const comparison = comparisonRef.current;
    const content = contentRef.current;
    if (!comparison || !content) return;
    const measure = () => {
      const available = Math.floor(comparison.getBoundingClientRect().height);
      if (available <= 0) return;
      setHeight(available);
      setOverflows(content.getBoundingClientRect().height > available + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(comparison);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [comparisonRef]);

  const collapsed = overflows && !expanded;
  return (
    <div
      ref={rootRef}
      className="patch-notes-disclosure"
      style={collapsed && height != null ? { height } : undefined}
    >
      <div
        id={id}
        className="patch-notes-disclosure__viewport"
        data-collapsed={collapsed || undefined}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {overflows ? (
        <button
          type="button"
          className="patch-notes-disclosure__toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => {
            if (expanded && (rootRef.current?.getBoundingClientRect().top ?? 0) < 0) {
              rootRef.current?.scrollIntoView({ block: "start" });
            }
            setExpanded((value) => !value);
          }}
        >
          {expanded ? less : more}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      ) : null}
    </div>
  );
}
