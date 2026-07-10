import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, LayoutDashboard, MapPin, Home, Gavel, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/counties", label: "Counties", icon: MapPin },
  { to: "/admin/properties", label: "Properties", icon: Home },
  { to: "/admin/auctions", label: "Auctions", icon: Gavel },
  { to: "/admin/liens", label: "Liens", icon: FileText },
] as const;

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
          <div className="min-w-0"><Outlet /></div>
        </div>
      </div>
    </div>
  );
}