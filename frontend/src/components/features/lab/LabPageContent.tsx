"use client";

import * as React from "react";
import { LabCharacterCard } from "./LabCharacterCard";
import { LabSearchFilter } from "./LabSearchFilter";
import type { LabCharacter, LabData, LabGroup } from "./types";

interface GroupSectionProps {
  group: LabGroup | null; // null = 미분류
  characters: LabCharacter[];
  query: string;
}

function GroupSection({ group, characters, query }: GroupSectionProps) {
  const filtered = query ? characters.filter((c) => c.characterName.includes(query)) : characters;

  if (filtered.length === 0) return null;

  const label = group ? group.label : "미분류";
  const partnerRoles = group ? (group.topPartnerRoles ?? []) : [];
  const internalRoleMap = new Map<
    string,
    {
      label: string;
      reason: string;
      metricSummary: string;
      characters: LabCharacter[];
      totalGames: number;
    }
  >();
  for (const character of filtered) {
    const roleLabel =
      character.classification?.metricRole ?? character.classification?.fitRole ?? "유연 연계";
    const reason = character.classification?.fitReason ?? "전투 상황에 맞춰 유연하게 보완합니다.";
    const metricSummary = character.classification?.metricSummary ?? "지표 검증 정보 없음";
    const key = `${roleLabel}::${reason}::${metricSummary}`;
    const internalRole = internalRoleMap.get(key) ?? {
      label: roleLabel,
      reason,
      metricSummary,
      characters: [],
      totalGames: 0,
    };
    internalRole.characters.push(character);
    internalRole.totalGames += character.totalGames;
    internalRoleMap.set(key, internalRole);
  }
  const internalRoles = [...internalRoleMap.values()].sort(
    (a, b) => b.totalGames - a.totalGames || a.label.localeCompare(b.label, "ko")
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="home-section-header flex flex-wrap items-center gap-2">
        <h2 className="dashboard-section-title text-base font-semibold text-[var(--color-foreground)]">
          {label}
        </h2>
        {partnerRoles.map((role) => (
          <span
            key={role}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-muted-foreground)]"
          >
            {role}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-5 border-l border-[var(--color-border)] pl-3 sm:pl-4">
        {internalRoles.map((internalRole) => (
          <div
            key={`${internalRole.label}::${internalRole.reason}`}
            className="flex flex-col gap-2.5"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {internalRole.label}
                </h3>
                <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                  {internalRole.characters.length}명
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                {internalRole.reason}
              </p>
              <p className="mt-1 text-[11px] font-medium tabular-nums text-[var(--color-accent-foreground)]">
                {internalRole.metricSummary}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {internalRole.characters.map((character) => (
                <LabCharacterCard
                  key={`${character.characterCode}_${character.weapon}`}
                  character={character}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface Props {
  data: LabData;
}

export function LabPageContent({ data }: Props) {
  const [query, setQuery] = React.useState("");

  // Build a map from groupId -> characters, preserving group order
  const groupMap = new Map<number | null, LabCharacter[]>();
  for (const c of data.characters) {
    const key = c.groupId;
    const arr = groupMap.get(key) ?? [];
    arr.push(c);
    groupMap.set(key, arr);
  }

  // Groups in order they appear in data.groups, then unclustered at end
  const orderedGroups: Array<{ group: LabGroup | null; characters: LabCharacter[] }> = [];
  for (const g of data.groups) {
    orderedGroups.push({ group: g, characters: groupMap.get(g.id) ?? [] });
  }
  // Unclustered (groupId = null)
  const unclustered = groupMap.get(null) ?? [];
  if (unclustered.length > 0) {
    orderedGroups.push({ group: null, characters: unclustered });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Search */}
      <LabSearchFilter value={query} onChange={setQuery} />

      {/* Group sections */}
      {orderedGroups.map(({ group, characters }) => (
        <GroupSection
          key={group ? group.id : "unclustered"}
          group={group}
          characters={characters}
          query={query}
        />
      ))}

      {/* Empty state when search yields nothing */}
      {query &&
        orderedGroups.every(({ characters }) => {
          return !characters.some((c) => c.characterName.includes(query));
        }) && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            &ldquo;{query}&rdquo;에 해당하는 실험체가 없습니다.
          </p>
        )}
    </div>
  );
}
