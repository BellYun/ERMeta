import type { MetadataRoute } from "next";
import { getAllPatchVersions } from "@/data/patch-notes";
import {
  buildSeoAlternateLanguages,
  prefixSeoLocalePath,
  SEO_TARGET_LOCALE,
} from "@/lib/seoLocales";

const CHARACTER_CODES: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
  76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com").replace(/\/$/, "");
  const now = new Date();

  const buildAlternates = (pathname: string) => {
    const languages = buildSeoAlternateLanguages(pathname);
    return {
      languages: {
        ko: `${base}${languages.ko}`,
        ja: `${base}${languages.ja}`,
        "x-default": `${base}${languages["x-default"]}`,
      },
    };
  };

  const buildLocalizedEntry = (
    pathname: string,
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>,
    priority: number
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${pathname}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: buildAlternates(pathname),
  });

  const staticPages: MetadataRoute.Sitemap = [
    buildLocalizedEntry("/", "daily", 1.0),
    buildLocalizedEntry("/character/1", "daily", 0.9),
    buildLocalizedEntry("/synergy", "daily", 0.8),
    buildLocalizedEntry("/synergy-detail", "daily", 0.75),
    buildLocalizedEntry("/patches", "weekly", 0.7),
    buildLocalizedEntry("/season10-recap", "weekly", 0.8),
    {
      url: `${base}/updates`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${base}/landing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const localizedStaticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}${prefixSeoLocalePath("/", SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: buildAlternates("/"),
    },
    {
      url: `${base}${prefixSeoLocalePath("/synergy", SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
      alternates: buildAlternates("/synergy"),
    },
    {
      url: `${base}${prefixSeoLocalePath("/synergy-detail", SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.65,
      alternates: buildAlternates("/synergy-detail"),
    },
    {
      url: `${base}${prefixSeoLocalePath("/patches", SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
      alternates: buildAlternates("/patches"),
    },
    {
      url: `${base}${prefixSeoLocalePath("/season10-recap", SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: buildAlternates("/season10-recap"),
    },
  ];

  const characterPages: MetadataRoute.Sitemap = CHARACTER_CODES.map((code) => {
    const pathname = `/character/${code}`;
    const languages = buildSeoAlternateLanguages(pathname);
    return {
      url: `${base}${pathname}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: {
        languages: {
          ko: `${base}${languages.ko}`,
          ja: `${base}${languages.ja}`,
          "x-default": `${base}${languages["x-default"]}`,
        },
      },
    };
  });

  const localizedCharacterPages: MetadataRoute.Sitemap = CHARACTER_CODES.map((code) => {
    const pathname = `/character/${code}`;
    return {
      url: `${base}${prefixSeoLocalePath(pathname, SEO_TARGET_LOCALE)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: {
        languages: buildAlternates(pathname).languages,
      },
    };
  });

  const patchPages: MetadataRoute.Sitemap = getAllPatchVersions().flatMap((version) => {
    const pathname = `/patches/${version}`;
    return [
      buildLocalizedEntry(pathname, "monthly", 0.6),
      {
        url: `${base}${prefixSeoLocalePath(pathname, SEO_TARGET_LOCALE)}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.55,
        alternates: buildAlternates(pathname),
      },
    ];
  });

  return [
    ...staticPages,
    ...localizedStaticPages,
    ...characterPages,
    ...localizedCharacterPages,
    ...patchPages,
  ];
}
