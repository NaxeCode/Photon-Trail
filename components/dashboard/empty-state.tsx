import { PlaidLinkButton } from "../plaid-link-button";
import { Button, Card, CardContent } from "@stargazers-stella/cosmic-ui";

type EmptyStateProps = {
  onSync?: () => void;
  onAi?: () => void;
};

export function EmptyState({ onSync, onAi }: EmptyStateProps) {
  return (
    <Card className="glass border-white/10 bg-white/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">No activity yet</p>
          <div className="text-lg font-semibold">Connect Plaid to pull transactions</div>
          <p className="text-sm text-slate-400">
            Link a bank, sync data, then let AI label your spending. Works great on mobile too.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <PlaidLinkButton />
          {onSync ? (
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onSync}>
              Fetch latest
            </Button>
          ) : null}
          {onAi ? (
            <Button className="w-full sm:w-auto" variant="outline" onClick={onAi}>
              Run AI
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
