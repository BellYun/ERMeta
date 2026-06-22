import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Database,
  Gauge,
  Layers,
  LineChart,
  Radio,
  Search,
  ShieldCheck,
  Swords,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import {
  getCharacterHalfImageUrl,
  getCharacterImageUrl,
  getCharacterName,
} from "@/lib/characterMap";

export const metadata: Metadata = {
  title: "Design Lab | ERMeta",
  robots: {
    index: false,
    follow: false,
  },
};

interface DesignLabPageProps {
  params: Promise<{ locale: string }>;
}

const picks = [
  { code: 79, weapon: "레이피어", tier: "S", win: "54.8%", pick: "12.4%", delta: "+2.8" },
  { code: 76, weapon: "기타", tier: "A+", win: "53.1%", pick: "9.7%", delta: "+1.9" },
  { code: 88, weapon: "글러브", tier: "A", win: "52.2%", pick: "8.1%", delta: "+1.4" },
];

const tableRows = [
  { rank: 1, code: 79, role: "교전 주도", score: "91.4", win: "54.8%", rp: "+18.6" },
  { rank: 2, code: 72, role: "원거리 압박", score: "88.2", win: "53.6%", rp: "+15.1" },
  { rank: 3, code: 10, role: "근접 운영", score: "84.9", win: "52.7%", rp: "+12.8" },
  { rank: 4, code: 43, role: "지역 장악", score: "81.5", win: "51.9%", rp: "+9.3" },
];

const signalBars = [74, 52, 88, 61, 47, 82, 69, 58, 91, 64, 76, 55];

const pageTypes = [
  "홈",
  "티어 랭킹",
  "캐릭터 상세",
  "시너지 추천",
  "트리오 연구소",
  "패치 분석",
] as const;

const directionSystems = [
  {
    id: "A",
    name: "DATA TERMINAL",
    title: "분석 터미널형",
    bg: "#f7fafc",
    panel: "#ffffff",
    sub: "#f8fbff",
    border: "#b8c5d6",
    accent: "#153e91",
    accentBg: "#edf4ff",
    text: "#0f172a",
    muted: "#475569",
    positive: "#116b34",
  },
  {
    id: "B",
    name: "ESPORTS DESK",
    title: "중계 분석 데스크형",
    bg: "#fbfcff",
    panel: "#ffffff",
    sub: "#eaf2ff",
    border: "#b6c4d8",
    accent: "#1d4ed8",
    accentBg: "#cfe2ff",
    text: "#0f172a",
    muted: "#334155",
    positive: "#116b34",
  },
  {
    id: "C",
    name: "GAME DATABASE",
    title: "게임 DB/위키형",
    bg: "#f8fafc",
    panel: "#ffffff",
    sub: "#f8fbff",
    border: "#b8c5d6",
    accent: "#153e91",
    accentBg: "#edf4ff",
    text: "#0f172a",
    muted: "#475569",
    positive: "#116b34",
  },
  {
    id: "D",
    name: "PRODUCT ANALYTICS",
    title: "프로덕트 분석툴형",
    bg: "#f7f9fc",
    panel: "#ffffff",
    sub: "#f5f8fc",
    border: "#c2ccd9",
    accent: "#1552b8",
    accentBg: "#e7f0ff",
    text: "#111827",
    muted: "#4b5563",
    positive: "#0f7a3f",
  },
  {
    id: "E",
    name: "PATCH REPORT",
    title: "패치 리포트형",
    bg: "#fbfbf8",
    panel: "#fffdf7",
    sub: "#f4efe2",
    border: "#c8c1ad",
    accent: "#725414",
    accentBg: "#f4efe2",
    text: "#1f2937",
    muted: "#4b5563",
    positive: "#116b34",
  },
  {
    id: "F",
    name: "SCOUTING BOARD",
    title: "스카우팅 보드형",
    bg: "#f8fafc",
    panel: "#ffffff",
    sub: "#f8fbff",
    border: "#b8c5d6",
    accent: "#153e91",
    accentBg: "#edf4ff",
    text: "#0f172a",
    muted: "#475569",
    positive: "#116b34",
  },
] as const;

function assertLocale(locale: string): asserts locale is RouteLocale {
  if (!isRouteLocale(locale)) notFound();
}

export default async function DesignLabPage({ params }: DesignLabPageProps) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);

  return (
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 text-[var(--color-foreground)]">
      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[var(--color-accent-foreground)]">
              ERMeta Design Direction Lab
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-[var(--color-foreground)] sm:text-3xl">
              전체 리디자인 전에 방향만 비교하는 임시 실험실
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
              실제 화면을 바로 갈아엎지 않고, 게임 도메인의 캐릭터성은 살리되 통계 서비스처럼 읽히는
              여섯 가지 방향을 나란히 비교합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <Metric label="우선순위" value="Readability" />
            <Metric label="톤" value="Game DB" />
            <Metric label="적용범위" value="Sample" />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <TerminalConcept />
        <EsportsConcept />
        <DatabaseConcept />
        <ProductAnalyticsConcept />
        <PatchReportConcept />
        <ScoutingBoardConcept />
      </div>

      <PageExampleGallery />
      <DirectionPageMatrix />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

function TerminalConcept() {
  return (
    <ConceptFrame
      eyebrow="A. DATA TERMINAL"
      title="분석 터미널형"
      description="가장 통계 서비스답게 읽힙니다. 숫자, 변화량, 테이블 밀도가 강점이고 캐릭터 이미지는 작게 씁니다."
      className="bg-[#f7fafc]"
    >
      <div className="rounded-md border border-[#b8c5d6] bg-[#ffffff]">
        <div className="flex items-center justify-between border-b border-[#cbd6e2] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-[#9fb1c8] bg-[#edf4ff] text-[#153e91]">
              <Radio className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold text-[#153e91]">LIVE META SIGNAL</p>
              <p className="text-xs font-semibold text-[#0f172a]">Patch 1.37 dashboard</p>
            </div>
          </div>
          <span className="rounded border border-[#9fb1c8] bg-[#edf4ff] px-2 py-1 text-[10px] font-bold text-[#153e91]">
            STABLE
          </span>
        </div>

        <div className="grid grid-cols-3 border-b border-[#cbd6e2]">
          <TerminalStat label="승률 변동" value="+2.8" />
          <TerminalStat label="표본" value="42K" />
          <TerminalStat label="신뢰도" value="A+" />
        </div>

        <div className="p-3">
          <SignalPreview />
          <div className="mb-2 grid grid-cols-[36px_1fr_54px_54px] gap-2 px-2 text-[10px] font-bold text-[#475569]">
            <span>#</span>
            <span>실험체</span>
            <span>WIN</span>
            <span>RP</span>
          </div>
          <div className="space-y-1.5">
            {tableRows.map((row) => (
              <div
                key={row.rank}
                className="grid grid-cols-[36px_1fr_54px_54px] items-center gap-2 rounded border border-[#d5dee9] bg-[#f8fbff] px-2 py-2"
              >
                <span className="font-mono text-xs font-bold text-[#153e91]">{row.rank}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                    <Image
                      src={getCharacterImageUrl(row.code)}
                      alt={getCharacterName(row.code)}
                      fill
                      className="object-cover object-top"
                      sizes="32px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#0f172a]">
                      {getCharacterName(row.code)}
                    </p>
                    <p className="truncate text-[10px] text-[#475569]">{row.role}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#0f172a]">{row.win}</span>
                <span className="font-mono text-xs font-bold text-[#116b34]">{row.rp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConceptFrame>
  );
}

function EsportsConcept() {
  return (
    <ConceptFrame
      eyebrow="B. ESPORTS DESK"
      title="중계 분석 데스크형"
      description="게임 도메인 감도가 가장 큽니다. 캐릭터 비주얼과 승률 그래프를 전면에 두되, 과한 게임 UI는 피합니다."
      className="bg-[#fbfcff]"
    >
      <div className="overflow-hidden rounded-md border border-[#b6c4d8] bg-[#ffffff]">
        <div className="relative min-h-[238px] border-b border-[#cbd6e2] bg-[#eaf2ff]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(29,78,216,0.18),rgba(255,255,255,0)_58%)]" />
          <div className="relative z-10 flex items-start justify-between p-3">
            <div>
              <p className="text-[10px] font-bold text-[#153e91]">RISING PICK</p>
              <h2 className="mt-1 text-xl font-black text-[#0f172a]">
                {getCharacterName(picks[0].code)}
              </h2>
              <p className="mt-1 text-xs font-semibold text-[#334155]">
                {picks[0].weapon} · Tier {picks[0].tier}
              </p>
            </div>
            <span className="rounded border border-[#1d4ed8] bg-[#cfe2ff] px-2.5 py-1 font-mono text-xs font-black text-[#153e91]">
              {picks[0].delta}
            </span>
          </div>
          <Image
            src={getCharacterHalfImageUrl(picks[0].code)}
            alt={getCharacterName(picks[0].code)}
            width={240}
            height={300}
            className="absolute bottom-0 right-0 h-[210px] w-auto object-contain object-bottom"
            priority={false}
          />
          <div className="absolute bottom-3 left-3 z-10 grid w-[52%] grid-cols-2 gap-2">
            <DeskStat label="WIN" value={picks[0].win} />
            <DeskStat label="PICK" value={picks[0].pick} />
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#d5dee9]">
          {picks.map((pick) => (
            <div key={pick.code} className="min-w-0 p-3">
              <div className="relative mx-auto h-12 w-12 overflow-hidden rounded border border-[#b8c5d6] bg-[#edf4ff]">
                <Image
                  src={getCharacterImageUrl(pick.code)}
                  alt={getCharacterName(pick.code)}
                  fill
                  className="object-cover object-top"
                  sizes="48px"
                />
              </div>
              <p className="mt-2 truncate text-center text-xs font-bold text-[#0f172a]">
                {getCharacterName(pick.code)}
              </p>
              <p className="mt-1 text-center font-mono text-[11px] font-bold text-[#116b34]">
                {pick.delta}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ConceptFrame>
  );
}

function DatabaseConcept() {
  return (
    <ConceptFrame
      eyebrow="C. GAME DATABASE"
      title="게임 DB/위키형"
      description="정보 탐색에 가장 편합니다. 캐릭터, 무기, 태그, 수치가 카드 안에서 안정적으로 정리됩니다."
      className="bg-[#f8fafc]"
    >
      <div className="rounded-md border border-[#b8c5d6] bg-[#ffffff] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-[#9fb1c8] bg-[#edf4ff] text-[#153e91]">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold text-[#153e91]">CHARACTER INDEX</p>
              <p className="text-xs font-semibold text-[#0f172a]">Role filtered meta cards</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#475569]" />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {["전체", "딜러", "브루저", "원거리", "운영"].map((item, index) => (
            <span
              key={item}
              className={
                index === 0
                  ? "rounded border border-[#1d4ed8] bg-[#cfe2ff] px-2 py-1 text-[10px] font-bold text-[#153e91]"
                  : "rounded border border-[#cbd6e2] bg-[#f6f8fb] px-2 py-1 text-[10px] font-semibold text-[#334155]"
              }
            >
              {item}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {tableRows.slice(0, 3).map((row) => (
            <div
              key={row.code}
              className="grid grid-cols-[56px_1fr] gap-3 rounded border border-[#d5dee9] bg-[#f8fbff] p-2.5"
            >
              <div className="relative h-14 w-14 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                <Image
                  src={getCharacterImageUrl(row.code)}
                  alt={getCharacterName(row.code)}
                  fill
                  className="object-cover object-top"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#0f172a]">
                      {getCharacterName(row.code)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#475569]">
                      {row.role}
                    </p>
                  </div>
                  <span className="rounded border border-[#9fb1c8] bg-[#edf4ff] px-1.5 py-0.5 font-mono text-[10px] font-black text-[#153e91]">
                    {row.score}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Mini label="WIN" value={row.win} />
                  <Mini label="RP" value={row.rp} positive />
                  <Mini label="Tier" value={row.rank === 1 ? "S" : "A"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ConceptFrame>
  );
}

function ProductAnalyticsConcept() {
  return (
    <ConceptFrame
      eyebrow="D. PRODUCT ANALYTICS"
      title="프로덕트 분석툴형"
      description="게임색을 가장 절제합니다. 운영툴처럼 명확하고, 랭킹/필터/지표 페이지 전체에 확장하기 쉽습니다."
      className="bg-[#f7f9fc]"
    >
      <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#153e91]">META OVERVIEW</p>
            <h3 className="mt-1 text-base font-black text-[#0f172a]">Performance summary</h3>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded border border-[#9fb1c8] bg-[#edf4ff] text-[#153e91]">
            <Gauge className="h-4 w-4" />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <AnalyticsTile label="Meta Score" value="87.2" tone="blue" />
          <AnalyticsTile label="Win Lift" value="+3.1%" tone="green" />
          <AnalyticsTile label="Volatility" value="Low" tone="gray" />
          <AnalyticsTile label="Samples" value="42K" tone="gray" />
        </div>

        <div className="mt-3 rounded border border-[#d5dee9] bg-[#f8fbff] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-[#0f172a]">Role distribution</p>
            <LineChart className="h-4 w-4 text-[#475569]" />
          </div>
          <div className="space-y-2">
            {[
              ["딜러", 78],
              ["브루저", 64],
              ["원거리", 51],
              ["서포트", 34],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[52px_1fr_38px] items-center gap-2">
                <span className="text-[11px] font-semibold text-[#475569]">{label}</span>
                <span className="h-2 overflow-hidden rounded bg-[#dbe4ee]">
                  <span
                    className="block h-full rounded bg-[#1d4ed8]"
                    style={{ width: `${value}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11px] font-black text-[#0f172a]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConceptFrame>
  );
}

function PatchReportConcept() {
  return (
    <ConceptFrame
      eyebrow="E. PATCH REPORT"
      title="패치 리포트형"
      description="패치 해석과 스토리텔링이 강합니다. 시즌 요약, 패치 분석, 홈 상단 리포트에 잘 맞습니다."
      className="bg-[#fbfbf8]"
    >
      <div className="overflow-hidden rounded-md border border-[#c8c1ad] bg-[#fffdf7]">
        <div className="border-b border-[#ddd5c1] bg-[#f4efe2] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-[#725414]">PATCH NOTE DIGEST</p>
              <h3 className="mt-1 text-lg font-black text-[#1f2937]">1.37 핵심 변화</h3>
            </div>
            <ClipboardList className="h-5 w-5 text-[#725414]" />
          </div>
          <p className="mt-2 text-xs leading-5 text-[#4b5563]">
            상향 캐릭터의 픽률 전환이 빠르게 진행 중이며, 근접 교전 조합의 평균 RP가 상승했습니다.
          </p>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-[72px_1fr] gap-3 rounded border border-[#ddd5c1] bg-white p-2.5">
            <div className="relative h-[92px] overflow-hidden rounded border border-[#c8c1ad] bg-[#f4efe2]">
              <Image
                src={getCharacterHalfImageUrl(76)}
                alt={getCharacterName(76)}
                fill
                className="object-cover object-top"
                sizes="72px"
              />
            </div>
            <div className="min-w-0">
              <span className="rounded bg-[#f4efe2] px-2 py-1 text-[10px] font-black text-[#725414]">
                TREND PICK
              </span>
              <p className="mt-2 text-base font-black text-[#111827]">{getCharacterName(76)}</p>
              <p className="mt-1 text-xs leading-5 text-[#4b5563]">
                버프 이후 교전 개시 성공률이 상승했고, 중상위권 표본에서 안정적인 성과가 확인됩니다.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {["초반 교전 빈도 증가", "평균 생존 시간 +18초", "상위권 픽률 9.7%"].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-xs font-semibold text-[#374151]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#725414]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConceptFrame>
  );
}

function ScoutingBoardConcept() {
  return (
    <ConceptFrame
      eyebrow="F. SCOUTING BOARD"
      title="스카우팅 보드형"
      description="조합 탐색과 비교에 강합니다. 시너지, 트리오 연구소, 캐릭터 랩 쪽에서 힘을 받는 방향입니다."
      className="bg-[#f8fafc]"
    >
      <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-[#9fb1c8] bg-[#edf4ff] text-[#153e91]">
            <Search className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#153e91]">COMBO SCOUT</p>
            <p className="truncate text-xs font-semibold text-[#0f172a]">Best trio candidates</p>
          </div>
        </div>

        <div className="rounded border border-[#d5dee9] bg-[#f8fbff] p-2.5">
          <div className="mb-3 flex justify-between gap-2">
            {[79, 72, 10].map((code) => (
              <div key={code} className="min-w-0 text-center">
                <div className="relative mx-auto h-14 w-14 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                  <Image
                    src={getCharacterImageUrl(code)}
                    alt={getCharacterName(code)}
                    fill
                    className="object-cover object-top"
                    sizes="56px"
                  />
                </div>
                <p className="mt-1 truncate text-[10px] font-black text-[#0f172a]">
                  {getCharacterName(code)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Mini label="시너지" value="92" />
            <Mini label="RP" value="+21.4" positive />
            <Mini label="난이도" value="M" />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            ["교전", "높음"],
            ["운영", "보통"],
            ["후반", "강함"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded border border-[#d5dee9] bg-white px-2.5 py-2"
            >
              <span className="text-xs font-semibold text-[#475569]">{label}</span>
              <span className="text-xs font-black text-[#0f172a]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </ConceptFrame>
  );
}

function PageExampleGallery() {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.07)] sm:p-5">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold text-[var(--color-accent-foreground)]">
            Page-Level Mockups
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--color-foreground)]">
            실제 페이지에 적용했을 때의 예시
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            방향성 카드가 아니라, ERMeta의 주요 화면을 같은 디자인 시스템으로 재구성했을 때의
            레이아웃 예시입니다.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
          <Metric label="페이지" value="6 Types" />
          <Metric label="기준" value="C + D" />
          <Metric label="비주얼" value="Selective" />
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <HomePageMockup />
        <TierPageMockup />
        <CharacterPageMockup />
        <SynergyPageMockup />
        <TrioPageMockup />
        <PatchPageMockup />
      </div>
    </section>
  );
}

function PageMockupFrame({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-[#b8c5d6] bg-[#f8fafc]">
      <div className="border-b border-[#cbd6e2] bg-white px-4 py-3">
        <p className="text-[10px] font-black text-[#153e91]">{label}</p>
        <h3 className="mt-1 text-lg font-black text-[#0f172a]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#475569]">{description}</p>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </article>
  );
}

function HomePageMockup() {
  return (
    <PageMockupFrame
      label="HOME"
      title="홈 대시보드"
      description="메타 요약, 상승픽, 랭킹 진입점을 한 화면에서 빠르게 읽는 구성입니다."
    >
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-md border border-[#b8c5d6] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-[#153e91]">PATCH 1.37</p>
              <h4 className="mt-1 text-xl font-black text-[#0f172a]">오늘의 메타 브리핑</h4>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#475569]">
                승률과 픽률이 동시에 오른 실험체를 중심으로, 랭크 상승 가능성이 높은 선택지를 먼저
                보여줍니다.
              </p>
            </div>
            <span className="rounded border border-[#1d4ed8] bg-[#cfe2ff] px-2.5 py-1 font-mono text-xs font-black text-[#153e91]">
              LIVE
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <AnalyticsTile label="변동 캐릭터" value="18" tone="blue" />
            <AnalyticsTile label="평균 RP" value="+8.4" tone="green" />
            <AnalyticsTile label="표본" value="42K" tone="gray" />
          </div>
        </div>
        <div className="rounded-md border border-[#b8c5d6] bg-[#eaf2ff] p-3">
          <div className="relative min-h-[190px] overflow-hidden rounded border border-[#9fb1c8] bg-white">
            <Image
              src={getCharacterHalfImageUrl(79)}
              alt={getCharacterName(79)}
              width={220}
              height={260}
              className="absolute bottom-0 right-0 h-[180px] w-auto object-contain"
            />
            <div className="relative z-10 p-3">
              <p className="text-[10px] font-black text-[#153e91]">TOP RISING</p>
              <h4 className="mt-1 text-lg font-black text-[#0f172a]">{getCharacterName(79)}</h4>
              <p className="mt-1 text-xs font-semibold text-[#475569]">승률 54.8% · 픽률 12.4%</p>
            </div>
          </div>
        </div>
      </div>
    </PageMockupFrame>
  );
}

function TierPageMockup() {
  return (
    <PageMockupFrame
      label="TIER RANKING"
      title="티어 랭킹"
      description="필터와 테이블을 최대한 명확하게 두고, 숫자 비교에 집중하는 구성입니다."
    >
      <div className="rounded-md border border-[#b8c5d6] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#cbd6e2] p-3">
          {["전체", "근거리", "원거리", "상승", "고표본"].map((item, index) => (
            <span
              key={item}
              className={
                index === 0
                  ? "rounded border border-[#1d4ed8] bg-[#cfe2ff] px-2.5 py-1.5 text-xs font-black text-[#153e91]"
                  : "rounded border border-[#cbd6e2] bg-[#f8fafc] px-2.5 py-1.5 text-xs font-bold text-[#475569]"
              }
            >
              {item}
            </span>
          ))}
        </div>
        <div className="divide-y divide-[#d5dee9]">
          {tableRows.map((row) => (
            <div
              key={row.rank}
              className="grid grid-cols-[44px_1fr_70px_70px_70px] items-center gap-2 px-3 py-2.5"
            >
              <span className="font-mono text-sm font-black text-[#153e91]">#{row.rank}</span>
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                  <Image
                    src={getCharacterImageUrl(row.code)}
                    alt={getCharacterName(row.code)}
                    fill
                    className="object-cover object-top"
                    sizes="36px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0f172a]">
                    {getCharacterName(row.code)}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-[#64748b]">{row.role}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-black text-[#0f172a]">{row.score}</span>
              <span className="font-mono text-xs font-black text-[#0f172a]">{row.win}</span>
              <span className="font-mono text-xs font-black text-[#116b34]">{row.rp}</span>
            </div>
          ))}
        </div>
      </div>
    </PageMockupFrame>
  );
}

function CharacterPageMockup() {
  return (
    <PageMockupFrame
      label="CHARACTER DETAIL"
      title="캐릭터 상세 분석"
      description="캐릭터 이미지는 헤더에서만 강하게 쓰고, 아래는 지표/무기/패치 근거 중심으로 정리합니다."
    >
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-[260px] overflow-hidden rounded-md border border-[#b8c5d6] bg-[#eaf2ff]">
          <Image
            src={getCharacterHalfImageUrl(72)}
            alt={getCharacterName(72)}
            width={280}
            height={340}
            className="absolute bottom-0 right-0 h-[245px] w-auto object-contain"
          />
          <div className="relative z-10 p-4">
            <p className="text-[10px] font-black text-[#153e91]">CHARACTER PROFILE</p>
            <h4 className="mt-1 text-2xl font-black text-[#0f172a]">{getCharacterName(72)}</h4>
            <p className="mt-1 text-xs font-bold text-[#475569]">원거리 압박 · 안정 성장</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <AnalyticsTile label="Tier Score" value="88.2" tone="blue" />
            <AnalyticsTile label="Win Rate" value="53.6%" tone="gray" />
            <AnalyticsTile label="RP Lift" value="+15.1" tone="green" />
          </div>
          <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
            <p className="text-xs font-black text-[#0f172a]">무기별 성과</p>
            <div className="mt-3 space-y-2">
              {["권총", "저격총", "돌격소총"].map((weapon, index) => (
                <div key={weapon} className="grid grid-cols-[72px_1fr_48px] items-center gap-2">
                  <span className="text-xs font-bold text-[#475569]">{weapon}</span>
                  <span className="h-2 rounded bg-[#dbe4ee]">
                    <span
                      className="block h-full rounded bg-[#1d4ed8]"
                      style={{ width: `${82 - index * 14}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs font-black text-[#0f172a]">
                    {82 - index * 7}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageMockupFrame>
  );
}

function SynergyPageMockup() {
  return (
    <PageMockupFrame
      label="SYNERGY"
      title="시너지 추천"
      description="선택 슬롯, 후보 풀, 결과 카드를 한 화면에서 스캔하는 보드형 구성입니다."
    >
      <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
          <p className="text-xs font-black text-[#0f172a]">선택 슬롯</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[79, 72, 10].map((code) => (
              <div
                key={code}
                className="rounded border border-[#d5dee9] bg-[#f8fbff] p-2 text-center"
              >
                <div className="relative mx-auto h-12 w-12 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                  <Image
                    src={getCharacterImageUrl(code)}
                    alt={getCharacterName(code)}
                    fill
                    className="object-cover object-top"
                    sizes="48px"
                  />
                </div>
                <p className="mt-1 truncate text-[10px] font-black text-[#0f172a]">
                  {getCharacterName(code)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
          <p className="text-xs font-black text-[#0f172a]">추천 조합</p>
          <div className="mt-3 grid gap-2">
            {["교전 안정형", "후반 성장형", "초반 압박형"].map((title, index) => (
              <div
                key={title}
                className="flex items-center justify-between rounded border border-[#d5dee9] bg-[#f8fbff] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-black text-[#0f172a]">{title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#64748b]">
                    시너지 점수 {92 - index * 6}
                  </p>
                </div>
                <span className="font-mono text-sm font-black text-[#116b34]">
                  +{21 - index * 4}.4
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageMockupFrame>
  );
}

function TrioPageMockup() {
  return (
    <PageMockupFrame
      label="TRIO LAB"
      title="트리오 연구소"
      description="조합 갤러리는 카드 탐색이 핵심이라, 이미지보다 태그/수치/멤버 구성이 먼저 보이게 둡니다."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {["Ranked Core", "High Tempo", "Late Scale"].map((title, index) => (
          <div key={title} className="rounded-md border border-[#b8c5d6] bg-white p-3">
            <div className="mb-3 flex justify-between">
              {[79, 72, 10].map((code) => (
                <div
                  key={`${title}-${code}`}
                  className="relative h-10 w-10 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]"
                >
                  <Image
                    src={getCharacterImageUrl(code + index)}
                    alt={getCharacterName(code + index)}
                    fill
                    className="object-cover object-top"
                    sizes="40px"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm font-black text-[#0f172a]">{title}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
              표본 {12 - index * 2}K · 안정도 A
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Mini label="WIN" value={`${54 - index}.2%`} />
              <Mini label="RP" value={`+${18 - index * 3}.1`} positive />
            </div>
          </div>
        ))}
      </div>
    </PageMockupFrame>
  );
}

function PatchPageMockup() {
  return (
    <PageMockupFrame
      label="PATCH ANALYSIS"
      title="패치 분석"
      description="패치 리포트는 타임라인, 영향 받은 캐릭터, 핵심 해석이 한 흐름으로 읽혀야 합니다."
    >
      <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-[#c8c1ad] bg-[#fffdf7] p-4">
          <p className="text-[10px] font-black text-[#725414]">PATCH IMPACT</p>
          <h4 className="mt-1 text-xl font-black text-[#1f2937]">상향 이후 48시간</h4>
          <p className="mt-2 text-sm leading-6 text-[#4b5563]">
            상향 실험체의 픽률이 빠르게 이동했고, 일부 조합은 승률보다 RP 기대값이 먼저
            반응했습니다.
          </p>
        </div>
        <div className="rounded-md border border-[#b8c5d6] bg-white p-3">
          <div className="space-y-2">
            {picks.map((pick, index) => (
              <div
                key={pick.code}
                className="grid grid-cols-[44px_1fr_64px] items-center gap-2 rounded border border-[#d5dee9] bg-[#f8fbff] px-2.5 py-2"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded border border-[#b8c5d6] bg-[#e8eef6]">
                  <Image
                    src={getCharacterImageUrl(pick.code)}
                    alt={getCharacterName(pick.code)}
                    fill
                    className="object-cover object-top"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0f172a]">
                    {getCharacterName(pick.code)}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-[#64748b]">
                    {index === 0 ? "핵심 상향" : "후속 상승"}
                  </p>
                </div>
                <span className="font-mono text-sm font-black text-[#116b34]">{pick.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageMockupFrame>
  );
}

function DirectionPageMatrix() {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.07)] sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-bold text-[var(--color-accent-foreground)]">
          Full Direction Matrix
        </p>
        <h2 className="mt-1 text-xl font-black text-[var(--color-foreground)]">
          A~F 전체를 페이지별로 재구성한 비교안
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--color-muted-foreground)]">
          각 디자인 방향마다 홈, 티어 랭킹, 캐릭터 상세, 시너지 추천, 트리오 연구소, 패치 분석
          화면을 같은 정보량으로 다시 배치했습니다.
        </p>
      </div>

      <div className="space-y-5">
        {directionSystems.map((system) => (
          <section
            key={system.id}
            className="rounded-md border p-3 sm:p-4"
            style={systemStyle(system)}
          >
            <div
              className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between"
              style={{ borderColor: system.border }}
            >
              <div>
                <p className="text-[10px] font-black" style={{ color: system.accent }}>
                  {system.id}. {system.name}
                </p>
                <h3 className="mt-1 text-lg font-black" style={{ color: system.text }}>
                  {system.title} 페이지 세트
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pageTypes.map((page) => (
                  <span
                    key={`${system.id}-${page}`}
                    className="rounded border px-2 py-1 text-[10px] font-bold"
                    style={{
                      borderColor: system.border,
                      background: system.panel,
                      color: system.muted,
                    }}
                  >
                    {page}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              {pageTypes.map((page, index) => (
                <DirectionPageCard
                  key={`${system.id}-${page}`}
                  system={system}
                  page={page}
                  index={index}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function DirectionPageCard({
  system,
  page,
  index,
}: {
  system: (typeof directionSystems)[number];
  page: (typeof pageTypes)[number];
  index: number;
}) {
  const character = [79, 72, 10, 43, 76, 88][index];
  const titleByPage: Record<(typeof pageTypes)[number], string> = {
    홈: "메타 요약",
    "티어 랭킹": "순위 테이블",
    "캐릭터 상세": getCharacterName(character),
    "시너지 추천": "조합 후보",
    "트리오 연구소": "트리오 카드",
    "패치 분석": "변화 리포트",
  };

  return (
    <article
      className="min-h-[312px] rounded-md border p-3"
      style={{ borderColor: system.border, background: system.panel }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black" style={{ color: system.accent }}>
            {page}
          </p>
          <h4 className="mt-1 truncate text-base font-black" style={{ color: system.text }}>
            {titleByPage[page]}
          </h4>
        </div>
        <span
          className="rounded border px-2 py-1 font-mono text-[10px] font-black"
          style={{ borderColor: system.accent, background: system.accentBg, color: system.accent }}
        >
          {system.id}
        </span>
      </div>

      {page === "홈" ? <MatrixHome system={system} character={character} /> : null}
      {page === "티어 랭킹" ? <MatrixRanking system={system} /> : null}
      {page === "캐릭터 상세" ? <MatrixCharacter system={system} character={character} /> : null}
      {page === "시너지 추천" ? <MatrixSynergy system={system} /> : null}
      {page === "트리오 연구소" ? <MatrixTrio system={system} /> : null}
      {page === "패치 분석" ? <MatrixPatch system={system} /> : null}
    </article>
  );
}

function MatrixHome({
  system,
  character,
}: {
  system: (typeof directionSystems)[number];
  character: number;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        <MatrixStat system={system} label="WIN" value="54.8%" />
        <MatrixStat system={system} label="PICK" value="12.4%" />
        <MatrixStat system={system} label="RP" value="+18.6" positive />
      </div>
      <div
        className="relative min-h-[150px] overflow-hidden rounded border"
        style={{ borderColor: system.border, background: system.sub }}
      >
        <Image
          src={getCharacterHalfImageUrl(character)}
          alt={getCharacterName(character)}
          width={180}
          height={220}
          className="absolute bottom-0 right-0 h-[140px] w-auto object-contain"
        />
        <div className="relative z-10 p-3">
          <p className="text-[10px] font-black" style={{ color: system.accent }}>
            TOP SIGNAL
          </p>
          <p className="mt-1 text-lg font-black" style={{ color: system.text }}>
            {getCharacterName(character)}
          </p>
          <p className="mt-1 max-w-[11rem] text-xs leading-5" style={{ color: system.muted }}>
            상승폭과 표본 안정성이 동시에 확인된 픽입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function MatrixRanking({ system }: { system: (typeof directionSystems)[number] }) {
  return (
    <div className="space-y-1.5">
      {tableRows.slice(0, 4).map((row) => (
        <div
          key={`${system.id}-rank-${row.rank}`}
          className="grid grid-cols-[28px_1fr_48px] items-center gap-2 rounded border px-2 py-2"
          style={{ borderColor: system.border, background: system.sub }}
        >
          <span className="font-mono text-xs font-black" style={{ color: system.accent }}>
            {row.rank}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded border"
              style={{ borderColor: system.border, background: system.accentBg }}
            >
              <Image
                src={getCharacterImageUrl(row.code)}
                alt={getCharacterName(row.code)}
                fill
                className="object-cover object-top"
                sizes="32px"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black" style={{ color: system.text }}>
                {getCharacterName(row.code)}
              </p>
              <p className="truncate text-[10px] font-semibold" style={{ color: system.muted }}>
                {row.role}
              </p>
            </div>
          </div>
          <span
            className="text-right font-mono text-xs font-black"
            style={{ color: system.positive }}
          >
            {row.rp}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatrixCharacter({
  system,
  character,
}: {
  system: (typeof directionSystems)[number];
  character: number;
}) {
  return (
    <div className="grid gap-3">
      <div
        className="relative min-h-[138px] overflow-hidden rounded border"
        style={{ borderColor: system.border, background: system.sub }}
      >
        <Image
          src={getCharacterHalfImageUrl(character)}
          alt={getCharacterName(character)}
          width={170}
          height={220}
          className="absolute bottom-0 right-0 h-[132px] w-auto object-contain"
        />
        <div className="relative z-10 p-3">
          <p className="text-[10px] font-black" style={{ color: system.accent }}>
            PROFILE
          </p>
          <p className="mt-1 text-lg font-black" style={{ color: system.text }}>
            {getCharacterName(character)}
          </p>
          <p className="text-xs font-semibold" style={{ color: system.muted }}>
            주무기 · 교전 주도
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <MatrixStat system={system} label="SCORE" value="88.2" />
        <MatrixStat system={system} label="WIN" value="53.6%" />
        <MatrixStat system={system} label="RP" value="+15.1" positive />
      </div>
    </div>
  );
}

function MatrixSynergy({ system }: { system: (typeof directionSystems)[number] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[79, 72, 10].map((code) => (
          <div key={`${system.id}-syn-${code}`} className="min-w-0 text-center">
            <div
              className="relative mx-auto h-12 w-12 overflow-hidden rounded border"
              style={{ borderColor: system.border, background: system.accentBg }}
            >
              <Image
                src={getCharacterImageUrl(code)}
                alt={getCharacterName(code)}
                fill
                className="object-cover object-top"
                sizes="48px"
              />
            </div>
            <p className="mt-1 truncate text-[10px] font-black" style={{ color: system.text }}>
              {getCharacterName(code)}
            </p>
          </div>
        ))}
      </div>
      {["교전 안정형", "후반 성장형", "초반 압박형"].map((label, index) => (
        <div
          key={`${system.id}-${label}`}
          className="flex items-center justify-between rounded border px-2.5 py-2"
          style={{ borderColor: system.border, background: system.sub }}
        >
          <span className="text-xs font-black" style={{ color: system.text }}>
            {label}
          </span>
          <span className="font-mono text-xs font-black" style={{ color: system.positive }}>
            +{21 - index * 4}.4
          </span>
        </div>
      ))}
    </div>
  );
}

function MatrixTrio({ system }: { system: (typeof directionSystems)[number] }) {
  return (
    <div className="space-y-3">
      {["Ranked Core", "High Tempo", "Late Scale"].map((title, index) => (
        <div
          key={`${system.id}-${title}`}
          className="rounded border p-2.5"
          style={{ borderColor: system.border, background: system.sub }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-black" style={{ color: system.text }}>
              {title}
            </p>
            <span className="font-mono text-[10px] font-black" style={{ color: system.accent }}>
              A{index === 0 ? "+" : ""}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[79, 72, 10].map((code) => (
              <div
                key={`${system.id}-${title}-${code}`}
                className="relative h-9 w-9 overflow-hidden rounded border"
                style={{ borderColor: system.border, background: system.accentBg }}
              >
                <Image
                  src={getCharacterImageUrl(code + index)}
                  alt={getCharacterName(code + index)}
                  fill
                  className="object-cover object-top"
                  sizes="36px"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatrixPatch({ system }: { system: (typeof directionSystems)[number] }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded border p-3"
        style={{ borderColor: system.border, background: system.sub }}
      >
        <p className="text-[10px] font-black" style={{ color: system.accent }}>
          PATCH IMPACT
        </p>
        <p className="mt-1 text-base font-black" style={{ color: system.text }}>
          상향 이후 48시간
        </p>
        <p className="mt-1 text-xs leading-5" style={{ color: system.muted }}>
          픽률 전환과 RP 기대값이 먼저 반응한 캐릭터를 요약합니다.
        </p>
      </div>
      {picks.slice(0, 3).map((pick) => (
        <div
          key={`${system.id}-patch-${pick.code}`}
          className="grid grid-cols-[34px_1fr_42px] items-center gap-2 rounded border px-2 py-1.5"
          style={{ borderColor: system.border, background: system.panel }}
        >
          <div
            className="relative h-8 w-8 overflow-hidden rounded border"
            style={{ borderColor: system.border, background: system.accentBg }}
          >
            <Image
              src={getCharacterImageUrl(pick.code)}
              alt={getCharacterName(pick.code)}
              fill
              className="object-cover object-top"
              sizes="32px"
            />
          </div>
          <p className="truncate text-xs font-black" style={{ color: system.text }}>
            {getCharacterName(pick.code)}
          </p>
          <span
            className="text-right font-mono text-xs font-black"
            style={{ color: system.positive }}
          >
            {pick.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatrixStat({
  system,
  label,
  value,
  positive = false,
}: {
  system: (typeof directionSystems)[number];
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      className="rounded border px-2 py-2"
      style={{ borderColor: system.border, background: system.sub }}
    >
      <p className="text-[9px] font-bold" style={{ color: system.muted }}>
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-xs font-black"
        style={{ color: positive ? system.positive : system.text }}
      >
        {value}
      </p>
    </div>
  );
}

function systemStyle(system: (typeof directionSystems)[number]): CSSProperties {
  return {
    borderColor: system.border,
    background: system.bg,
  };
}

function ConceptFrame({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-h-full flex-col rounded-md border border-[var(--color-border)] p-4 ${className}`}
    >
      <div className="mb-4">
        <p className="text-[10px] font-bold text-[var(--color-accent-foreground)]">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black text-[var(--color-foreground)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      <div className="mt-auto">{children}</div>
      <ConceptFooter />
    </section>
  );
}

function ConceptFooter() {
  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5">
      {[
        { icon: BarChart3, label: "통계" },
        { icon: Swords, label: "게임" },
        { icon: ShieldCheck, label: "신뢰" },
        { icon: Layers, label: "확장" },
      ].map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex min-h-9 items-center justify-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-muted-foreground)]"
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function TerminalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[10px] font-semibold text-[#475569]">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-[#0f172a]">{value}</p>
    </div>
  );
}

function AnalyticsTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "gray";
}) {
  const valueClass =
    tone === "blue" ? "text-[#153e91]" : tone === "green" ? "text-[#116b34]" : "text-[#0f172a]";

  return (
    <div className="rounded border border-[#d5dee9] bg-[#f8fbff] px-3 py-3">
      <p className="text-[10px] font-semibold text-[#475569]">{label}</p>
      <p className={`mt-1 font-mono text-lg font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function DeskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#9fb1c8] bg-white/90 px-2.5 py-2">
      <p className="text-[10px] font-bold text-[#475569]">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-black text-[#0f172a]">{value}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded border border-[#d5dee9] bg-white px-2 py-1.5">
      <p className="text-[9px] font-semibold text-[#64748b]">{label}</p>
      <p
        className={`mt-0.5 font-mono text-[11px] font-black ${positive ? "text-[#116b34]" : "text-[#0f172a]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalPreview() {
  return (
    <div className="flex h-16 items-end gap-1 rounded border border-[#d5dee9] bg-[#f8fbff] p-2">
      {signalBars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="flex-1 rounded-sm bg-[#1d4ed8]"
          style={{ height: `${Math.max(18, height)}%`, opacity: 0.28 + index / 24 }}
        />
      ))}
    </div>
  );
}
