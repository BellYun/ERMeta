import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://lumiastats.vercel.app",
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://lumiastats.vercel.app/synergy",
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://lumiastats.vercel.app/character-analysis",
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
