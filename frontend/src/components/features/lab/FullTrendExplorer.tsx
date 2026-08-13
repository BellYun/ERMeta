"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { LabConditionalType } from "@/lib/labCompositionTypes";

type TrendContext = NonNullable<LabConditionalType["trendContexts"]>[number];
type AffinityGroup = NonNullable<LabConditionalType["affinityGroups"]>[number];

interface FullTrendExplorerProps {
  contexts: TrendContext[];
  locale: string;
  minGames: number;
  labels: {
    title: string;
    positive: string;
    minGames: string;
  };
}

function signedRp(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} RP`;
}

export function FullTrendExplorer({ contexts, locale, minGames, labels }: FullTrendExplorerProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const numberFormatter = new Intl.NumberFormat(locale);
  const positiveContexts = contexts.filter((context) =>
    context.positiveCharacterCount === undefined
      ? context.direction === "positive"
      : context.positiveCharacterCount > 0
  );

  return (
    <section className="overflow-hidden rounded-md border border-[var(--color-border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 bg-[var(--color-muted)]/20 px-3 py-2 text-left text-xs font-bold text-[var(--color-accent-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]"
      >
        <span>
          {labels.title} · {numberFormatter.format(positiveContexts.length)}
        </span>
        <span className="flex items-center gap-2 text-[10px] font-normal text-[var(--color-muted-foreground)]">
          {labels.minGames} {numberFormatter.format(minGames)}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[var(--color-border)] p-3">
          <section className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2">
              <h5 className="text-xs font-bold text-[var(--color-accent-foreground)]">
                {labels.positive}
              </h5>
              <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                {numberFormatter.format(positiveContexts.length)}
              </span>
            </header>
            <ul className="max-h-80 divide-y divide-[var(--color-border)] overflow-y-auto [content-visibility:auto]">
              {positiveContexts.map((context, index) => (
                <li
                  key={`${context.partnerTypes.map((type) => `${type.role}:${type.fitRole}`).join("|")}:${index}`}
                  className="px-3 py-2.5 text-[11px]"
                >
                  <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                    <span className="min-w-0 font-semibold leading-4 text-[var(--color-foreground)]">
                      {context.partnerTypes
                        .map((type) => `${type.role} · ${type.fitRole}`)
                        .join(" + ")}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--color-muted-foreground)] sm:text-right">
                      <strong className="text-[var(--color-accent-foreground)]">
                        {signedRp(context.groupAdjustedResidual ?? context.adjustedResidual)}
                      </strong>{" "}
                      · {numberFormatter.format(context.groupGames ?? context.games)}
                    </span>
                  </div>
                  {context.positiveCharacterCount !== undefined ? (
                    <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                      상승 {numberFormatter.format(context.positiveCharacterCount)}명
                      {context.negativeCharacterCount
                        ? ` · 하락 ${numberFormatter.format(context.negativeCharacterCount)}명`
                        : ""}
                      {context.tendencyAgreement == null
                        ? ""
                        : ` · 상승 일치 ${(context.tendencyAgreement * 100).toFixed(0)}%`}
                    </p>
                  ) : null}
                  {(context.characters?.length ?? 0) > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {(context.characters ?? []).map((character) => (
                        <li
                          key={`${character.characterCode}:${character.weapon}`}
                          className="rounded border border-[var(--color-border)] bg-[var(--color-muted)]/15 px-2 py-1 text-[10px] text-[var(--color-muted-foreground)]"
                        >
                          <strong className="text-[var(--color-foreground)]">
                            {character.characterName} {character.weaponName}
                          </strong>{" "}
                          <span
                            className={`font-mono ${
                              character.direction === "positive"
                                ? "text-[var(--color-accent-foreground)]"
                                : character.direction === "negative"
                                  ? "text-[var(--color-danger)]"
                                  : "text-[var(--color-muted-foreground)]"
                            }`}
                          >
                            {signedRp(character.adjustedResidual)}
                          </span>{" "}
                          · {numberFormatter.format(character.games)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}

interface PartnerAffinityExplorerProps {
  groups: AffinityGroup[];
  locale: string;
  minGames: number;
  labels: {
    title: string;
    positive: string;
    minGames: string;
  };
}

export function PartnerAffinityExplorer({
  groups,
  locale,
  minGames,
  labels,
}: PartnerAffinityExplorerProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const numberFormatter = new Intl.NumberFormat(locale);
  const positiveGroups = groups.filter((group) => group.positiveCharacterCount > 0);
  const secondaryLabel = locale === "ko" ? "같이 좋았던 나머지 유형" : "Best companion types";

  return (
    <section className="overflow-hidden rounded-md border border-[var(--color-border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 bg-[var(--color-muted)]/20 px-3 py-2 text-left text-xs font-bold text-[var(--color-accent-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]"
      >
        <span>
          {labels.title} · {numberFormatter.format(positiveGroups.length)}
        </span>
        <span className="flex items-center gap-2 text-[10px] font-normal text-[var(--color-muted-foreground)]">
          {labels.minGames} {numberFormatter.format(minGames)}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[var(--color-border)] p-3">
          <ul className="max-h-[32rem] divide-y divide-[var(--color-border)] overflow-y-auto [content-visibility:auto]">
            {positiveGroups.map((group) => (
              <li
                key={`${group.partnerRoles.join("|")}:${group.anchorType.role}:${group.anchorType.fitRole}`}
                className="py-3 first:pt-0 last:pb-0"
              >
                <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  <strong className="text-xs text-[var(--color-foreground)]">
                    {group.anchorType.role} · {group.anchorType.fitRole}
                  </strong>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)] sm:text-right">
                    <strong className="text-[var(--color-accent-foreground)]">
                      {signedRp(group.groupAdjustedResidual ?? group.adjustedResidual)}
                    </strong>{" "}
                    · {numberFormatter.format(group.groupGames)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                  상승 {numberFormatter.format(group.positiveCharacterCount)}명
                  {group.negativeCharacterCount
                    ? ` · 하락 ${numberFormatter.format(group.negativeCharacterCount)}명`
                    : ""}
                  {group.tendencyAgreement == null
                    ? ""
                    : ` · 상승 일치 ${(group.tendencyAgreement * 100).toFixed(0)}%`}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.characters.map((character) => (
                    <li
                      key={`${character.characterCode}:${character.weapon}`}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-muted)]/15 px-2 py-1 text-[10px] text-[var(--color-muted-foreground)]"
                    >
                      <strong className="text-[var(--color-foreground)]">
                        {character.characterName} {character.weaponName}
                      </strong>{" "}
                      <span
                        className={`font-mono ${
                          character.direction === "positive"
                            ? "text-[var(--color-accent-foreground)]"
                            : character.direction === "negative"
                              ? "text-[var(--color-danger)]"
                              : "text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {signedRp(character.adjustedResidual)}
                      </span>{" "}
                      · {numberFormatter.format(character.games)}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
                    {secondaryLabel}
                  </p>
                  <ul className="mt-1.5 grid gap-1 text-[10px] text-[var(--color-muted-foreground)] sm:grid-cols-2">
                    {group.secondaryContexts
                      .filter((context) => context.direction === "positive")
                      .slice(0, 8)
                      .map((context) => (
                        <li
                          key={context.partnerTypes
                            .map((type) => `${type.role}:${type.fitRole}`)
                            .join("|")}
                          className="flex justify-between gap-2"
                        >
                          <span className="truncate">
                            {context.partnerTypes
                              .map((type) => `${type.role} · ${type.fitRole}`)
                              .join(" + ")}
                          </span>
                          <span className="shrink-0 font-mono">
                            {signedRp(context.adjustedResidual)} ·{" "}
                            {numberFormatter.format(context.games)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
