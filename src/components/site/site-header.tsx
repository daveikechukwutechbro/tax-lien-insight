import { Link } from "@tanstack/react-router";
import { Bell, ChevronDown, Landmark, LogOut } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

const nav = [
  { to: "/auctions", label: "Auctions" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/resources", label: "Resources" },
  { to: "/about", label: "About Us" },
] as const;

export function SiteHeader() {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
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
        </nav>

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
              <div className="hidden items-center gap-2 text-sm text-ink sm:flex">
                <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-600 text-gold">
                  {(user.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden md:inline">
                  {user.email?.split("@")[0]}
                </span>
                <ChevronDown className="size-4" />
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-sm font-500 text-ink hover:border-navy hover:text-navy"
              >
                <LogOut className="size-4" /> Sign out
              </button>
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