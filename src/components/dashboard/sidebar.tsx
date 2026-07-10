import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard, Gavel, Bookmark, Trophy, XCircle, CalendarClock,
  Receipt, CreditCard, Wallet, UserRound, Bell, Search, FileText, MessageSquare, LogOut, ShieldCheck,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminQuery, profileQuery } from "@/lib/queries/dashboard";
import { useRouter } from "@tanstack/react-router";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/bids", label: "My Bids", icon: Gavel },
  { to: "/dashboard/watched", label: "Watched Properties", icon: Bookmark },
  { to: "/dashboard/won", label: "Won Properties", icon: Trophy },
  { to: "/dashboard/lost", label: "Lost Properties", icon: XCircle },
  { to: "/dashboard/scheduled", label: "Scheduled Auctions", icon: CalendarClock },
  { to: "/dashboard/history", label: "Purchase History", icon: Receipt },
  { to: "/dashboard/payments", label: "Payments & Invoices", icon: CreditCard },
  { to: "/dashboard/funds", label: "Account Funds", icon: Wallet },
  { to: "/dashboard/profile", label: "Profile Settings", icon: UserRound },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/searches", label: "Saved Searches", icon: Search },
  { to: "/dashboard/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
] as const;

export function DashboardSidebar() {
  const { user } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id));

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Bidder";
  const initials = displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <aside className="w-full shrink-0 lg:w-[240px]">
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-navy text-sm font-600 text-gold">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate font-600 text-navy">{displayName}</div>
            <div className="flex items-center gap-1 text-xs text-ink-muted">
              Investor Member
              {profile?.verified && <span className="ml-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-600 text-success">Verified</span>}
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-3 rounded-xl border border-hairline bg-surface p-2 text-sm">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-ink transition-colors hover:bg-surface-alt"
            activeProps={{ className: "bg-navy/5 text-navy font-600 border-l-2 border-navy" }}
          >
            <Icon className="size-4" strokeWidth={1.75} /> {label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" className="mt-1 flex items-center gap-2.5 rounded-md border-t border-hairline px-3 py-2 pt-3 text-navy font-600 hover:bg-surface-alt">
            <ShieldCheck className="size-4" /> Admin Panel
          </Link>
        )}
        <button onClick={signOut} className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-ink hover:bg-surface-alt">
          <LogOut className="size-4" /> Log Out
        </button>
      </nav>
    </aside>
  );
}