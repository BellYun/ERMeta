"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

export function SlotEmpty({ index }: { index: number }) {
  const t = useTranslations("slotEmpty");
  return (
    <div className="flex w-full items-center gap-3 rounded-[18px] border border-dashed border-[rgba(96,165,250,0.32)] bg-[linear-gradient(135deg,rgba(96,165,250,0.06),rgba(255,255,255,0.02)_60%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary-hover)]">
        <UserPlus className="h-5 w-5" strokeWidth={2.1} />
      </div>
      <span className="truncate text-sm font-semibold text-[var(--color-foreground)]/82">
        {t("allyCharacter", { index: index + 1 })}
      </span>
    </div>
  );
}
