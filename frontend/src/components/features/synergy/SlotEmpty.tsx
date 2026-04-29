"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function SlotEmpty({ index }: { index: number }) {
  const t = useTranslations("slotEmpty");
  return (
    <div className="flex w-full items-center gap-3 rounded-[18px] border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)] text-[var(--color-border)]">
        <Users className="h-5 w-5" />
      </div>
      <span className="text-sm text-[var(--color-muted-foreground)]">
        {t("allyCharacter", { index: index + 1 })}
      </span>
    </div>
  );
}
