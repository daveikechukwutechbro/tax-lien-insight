import { Link } from "@tanstack/react-router";
import { AlertTriangle, House, RefreshCcw, SearchX } from "lucide-react";

export function RouteNotFound() {
  return (
    <section className="container-tight py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-hairline bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto grid size-13 place-items-center rounded-full bg-gold/15 text-gold">
          <SearchX className="size-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The page you are looking for does not exist or has moved. Try the home page or browse
          auctions.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/auctions"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-soft"
          >
            <House className="size-4" strokeWidth={1.75} />
            Browse auctions
          </Link>
        </div>
      </div>
    </section>
  );
}

export function RouteErrorFallback({ reset }: { error?: unknown; reset?: () => void }) {
  return (
    <section className="container-tight py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-hairline bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto grid size-13 place-items-center rounded-full bg-gold/15 text-gold">
          <AlertTriangle className="size-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">This page hit a snag</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Something interrupted loading this page. It is usually temporary, so a retry normally
          fixes it right away.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-soft"
          >
            <RefreshCcw className="size-4" strokeWidth={1.75} />
            Retry
          </button>
          {reset ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface-alt px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:text-navy"
            >
              Try again in-app
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const RouteFrame = {
  Error: RouteErrorFallback,
  NotFound: RouteNotFound,
};