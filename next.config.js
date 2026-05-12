/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Desativa o Strict Mode para evitar inicializações duplas do WebLLM (opcional, mas ajuda na estabilidade)
  reactStrictMode: false,

  // 2. Garante que os arquivos .wasm e pesos do modelo sejam servidos corretamente
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, // Necessário para algumas bibliotecas de ML que tentam ler arquivos localmente
    };
    return config;
  },

  // 3. Configurações para garantir performance e evitar erros de cabeçalho
  // Importante se você for hospedar na Vercel para permitir o WebGPU
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless', // Ou 'require-corp', essencial para WebGPU em alguns contextos
          },
        ],
      },
    ];
  },
};

export default nextConfig;