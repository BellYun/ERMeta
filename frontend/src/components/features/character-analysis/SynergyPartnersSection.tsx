"use client";

import { TrendingDown, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import { useLocale } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import type { RouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

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

type Copy = {
  title: string;
  basedOn: string;
  synergyTitle: string;
  antiTitle: string;
  insufficientSample: string;
  games: string;
  winRate: string;
  rpLift: string;
};

const COPY: Record<RouteLocale, Copy> = {
  ko: {
    title: "잘 맞는 실험체",
    basedOn: "기준",
    synergyTitle: "잘 맞는 조합",
    antiTitle: "주의할 조합",
    insufficientSample: "표본 부족",
    games: "판",
    winRate: "승률",
    rpLift: "RP 증가량",
  },
  en: {
    title: "Partner Results",
    basedOn: "base",
    synergyTitle: "Higher-RP Partners",
    antiTitle: "Lower-RP Partners",
    insufficientSample: "Limited sample",
    games: "games",
    winRate: "Win rate",
    rpLift: "RP lift",
  },
  ja: {
    title: "相性データ",
    basedOn: "基準",
    synergyTitle: "高RPの組み合わせ",
    antiTitle: "注意する組み合わせ",
    insufficientSample: "サンプル不足",
    games: "試合",
    winRate: "勝率",
    rpLift: "RP差分",
  },
  "zh-Hans": {
    title: "搭档数据",
    basedOn: "基准",
    synergyTitle: "较高 RP 组合",
    antiTitle: "需注意组合",
    insufficientSample: "样本不足",
    games: "场",
    winRate: "胜率",
    rpLift: "RP 提升",
  },
  "zh-Hant": {
    title: "搭檔資料",
    basedOn: "基準",
    synergyTitle: "較高 RP 組合",
    antiTitle: "需注意組合",
    insufficientSample: "樣本不足",
    games: "場",
    winRate: "勝率",
    rpLift: "RP 提升",
  },
};

export function SynergyPartnersSection({
  characterCode,
  selectedWeapon,
}: {
  characterCode: number;
  selectedWeapon: number | null;
}) {
  const locale = useLocale() as RouteLocale;
  const copy = COPY[locale] ?? COPY.ko;
  const { l10n } = useL10n();
  const fallbackMap = React.useMemo(() => buildFallbackMap(), []);
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

  const characterName = resolveCharacterName(data.characterCode, l10n, fallbackMap);
  const weaponName = resolveWeaponName(entry.weapon, l10n);

  return (
    <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mb-4">
        <Users className="h-4 w-4 text-[var(--color-primary)]" />
        <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.18rem]">
          {copy.title}
        </h2>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {characterName}({weaponName}) {copy.basedOn} · {data.patchScope} · {data.tierScope}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartnerList
          title={copy.synergyTitle}
          icon={<TrendingUp className="h-3.5 w-3.5 text-[var(--color-stat-up)]" />}
          partners={entry.topSynergy}
          variant="synergy"
          copy={copy}
          l10n={l10n}
          fallbackMap={fallbackMap}
        />
        <PartnerList
          title={copy.antiTitle}
          icon={<TrendingDown className="h-3.5 w-3.5 text-[var(--color-stat-down)]" />}
          partners={entry.topAnti}
          variant="anti"
          copy={copy}
          l10n={l10n}
          fallbackMap={fallbackMap}
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
  copy,
  l10n,
  fallbackMap,
}: {
  title: string;
  icon: React.ReactNode;
  partners: SynergyPartner[];
  variant: "synergy" | "anti";
  copy: Copy;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-[var(--color-foreground)]">{title}</span>
      </div>
      {partners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white p-3 text-center text-xs text-[var(--color-muted-foreground)]">
          {copy.insufficientSample}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {partners.map((p) => (
            <PartnerCard
              key={`${p.partnerCode}-${p.partnerWeapon}`}
              partner={p}
              variant={variant}
              copy={copy}
              l10n={l10n}
              fallbackMap={fallbackMap}
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
  copy,
  l10n,
  fallbackMap,
}: {
  partner: SynergyPartner;
  variant: "synergy" | "anti";
  copy: Copy;
  l10n: Map<string, string>;
  fallbackMap: Map<number, string>;
}) {
  const liftColor =
    variant === "synergy" ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]";
  const liftSign = p.rpLift > 0 ? "+" : "";
  const partnerName = resolveCharacterName(p.partnerCode, l10n, fallbackMap);
  const partnerWeaponName = resolveWeaponName(p.partnerWeapon, l10n);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white p-2.5">
      <Image
        src={getCharacterMiniWebpUrl(p.partnerCode)}
        alt={partnerName}
        width={36}
        height={36}
        className="h-9 w-9 rounded-md object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            {partnerName}
          </span>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {partnerWeaponName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
          <span>
            {p.games.toLocaleString()}
            {copy.games}
          </span>
          <span>·</span>
          <span>
            {copy.winRate} {p.winRate.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className={cn("flex flex-col items-end tabular-nums", liftColor)}>
        <span className="text-sm font-semibold">
          {liftSign}
          {p.rpLift.toFixed(1)}
        </span>
        <span className="text-[9px] opacity-80">{copy.rpLift}</span>
      </div>
    </li>
  );
}
