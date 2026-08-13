import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { LabCharacter, LabData, LabGroup } from "@/components/features/lab/types";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { BASE_URL } from "@/lib/siteMetadata";
import rangersData from "../../../../../../public/data/lab/rangers.json";

export const dynamic = "force-static";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const PREVIEW_METADATA = {
  ko: {
    title: "시너지 그룹 분석",
    description: "실험체 유형별 파트너 역할과 트리오 성과를 비교합니다.",
  },
  en: {
    title: "Synergy Group Analysis",
    description: "Compare partner roles and trio performance by character group.",
  },
  ja: {
    title: "シナジーグループ分析",
    description: "キャラクタータイプ別に相性役割とトリオ成績を比較します。",
  },
  "zh-Hans": {
    title: "协同分组分析",
    description: "按角色类型比较队友职责与三人组表现。",
  },
  "zh-Hant": {
    title: "協同分組分析",
    description: "依角色類型比較隊友定位與三人組表現。",
  },
} as const;

const PREVIEW_COPY: Record<
  RouteLocale,
  {
    back: string;
    kicker: string;
    summary: string;
    metrics: [string, string, string];
  }
> = {
  ko: {
    back: "실험체 유형 분석",
    kicker: "원거리 딜러 기준",
    summary: "원거리 딜러 기준으로 파트너 역할, 역할 조합, 트리오 성과를 함께 비교합니다.",
    metrics: ["그룹", "실험체", "최소 표본"],
  },
  en: {
    back: "Role Groups",
    kicker: "Ranged carry baseline",
    summary:
      "This preview summarizes partner-role patterns and trio performance for ranged carries.",
    metrics: ["Groups", "Characters", "Minimum sample"],
  },
  ja: {
    back: "ロールグループ",
    kicker: "遠距離キャリー基準",
    summary: "遠距離キャリーを基準に、相性役割とトリオ成績の概要を確認できます。",
    metrics: ["グループ", "キャラクター", "最小サンプル"],
  },
  "zh-Hans": {
    back: "角色分组",
    kicker: "远程输出基准",
    summary: "此预览会按远程输出基准汇总队友定位与三人组表现。",
    metrics: ["分组", "角色", "最小样本"],
  },
  "zh-Hant": {
    back: "角色分組",
    kicker: "遠程輸出基準",
    summary: "此預覽會依遠程輸出基準彙整隊友定位與三人組表現。",
    metrics: ["分組", "角色", "最小樣本"],
  },
};

const PARTNER_ROLES = ["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"] as const;
type PartnerRole = (typeof PARTNER_ROLES)[number];

const ROLE_SHORT: Record<PartnerRole, string> = {
  탱커: "탱",
  "원거리 딜러": "원딜",
  스킬딜러: "스딜",
  전사: "전사",
  지원가: "지원",
  암살자: "암살",
};

const ROLE_COLOR: Record<PartnerRole, string> = {
  탱커: "var(--color-foreground)",
  "원거리 딜러": "var(--color-accent-foreground)",
  스킬딜러: "var(--color-muted-foreground)",
  전사: "var(--color-foreground)",
  지원가: "var(--color-success)",
  암살자: "var(--color-trait-chaos)",
};

function roleTint(role: PartnerRole, amount = 14) {
  return `color-mix(in srgb, ${ROLE_COLOR[role]} ${amount}%, var(--color-surface))`;
}

function deltaCellStyle(value: number): { backgroundColor: string; color: string } {
  const abs = Math.min(1, Math.abs(value) / 1.5);
  if (value > 0.05) {
    const amount = 6 + abs * 18;
    return {
      backgroundColor: `color-mix(in srgb, var(--color-success) ${amount}%, var(--color-surface))`,
      color: "var(--color-success)",
    };
  }
  if (value < -0.05) {
    const amount = 4 + abs * 10;
    return {
      backgroundColor: `color-mix(in srgb, var(--color-danger-readable) ${amount}%, var(--color-surface))`,
      color: "var(--color-danger-readable)",
    };
  }
  return {
    backgroundColor: "var(--color-surface-2)",
    color: "var(--color-muted-foreground)",
  };
}

function memberStrokeColor(dist: number) {
  if (dist < 0.15) return "color-mix(in srgb, var(--color-success) 58%, transparent)";
  if (dist < 0.3) return "color-mix(in srgb, var(--color-muted-foreground) 58%, transparent)";
  if (dist < 0.5) return "color-mix(in srgb, var(--color-accent-foreground) 62%, transparent)";
  return "color-mix(in srgb, var(--color-danger-readable) 68%, transparent)";
}

function memberTextColor(dist: number) {
  if (dist < 0.15) return "var(--color-success)";
  if (dist < 0.3) return "var(--color-muted-foreground)";
  if (dist < 0.5) return "var(--color-accent-foreground)";
  return "var(--color-danger-readable)";
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const { title, description } = PREVIEW_METADATA[locale];
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    robots: { index: false, follow: false },
  };
}

// 멀티셋 문자열에서 파트너 역할 분리 (focus character role 제거)
function partnersOfMultiset(multiset: string, focusRole: string): PartnerRole[] {
  const roles = multiset.split(" + ").map((s) => s.trim());
  let focusUsed = false;
  const partners: PartnerRole[] = [];
  for (const r of roles) {
    if (!focusUsed && r === focusRole) {
      focusUsed = true;
      continue;
    }
    if ((PARTNER_ROLES as readonly string[]).includes(r)) partners.push(r as PartnerRole);
  }
  return partners;
}

// 실험체마다 파트너 역할별 가중 평균 RP delta
function computeAffinity(char: LabCharacter, focusRole: string): Record<PartnerRole, number> {
  const acc: Record<PartnerRole, { sum: number; weight: number }> = {
    탱커: { sum: 0, weight: 0 },
    "원거리 딜러": { sum: 0, weight: 0 },
    스킬딜러: { sum: 0, weight: 0 },
    전사: { sum: 0, weight: 0 },
    지원가: { sum: 0, weight: 0 },
    암살자: { sum: 0, weight: 0 },
  };
  const combos = [...char.strong, ...char.weak];
  for (const c of combos) {
    const partners = partnersOfMultiset(c.multiset, focusRole);
    for (const p of partners) {
      acc[p].sum += c.delta * c.games;
      acc[p].weight += c.games;
    }
  }
  const out: Record<PartnerRole, number> = {
    탱커: 0,
    "원거리 딜러": 0,
    스킬딜러: 0,
    전사: 0,
    지원가: 0,
    암살자: 0,
  };
  for (const role of PARTNER_ROLES) {
    out[role] = acc[role].weight > 0 ? acc[role].sum / acc[role].weight : 0;
  }
  return out;
}

function groupAvgAffinity(
  group: LabGroup,
  charactersByKey: Map<string, LabCharacter>,
  focusRole: string
): Record<PartnerRole, number> {
  const members = group.characterKeys
    .map((k) => charactersByKey.get(k))
    .filter((c): c is LabCharacter => Boolean(c));
  if (members.length === 0) {
    return { 탱커: 0, "원거리 딜러": 0, 스킬딜러: 0, 전사: 0, 지원가: 0, 암살자: 0 };
  }
  const sum: Record<PartnerRole, number> = {
    탱커: 0,
    "원거리 딜러": 0,
    스킬딜러: 0,
    전사: 0,
    지원가: 0,
    암살자: 0,
  };
  for (const m of members) {
    const aff = computeAffinity(m, focusRole);
    for (const role of PARTNER_ROLES) sum[role] += aff[role];
  }
  for (const role of PARTNER_ROLES) sum[role] /= members.length;
  return sum;
}

// ───────── 1) 그룹 성향 요약 ─────────
function RadarChart({
  values,
  size = 160,
  scale = 1.2,
}: {
  values: Record<PartnerRole, number>;
  size?: number;
  scale?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;
  const numAxes = PARTNER_ROLES.length;
  // 정규화: -scale ~ +scale 을 0 ~ 1 로 매핑, 중앙은 0.5
  const norm = (v: number) => Math.max(0, Math.min(1, 0.5 + v / (scale * 2)));
  const points = PARTNER_ROLES.map((role, i) => {
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    const r = norm(values[role]) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, role };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  // 그리드 (3 단계)
  const grid = [0.33, 0.66, 1].map((ratio) => {
    const pts = PARTNER_ROLES.map((_, i) => {
      const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
      return `${cx + Math.cos(angle) * maxR * ratio},${cy + Math.sin(angle) * maxR * ratio}`;
    }).join(" ");
    return pts;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth={1} />
      ))}
      {/* 중앙선 (zero level) */}
      <polygon
        points={PARTNER_ROLES.map((_, i) => {
          const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
          return `${cx + Math.cos(angle) * maxR * 0.5},${cy + Math.sin(angle) * maxR * 0.5}`;
        }).join(" ")}
        fill="none"
        stroke="rgba(100,116,139,0.34)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <polygon
        points={polygon}
        fill="rgba(100,116,139,0.18)"
        stroke="rgba(100,116,139,0.85)"
        strokeWidth={1.5}
      />
      {points.map((p) => (
        <circle key={p.role} cx={p.x} cy={p.y} r={2.5} fill="#64748b" />
      ))}
      {PARTNER_ROLES.map((role, i) => {
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (maxR + 14);
        const ly = cy + Math.sin(angle) * (maxR + 14);
        return (
          <text
            key={role}
            x={lx}
            y={ly}
            fontSize={10}
            fill="rgba(104,115,134,0.9)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {ROLE_SHORT[role]}
          </text>
        );
      })}
    </svg>
  );
}

// ───────── 2) 파트너 역할 분포 ─────────
function Heatmap({
  characters,
  focusRole,
  groupIdByKey,
}: {
  characters: LabCharacter[];
  focusRole: string;
  groupIdByKey: Map<string, number>;
}) {
  // 그룹별로 정렬
  const sorted = [...characters].sort((a, b) => {
    const ka = `${a.characterCode}_${a.weapon}`;
    const kb = `${b.characterCode}_${b.weapon}`;
    const ga = groupIdByKey.get(ka) ?? 999;
    const gb = groupIdByKey.get(kb) ?? 999;
    if (ga !== gb) return ga - gb;
    return b.totalGames - a.totalGames;
  });

  const matrixRows = sorted.flatMap((char, index) => {
    const key = `${char.characterCode}_${char.weapon}`;
    const g = groupIdByKey.get(key) ?? -1;
    const prev = sorted[index - 1];
    const prevKey = prev ? `${prev.characterCode}_${prev.weapon}` : null;
    const prevGroup = prevKey ? (groupIdByKey.get(prevKey) ?? -1) : null;
    const isNewGroup = g !== prevGroup;
    const aff = computeAffinity(char, focusRole);
    const rows = [];

    if (isNewGroup) {
      rows.push(
        <tr key={`sep-${g}`}>
          <td
            colSpan={PARTNER_ROLES.length + 1}
            className="border-b border-[var(--color-border)] px-2 pt-2 pb-1 text-[10px] font-medium text-[var(--color-muted-foreground)]"
          >
            GROUP {g}
          </td>
        </tr>
      );
    }

    rows.push(
      <tr key={key} className="hover:bg-[var(--color-surface-2)]">
        <td className="sticky left-0 bg-[var(--color-surface)] px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="relative h-6 w-6 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <Image
                src={getCharacterMiniWebpUrl(char.characterCode)}
                alt={char.characterName}
                fill
                sizes="24px"
                className="object-cover"
                unoptimized
              />
            </span>
            <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
              {char.characterName}
            </span>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              {char.weaponName}
            </span>
          </div>
        </td>
        {PARTNER_ROLES.map((role) => {
          const v = aff[role];
          return (
            <td
              key={role}
              className="px-1 py-1.5 text-center text-[10px] font-semibold tabular-nums"
              style={deltaCellStyle(v)}
              title={`${role}: ${v.toFixed(2)} RP`}
            >
              {v.toFixed(1)}
            </td>
          );
        })}
      </tr>
    );

    return rows;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-separate border-spacing-y-0.5 font-mono text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--color-surface)] px-2 py-2 text-left text-[10px] font-medium text-[var(--color-muted-foreground)]">
              실험체+무기
            </th>
            {PARTNER_ROLES.map((role) => (
              <th
                key={role}
                className="px-2 py-2 text-center text-[10px] font-semibold"
                style={{ color: ROLE_COLOR[role] }}
              >
                {ROLE_SHORT[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{matrixRows}</tbody>
      </table>
      <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)]">
        셀 값은 해당 파트너 역할이 포함된 역할 조합의 평균 RP 변화입니다. 초록은 양전, 빨강은 음전
        구간입니다.
      </p>
    </div>
  );
}

// ───────── 3) 그룹 멀티셋 다이버징 풀스택 ─────────
function aggregateGroupMultisets(
  group: LabGroup,
  charactersByKey: Map<string, LabCharacter>
): { multiset: string; delta: number; games: number }[] {
  const acc = new Map<string, { sum: number; games: number }>();
  for (const k of group.characterKeys) {
    const ch = charactersByKey.get(k);
    if (!ch) continue;
    for (const c of [...ch.strong, ...ch.weak]) {
      const bucket = acc.get(c.multiset) ?? { sum: 0, games: 0 };
      bucket.sum += c.delta * c.games;
      bucket.games += c.games;
      acc.set(c.multiset, bucket);
    }
  }
  return Array.from(acc.entries())
    .filter(([, v]) => v.games > 0)
    .map(([multiset, v]) => ({
      multiset,
      delta: v.sum / v.games,
      games: v.games,
    }));
}

function DivergingStack({
  group,
  charactersByKey,
}: {
  group: LabGroup;
  charactersByKey: Map<string, LabCharacter>;
}) {
  const aggregated = aggregateGroupMultisets(group, charactersByKey);
  const top = [...aggregated].sort((a, b) => b.delta - a.delta).slice(0, 4);
  const bot = [...aggregated].sort((a, b) => a.delta - b.delta).slice(0, 4);
  const maxAbs = Math.max(...[...top, ...bot].map((c) => Math.abs(c.delta)), 0.5);
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-[var(--color-success)]">
          성과가 좋은 역할 조합
        </p>
        <ul className="space-y-1">
          {top.map((c) => (
            <li key={c.multiset} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-[11px] text-[var(--color-foreground)]">
                {c.multiset}
              </span>
              <div className="relative h-3 flex-1 rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--color-success)]"
                  style={{ width: `${(c.delta / maxAbs) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-stat-up)]">
                +{c.delta.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-[var(--color-danger)]">
          성과가 낮은 역할 조합
        </p>
        <ul className="space-y-1">
          {bot.map((c) => (
            <li key={c.multiset} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-[11px] text-[var(--color-foreground)]">
                {c.multiset}
              </span>
              <div className="relative h-3 flex-1 rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--color-danger)]"
                  style={{ width: `${(Math.abs(c.delta) / maxAbs) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-stat-down)]">
                {c.delta.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ───────── 7) 파트너 역할 궁합 ─────────

// 모든 (partnerA, partnerB) 페어 (정렬, 중복 허용)
const PARTNER_PAIRS: [PartnerRole, PartnerRole][] = (() => {
  const out: [PartnerRole, PartnerRole][] = [];
  for (let i = 0; i < PARTNER_ROLES.length; i++) {
    for (let j = i; j < PARTNER_ROLES.length; j++) {
      out.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
    }
  }
  return out; // 21 페어
})();

function pairKey(a: PartnerRole, b: PartnerRole): string {
  return [a, b].sort().join("|");
}

function partnerPairOfMultiset(
  multiset: string,
  focusRole: string
): [PartnerRole, PartnerRole] | null {
  const roles = multiset.split(" + ").map((s) => s.trim());
  // focus role 1개 제거
  const idx = roles.indexOf(focusRole);
  if (idx >= 0) roles.splice(idx, 1);
  if (roles.length !== 2) return null;
  if (!(PARTNER_ROLES as readonly string[]).includes(roles[0])) return null;
  if (!(PARTNER_ROLES as readonly string[]).includes(roles[1])) return null;
  const sorted = [...roles].sort();
  return [sorted[0] as PartnerRole, sorted[1] as PartnerRole];
}

function computeGroupPairAffinity(
  group: LabGroup,
  charactersByKey: Map<string, LabCharacter>,
  focusRole: string
): Map<string, { delta: number; games: number }> {
  const acc = new Map<string, { sum: number; games: number }>();
  for (const k of group.characterKeys) {
    const ch = charactersByKey.get(k);
    if (!ch) continue;
    for (const c of [...ch.strong, ...ch.weak]) {
      const pair = partnerPairOfMultiset(c.multiset, focusRole);
      if (!pair) continue;
      const key = pairKey(pair[0], pair[1]);
      const bucket = acc.get(key) ?? { sum: 0, games: 0 };
      bucket.sum += c.delta * c.games;
      bucket.games += c.games;
      acc.set(key, bucket);
    }
  }
  const result = new Map<string, { delta: number; games: number }>();
  for (const [key, v] of acc) {
    result.set(key, { delta: v.games > 0 ? v.sum / v.games : 0, games: v.games });
  }
  return result;
}

function DenseRadar({
  pairAffinity,
  size = 280,
  scale = 1.5,
}: {
  pairAffinity: Map<string, { delta: number; games: number }>;
  size?: number;
  scale?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  // 게임 수 충분한 페어만 (≥ 100판)
  const filtered = PARTNER_PAIRS.filter(([a, b]) => {
    const v = pairAffinity.get(pairKey(a, b));
    return v && v.games >= 100;
  });
  const n = filtered.length || 1;
  const norm = (v: number) => Math.max(0, Math.min(1, 0.5 + v / (scale * 2)));

  const points = filtered.map(([a, b], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = pairAffinity.get(pairKey(a, b))?.delta ?? 0;
    const r = norm(v) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, a, b, v, angle };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  const grids = [0.25, 0.5, 0.75, 1].map((ratio) =>
    filtered
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return `${cx + Math.cos(angle) * maxR * ratio},${cy + Math.sin(angle) * maxR * ratio}`;
      })
      .join(" ")
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grids.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="rgba(100,116,139,0.16)" strokeWidth={1} />
      ))}
      {/* zero level */}
      <polygon
        points={filtered
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + Math.cos(angle) * maxR * 0.5},${cy + Math.sin(angle) * maxR * 0.5}`;
          })
          .join(" ")}
        fill="none"
        stroke="rgba(100,116,139,0.34)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <polygon
        points={polygon}
        fill="rgba(100,116,139,0.18)"
        stroke="rgba(100,116,139,0.85)"
        strokeWidth={1.4}
      />
      {points.map((p) => {
        const positive = p.v >= 0;
        return (
          <circle
            key={`${p.a}|${p.b}`}
            cx={p.x}
            cy={p.y}
            r={2}
            fill={positive ? "#15803d" : "#dc2626"}
          />
        );
      })}
      {/* 라벨: 페어 칩 2개 */}
      {points.map((p) => {
        const lr = maxR + 22;
        const lx = cx + Math.cos(p.angle) * lr;
        const ly = cy + Math.sin(p.angle) * lr;
        return (
          <g key={`label-${p.a}|${p.b}`} transform={`translate(${lx - 22}, ${ly - 6})`}>
            <rect
              width={20}
              height={11}
              rx={2}
              fill={roleTint(p.a, 14)}
              stroke={roleTint(p.a, 48)}
            />
            <text x={10} y={8} fontSize={7.5} fill={ROLE_COLOR[p.a]} textAnchor="middle">
              {ROLE_SHORT[p.a]}
            </text>
            <rect
              x={22}
              width={20}
              height={11}
              rx={2}
              fill={roleTint(p.b, 14)}
              stroke={roleTint(p.b, 48)}
            />
            <text x={32} y={8} fontSize={7.5} fill={ROLE_COLOR[p.b]} textAnchor="middle">
              {ROLE_SHORT[p.b]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ───────── 8) 그룹 내 유사도 검증 ─────────

function computeMemberPairAffinity(
  char: LabCharacter,
  focusRole: string
): Map<string, { delta: number; games: number }> {
  const acc = new Map<string, { sum: number; games: number }>();
  for (const c of [...char.strong, ...char.weak]) {
    const pair = partnerPairOfMultiset(c.multiset, focusRole);
    if (!pair) continue;
    const key = pairKey(pair[0], pair[1]);
    const bucket = acc.get(key) ?? { sum: 0, games: 0 };
    bucket.sum += c.delta * c.games;
    bucket.games += c.games;
    acc.set(key, bucket);
  }
  const result = new Map<string, { delta: number; games: number }>();
  for (const [k, v] of acc) {
    result.set(k, { delta: v.games > 0 ? v.sum / v.games : 0, games: v.games });
  }
  return result;
}

// 멤버 vs 그룹 centroid 의 cosine distance (낮을수록 응집)
function cosineDistance(
  member: Map<string, { delta: number; games: number }>,
  centroid: Map<string, { delta: number; games: number }>,
  axes: { a: PartnerRole; b: PartnerRole }[]
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const { a, b } of axes) {
    const k = pairKey(a, b);
    const va = member.get(k)?.delta ?? 0;
    const vb = centroid.get(k)?.delta ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 1;
  return 1 - dot / denom; // 0 = identical, 2 = opposite
}

function GroupCohesionRadar({
  group,
  charactersByKey,
  focusRole,
  size = 280,
  scale = 1.8,
}: {
  group: LabGroup;
  charactersByKey: Map<string, LabCharacter>;
  focusRole: string;
  size?: number;
  scale?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;

  const groupPair = computeGroupPairAffinity(group, charactersByKey, focusRole);
  // 표본 ≥ 100 페어만 축으로 사용
  const axes = PARTNER_PAIRS.filter(
    ([a, b]) => (groupPair.get(pairKey(a, b))?.games ?? 0) >= 100
  ).map(([a, b]) => ({ a, b }));
  const n = axes.length || 1;
  const norm = (v: number) => Math.max(0, Math.min(1, 0.5 + v / (scale * 2)));

  // 그룹 centroid polygon
  const centroidPoints = axes.map(({ a, b }, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = groupPair.get(pairKey(a, b))?.delta ?? 0;
    const r = norm(v) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  const centroidPolygon = centroidPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // 멤버 각자 polygon + cosine distance
  const members = group.characterKeys
    .map((k) => charactersByKey.get(k))
    .filter((c): c is LabCharacter => Boolean(c));

  const memberData = members.map((m) => {
    const aff = computeMemberPairAffinity(m, focusRole);
    const dist = cosineDistance(aff, groupPair, axes);
    const points = axes.map(({ a, b }, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = aff.get(pairKey(a, b))?.delta ?? 0;
      const r = norm(v) * maxR;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    });
    return { char: m, dist, polygon: points.join(" ") };
  });

  // 응집도 = 평균 cosine distance
  const avgDist =
    memberData.length > 0 ? memberData.reduce((s, d) => s + d.dist, 0) / memberData.length : 0;
  const cohesion = Math.max(0, Math.min(100, (1 - avgDist) * 100));

  return (
    <div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((ratio, gi) => (
          <polygon
            key={gi}
            points={axes
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                return `${cx + Math.cos(angle) * maxR * ratio},${cy + Math.sin(angle) * maxR * ratio}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(100,116,139,0.16)"
            strokeWidth={1}
          />
        ))}
        {/* zero level */}
        <polygon
          points={axes
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + Math.cos(angle) * maxR * 0.5},${cy + Math.sin(angle) * maxR * 0.5}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(100,116,139,0.34)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {/* 멤버 polygon (thin) */}
        {memberData.map((m) => (
          <polygon
            key={`${m.char.characterCode}_${m.char.weapon}`}
            points={m.polygon}
            fill="none"
            stroke={memberStrokeColor(m.dist)}
            strokeWidth={1.2}
          />
        ))}
        {/* 그룹 centroid polygon (filled) */}
        <polygon
          points={centroidPolygon}
          fill="rgba(100,116,139,0.16)"
          stroke="rgba(100,116,139,0.85)"
          strokeWidth={1.8}
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-[var(--color-muted-foreground)]">응집도</span>
        <span
          className={`font-mono font-bold ${
            cohesion >= 80
              ? "text-[var(--color-success)]"
              : cohesion >= 60
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-danger)]"
          }`}
        >
          {cohesion.toFixed(0)}/100
        </span>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {[...memberData]
          .sort((a, b) => b.dist - a.dist)
          .map((m) => (
            <li
              key={`${m.char.characterCode}_${m.char.weapon}`}
              className="flex items-center justify-between gap-2 text-[10px]"
              style={{ color: memberTextColor(m.dist) }}
            >
              <span className="min-w-0 truncate">
                {m.char.characterName}
                <span className="text-[var(--color-muted-foreground)]"> · {m.char.weaponName}</span>
              </span>
              <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted-foreground)]">
                {m.char.totalGames.toLocaleString("ko-KR")}판
              </span>
              <span className="w-9 shrink-0 text-right font-mono tabular-nums">
                {m.dist.toFixed(2)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

// ───────── 5) 트리오 구성 요약 ─────────
function RoleChip({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const color = ROLE_COLOR[role as PartnerRole] ?? "#94a3b8";
  const short = ROLE_SHORT[role as PartnerRole] ?? role.slice(0, 2);
  const dims = size === "sm" ? "h-7 w-9 text-[10px]" : "h-9 w-12 text-[11px]";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-md border font-bold tabular-nums`}
      style={{
        borderColor: `${color}55`,
        background: `${color}1c`,
        color,
      }}
    >
      {short}
    </span>
  );
}

function TrioSlotChips({ multiset, size }: { multiset: string; size?: "sm" | "md" }) {
  const parts = multiset.split(" + ");
  return (
    <div className="flex items-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-[var(--color-muted-foreground)]">+</span>}
          <RoleChip role={p} size={size} />
        </span>
      ))}
    </div>
  );
}

function TrioGroupCard({
  group,
  charactersByKey,
}: {
  group: LabGroup;
  charactersByKey: Map<string, LabCharacter>;
}) {
  const aggregated = aggregateGroupMultisets(group, charactersByKey);
  const top = [...aggregated].sort((a, b) => b.delta - a.delta).slice(0, 6);
  const maxAbs = Math.max(...top.map((t) => Math.abs(t.delta)), 0.5);
  return (
    <div className="char-card p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="text-xs font-bold text-[var(--color-foreground)]">{group.label}</p>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          {group.characterKeys.length}명
        </p>
      </header>
      <ul className="space-y-1.5">
        {top.map((t) => {
          const positive = t.delta >= 0;
          return (
            <li
              key={t.multiset}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)]/40 p-2"
            >
              <TrioSlotChips multiset={t.multiset} />
              <div className="relative ml-auto h-2 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div
                  className="h-full"
                  style={{
                    width: `${(Math.abs(t.delta) / maxAbs) * 100}%`,
                    background: positive ? "var(--color-success)" : "var(--color-danger)",
                  }}
                />
              </div>
              <span
                className={`w-14 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                  positive ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
                }`}
              >
                {positive ? "+" : ""}
                {t.delta.toFixed(2)}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
                {t.games.toLocaleString("ko-KR")}판
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrioMatrixRow({
  group,
  charactersByKey,
}: {
  group: LabGroup;
  charactersByKey: Map<string, LabCharacter>;
}) {
  const aggregated = aggregateGroupMultisets(group, charactersByKey);
  const top = [...aggregated].sort((a, b) => b.delta - a.delta).slice(0, 3);
  const bot = [...aggregated].sort((a, b) => a.delta - b.delta).slice(0, 3);

  return (
    <div className="char-card grid gap-3 p-3 lg:grid-cols-[180px_1fr_1fr]">
      <div className="flex flex-col justify-center gap-1 border-r border-[var(--color-border)] pr-3">
        <p className="text-xs font-bold text-[var(--color-foreground)]">{group.label}</p>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          {group.characterKeys.length}명 · 그룹 {group.id}
        </p>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-[var(--color-success)]">
          성과가 좋은 트리오
        </p>
        <ul className="space-y-1">
          {top.map((t) => (
            <li
              key={`top-${t.multiset}`}
              className="flex items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5"
            >
              <TrioSlotChips multiset={t.multiset} size="sm" />
              <span className="ml-auto flex items-center gap-1.5">
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
                  {t.games.toLocaleString("ko-KR")}판
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-stat-up)]">
                  +{t.delta.toFixed(2)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-[var(--color-danger)]">
          성과가 낮은 트리오
        </p>
        <ul className="space-y-1">
          {bot.map((t) => (
            <li
              key={`bot-${t.multiset}`}
              className="flex items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5"
            >
              <TrioSlotChips multiset={t.multiset} size="sm" />
              <span className="ml-auto flex items-center gap-1.5">
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
                  {t.games.toLocaleString("ko-KR")}판
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-stat-down)]">
                  {t.delta.toFixed(2)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ───────── 4) 실험체 위치 비교 ─────────
function ScatterPlot({
  characters,
  focusRole,
  groupIdByKey,
}: {
  characters: LabCharacter[];
  focusRole: string;
  groupIdByKey: Map<string, number>;
}) {
  // 2D projection: x = 평균 친화 (탱커+전사+지원) - (스킬딜러+원딜), y = 전체 친화 합
  const points = characters.map((char) => {
    const aff = computeAffinity(char, focusRole);
    const x = aff["탱커"] + aff["전사"] + aff["지원가"] - aff["스킬딜러"] - aff["원거리 딜러"];
    const y = PARTNER_ROLES.reduce((s, r) => s + aff[r], 0);
    return { char, x, y };
  });
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const W = 480;
  const H = 280;
  const pad = 40;
  const projX = (x: number) => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - pad * 2);
  const projY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin || 1)) * (H - pad * 2);
  const groupColors = ["#374151", "#4b5563", "#64748b", "#6b7280", "#687386", "#94a3b8", "#9ca3af"];

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} fill="rgba(248,250,252,0.9)" rx={6} />
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(100,116,139,0.26)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(100,116,139,0.26)" />
        <text
          x={W - pad}
          y={H - pad + 18}
          fontSize={9}
          fill="rgba(104,115,134,0.85)"
          textAnchor="end"
        >
          → 탱·전·지 친화
        </text>
        <text x={pad - 6} y={pad - 6} fontSize={9} fill="rgba(104,115,134,0.85)" textAnchor="start">
          ↑ 종합 친화
        </text>
        {points.map((p) => {
          const key = `${p.char.characterCode}_${p.char.weapon}`;
          const g = groupIdByKey.get(key) ?? 0;
          const color = groupColors[g % groupColors.length];
          return (
            <g key={key}>
              <circle
                cx={projX(p.x)}
                cy={projY(p.y)}
                r={9}
                fill={color}
                fillOpacity={0.22}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={projX(p.x)}
                y={projY(p.y) + 22}
                fontSize={9}
                fill="rgba(104,115,134,0.9)"
                textAnchor="middle"
              >
                {p.char.characterName}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)]">
        x축 = (탱·전·지원 친화) − (스딜·원딜 친화). y축 = 전체 친화 합. 같은 색 = 같은 그룹.
      </p>
    </div>
  );
}

export default async function CharacterLabPreviewPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = rangersData as LabData;
  const meta = PREVIEW_METADATA[locale];
  const copy = PREVIEW_COPY[locale];

  if (locale !== "ko") {
    return (
      <main className="page-shell mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-5 sm:py-8">
        <nav className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
          <Link
            href="/character-lab"
            className="dashboard-tab inline-flex items-center gap-1 px-2 py-1"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
            {copy.back}
          </Link>
        </nav>

        <header className="dashboard-panel p-4">
          <span className="dashboard-kicker">{copy.kicker}</span>
          <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
            {meta.title}
          </h1>
          <p className="mt-2 max-w-[54rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem]">
            {copy.summary}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="metric-card px-4 py-4" data-accent="true">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.metrics[0]}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-accent-foreground)]">
              {data.groupK}
            </p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.metrics[1]}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
              {data.characters.length}
            </p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.metrics[2]}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
              {data.minGames}+
            </p>
          </div>
        </section>
      </main>
    );
  }

  const charactersByKey = new Map<string, LabCharacter>();
  const groupIdByKey = new Map<string, number>();
  for (const ch of data.characters) {
    charactersByKey.set(`${ch.characterCode}_${ch.weapon}`, ch);
  }
  for (const g of data.groups) {
    for (const k of g.characterKeys) groupIdByKey.set(k, g.id);
  }

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-5 sm:py-8">
      <nav className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href="/character-lab"
          className="dashboard-tab inline-flex items-center gap-1 px-2 py-1"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          실험체 유형 분석
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="text-[var(--color-foreground)]">그룹 분석</span>
      </nav>

      <header className="dashboard-panel p-4">
        <span className="dashboard-kicker">{data.role} 기준</span>
        <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
          시너지 그룹 분석
        </h1>
        <p className="mt-2 max-w-[54rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem]">
          {data.role} 기준으로 파트너 역할, 역할 조합, 트리오 성과를 함께 비교합니다.
        </p>
      </header>

      {/* 그룹 성향 요약 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          그룹별 성향 요약
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          각 그룹이 어떤 파트너 역할에서 RP 이득을 내는지 비교합니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.groups.map((g, index) => (
            <div
              key={g.id}
              className="char-card flex flex-col items-center gap-2 p-4"
              data-accent={index === 0 ? "true" : undefined}
            >
              <p className="text-xs font-bold text-[var(--color-foreground)]">{g.label}</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">
                {g.characterKeys.length}명 · 합산{" "}
                {g.characterKeys
                  .reduce((s, k) => s + (charactersByKey.get(k)?.totalGames ?? 0), 0)
                  .toLocaleString("ko-KR")}
                판
              </p>
              <RadarChart values={groupAvgAffinity(g, charactersByKey, data.role)} />
            </div>
          ))}
        </div>
      </section>

      {/* 파트너 역할 분포 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          파트너 역할 분포
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          실험체별로 어떤 파트너 역할과 함께할 때 RP가 좋아지는지 보여줍니다.
        </p>
        <div className="mt-3">
          <Heatmap characters={data.characters} focusRole={data.role} groupIdByKey={groupIdByKey} />
        </div>
      </section>

      {/* 그룹별 역할 조합 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          그룹별 역할 조합
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          그룹별로 성과가 좋았던 역할 조합과 낮았던 역할 조합을 게임 수 기준으로 비교합니다.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.groups.slice(0, 4).map((g) => (
            <div key={g.id} className="char-card p-4">
              <p className="mb-3 text-xs font-bold text-[var(--color-foreground)]">{g.label}</p>
              <DivergingStack group={g} charactersByKey={charactersByKey} />
            </div>
          ))}
        </div>
      </section>

      {/* 그룹 응집도 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          그룹 내 유사도
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          그룹 대표 패턴과 각 실험체의 패턴을 겹쳐서 같은 유형으로 묶이는지 확인합니다. 응집도는
          패턴 유사도를 100점 기준으로 환산합니다.
          <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px]">
            <span
              className="inline-block h-2 w-3 rounded"
              style={{
                background: "color-mix(in srgb, var(--color-success) 28%, var(--color-surface))",
              }}
            />{" "}
            ≤ 0.15
            <span
              className="inline-block h-2 w-3 rounded"
              style={{
                background:
                  "color-mix(in srgb, var(--color-muted-foreground) 28%, var(--color-surface))",
              }}
            />{" "}
            ≤ 0.30
            <span
              className="inline-block h-2 w-3 rounded"
              style={{
                background:
                  "color-mix(in srgb, var(--color-accent-foreground) 28%, var(--color-surface))",
              }}
            />{" "}
            ≤ 0.50
            <span
              className="inline-block h-2 w-3 rounded"
              style={{
                background:
                  "color-mix(in srgb, var(--color-danger-readable) 30%, var(--color-surface))",
              }}
            />{" "}
            &gt; 0.50 (이상치)
          </span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.groups.map((g) => {
            const totalGames = g.characterKeys.reduce(
              (s, k) => s + (charactersByKey.get(k)?.totalGames ?? 0),
              0
            );
            return (
              <div key={g.id} className="char-card flex flex-col items-center gap-2 p-4">
                <p className="text-xs font-bold text-[var(--color-foreground)]">{g.label}</p>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  {g.characterKeys.length}명 · 그룹 {g.id} · 합산{" "}
                  {totalGames.toLocaleString("ko-KR")}판
                </p>
                <GroupCohesionRadar
                  group={g}
                  charactersByKey={charactersByKey}
                  focusRole={data.role}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 파트너 역할 궁합 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          파트너 역할 궁합
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          두 파트너 역할이 함께 들어간 트리오의 평균 RP를 기준으로 세부 성향을 비교합니다. 표본이
          적은 축은 제외합니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.groups.map((g) => (
            <div key={g.id} className="char-card flex flex-col items-center gap-2 p-4">
              <p className="text-xs font-bold text-[var(--color-foreground)]">{g.label}</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">
                {g.characterKeys.length}명
              </p>
              <DenseRadar pairAffinity={computeGroupPairAffinity(g, charactersByKey, data.role)} />
            </div>
          ))}
        </div>
      </section>

      {/* 트리오 구성 요약 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          트리오 구성 요약
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          역할 조합을 3개 슬롯으로 나눠 실제 트리오 구성을 빠르게 비교합니다.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.groups.slice(0, 4).map((g) => (
            <TrioGroupCard key={g.id} group={g} charactersByKey={charactersByKey} />
          ))}
        </div>
      </section>

      {/* 트리오 성과 비교 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          트리오 성과 비교
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          그룹마다 성과가 좋은 트리오와 낮은 트리오를 나란히 비교합니다.
        </p>
        <div className="mt-4 space-y-3">
          {data.groups.map((g) => (
            <TrioMatrixRow key={g.id} group={g} charactersByKey={charactersByKey} />
          ))}
        </div>
      </section>

      {/* 실험체 위치 비교 */}
      <section className="dashboard-panel p-4">
        <h2 className="dashboard-section-title text-sm font-bold text-[var(--color-foreground)]">
          실험체 위치 비교
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          같은 그룹의 실험체들이 어느 정도 가까운 위치에 모이는지 비교합니다.
        </p>
        <div className="mt-4 char-card p-4">
          <ScatterPlot
            characters={data.characters}
            focusRole={data.role}
            groupIdByKey={groupIdByKey}
          />
        </div>
      </section>
    </main>
  );
}
