import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distributed Payment & Ledger Platform",
  description: "Production UI for high-concurrency distributed payment and double-entry ledger platform",
  keywords: ["payments", "ledger", "double-entry", "distributed-systems", "fintech"],
  authors: [{ name: "Engineering Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
