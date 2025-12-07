"use client";

import { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@stargazers-stella/cosmic-ui";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const actions = [
    {
      label: "Go to dashboard",
      hint: "Home",
      onSelect: () => router.push("/"),
    },
    {
      label: "Link a bank",
      hint: "Plaid",
      onSelect: () => {
        const button = document.getElementById("plaid-link-button");
        if (button instanceof HTMLButtonElement) {
          button.click();
        } else {
          toast.info("Open dashboard to link an account");
        }
      },
    },
    {
      label: "Refresh AI categories",
      hint: "Run AI",
      onSelect: () => {
        const el = document.getElementById("ai-refresh-button");
        if (el instanceof HTMLButtonElement) {
          el.click();
        } else {
          toast.info("Open dashboard first");
        }
      },
    },
    status === "authenticated"
      ? {
          label: "Sign out",
          hint: "Logout",
          onSelect: () => signOut(),
        }
      : {
          label: "Sign in with Google",
          hint: "Auth",
          onSelect: () => signIn("google"),
        },
  ].filter(Boolean) as Array<{ label: string; hint?: string; onSelect: () => void }>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[360px] p-0 sm:max-w-2xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-base">Quick actions</DialogTitle>
        </DialogHeader>
        <Command className="max-h-[70vh]">
          <CommandInput placeholder="Search commands…" />
          <CommandList className="max-h-[55vh] sm:max-h-[420px]">
            <CommandEmpty>No actions found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {actions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => {
                    action.onSelect();
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Support">
              <CommandItem onSelect={() => toast("Need help? Check README in repo.")}>
                View setup notes
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
