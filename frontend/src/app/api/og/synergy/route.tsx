import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getCharacterName } from "@/lib/characterMap";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

// ─── 추천 점수 계산 (trios/route.ts 동일 로직) ─────────────────────────────
const BAYESIAN_K = 50;
const TRIO_MEMBER_COUNT = 3;
const DIAMOND_PLUS_TIERS = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];
const EXCLUDED = new Set([9998, 9999]);

interface TrioRow {
  character1: number;
  character2: number;
  character3: number;
  winRate: number;
  averageRP: number;
  totalGames: number;
  averageRank: number;
}

interface AggTrio {
  character1: number;
  character2: number;
  character3: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

function aggregate(rows: TrioRow[]): AggTrio[] {
  const m = new Map<string, { c1: number; c2: number; c3: number; tg: number; wr: number; rp: number; rk: number }>();
  for (const r of rows) {
    const k = `${r.character1}-${r.character2}-${r.character3}`;
    const e = m.get(k);
    if (!e) m.set(k, { c1: r.character1, c2: r.character2, c3: r.character3, tg: r.totalGames, wr: r.winRate * r.totalGames, rp: r.averageRP * r.totalGames, rk: r.averageRank * r.totalGames });
    else { e.tg += r.totalGames; e.wr += r.winRate * r.totalGames; e.rp += r.averageRP * r.totalGames; e.rk += r.averageRank * r.totalGames; }
  }
  return Array.from(m.values()).map(v => ({
    character1: v.c1, character2: v.c2, character3: v.c3,
    totalGames: v.tg,
    winRate: v.tg > 0 ? v.wr / v.tg : 0,
    averageRP: v.tg > 0 ? v.rp / v.tg / TRIO_MEMBER_COUNT : 0,
    averageRank: v.tg > 0 ? v.rk / v.tg : 0,
  }));
}

function score(r: AggTrio, gAvg: number, rpRange: { min: number; max: number }): number {
  const bRP = (r.totalGames * r.averageRP + BAYESIAN_K * gAvg) / (r.totalGames + BAYESIAN_K);
  const span = rpRange.max - rpRange.min || 1;
  const nRP = Math.max(0, Math.min(1, (bRP - rpRange.min) / span));
  const p = r.winRate / 100;
  const z = 1.645;
  const n = r.totalGames || 1;
  const wilson = Math.max(0, (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z * z / (4 * n * n))) / (1 + z * z / n));
  const rk = Math.max(0, Math.min(1, (8 - r.averageRank) / 7));
  return 0.60 * nRP + 0.30 * wilson + 0.10 * rk;
}

async function fetchTop3(char1: number | null, char2: number | null): Promise<AggTrio[]> {
  const supabase = createServerClient();
  const ttl = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("CharacterTrio")
    .select("character1,character2,character3,winRate,averageRP,totalGames,averageRank")
    .in("tier", DIAMOND_PLUS_TIERS)
    .gte("lastUpdated", ttl)
    .order("totalGames", { ascending: false })
    .limit(5000);

  if (char1 !== null && char2 !== null) {
    const [lo, hi] = [char1, char2].sort((a, b) => a - b);
    query = query.or([
      `and(character1.eq.${lo},character2.eq.${hi})`,
      `and(character1.eq.${lo},character3.eq.${hi})`,
      `and(character2.eq.${lo},character3.eq.${hi})`,
    ].join(","));
  } else if (char1 !== null) {
    query = query.or(`character1.eq.${char1},character2.eq.${char1},character3.eq.${char1}`);
  }

  const { data } = await query;
  const rows = ((data ?? []) as TrioRow[]).filter(r => !EXCLUDED.has(r.character1) && !EXCLUDED.has(r.character2) && !EXCLUDED.has(r.character3));
  const agg = aggregate(rows);

  const gAvg = agg.length > 0 ? agg.reduce((s, r) => s + r.averageRP, 0) / agg.length : 0;
  const rps = agg.map(r => r.averageRP);
  const rpRange = { min: Math.min(...rps, 0), max: Math.max(...rps, 0) };
  agg.sort((a, b) => score(b, gAvg, rpRange) - score(a, gAvg, rpRange));
  return agg.slice(0, 3);
}

// ─── OG 이미지 렌더링 ──────────────────────────────────────────────────────

function renderDefaultOG() {
  return (
    <div style={{ background: "#0f0f14", width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ width: "100%", height: "4px", background: "#f59e0b", display: "flex" }} />
      <div style={{ display: "flex", flex: 1, padding: "60px 80px", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "#6366f1", borderRadius: "12px", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 800, color: "white" }}>E</div>
          <span style={{ fontSize: "40px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-1px" }}>ER&GG</span>
        </div>
        <div style={{ display: "flex", fontSize: "56px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-2px" }}>3인 조합 추천</div>
        <div style={{ display: "flex", fontSize: "24px", color: "#94a3b8" }}>베이지안 통계 기반 최적 팀 조합 분석</div>
        <div style={{ display: "flex", fontSize: "18px", color: "#6366f1", marginTop: "8px" }}>erwagg.com</div>
      </div>
      <div style={{ display: "flex", height: "3px", background: "linear-gradient(90deg, #6366f1 0%, #f59e0b 100%)" }} />
    </div>
  );
}

function renderTrioOG(trios: AggTrio[], allies: number[]) {
  const name1 = allies[0] ? getCharacterName(allies[0]) : null;
  const name2 = allies[1] ? getCharacterName(allies[1]) : null;
  const allyLabel = name2 ? `${name1} + ${name2}` : name1 ?? "";

  return (
    <div style={{ background: "#0f0f14", width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* 상단 골드 라인 */}
      <div style={{ width: "100%", height: "4px", background: "#f59e0b", display: "flex" }} />

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "40px 60px 30px" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ background: "#6366f1", borderRadius: "10px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", fontWeight: 800, color: "white" }}>E</div>
            <span style={{ fontSize: "32px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-1px" }}>ER&GG</span>
          </div>
          <span style={{ fontSize: "16px", color: "#6366f1" }}>erwagg.com</span>
        </div>

        {/* 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ display: "flex", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "12px", padding: "10px 20px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#e2e8f0" }}>{allyLabel}</span>
          </div>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#94a3b8" }}>추천 조합 TOP 3</span>
        </div>

        {/* TOP 3 카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          {trios.map((trio, i) => {
            const chars = [trio.character1, trio.character2, trio.character3];
            // 아군을 앞에, 추천 캐릭터를 뒤에
            const allySet = new Set(allies);
            const allyChars = chars.filter(c => allySet.has(c));
            const recChars = chars.filter(c => !allySet.has(c));
            const ordered = [...allyChars, ...recChars];

            const isFirst = i === 0;
            const bgColor = isFirst ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)";
            const borderColor = isFirst ? "rgba(251,191,36,0.25)" : "#1e293b";
            const rankColor = isFirst ? "#fbbf24" : i === 1 ? "#e2e8f0" : "#94a3b8";

            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", background: bgColor,
                border: `2px solid ${borderColor}`, borderRadius: "16px",
                padding: "14px 24px", gap: "20px",
              }}>
                {/* 순위 */}
                <span style={{ fontSize: "32px", fontWeight: 900, color: rankColor, width: "44px", textAlign: "center" }}>
                  {i + 1}
                </span>

                {/* 캐릭터 3명 */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  {ordered.map((code, ci) => {
                    const isRec = !allySet.has(code);
                    const charName = getCharacterName(code);
                    return (
                      <div key={code} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        }}>
                          <div style={{
                            width: "56px", height: "56px", borderRadius: "12px",
                            background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center",
                            border: isRec ? "3px solid #fbbf24" : "2px solid #334155",
                            fontSize: "20px", fontWeight: 700,
                            color: isRec ? "#fbbf24" : "#94a3b8",
                          }}>
                            {charName.slice(0, 2)}
                          </div>
                          <span style={{
                            fontSize: "13px", fontWeight: 600,
                            color: isRec ? "#fbbf24" : "#cbd5e1",
                            maxWidth: "80px", textAlign: "center",
                          }}>
                            {charName}
                          </span>
                        </div>
                        {ci < 2 && (
                          <span style={{ fontSize: "18px", color: "#475569", fontWeight: 700, margin: "0 2px" }}>+</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 스탯 */}
                <div style={{ display: "flex", gap: "28px", marginLeft: "auto" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>승률</span>
                    <span style={{
                      fontSize: "22px", fontWeight: 800,
                      color: trio.winRate >= 60 ? "#fbbf24" : trio.winRate >= 55 ? "#e2e8f0" : "#94a3b8",
                    }}>
                      {trio.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>평균 RP</span>
                    <span style={{
                      fontSize: "22px", fontWeight: 800,
                      color: trio.averageRP > 0 ? "#fbbf24" : trio.averageRP < 0 ? "#f87171" : "#94a3b8",
                    }}>
                      {trio.averageRP > 0 ? "+" : ""}{trio.averageRP.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
          <span style={{ fontSize: "14px", color: "#475569" }}>erwagg.com · 이터널리턴 통계 분석</span>
        </div>
      </div>

      {/* 하단 그라디언트 */}
      <div style={{ display: "flex", height: "3px", background: "linear-gradient(90deg, #6366f1 0%, #f59e0b 100%)" }} />
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ally1Param = searchParams.get("ally1");
  const ally2Param = searchParams.get("ally2");

  const char1 = ally1Param ? parseInt(ally1Param, 10) : null;
  const char2 = ally2Param ? parseInt(ally2Param, 10) : null;

  // 유효한 캐릭터가 없으면 기본 OG
  if (char1 === null || isNaN(char1)) {
    return new ImageResponse(renderDefaultOG(), {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600" },
    });
  }

  try {
    const allies = [char1];
    if (char2 !== null && !isNaN(char2) && char2 !== char1) allies.push(char2);

    const trios = await fetchTop3(char1, char2 !== null && !isNaN(char2) ? char2 : null);

    if (trios.length === 0) {
      return new ImageResponse(renderDefaultOG(), {
        ...SIZE,
        headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
      });
    }

    return new ImageResponse(renderTrioOG(trios, allies), {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    console.error("[og/synergy] Error:", e);
    return new ImageResponse(renderDefaultOG(), {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    });
  }
}
