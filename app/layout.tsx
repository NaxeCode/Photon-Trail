import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Photon Trail",
  description: "A personal-finance ledger with incremental imports and category review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50"><AppShell connected={Boolean(process.env.DATABASE_URL)}>{children}</AppShell></body>
    </html>
  );
}
