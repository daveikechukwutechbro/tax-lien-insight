import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  Landmark,
  LogOut,
  Menu,
  User,
  Settings,
  Image,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/firebase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { isAdminQuery } from "@/lib/queries/dashboard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetOverlay,
  SheetClose,
} from "@/components/ui/sheet";

const nav = [
  { to: "/auctions", label: "Auctions" },
  { to: "/states", label: "By State" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/resources", label: "Resources" },
  { to: "/help", label: "Help" },
  { to: "/about", label: "About Us" },
] as const;

export function SiteHeader() {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id));

  async function signOut() {
    await queryClient.cancelQueries();
    await supabase.auth.signOut();
    queryClient.removeQueries();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-tight flex h-16 items-center gap-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-navy text-gold">
            <Landmark className="size-5" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-700 tracking-tight text-navy">
              Chicago<span className="text-gold">TaxLien</span>
            </span>
            <span className="mt-0.5 text-[9px] font-600 uppercase tracking-[0.28em] text-ink-muted">
              Auctions
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-500 text-ink transition-colors hover:text-navy"
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
                {nav.map((item) => (
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-ink hover:text-navy sm:flex">
                    <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-600 text-gold">
                      {(user.email ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden md:inline">{user.email?.split("@")[0]}</span>
                    <ChevronDown className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-ink-muted">
                    Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="flex items-center gap-2">
                      <User className="size-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="flex items-center gap-2">
                      <Settings className="size-4" /> Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <ShieldCheck className="size-4" /> Admin panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Image className="size-4" /> Upload Photo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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