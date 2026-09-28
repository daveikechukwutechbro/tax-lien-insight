import { Link, useLocation } from "@tanstack/react-router";
import { Bell, ChevronDown, Landmark, Menu } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { isAdminQuery, profileQuery, unreadNotificationsQuery } from "@/lib/queries/dashboard";
import { ProfileMenu } from "@/components/site/profile-menu";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Sheet, SheetTrigger, SheetContent, SheetOverlay, SheetClose } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/auctions", label: "Auctions" },
  { to: "/states", label: "By State" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/admin", label: "Admin", adminOnly: true },
];

const linkCls =
  "relative text-sm font-500 text-ink-muted transition-colors hover:text-navy active:top-px";
const linkActive = "text-navy font-600";

export function SiteHeader() {
  const { user, loading } = useSession();
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id));
  const { data: unread } = useQuery(unreadNotificationsQuery(user?.id));
  const { data: profile } = useQuery(profileQuery(user?.id));

  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.href]);

  const initials = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-tight flex h-14 items-center gap-3 sm:gap-4 md:h-16 lg:gap-8">
        <Link to={user ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-navy text-gold">
            <Landmark className="size-5" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-700 tracking-tight text-navy">
              Auction<span className="text-gold">Ledger</span>
            </span>
            <span className="mt-0.5 hidden text-[9px] font-600 uppercase tracking-[0.28em] text-ink-muted sm:block">
              Tax Lien Auctions
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 border-l border-hairline pl-6 lg:flex">
          {nav
            .filter((item) => !(item.adminOnly && !isAdmin))
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${linkCls} ${item.adminOnly ? "text-navy" : ""}`}
                activeProps={{ className: linkActive }}
              >
                {item.label}
              </Link>
            ))}
          {!loading && user && (
            <Link
              to="/dashboard"
              className={linkCls}
              activeProps={{ className: linkActive }}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Mobile / tablet menu */}
        <div className="lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="grid size-10 place-items-center rounded-md border border-hairline bg-surface text-ink hover:bg-surface-alt"
              >
                <Menu className="size-5" strokeWidth={1.75} />
              </button>
            </SheetTrigger>
            <SheetOverlay />
            <SheetContent side="left" className="w-[280px] overflow-y-auto">
              {!loading && !user && (
                <div className="space-y-2 px-4 pb-4 pt-6">
                  <SheetClose asChild>
                    <Link
                      to="/auth"
                      className="block w-full rounded-md border border-hairline bg-surface px-4 py-2.5 text-center text-sm font-600 text-navy transition-colors hover:bg-surface-alt"
                    >
                      Log in
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/auth"
                      search={{ mode: "signup" }}
                      className="block w-full rounded-md bg-gold px-4 py-2.5 text-center text-sm font-600 text-navy"
                    >
                      Create Account
                    </Link>
                  </SheetClose>
                </div>
              )}
              <nav className="flex flex-col gap-1 py-4">
                {nav
                  .filter((item) => !(item.adminOnly && !isAdmin))
                  .map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className="rounded-md px-4 py-3 text-sm font-500 text-ink transition-colors hover:bg-surface-alt"
                        activeProps={{ className: "bg-navy/5 text-navy font-600" }}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                {!loading && user && (
                  <SheetClose asChild>
                    <Link
                      to="/dashboard"
                      className="rounded-md px-4 py-3 text-sm font-500 text-ink transition-colors hover:bg-surface-alt"
                      activeProps={{ className: "bg-navy/5 text-navy font-600" }}
                    >
                      Dashboard
                    </Link>
                  </SheetClose>
                )}
              </nav>
              <div className="border-t border-hairline p-4">
                <SheetClose asChild>
                  <Link
                    to="/about"
                    className="flex items-center gap-2 text-sm font-500 text-ink-muted transition-colors hover:text-navy"
                  >
                    About Us
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/help"
                    className="mt-3 flex items-center gap-2 text-sm font-500 text-ink-muted transition-colors hover:text-navy"
                  >
                    Help &amp; Support
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:gap-5">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <Link
                to="/dashboard/notifications"
                aria-label="Notifications"
                className="relative hidden items-center gap-2 rounded-md p-1.5 text-ink-muted transition-colors hover:text-navy sm:flex"
              >
                <Bell className="size-5" strokeWidth={1.75} />
                {typeof unread === "number" && unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-700 leading-[18px] text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <ProfileMenu
                trigger={
                  <button className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface p-0.5 text-ink transition-colors hover:border-navy/40 hover:bg-surface-alt sm:gap-2 sm:pr-2.5">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="" className="size-8 rounded-full object-cover md:size-7" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-600 text-gold md:size-7">
                        {initials}
                      </span>
                    )}
                    <span className="hidden max-w-[9rem] truncate text-navy md:inline">
                      {user.email?.split("@")[0]}
                    </span>
                    <ChevronDown className="hidden size-4 text-ink-muted md:block" />
                  </button>
                }
              />
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden text-sm font-500 text-ink-muted transition-colors hover:text-navy lg:inline-block"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="hidden whitespace-nowrap items-center rounded-md bg-gold px-4 py-2 text-sm font-600 text-navy shadow-sm transition-colors hover:bg-gold-soft lg:inline-flex"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}