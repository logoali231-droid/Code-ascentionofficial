import "@/app/styles/globals.css";

import type { Metadata } from "next";

import ClientBody from "@/components/ClientBody";
import DevConsoleBoot from "@/components/DevConsoleBoot";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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

  themeColor: "#000000",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
          {children}
        </ClientBody>

        <DevConsoleBoot />
      </body>
    </html>
  );
}