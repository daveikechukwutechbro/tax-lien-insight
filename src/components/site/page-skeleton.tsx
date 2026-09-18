export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="container-tight py-12">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-lg bg-surface-alt" />
        <div>
          <div className="h-7 w-56 animate-pulse rounded bg-surface-alt" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-surface-alt" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-surface p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-surface-alt" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-surface-alt" />
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="h-4 animate-pulse rounded bg-surface-alt" />
              <div className="h-4 animate-pulse rounded bg-surface-alt" />
              <div className="h-4 animate-pulse rounded bg-surface-alt" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}