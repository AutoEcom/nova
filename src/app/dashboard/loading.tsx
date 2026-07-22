export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="h-4 w-72 max-w-full rounded bg-white/5" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-24 rounded-2xl" />
        ))}
      </div>
      <div className="glass mt-4 h-64 rounded-2xl" />
    </div>
  );
}
