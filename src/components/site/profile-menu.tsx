import { Link } from "@tanstack/react-router";
import {
  Activity, Bell, Bookmark, Gavel, LayoutDashboard, LogOut, ShieldCheck, User, Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Bidder";
  const email = user?.email ?? "";
  const initials = displayName.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();

  async function signOut() {
    await qc.cancelQueries().catch(() => {});
    qc.clear();
    const pendingLogout = logout();
    if (router.state.location.pathname !== "/") {
      await router.navigate({ to: "/", replace: true });
    }
    emitAuthChange();
    await pendingLogout.catch(() => {});
    await router.invalidate().catch(() => {});
  }

  const close = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-2 py-2">
          <div className="flex items-center gap-2.5">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-600 text-gold">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-600 text-navy">{displayName}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs font-normal text-ink-muted">
                {email}
                {profile?.verified && (
                  <span className="rounded bg-success-soft px-1 py-0.5 text-[10px] font-600 text-success">Verified</span>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard/profile" className="flex items-center gap-2">
            <User className="size-4" /> Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/auctions" className="flex items-center gap-2">
            <Gavel className="size-4" /> Auctions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard/activity" className="flex items-center gap-2">
            <Activity className="size-4" /> My Activity
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard/notifications" className="flex items-center gap-2">
            <Bell className="size-4" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard/watched" className="flex items-center gap-2">
            <Bookmark className="size-4" /> Watched Properties
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={close}>
          <Link to="/dashboard/funds" className="flex items-center gap-2">
            <Wallet className="size-4" /> Account Funds
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild onClick={close}>
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