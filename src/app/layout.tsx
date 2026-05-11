import "@/app/styles/globals.css";
import ClientBody from "@/components/ClientBody";
import DevConsoleBoot from "@/components/DevConsoleBoot";

export const metadata = {
  title: "Code Ascension",
  description: "Code Ascension official app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>
        <ClientBody>{children}</ClientBody>
        <DevConsoleBoot />
        
      </body>
    </html>
  );
}
