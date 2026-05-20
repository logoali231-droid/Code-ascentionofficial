/** @type {import('next').NextConfig} */
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  output: "standalone",
  reactStrictMode: false,

  // Otimização de build: Adicionamos transpilePackages para evitar problemas
  // de compatibilidade com módulos ESM em workers (comum no web-llm e runtimes WASM)
  transpilePackages: ["@mlc-ai/web-llm"],

  experimental: {
    optimizePackageImports: ["@mlc-ai/web-llm", "lucide-react"],
  },

  webpack: (config, { isServer }) => {
    // 1. Resolver conflitos de módulos nativos no client-side
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };

    // 2. Correção de carga de WASM para evitar problemas de MIME type em worker threads
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
          // Necessário para COOP/COEP (SharedArrayBuffer/WASM Threads)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" }, 
        ],
      },
    ];
  },

  compress: true,
};

export default withBundleAnalyzer(nextConfig);
