"use client";

import { usePathname } from "next/navigation";
import Providers from "./providers";
import { CommandPalette } from "./command-palette";

export function AppShell({ connected, children }: { connected: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  if (!connected || pathname === "/demo") return <>{children}</>;
  return (
    <Providers>
      <CommandPalette />
      <div className="min-h-screen">{children}</div>
    </Providers>
  );
}
