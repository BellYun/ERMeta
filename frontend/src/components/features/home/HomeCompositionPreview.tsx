"use client";

import dynamic from "next/dynamic";
import { SynergyDetailPreviewProvider } from "@/components/features/synergy-detail/SynergyDetailSelectionStore";
import { WeaponAllySelector } from "@/components/features/synergy-detail/WeaponAllySelector";

const Results = dynamic(
  () =>
    import("@/components/features/synergy-detail/SynergyDetailResults").then(
      (module) => module.SynergyDetailResults
    ),
  { ssr: false }
);

export function HomeCompositionPreview() {
  return (
    <SynergyDetailPreviewProvider>
      <div className="home-entry__actual-composition" inert aria-hidden="true">
        <section className="dashboard-panel min-w-0 p-3.5">
          <WeaponAllySelector />
        </section>
        <section className="dashboard-panel min-w-0 p-3.5">
          <Results />
        </section>
      </div>
    </SynergyDetailPreviewProvider>
  );
}
