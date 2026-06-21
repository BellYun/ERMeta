"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

export function SlotEmpty({ index }: { index: number }) {
  const t = useTranslations("slotEmpty");
  return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
        <UserPlus className="h-5 w-5" strokeWidth={2.1} />
      </div>
      <span className="truncate text-sm font-semibold text-[var(--color-foreground)]/82">
        {t("allyCharacter", { index: index + 1 })}
      </span>
    </div>
  );
}
