import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { getMe } from "@/lib/backend-auth";
import {
  ShieldCheck,
  LayoutDashboard,
  MapPin,
  Home,
  Gavel,
  FileText,
  Wallet,
  Users,
  ClipboardCheck,
  ScrollText,
  Activity,
  Files,
  BadgeCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/auth" });
    const isAdmin = user.roles.includes("admin") || user.roles.includes("super_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { user };
  },
  component: AdminLayout,
});

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/counties", label: "Counties", icon: MapPin },
  { to: "/admin/properties", label: "Properties", icon: Home },
  { to: "/admin/auctions", label: "Auctions", icon: Gavel },
  { to: "/admin/liens", label: "Liens", icon: FileText },
  { to: "/admin/documents", label: "Documents", icon: Files },
  { to: "/admin/registrations", label: "Registrations", icon: ClipboardCheck },
  { to: "/admin/bids", label: "Bids", icon: Activity },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/kyc", label: "KYC Review", icon: BadgeCheck },
  { to: "/admin/funds", label: "Fund Requests", icon: Wallet },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

function AdminLayout() {
  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <div className="mb-4 flex items-center gap-2 text-navy">
          <ShieldCheck className="size-5" />
          <h1 className="font-display text-xl font-600">Admin Panel</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="rounded-xl border border-hairline bg-surface p-2 text-sm">
            {nav.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-ink hover:bg-surface-alt"
                activeProps={{ className: "bg-navy/5 text-navy font-600" }}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
