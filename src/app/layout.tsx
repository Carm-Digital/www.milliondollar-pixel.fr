import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Million Dollar Pixel — Le mur le plus viral d'Internet",
  description: "1 000 000 pixels à vendre. Affichez votre marque sur un mur public permanent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
