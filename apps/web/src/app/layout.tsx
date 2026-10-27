import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecommerce CDS",
  description: "Ecommerce application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`light ${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      data-theme="light"
    >
      <body className="min-h-svh bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
