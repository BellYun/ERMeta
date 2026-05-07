"use client";

import { TrendingDown, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";

type SynergyPartner = {
  partnerCode: number;
  partnerName: string;
  partnerWeapon: number;
  partnerWeaponName: string;
  games: number;
  winRate: number;
  avgRP: number;
  avgRank: number;
  rpLift: number;
  winRateLift: number;
  confidence: "high" | "medium" | "low";
};

type WeaponSynergy = {
  weapon: number;
  weaponName: string;
  soloBaseline: { games: number; winRate: number; avgRP: number; avgRank: number };
  topSynergy: SynergyPartner[];
  topAnti: SynergyPartner[];
  eligiblePairs: number;
};

type SynergyData = {
  characterCode: number;
  characterName: string;
  patchScope: string;
  tierScope: string;
  weapons: WeaponSynergy[];
};

export function SynergyPartnersSection({
  characterCode,
  selectedWeapon,
}: {
  characterCode: number;
  selectedWeapon: number | null;
}) {
  const [data, setData] = React.useState<SynergyData | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/api/synergy-pairs/${characterCode}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: SynergyData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [characterCode]);

  if (!data) return null;

  const entry =
    selectedWeapon != null
      ? data.weapons.find((w) => w.weapon === selectedWeapon)
      : data.weapons[0];

  if (!entry || (entry.topSynergy.length === 0 && entry.topAnti.length === 0)) return null;

  return (
    <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mb-4">
        <Users className="h-4 w-4 text-[var(--color-primary)]" />
        <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
          잘 맞는 실험체
        </h2>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {data.characterName}({entry.weaponName}) 기준 · {data.patchScope} · {data.tierScope}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartnerList
          title="시너지 Top 5"
          icon={<TrendingUp className="h-3.5 w-3.5 text-[var(--color-stat-up)]" />}
          partners={entry.topSynergy}
          variant="synergy"
        />
        <PartnerList
          title="피해야 할 조합 Top 5"
          icon={<TrendingDown className="h-3.5 w-3.5 text-[var(--color-stat-down)]" />}
          partners={entry.topAnti}
          variant="anti"
        />
      </div>
    </section>
  );
}

function PartnerList({
  title,
  icon,
  partners,
  variant,
}: {
  title: string;
  icon: React.ReactNode;
  partners: SynergyPartner[];
  variant: "synergy" | "anti";
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-[var(--color-foreground)]">{title}</span>
      </div>
      {partners.length === 0 ? (
        <div className="rounded-[12px] bg-[rgba(255,255,255,0.04)] p-3 text-center text-xs text-[var(--color-muted-foreground)]">
          표본 부족
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {partners.map((p) => (
            <PartnerCard
              key={`${p.partnerCode}-${p.partnerWeapon}`}
              partner={p}
              variant={variant}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PartnerCard({
  partner: p,
  variant,
}: {
  partner: SynergyPartner;
  variant: "synergy" | "anti";
}) {
  const liftColor =
    variant === "synergy" ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]";
  const liftSign = p.rpLift > 0 ? "+" : "";

  return (
    <li className="flex items-center gap-3 rounded-[12px] bg-[rgba(255,255,255,0.04)] p-2.5">
      <Image
        src={getCharacterMiniWebpUrl(p.partnerCode)}
        alt={p.partnerName}
        width={36}
        height={36}
        className="h-9 w-9 rounded-md object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-[var(--color-foreground)]">{p.partnerName}</span>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {p.partnerWeaponName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
          <span>{p.games.toLocaleString()}판</span>
          <span>·</span>
          <span>승률 {p.winRate.toFixed(1)}%</span>
        </div>
      </div>
      <div className={cn("flex flex-col items-end tabular-nums", liftColor)}>
        <span className="text-base font-black">
          {liftSign}
          {p.rpLift.toFixed(1)}
        </span>
        <span className="text-[9px] opacity-80">RP 증가량</span>
      </div>
    </li>
  );
}
