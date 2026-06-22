"use client";

import * as React from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";

interface HomeFilterAsideProps {
  anchorId: string;
}

interface FloatingFilterLayout {
  isVisible: boolean;
  left: number;
  width: number;
}

const FLOATING_FILTER_TOP = 120;

export function HomeFilterAside({ anchorId }: HomeFilterAsideProps) {
  const [layout, setLayout] = React.useState<FloatingFilterLayout>({
    isVisible: false,
    left: 0,
    width: 0,
  });

  React.useEffect(() => {
    const updateVisibility = () => {
      if (window.innerWidth < 1280) {
        setLayout((current) =>
          current.isVisible ? { isVisible: false, left: 0, width: 0 } : current
        );
        return;
      }

      const anchor = document.getElementById(anchorId);
      if (!anchor) {
        setLayout((current) =>
          current.isVisible ? { isVisible: false, left: 0, width: 0 } : current
        );
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setLayout({
        isVisible: rect.bottom < FLOATING_FILTER_TOP,
        left: Math.max(16, rect.left),
        width: Math.max(320, Math.round(rect.width)),
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [anchorId]);

  if (!layout.isVisible) {
    return null;
  }

  return (
    <section
      className="fixed z-30 hidden xl:block"
      style={{ left: layout.left, top: FLOATING_FILTER_TOP, width: layout.width }}
    >
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <GlobalFilter />
      </div>
    </section>
  );
}
