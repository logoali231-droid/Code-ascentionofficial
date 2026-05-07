import "@/app/styles/globals.css";
import ClientBody from "@/components/ClientBody";

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
      </body>
    </html>
  );
}