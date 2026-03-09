import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { L10nProvider } from "@/components/L10nProvider";
import { Analytics } from "@vercel/analytics/next";
import { AmplitudeProvider } from "@/components/AmplitudeProvider";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ermeta.vercel.app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "루미아 스탯 | 이터널리턴 메타 분석 - LumiaStats",
    template: "%s | 루미아 스탯 LumiaStats",
  },
  description: "루미아 스탯(LumiaStats) - 이터널리턴(Eternal Return) 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스. 다이아~상위 1000위 데이터 기반.",
  keywords: [
    "루미아 스탯", "루미아스탯", "LumiaStats",
    "이터널리턴", "Eternal Return", "이터널리턴 티어표", "이터널리턴 메타",
    "이터널리턴 조합 추천", "이터널리턴 캐릭터 분석", "이터널리턴 승률",
    "이터널리턴 픽률", "이터널리턴 RP", "이터널리턴 통계",
  ],
  authors: [{ name: "루미아 스탯 LumiaStats" }],
  creator: "LumiaStats",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "루미아 스탯 LumiaStats",
    title: "루미아 스탯 | 이터널리턴 메타 분석 - LumiaStats",
    description: "루미아 스탯(LumiaStats) - 이터널리턴 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스.",
  },
  twitter: {
    card: "summary_large_image",
    title: "루미아 스탯 | 이터널리턴 메타 분석 - LumiaStats",
    description: "루미아 스탯(LumiaStats) - 이터널리턴 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "1YZVnVc8C2KfQoJEQg1n5wNhGwEraNxZi97w22sN5V8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geistSans.variable}>
      <body>
        <L10nProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </L10nProvider>
        <Analytics />
        <AmplitudeProvider />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LumiaStats",
              url: BASE_URL,
              description: "이터널리턴(Eternal Return) 캐릭터 티어, 3인 조합 추천, 통계 분석 서비스",
              inLanguage: "ko-KR",
              potentialAction: {
                "@type": "SearchAction",
                target: `${BASE_URL}/character-analysis?character={character_code}`,
                "query-input": "required name=character_code",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
