import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-600 text-navy lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  value2,
  sub,
  accent,
  href,
  cta,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  value2?: string;
  sub?: string;
  accent?: string;
  href?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex aspect-square flex-col justify-between rounded-2xl border border-hairline bg-surface p-3.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
          {icon}
        </span>
        {href && cta && (
          <Link
            to={href}
            aria-label={cta}
            className="grid size-7 place-items-center rounded-md text-navy transition-colors hover:bg-surface-alt"
          >
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-600 uppercase tracking-wider text-ink-muted">
          {label}
        </div>
        <div
          className={cn(
            "mt-1 truncate font-display text-2xl font-600 tabular-nums leading-none",
            accent ?? "text-navy",
          )}
        >
          {value}
        </div>
        {value2 && <div className="mt-1 truncate text-sm font-600 text-navy tabular-nums">{value2}</div>}
        {sub && <div className="mt-1.5 text-[11px] leading-tight text-ink-muted">{sub}</div>}
      </div>
    </div>
  );
}