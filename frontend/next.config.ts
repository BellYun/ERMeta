import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { isPublicPatchVersion } from "./src/lib/publicPatchVersion";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
const STAT_SNAPSHOT_FILES = ["./public/data/season-stats/*/stats/*.json"];

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getFrozenPatchAnalysisRewrites() {
  const origin = process.env.PATCH_ANALYSIS_FROZEN_ORIGIN?.replace(/\/$/, "");
  const versions = parseCsvEnv(process.env.PATCH_ANALYSIS_FROZEN_VERSIONS).filter(
    isPublicPatchVersion
  );
  if (!origin || versions.length === 0) return [];

  return versions.flatMap((version) => [
    {
      source: `/patch-analysis/${version}`,
      destination: `${origin}/patch-analysis/${version}`,
    },
    {
      source: `/:locale(ko|en|ja)/patch-analysis/${version}`,
      destination: `${origin}/:locale/patch-analysis/${version}`,
    },
  ]);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  outputFileTracingIncludes: {
    "/\\[locale\\]": STAT_SNAPSHOT_FILES,
    "/character/\\[code\\]": STAT_SNAPSHOT_FILES,
    "/performance-lab/home-filter": STAT_SNAPSHOT_FILES,
    "/api/{builds/traits,character,meta}/**": STAT_SNAPSHOT_FILES,
    "/api/og/synergy": ["./public/data/season-stats/*/og.json.gz"],
  },
  async headers() {
    return [
      {
        source: "/data/season-stats/:version/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/data/:snapshot(trio-builder|trio-detail-pairs)/:version/:bucket",
        headers: [
          {
            key: "Cache-Control",
            value: IMMUTABLE_ASSET_CACHE_CONTROL,
          },
        ],
      },
      {
        source: "/data/composition-affinity/:version.json.gz",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/l10n/chunks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: IMMUTABLE_ASSET_CACHE_CONTROL,
          },
        ],
      },
      {
        source: "/characters/mini/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: IMMUTABLE_ASSET_CACHE_CONTROL,
          },
        ],
      },
      {
        source: "/CharactER/:character/03.%20skill%20Icon/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: IMMUTABLE_ASSET_CACHE_CONTROL,
          },
        ],
      },
      {
        source: "/sprites/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: IMMUTABLE_ASSET_CACHE_CONTROL,
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: getFrozenPatchAnalysisRewrites(),
    };
  },
  async redirects() {
    return [
      {
        source: "/character-analysis",
        destination: "/character/1",
        permanent: true,
      },
      {
        source: "/character-test",
        destination: "/character/1",
        permanent: false,
      },
      {
        source: "/lab",
        destination: "/composition-lab",
        permanent: true,
      },
      {
        source: "/lab/:role",
        destination: "/composition-lab",
        permanent: true,
      },
      {
        source: "/landing",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
