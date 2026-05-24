/** @type {import('next').NextConfig} */
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: false,

  experimental: {
    esmExternals: "loose",
  },

  transpilePackages: [
    "@mlc-ai/web-llm",
  ],

  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      encoding: false,
    };

    if (isServer) {
      config.externals.push({
        "@huggingface/transformers":
          "commonjs @huggingface/transformers",
      });
    }

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
            value: "require-corp",
          },
          // Solução para o erro [Violation] Permissions policy violation: unload
          {
            key: "Permissions-Policy",
            value: "unload=*",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);