"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@stargazers-stella/cosmic-ui";
import { toast } from "sonner";

async function fetchLinkToken() {
  const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create link token");
  return res.json();
}

export function PlaidLinkButton() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // prefetch for faster open
    fetchLinkToken()
      .then((data) => setToken(data.link_token))
      .catch(() => null);
  }, []);

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata?.institution?.institution_id,
          institutionName: metadata?.institution?.name,
        }),
      });

      if (!res.ok) throw new Error("Failed to save link");
      toast.success("Bank linked securely");

      try {
        const syncRes = await fetch("/api/plaid/sync", { method: "POST" });
        const summary = await syncRes.json().catch(() => ({}));
        if (syncRes.ok) {
          const added = summary?.added ?? 0;
          const modified = summary?.modified ?? 0;
          toast.success(`Synced ${added} new and ${modified} updated transactions`);
        } else {
          toast.message("Linked. Sync will run shortly.");
        }
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to save account");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: token ?? "",
    onSuccess,
    onExit: () => setLoading(false),
  });

  return (
    <Button
      id="plaid-link-button"
      variant="outline"
      className="btn-secondary w-full sm:w-auto"
      disabled={!ready || loading}
      onClick={async () => {
        try {
          setLoading(true);
          if (!token) {
            const data = await fetchLinkToken();
            setToken(data.link_token);
          }
          open();
        } catch (error) {
          console.error(error);
          toast.error("Could not start Plaid Link");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Opening…" : "Link an account"}
    </Button>
  );
}
