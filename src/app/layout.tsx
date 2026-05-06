import Navbar from "@/components/Navbar";
import "./styles/globals.css";
import ClientBody from "@/components/ClientBody";

export const metadata = {
  title: "Code Ascent",
  description: "Adaptive AI learning",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="en">
      <body>
        <ClientBody>
          {children}
          <Navbar />
        </ClientBody>
      </body>
    </html>
  );
}