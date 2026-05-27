/** @type {import('next').NextConfig} */

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: false,

  swcMinify: true,

  experimental: {
    esmExternals: "loose",

    /*
      reduz pressão de memória
      em builds grandes
    */
    optimizePackageImports: [
      "@mlc-ai/web-llm",
    ],
  },

  transpilePackages: [
    "@mlc-ai/web-llm",
  ],

  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {

    /* =====================================================
       FALLBACKS
    ===================================================== */

    config.resolve.fallback = {
      ...config.resolve.fallback,

      fs: false,
      path: false,
      crypto: false,
      stream: false,
      perf_hooks: false,
    };

    /* =====================================================
       WEBASSEMBLY
    ===================================================== */

    config.experiments = {
      ...config.experiments,

      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    /* =====================================================
       ALIASES
    ===================================================== */

    config.resolve.alias = {
      ...config.resolve.alias,

      "pino-pretty": false,
      encoding: false,
    };

    /* =====================================================
       SERVER EXTERNALS
    ===================================================== */

    if (isServer) {
      config.externals.push({
        "@huggingface/transformers":
          "commonjs @huggingface/transformers",
      });
    }

    /* =====================================================
       HUGE WARNING FILTER
       (webllm spam)
    ===================================================== */

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),

      /Critical dependency/,

      /Failed to parse source map/,
    ];

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",

        headers: [

          /* =================================================
             WEBGPU / SHAREDARRAYBUFFER
          ================================================= */

          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },

          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },

          /* =================================================
             PERMISSIONS
          ================================================= */

          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), unload=*",
          },

          /* =================================================
             CACHE
          ================================================= */

          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },

          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);