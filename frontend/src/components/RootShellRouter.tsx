"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import { isRouteLocale } from "@/i18n/routing";

interface RootShellRouterProps {
  defaultShell: ReactNode;
  feedbackWidget: ReactNode;
  children: ReactNode;
}

export function RootShellRouter({ defaultShell, feedbackWidget, children }: RootShellRouterProps) {
  const segments = useSelectedLayoutSegments();
  const firstSegment = segments[0];

  if (firstSegment && isRouteLocale(firstSegment)) {
    return <>{children}</>;
  }

  return (
    <>
      {defaultShell}
      {feedbackWidget}
    </>
  );
}
