import "./styles/globals.css";

import type {
  Metadata,
  Viewport,
} from "next";

import Web3Provider from "@/providers/web3Provider";

import ClientBody from "@/components/ClientBody";
import DevConsoleBoot from "@/components/DevConsoleBoot";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,

  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Code Ascension",

  description:
    "Offline AI-powered cyberpunk learning roguelike.",

  manifest: "/manifest.json",

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/icons/icon-192.png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle:
      "black-translucent",

    title: "Code Ascension",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-white">
        <ClientBody>
          <Web3Provider>
            {children}
          </Web3Provider>
        </ClientBody>

        {process.env.NODE_ENV ===
          "development" && (
          <DevConsoleBoot />
        )}
      </body>
    </html>
  );
}
