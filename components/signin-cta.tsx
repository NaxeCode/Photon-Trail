"use client";

import { signIn } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@stargazers-stella/cosmic-ui";

export function SignInCta() {
  return (
    <Card className="paper mx-auto max-w-xl rounded-[2rem]">
      <CardHeader className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.35em] text-brand-700">Entry Point</p>
        <CardTitle className="font-display text-3xl tracking-[-0.04em] text-stone-900">
          Sign in to open your ledger.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-stone-700">
          Connect Google to sync your profile, then securely link bank or card accounts with
          Plaid. AI suggestions stay visible, but the final category stays under your control.
        </p>
        <Button
          className="btn-primary h-12 w-full"
          onClick={() => signIn("google")}
        >
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
