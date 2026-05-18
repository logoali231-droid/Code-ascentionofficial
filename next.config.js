/** @type {import('next').NextConfig} */

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {

  output: "standalone",
  reactStrictMode: false,

  experimental: {
    optimizePackageImports: ["@mlc-ai/web-llm", "lucide-react"],
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",

        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },

          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },

      {
        source: "/(.*).wasm",

        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
        ],
      },
    ];
  },

  compress: true,
};

export default withBundleAnalyzer(nextConfig);