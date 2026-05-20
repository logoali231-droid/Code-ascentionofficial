/** @type {import('next').NextConfig} */
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  
  // Essencial para evitar erros de build com bibliotecas ESM
  transpilePackages: ["@mlc-ai/web-llm"],

  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {
    // Resolve falhas de módulos Node que não existem no browser
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };

    // Habilita suporte a WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
