import { Link, useLocation } from "@tanstack/react-router";
import { Gavel, LayoutDashboard, Menu, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS: Record<string, { label: string; icon: typeof LayoutDashboard; match: string[] }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  investments: { label: "Investments", icon: Gavel, match: ["/dashboard/bids", "/dashboard/won", "/dashboard/lost"] },
  transactions: {
    label: "Transactions",
    icon: Receipt,
    match: ["/dashboard/payments", "/dashboard/history", "/dashboard/funds"],
  },
};

export function MobileBottomNav({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const { pathname } = useLocation();

  const activeKey =
    (Object.entries(GROUPS).find(([, g]) => g.match.some((p) => pathname.startsWith(p)))?.[0] as
      | keyof typeof GROUPS
      | undefined) ?? "more";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid h-14 grid-cols-4">
        {Object.entries(GROUPS).map(([key, { label, icon: Icon }]) => {
          const active = activeKey === key;
          return (
            <Link
              key={key}
              to={key === "dashboard" ? "/dashboard" : (GROUPS[key].match[0] as never)}
              className="flex flex-col items-center justify-center gap-0.5 pt-1.5"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full transition-colors",
                  active ? "bg-navy/10 text-navy" : "text-ink-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span
                className={cn(
                  "text-[10px] font-500 leading-none",
                  active ? "text-navy" : "text-ink-muted",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-expanded={moreOpen}
          aria-label="More menu"
          className="flex flex-col items-center justify-center gap-0.5 pt-1.5"
        >
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full transition-colors",
              moreOpen || activeKey === "more" ? "bg-navy/10 text-navy" : "text-ink-muted",
            )}
          >
            <Menu className="size-5" strokeWidth={moreOpen || activeKey === "more" ? 2.25 : 1.75} />
          </span>
          <span
            className={cn(
              "text-[10px] font-500 leading-none",
              moreOpen || activeKey === "more" ? "text-navy" : "text-ink-muted",
            )}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
}