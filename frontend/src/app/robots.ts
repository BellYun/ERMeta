import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com").replace(/\/$/, "");
  const trioLabDetailPaths = [
    "/trio-lab/",
    "/ko/trio-lab/",
    "/en/trio-lab/",
    "/ja/trio-lab/",
    "/zh-Hans/trio-lab/",
    "/zh-Hant/trio-lab/",
  ];

  return {
    rules: [
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...trioLabDetailPaths],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
