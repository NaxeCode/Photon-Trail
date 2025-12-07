import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { SignInCta } from "@/components/signin-cta";
import { getServerAuthSession } from "@/lib/auth";
import { getDashboardData, getPaginatedTransactions } from "@/lib/data";

export default async function Home() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-300">Photon Trail</p>
          <h1 className="text-4xl font-semibold">Follow every dollar</h1>
          <p className="text-slate-300">
            Link accounts with Plaid, store data in Neon/Postgres, and let AI illuminate your
            categories.
          </p>
        </div>
        <div className="mt-6">
          <SignInCta />
        </div>
      </main>
    );
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 30);

  const [dashboard, transactions] = await Promise.all([
    getDashboardData(session.user.id, { from }),
    getPaginatedTransactions(session.user.id, { from, limit: 10, page: 1 }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
