import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
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
