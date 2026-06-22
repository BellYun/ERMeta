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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((c) => (
          <LabCharacterCard key={`${c.characterCode}_${c.weapon}`} character={c} />
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
            &ldquo;{query}&rdquo;에 해당하는 캐릭터가 없습니다.
          </p>
        )}
    </div>
  );
}
