import type { MetadataRoute } from "next";
import { ROUTE_LOCALES } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com").replace(/\/$/, "");
  const trioLabDetailPaths = [
    "/trio-lab/",
    ...ROUTE_LOCALES.map((locale) => `/${locale}/trio-lab/`),
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
