import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import styles from "./PaletteLab.module.css";

export const metadata: Metadata = {
  title: "Palette Lab | ER&GG",
  description: "ER&GG의 화이트·다크 컬러 팔레트 비교 실험실",
  robots: {
    index: false,
    follow: false,
  },
};

interface PaletteLabPageProps {
  params: Promise<{ locale: string }>;
}

interface PaletteCandidate {
  koreanName: string;
  impression: string;
  note: string;
  lightClassName: string;
  darkClassName: string;
}

const rankings = [
  { rank: "01", character: "재키 · 단검", winRate: "13.0%", rp: "+57", tone: "positive" },
  { rank: "02", character: "알렉스 · 암기", winRate: "14.8%", rp: "+4.6", tone: "positive" },
  { rank: "03", character: "엠마 · 암기", winRate: "2.8%", rp: "-9.9", tone: "negative" },
] as const;

function assertLocale(locale: string): asserts locale is RouteLocale {
  if (!isRouteLocale(locale)) notFound();
}

function PalettePreview({ mode, className }: { mode: "WHITE" | "DARK"; className: string }) {
  return (
    <div className={`${styles.preview} ${className}`}>
      <div className={styles.previewHeader}>
        <div className={styles.previewBrand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span>ER&amp;GG</span>
        </div>
        <span className={styles.modeLabel}>{mode}</span>
      </div>

      <div className={styles.previewBody}>
        <div className={styles.contextRow}>
          <div>
            <p className={styles.contextLabel}>캐릭터 메타</p>
            <h3 className={styles.characterName}>재키 · 단검</h3>
          </div>
          <span className={styles.patchBadge}>11.7 · 다이아+</span>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metricPrimary}>
            <span className={styles.metricLabel}>표본</span>
            <strong>18,947</strong>
            <span className={styles.metricUnit}>게임</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>픽률</span>
            <strong>77.4%</strong>
            <span className={styles.metricDelta}>+2.1</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>승률</span>
            <strong>13.0%</strong>
            <span className={styles.metricDelta}>+1.6</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>평균 RP</span>
            <strong>+57</strong>
            <span className={styles.metricUnit}>상위 8%</span>
          </div>
        </div>

        <div className={styles.rankingHeader}>
          <span>실험체</span>
          <span>승률</span>
          <span>평균 RP</span>
        </div>
        <div className={styles.rankingList}>
          {rankings.map((row) => (
            <div className={styles.rankingRow} key={row.rank}>
              <span className={styles.rankNumber}>{row.rank}</span>
              <span className={styles.rankName}>{row.character}</span>
              <span>{row.winRate}</span>
              <strong className={row.tone === "positive" ? styles.positive : styles.negative}>
                {row.rp}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function PaletteLabPage({ params }: PaletteLabPageProps) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);

  const candidates: PaletteCandidate[] = [
    {
      koreanName: "01. 미네랄 시그널",
      impression: "광물 · 신호 · 선명함",
      note: "기존 미네랄 블루의 채도를 키운 기준안입니다. 금속성은 유지하고 핵심 지표를 더 또렷하게 띄웁니다.",
      lightClassName: styles.mineralSignalLight,
      darkClassName: styles.mineralSignalDark,
    },
    {
      koreanName: "02. 미네랄 아이스",
      impression: "빙결 · 분석 · 개방감",
      note: "미네랄 블루를 시안 쪽으로 이동한 안입니다. 화이트 모드가 가장 맑고 다크 모드의 강조색도 밝습니다.",
      lightClassName: styles.mineralIceLight,
      darkClassName: styles.mineralIceDark,
    },
    {
      koreanName: "03. 미네랄 스틸",
      impression: "강철 · 야간 · 안정감",
      note: "미네랄 블루를 인디고 경계로 이동한 안입니다. 채도는 절제하고 명암 대비로 가시성을 확보합니다.",
      lightClassName: styles.mineralSteelLight,
      darkClassName: styles.mineralSteelDark,
    },
    {
      koreanName: "04. 페트롤 시그널",
      impression: "연료 · 탐색 · 전술 HUD",
      note: "기존 딥 페트롤을 청록 쪽으로 넓힌 안입니다. 다섯 후보 중 게임 HUD의 신호성이 가장 강합니다.",
      lightClassName: styles.petrolSignalLight,
      darkClassName: styles.petrolSignalDark,
    },
    {
      koreanName: "05. 페트롤 딥",
      impression: "심해 · 장비 · 무게감",
      note: "페트롤을 블루 쪽으로 당긴 안입니다. 청록의 개성은 남기면서 통계 서비스의 안정감을 더합니다.",
      lightClassName: styles.petrolDeepLight,
      darkClassName: styles.petrolDeepDark,
    },
  ];

  return (
    <article className={styles.page}>
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>ER&amp;GG PALETTE LAB / 05</p>
          <h1>
            블루 한 계열 안에서도,
            <br />
            인상은 달라집니다.
          </h1>
          <p className={styles.lede}>
            미네랄과 페트롤 두 계열 안에서 색의 온도와 채도를 넓혔습니다. 같은 통계 화면으로
            가시성과 고유한 인상을 함께 비교해 보세요.
          </p>
        </div>
        <dl className={styles.criteria}>
          <div>
            <dt>공통 기준</dt>
            <dd>높은 가시성 + 통계 전문성</dd>
          </div>
          <div>
            <dt>제외 방향</dt>
            <dd>왕도 코발트 · 보라-청색 조합</dd>
          </div>
          <div>
            <dt>비교 방식</dt>
            <dd>화이트 · 다크 동시 확인</dd>
          </div>
        </dl>
      </header>

      <div className={styles.catalogue}>
        {candidates.map((candidate) => (
          <section className={styles.paletteSection} key={candidate.koreanName}>
            <div className={styles.paletteHeader}>
              <div className={styles.paletteTitleGroup}>
                <h2>{candidate.koreanName}</h2>
              </div>
              <div className={styles.paletteDescription}>
                <p className={styles.impression}>{candidate.impression}</p>
                <p>{candidate.note}</p>
              </div>
              <div
                className={`${styles.swatches} ${candidate.lightClassName}`}
                aria-label={`${candidate.koreanName} 대표 색상`}
              >
                <span className={styles.swatchCanvas} />
                <span className={styles.swatchSurface} />
                <span className={styles.swatchAccent} />
                <span className={styles.swatchInk} />
              </div>
            </div>

            <div className={styles.previewGrid}>
              <PalettePreview mode="WHITE" className={candidate.lightClassName} />
              <PalettePreview mode="DARK" className={candidate.darkClassName} />
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
