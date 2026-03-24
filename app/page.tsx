import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { SignInCta } from "@/components/signin-cta";
import { getAppSession, isDevAuthBypassed } from "@/lib/auth";
import { getDashboardData, getPaginatedTransactions } from "@/lib/data";

export default async function Home() {
  const session = await getAppSession();

  if (!session?.user?.id && !isDevAuthBypassed()) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="section-shell grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="relative z-10 space-y-6">
            <p className="eyebrow">Photon Trail</p>
            <div className="space-y-4">
              <h1 className="hero-title max-w-3xl">
                A sharper money dashboard with a human point of view.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[color:var(--text-muted)] sm:text-lg">
                Link accounts with Plaid, store every movement in Postgres, and let AI propose
                categories without burying the signal under generic dashboards.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[color:var(--text-muted)] sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="muted-label mb-2">Connected</div>
                <div className="font-display text-2xl text-[color:var(--text)]">Plaid Link</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="muted-label mb-2">Stored In</div>
                <div className="font-display text-2xl text-[color:var(--text)]">Postgres</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="muted-label mb-2">Assisted By</div>
                <div className="font-display text-2xl text-[color:var(--text)]">AI Labels</div>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <SignInCta />
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 30);

  const [dashboard, transactions] = await Promise.all([
    getDashboardData(session?.user?.id ?? "", { from }),
    getPaginatedTransactions(session?.user?.id ?? "", { from, limit: 10, page: 1 }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <DashboardClient
        initialDashboard={dashboard}
        initialTransactions={transactions}
        defaultFilters={{
          from: from.toISOString().slice(0, 10),
          to: now.toISOString().slice(0, 10),
        }}
      />
    </main>
  );
}
