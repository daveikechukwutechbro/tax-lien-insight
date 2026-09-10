import { Link } from "@tanstack/react-router";
import { Bell, ChevronDown, Landmark, Menu } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { isAdminQuery } from "@/lib/queries/dashboard";
import { ProfileMenu } from "@/components/site/profile-menu";
import { Sheet, SheetTrigger, SheetContent, SheetOverlay, SheetClose } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/auctions", label: "Auctions" },
  { to: "/states", label: "By State" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/resources", label: "Resources" },
  { to: "/help", label: "Help" },
  { to: "/about", label: "About Us" },
  { to: "/admin", label: "Admin", adminOnly: true },
];

export function SiteHeader() {
  const { user, loading } = useSession();
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id));

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-tight flex h-16 items-center gap-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-navy text-gold">
            <Landmark className="size-5" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-700 tracking-tight text-navy">
              Auction<span className="text-gold">Ledger</span>
            </span>
            <span className="mt-0.5 text-[9px] font-600 uppercase tracking-[0.28em] text-ink-muted">
              Tax Lien Auctions
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav
            .filter((item) => !(item.adminOnly && !isAdmin))
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-500 text-ink transition-colors hover:text-navy ${item.adminOnly ? "text-navy" : ""}`}
                activeProps={{ className: "text-navy" }}
              >
                {item.label}
              </Link>
            ))}
          {!loading && user && (
            <Link
              to="/dashboard"
              className="text-sm font-500 text-ink transition-colors hover:text-navy"
              activeProps={{ className: "text-navy" }}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet>
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
            <SheetContent side="left" className="w-[260px]">
              <nav className="flex h-[calc(100vh-4rem)] flex-col gap-1 py-4">
                {nav
                  .filter((item) => !(item.adminOnly && !isAdmin))
                  .map((item) => (
                    <SheetClose key={item.to} asChild>
                      <Link
                        to={item.to}
                        className="flex items-center gap-3 rounded-md border-b border-hairline px-4 py-3 text-sm font-500 text-ink transition-colors hover:bg-surface-alt"
                        activeProps={{ className: "text-navy" }}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                {!loading && user && (
                  <SheetClose asChild>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 rounded-md border-b border-hairline px-4 py-3 text-sm font-500 text-ink transition-colors hover:bg-surface-alt"
                      activeProps={{ className: "text-navy" }}
                    >
                      Dashboard
                    </Link>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="ml-auto flex items-center gap-5">
          {loading ? null : user ? (
            <>
              <button
                type="button"
                aria-label="Notifications"
                className="relative hidden items-center gap-2 text-sm text-ink transition-colors hover:text-navy sm:flex"
              >
                <Bell className="size-5" strokeWidth={1.75} />
              </button>
              <ProfileMenu
                trigger={
                  <button className="flex items-center gap-2 text-sm text-ink hover:text-navy sm:flex">
                    <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-600 text-gold">
                      {(user.email ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden md:inline">{user.email?.split("@")[0]}</span>
                    <ChevronDown className="size-4" />
                  </button>
                }
              />
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden text-sm font-500 text-ink hover:text-navy sm:inline"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center rounded-md bg-gold px-4 py-2 text-sm font-600 text-navy shadow-sm transition-colors hover:bg-gold-soft"
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
