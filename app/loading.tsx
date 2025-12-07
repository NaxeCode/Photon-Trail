export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
      </div>
    </main>
  );
}
