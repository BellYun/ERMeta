"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function SlotEmpty({ index }: { index: number }) {
  const t = useTranslations("slotEmpty");
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-border)]">
        <Users className="h-5 w-5" />
      </div>
      <span className="text-sm text-[var(--color-border)]">
        {t("allyCharacter", { index: index + 1 })}
      </span>
    </div>
  );
}
