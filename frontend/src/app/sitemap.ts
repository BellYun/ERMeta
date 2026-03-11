import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com").replace(/\/$/, "")

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/character-analysis`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/synergy`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ]
}
