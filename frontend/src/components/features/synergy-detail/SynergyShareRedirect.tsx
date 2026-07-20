"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buildSynergyShareTargetUrl, type SynergyShareSelection } from "@/lib/synergyShare";
import SynergyDetailLoading from "@/views/synergy-detail/SynergyDetailRouteLoading";

interface SynergyShareRedirectProps {
  fallbackPath: string;
  selection: SynergyShareSelection;
}

export function SynergyShareRedirect({ fallbackPath, selection }: SynergyShareRedirectProps) {
  const router = useRouter();
  const { ally1, ally2 } = selection;
  const fallbackParams = new URLSearchParams({ ally1: String(ally1) });
  if (ally2 != null) fallbackParams.set("ally2", String(ally2));

  useEffect(() => {
    router.replace(buildSynergyShareTargetUrl(window.location.href, { ally1, ally2 }));
  }, [ally1, ally2, router]);

  return (
    <div aria-label="Opening the shared team composition" role="status">
      <SynergyDetailLoading />
      <noscript>
        <a href={`${fallbackPath}?${fallbackParams.toString()}`}>
          Open the shared team composition
        </a>
      </noscript>
    </div>
  );
}
