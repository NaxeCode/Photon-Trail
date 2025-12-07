import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { CommandPalette } from "@/components/command-palette";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "Photon Trail",
  description: "Photon Trail — AI-first personal finance dashboard powered by Plaid and Neon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} bg-slate-950 text-slate-50`}
      >
        <Providers>
          <CommandPalette />
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
