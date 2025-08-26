import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fancy Text",
  description:
    "Interactive Fancy Text app built with Next.js, TypeScript and Canvas. Enter custom text to trigger colorful fireworks, floating balloons, hearts, and confetti animations. Fully responsive, interactive, and optimized for dynamic celebrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
