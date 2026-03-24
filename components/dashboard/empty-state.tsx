import { PlaidLinkButton } from "../plaid-link-button";
import { Button, Card, CardContent } from "@stargazers-stella/cosmic-ui";

type EmptyStateProps = {
  onSync?: () => void;
  onAi?: () => void;
};

export function EmptyState({ onSync, onAi }: EmptyStateProps) {
  return (
    <Card className="panel border-white/10">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <p className="muted-label">No activity yet</p>
          <div className="ui-heading text-2xl">
            Connect Plaid to pull transactions
          </div>
          <p className="text-sm leading-6 text-[color:var(--text-muted)]">
            Link an account, run a sync, then use AI suggestions as a first pass instead of the
            final word.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <PlaidLinkButton />
          {onSync ? (
            <Button
              className="btn-primary w-full sm:w-auto"
              variant="secondary"
              onClick={onSync}
            >
              Fetch latest
            </Button>
          ) : null}
          {onAi ? (
            <Button
              className="btn-secondary w-full sm:w-auto"
              variant="outline"
              onClick={onAi}
            >
              Run AI
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
