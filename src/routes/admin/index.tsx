import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Users,
  Gavel,
  Home,
  FileText,
  ListChecks,
  Activity,
  HandCoins,
  BadgeCheck,
  Landmark,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const statDefs: { key: string; label: string; to: string; icon: typeof Users; accent: string }[] = [
  { key: "properties", label: "Properties", to: "/admin/properties", icon: Home, accent: "bg-navy/10 text-navy" },
  { key: "counties", label: "Counties", to: "/admin/counties", icon: Landmark, accent: "bg-gold/15 text-navy" },
  { key: "auctions", label: "Auctions", to: "/admin/auctions", icon: Gavel, accent: "bg-navy/10 text-navy" },
  { key: "lots", label: "Liens in sale", to: "/admin/liens", icon: FileText, accent: "bg-gold/15 text-navy" },
  { key: "bids", label: "Bids", to: "/admin/bids", icon: Activity, accent: "bg-navy/10 text-navy" },
  { key: "users", label: "Registered users", to: "/admin/users", icon: Users, accent: "bg-gold/15 text-navy" },
  { key: "pendingKyc", label: "Pending KYC", to: "/admin/kyc", icon: BadgeCheck, accent: "bg-navy/10 text-navy" },
  { key: "confirmedDeposits", label: "Confirmed deposits", to: "/admin/funds", icon: HandCoins, accent: "bg-gold/15 text-navy" },
];

const quickActions = [
  { label: "Add property", to: "/admin/properties" },
  { label: "Create auction", to: "/admin/auctions" },
  { label: "Review KYC", to: "/admin/kyc" },
  { label: "Edit site pages", to: "/admin/content/pages" },
  { label: "Site settings", to: "/admin/content/settings" },
];

function AdminOverview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
  });

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="System snapshot, key numbers and quick actions."
        actions={
          <a
            href="https://tax-lien-insight-zeta.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-[13px] font-500 text-ink transition-colors hover:border-navy/40 hover:bg-surface-alt"
          >
            <ExternalLink className="size-4" /> View live site
          </a>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {statDefs.map(({ key, label, to, icon: Icon, accent }) => (
          <Link
            key={key}
            to={to}
            className="group rounded-xl border border-hairline bg-surface p-4 transition-colors hover:border-navy/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`grid size-9 place-items-center rounded-lg ${accent}`}>
                <Icon className="size-4.5" strokeWidth={2} />
              </span>
              <ArrowRight className="size-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-3 font-display text-2xl font-600 text-navy">
              {isLoading ? "…" : isError ? "—" : (data as any)?.[key] ?? 0}
            </div>
            <div className="mt-0.5 text-xs font-500 text-ink-muted">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
            <h2 className="text-sm font-600 text-navy">Recent admin activity</h2>
            <Link to="/admin/audit" className="text-xs font-500 text-ink-muted hover:text-navy">
              View audit log
            </Link>
          </div>
          <ul className="divide-y divide-hairline">
            {(data?.recent ?? []).slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">
                  <ListChecks className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-500 text-ink">{formatAction(r.action, r.email)}</span>
                <span className="shrink-0 text-xs text-ink-muted">{formatWhen(r.created_at)}</span>
              </li>
            ))}
            {!data?.recent?.length && (
              <li className="px-5 py-8 text-center text-sm text-ink-muted">No admin activity recorded yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-hairline bg-surface">
          <div className="border-b border-hairline px-5 py-3.5">
            <h2 className="text-sm font-600 text-navy">Quick actions</h2>
          </div>
          <div className="p-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-500 text-ink transition-colors hover:bg-surface-alt hover:text-navy"
              >
                {a.label} <ArrowRight className="size-4 text-ink-muted" />
              </Link>
            ))}
          </div>
          {!isLoading && !isError ? (
            <div className="border-t border-hairline px-5 py-3.5 text-sm">
              <div className="text-xs uppercase tracking-wider text-ink-muted">Total funds on hold</div>
              <div className="mt-0.5 font-display text-lg font-600 text-navy">
                ${Number(data?.totalFunds ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </div>
              <div className="mt-1 text-xs text-ink-muted">{data?.activeAuctions ?? 0} auctions currently active</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string, email: string | null) {
  const text = action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return email ? `${text} — ${email}` : text;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}