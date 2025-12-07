"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@stargazers-stella/cosmic-ui";
import { SWRConfig } from "swr";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher: (resource, init) =>
            fetch(resource as RequestInfo, init).then((res) => res.json()),
        }}
      >
        {children}
      </SWRConfig>
      <Toaster position="top-center" />
    </SessionProvider>
  );
}
