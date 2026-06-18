import Image from "next/image";
import type { PatchChange } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface CharacterCardProps {
  name: string;
  imageUrl: string;
  rateChange: number;
  code?: number;
  patchChanges?: PatchChange[];
  className?: string;
}

const CHANGE_LABEL: Record<PatchChange["changeType"], { label: string; className: string }> = {
  buff: { label: "버프", className: "text-[var(--color-accent-gold)]" },
  nerf: { label: "너프", className: "text-[var(--color-danger)]" },
  rework: { label: "변경", className: "text-[var(--color-foreground)]" },
};

const baseClass =
  "group relative flex items-center gap-3 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 hover:bg-[var(--color-border)] transition-colors";

function CardContent({
  name,
  imageUrl,
  rateChange,
  patchChanges,
}: Omit<CharacterCardProps, "code">) {
  const isUp = rateChange >= 0;
  const hasChanges = patchChanges && patchChanges.length > 0;

  return (
    <>
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes="48px" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{name}</span>
        <span
          className={cn(
            "text-xs font-semibold",
            isUp ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
          )}
        >
          {isUp ? "+" : ""}
          {rateChange.toFixed(1)} RP
        </span>
      </div>

      {hasChanges && (
        <div className="pointer-events-none absolute bottom-full left-0 right-0 z-50 mb-2 hidden group-hover:block">
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5">
            {patchChanges.map((change, i) => {
              const { label, className: labelClass } = CHANGE_LABEL[change.changeType];
              return (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[10px] font-bold shrink-0", labelClass)}>
                      {label}
                    </span>
                    <span className="text-[11px] text-[var(--color-foreground)]">
                      {change.target}
                    </span>
                  </div>
                  {change.valueSummary && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)] pl-5 leading-snug">
                      {change.valueSummary}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export function CharacterCard({
  name,
  imageUrl,
  rateChange,
  code,
  patchChanges,
  className,
}: CharacterCardProps) {
  if (code != null) {
    return (
      <Link href={`/character/${code}`} className={cn(baseClass, className)}>
        <CardContent
          name={name}
          imageUrl={imageUrl}
          rateChange={rateChange}
          patchChanges={patchChanges}
        />
      </Link>
    );
  }

  return (
    <div className={cn(baseClass, className)}>
      <CardContent
        name={name}
        imageUrl={imageUrl}
        rateChange={rateChange}
        patchChanges={patchChanges}
      />
    </div>
  );
}
