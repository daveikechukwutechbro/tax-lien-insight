import { Link } from "@tanstack/react-router";
import {
  Activity, Bell, Bookmark, Image, LayoutDashboard, LogOut, Settings, ShieldCheck, User, Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { logout, emitAuthChange } from "@/lib/backend-auth";
import { isAdminQuery, profileQuery } from "@/lib/queries/dashboard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function ProfileMenu({ trigger }: { trigger: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id));

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Bidder";
  const email = user?.email ?? "";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await logout();
    emitAuthChange();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="truncate text-sm font-600 text-navy">{displayName}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs font-normal text-ink-muted">
            {email}
            {profile?.verified && (
              <span className="rounded bg-success-soft px-1 py-0.5 text-[10px] font-600 text-success">Verified</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center gap-2">
            <User className="size-4" /> View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center gap-2">
            <Settings className="size-4" /> Edit Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center gap-2">
            <Image className="size-4" /> Upload Photo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/activity" className="flex items-center gap-2">
            <Activity className="size-4" /> My Activity
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/notifications" className="flex items-center gap-2">
            <Bell className="size-4" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/watched" className="flex items-center gap-2">
            <Bookmark className="size-4" /> Watched Properties
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/funds" className="flex items-center gap-2">
            <Wallet className="size-4" /> Account Funds
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}