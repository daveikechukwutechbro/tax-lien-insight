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
    <div className={cn("rounded-xl border border-hairline bg-surface p-4", className)}>
      <div className="flex items-center gap-2 text-[11px] font-500 uppercase tracking-wider text-ink-muted">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("mt-2 font-display text-2xl font-600 tabular-nums", accent ?? "text-navy")}>
        {value}
      </div>
      {value2 && <div className="text-sm font-600 text-navy tabular-nums">{value2}</div>}
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
      {href && cta && (
        <Link
          to={href}
          className="mt-2 inline-flex items-center gap-1 text-xs font-500 text-navy hover:underline"
        >
          {cta} <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}