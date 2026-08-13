"use client";

import Image from "next/image";
import itemImageMap from "@/../const/itemImageMap.json";
import { cn } from "@/lib/utils";
import { GameDataTooltip, useGameDescription } from "./GameDataTooltip";
import { encodePublicAssetPath, getItemGrade, GRADE_BG, GRADE_BORDER } from "./item-utils";

export function ItemIcon({
  code,
  name,
  size = 36,
}: {
  code: number | null;
  name?: string;
  size?: number;
}) {
  const description = useGameDescription("item", code ?? 0);

  if (code == null) {
    return (
      <div
        className="rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)]"
        style={{ width: size, height: size }}
      />
    );
  }

  const rawImgPath = (itemImageMap as Record<string, string>)[String(code)];
  const imgPath = rawImgPath ? encodePublicAssetPath(rawImgPath) : undefined;
  const grade = getItemGrade(code);
  const gradeBg = grade ? GRADE_BG[grade] : "bg-[var(--color-surface-2)]";
  const gradeBorder = grade ? GRADE_BORDER[grade] : "border border-[var(--color-border)]";
  const missingIconText = grade
    ? "text-[var(--color-on-graphite)]"
    : "text-[var(--color-muted-foreground)]";

  const icon = !imgPath ? (
    <div
      className={cn("rounded-md flex items-center justify-center", gradeBg, gradeBorder)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn("font-bold", missingIconText)}
        style={{ fontSize: "var(--text-data-min)" }}
      >
        ?
      </span>
    </div>
  ) : (
    <div
      className={cn("relative rounded-md overflow-hidden", gradeBg, gradeBorder)}
      style={{ width: size, height: size }}
    >
      <Image
        src={imgPath}
        alt={String(code)}
        fill
        className="rounded-md object-cover"
        sizes={`${size}px`}
        unoptimized
      />
    </div>
  );

  return (
    <GameDataTooltip title={name ?? String(code)} description={description}>
      {icon}
    </GameDataTooltip>
  );
}
