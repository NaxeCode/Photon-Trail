"use client";

import { useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@stargazers-stella/cosmic-ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <Card className="panel w-full">
        <CardHeader>
          <CardTitle className="ui-heading text-2xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[color:var(--text-muted)]">
            The dashboard hit an error. Try reloading or jump back to the home view.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="btn-primary w-full sm:w-auto" onClick={() => reset()}>
              Retry
            </Button>
            <Button variant="outline" className="btn-secondary w-full sm:w-auto" onClick={() => location.assign("/")}>
              Back home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
