import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  inactive: "bg-muted text-muted-foreground ring-border",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  banned: "bg-red-50 text-red-700 ring-red-600/20",
  suspended: "bg-amber-50 text-amber-700 ring-amber-600/20",
  awarded: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  open: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-muted text-muted-foreground ring-border",
  submitted: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-600 uppercase tracking-wide ring-1 ring-inset",
        styles[status.toLowerCase()] ?? "bg-muted text-muted-foreground ring-border",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}