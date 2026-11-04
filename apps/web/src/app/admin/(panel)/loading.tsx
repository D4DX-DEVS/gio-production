// Shown inside the admin frame while a screen's data loads, so the menu stays put and a click answers at once.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="animate-pulse">
      <div className="mb-7">
        <div className="h-9 w-64 max-w-full rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200/80" />
      </div>
      <div className="space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded-lg bg-slate-100" />
              <div className="h-11 rounded-lg bg-slate-100" />
              <div className="h-24 rounded-lg bg-slate-100 sm:col-span-2" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
