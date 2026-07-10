import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getFrozenPatchAnalysisRewrites() {
  const origin = process.env.PATCH_ANALYSIS_FROZEN_ORIGIN?.replace(/\/$/, "");
  const versions = parseCsvEnv(process.env.PATCH_ANALYSIS_FROZEN_VERSIONS);
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
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
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
        destination: "/character-lab",
        permanent: true,
      },
      {
        source: "/lab/:role",
        destination: "/character-lab/:role",
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
