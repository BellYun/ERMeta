import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "이리와지지 ER&GG - 이터널리턴 메타 분석",
    short_name: "ER&GG",
    description: "이터널리턴 실험체 티어, 3인 조합, 빌드 통계 분석 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#172033",
    lang: "ko",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
