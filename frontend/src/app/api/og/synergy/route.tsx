import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { getCharacterName } from "@/lib/characterMap";
import { createServerClient } from "@/lib/supabase";

// Satori 가 WebP 디코딩을 못 하므로 미리 PNG dataURL 로 변환해서 임베드한다.
// 캐릭터 mini 이미지는 정적 자산이라 instance 메모리에 캐시 (87 chars × ~3KB ≈ 260KB)
const iconCache = new Map<number, string>();

async function loadIconDataUrl(code: number): Promise<string | null> {
  const cached = iconCache.get(code);
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "public", "characters", "mini", `${code}.webp`);
    const buf = await readFile(file);
    const png = await sharp(buf).resize(64, 64).png().toBuffer();
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    iconCache.set(code, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

async function loadIcons(codes: number[]): Promise<Map<number, string>> {
  const unique = Array.from(new Set(codes));
  const results = await Promise.all(
    unique.map(async (code) => [code, await loadIconDataUrl(code)] as const)
  );
  const m = new Map<number, string>();
  for (const [code, url] of results) {
    if (url) m.set(code, url);
  }
  return m;
}

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

// ─── 추천 점수 계산 (trios/route.ts 동일 로직) ─────────────────────────────
const BAYESIAN_K = 50;
const TRIO_MEMBER_COUNT = 3;
const DIAMOND_PLUS_TIERS = ["DIAMOND", "METEORITE", "MITHRIL"];
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
  const m = new Map<
    string,
    { c1: number; c2: number; c3: number; tg: number; wr: number; rp: number; rk: number }
  >();
  for (const r of rows) {
    const k = `${r.character1}-${r.character2}-${r.character3}`;
    const e = m.get(k);
    if (!e)
      m.set(k, {
        c1: r.character1,
        c2: r.character2,
        c3: r.character3,
        tg: r.totalGames,
        wr: r.winRate * r.totalGames,
        rp: r.averageRP * r.totalGames,
        rk: r.averageRank * r.totalGames,
      });
    else {
      e.tg += r.totalGames;
      e.wr += r.winRate * r.totalGames;
      e.rp += r.averageRP * r.totalGames;
      e.rk += r.averageRank * r.totalGames;
    }
  }
  return Array.from(m.values()).map((v) => ({
    character1: v.c1,
    character2: v.c2,
    character3: v.c3,
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
  const wilson = Math.max(
    0,
    (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) /
      (1 + (z * z) / n)
  );
  const rk = Math.max(0, Math.min(1, (8 - r.averageRank) / 7));
  return 0.6 * nRP + 0.3 * wilson + 0.1 * rk;
}

async function fetchTop3(char1: number | null, char2: number | null): Promise<AggTrio[]> {
  const supabase = createServerClient();
  const ttl = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("v2_CharacterTrio")
    .select("character1,character2,character3,winRate,averageRP,totalGames,averageRank")
    .in("tier", DIAMOND_PLUS_TIERS)
    .gte("lastUpdated", ttl)
    .order("totalGames", { ascending: false })
    .limit(5000);

  if (char1 != null && char2 != null) {
    const [lo, hi] = [char1, char2].sort((a, b) => a - b);
    query = query.or(
      [
        `and(character1.eq.${lo},character2.eq.${hi})`,
        `and(character1.eq.${lo},character3.eq.${hi})`,
        `and(character2.eq.${lo},character3.eq.${hi})`,
      ].join(",")
    );
  } else if (char1 != null) {
    query = query.or(`character1.eq.${char1},character2.eq.${char1},character3.eq.${char1}`);
  }

  const { data } = await query;
  const rows = ((data ?? []) as TrioRow[]).filter(
    (r) => !EXCLUDED.has(r.character1) && !EXCLUDED.has(r.character2) && !EXCLUDED.has(r.character3)
  );
  const agg = aggregate(rows);

  const gAvg = agg.length > 0 ? agg.reduce((s, r) => s + r.averageRP, 0) / agg.length : 0;
  const rps = agg.map((r) => r.averageRP);
  const rpRange = { min: Math.min(...rps, 0), max: Math.max(...rps, 0) };
  agg.sort((a, b) => score(b, gAvg, rpRange) - score(a, gAvg, rpRange));
  return agg.slice(0, 3);
}

// ─── OG 이미지 렌더링 ──────────────────────────────────────────────────────

function renderDefaultOG() {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #d5dbe5",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", height: "4px", background: "#d5dbe5", display: "flex" }} />
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "60px 80px",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #d5dbe5",
              borderRadius: "10px",
              width: "56px",
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
              color: "#1d4ed8",
            }}
          >
            E
          </div>
          <span style={{ fontSize: "40px", fontWeight: 700, color: "#0f172a", letterSpacing: "0" }}>
            ER&GG
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "56px",
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "0",
          }}
        >
          3인 조합 데이터
        </div>
        <div style={{ display: "flex", fontSize: "24px", color: "#475569" }}>
          무기와 특성을 포함한 조합 표본 지표
        </div>
        <div style={{ display: "flex", fontSize: "18px", color: "#1d4ed8", marginTop: "8px" }}>
          erwagg.com
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "3px",
          background: "#d5dbe5",
        }}
      />
    </div>
  );
}

function renderTrioOG(trios: AggTrio[], allies: number[], icons: Map<number, string>) {
  const name1 = allies[0] ? getCharacterName(allies[0]) : null;
  const name2 = allies[1] ? getCharacterName(allies[1]) : null;
  const allyLabel = name2 ? `${name1} + ${name2}` : (name1 ?? "");

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #d5dbe5",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", height: "4px", background: "#d5dbe5", display: "flex" }} />

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "40px 60px 30px" }}>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #d5dbe5",
                borderRadius: "10px",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 700,
                color: "#1d4ed8",
              }}
            >
              E
            </div>
            <span
              style={{ fontSize: "32px", fontWeight: 700, color: "#0f172a", letterSpacing: "0" }}
            >
              ER&GG
            </span>
          </div>
          <span style={{ fontSize: "16px", color: "#1d4ed8" }}>erwagg.com</span>
        </div>

        {/* 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              border: "1px solid #d5dbe5",
              borderRadius: "10px",
              padding: "10px 20px",
            }}
          >
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>{allyLabel}</span>
          </div>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#475569" }}>조합 데이터</span>
        </div>

        {/* 조합 카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          {trios.map((trio, i) => {
            const chars = [trio.character1, trio.character2, trio.character3];
            // 아군을 앞에, 후보 캐릭터를 뒤에
            const allySet = new Set(allies);
            const allyChars = chars.filter((c) => allySet.has(c));
            const recChars = chars.filter((c) => !allySet.has(c));
            const ordered = [...allyChars, ...recChars];

            const isFirst = i === 0;
            const bgColor = isFirst ? "#ffffff" : "#f8fafc";
            const borderColor = isFirst ? "#94a3b8" : "#d5dbe5";
            const rankColor = isFirst ? "#1d4ed8" : i === 1 ? "#334155" : "#64748b";

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "10px",
                  padding: "14px 24px",
                  gap: "20px",
                }}
              >
                {/* 순위 */}
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: rankColor,
                    width: "44px",
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </span>

                {/* 캐릭터 3명 */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  {ordered.map((code, ci) => {
                    const isRec = !allySet.has(code);
                    const charName = getCharacterName(code);
                    return (
                      <div key={code} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              width: "56px",
                              height: "56px",
                              borderRadius: "10px",
                              background: "#ffffff",
                              overflow: "hidden",
                              border: isRec ? "2px solid #1d4ed8" : "1px solid #d5dbe5",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {icons.has(code) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={icons.get(code)!}
                                alt={charName}
                                width={56}
                                height={56}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: "20px",
                                  fontWeight: 700,
                                  color: isRec ? "#1d4ed8" : "#64748b",
                                }}
                              >
                                {charName.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: isRec ? "#1d4ed8" : "#334155",
                              maxWidth: "80px",
                              textAlign: "center",
                            }}
                          >
                            {charName}
                          </span>
                        </div>
                        {ci < 2 && (
                          <span
                            style={{
                              fontSize: "18px",
                              color: "#475569",
                              fontWeight: 700,
                              margin: "0 2px",
                            }}
                          >
                            +
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 스탯 */}
                <div style={{ display: "flex", gap: "28px", marginLeft: "auto" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>승률</span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color:
                          trio.winRate >= 60
                            ? "#1d4ed8"
                            : trio.winRate >= 55
                              ? "#334155"
                              : "#64748b",
                      }}
                    >
                      {trio.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>평균 RP</span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color:
                          trio.averageRP > 0
                            ? "#1d4ed8"
                            : trio.averageRP < 0
                              ? "#f87171"
                              : "#94a3b8",
                      }}
                    >
                      {trio.averageRP > 0 ? "+" : ""}
                      {trio.averageRP.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
          <span style={{ fontSize: "14px", color: "#475569" }}>
            erwagg.com · 이터널리턴 통계 분석
          </span>
        </div>
      </div>

      {/* 하단 그라디언트 */}
      <div
        style={{
          display: "flex",
          height: "3px",
          background: "#d5dbe5",
        }}
      />
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ally1Param = searchParams.get("ally1") ?? searchParams.get("a");
  const ally2Param = searchParams.get("ally2") ?? searchParams.get("b");

  const char1 = ally1Param ? parseInt(ally1Param, 10) : null;
  const char2 = ally2Param ? parseInt(ally2Param, 10) : null;

  // 유효한 캐릭터가 없으면 기본 OG
  if (char1 == null || isNaN(char1)) {
    return new ImageResponse(renderDefaultOG(), {
      ...SIZE,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  }

  try {
    const allies = [char1];
    if (char2 != null && !isNaN(char2) && char2 !== char1) allies.push(char2);

    const trios = await fetchTop3(char1, char2 != null && !isNaN(char2) ? char2 : null);

    if (trios.length === 0) {
      return new ImageResponse(renderDefaultOG(), {
        ...SIZE,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    const allCodes = trios.flatMap((t) => [t.character1, t.character2, t.character3]);
    const icons = await loadIcons(allCodes);

    return new ImageResponse(renderTrioOG(trios, allies, icons), {
      ...SIZE,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("[og/synergy] Error:", e);
    return new ImageResponse(renderDefaultOG(), {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    });
  }
}
