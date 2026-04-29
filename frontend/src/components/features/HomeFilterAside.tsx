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
      const topOffset = 88;
      setLayout({
        isVisible: rect.bottom < topOffset,
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
      className="fixed top-[5.5rem] z-50 hidden xl:block"
      style={{ left: layout.left, width: layout.width }}
    >
      <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(8,13,26,0.82)] p-3 shadow-[0_24px_48px_-36px_rgba(0,0,0,0.82)] backdrop-blur-xl">
        <GlobalFilter />
      </div>
    </section>
  );
}
