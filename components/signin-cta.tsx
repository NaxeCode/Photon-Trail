"use client";

import { signIn } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@stargazers-stella/cosmic-ui";

export function SignInCta() {
  return (
    <Card className="mx-auto max-w-xl border border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to continue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          Connect Google to sync your profile, then securely link bank or card accounts with
          Plaid. AI will clean up merchants and categorize spending with confidence scores.
        </p>
        <Button className="w-full" onClick={() => signIn("google")}>
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
