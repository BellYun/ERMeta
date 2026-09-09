import {
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
  canRenderAdSlot,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";

export function SiteContentAd() {
  const slot = ADSENSE_SLOTS.siteContent;

  if (!canRenderAdSlot(slot)) return null;

  return (
    <AdSlot
      slot={slot}
      slotName="site_content_top"
      format="horizontal"
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-4"
      reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
    />
  );
}
