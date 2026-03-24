export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6 py-4">
        <div className="section-shell">
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-12 w-full max-w-2xl animate-pulse rounded bg-white/10" />
            <div className="h-5 w-full max-w-xl animate-pulse rounded bg-white/5" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="panel h-32 animate-pulse" />
          ))}
        </div>
        <div className="panel h-72 animate-pulse" />
      </div>
    </main>
  );
}
