import { Link } from "@tanstack/react-router";
import { Bell, ChevronDown, Landmark } from "lucide-react";

const nav = [
  { to: "/auctions", label: "Auctions" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/resources", label: "Resources" },
  { to: "/about", label: "About Us" },
] as const;

export function SiteHeader() {
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
          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden items-center gap-2 text-sm text-ink transition-colors hover:text-navy sm:flex"
          >
            <span className="relative">
              <Bell className="size-5" strokeWidth={1.75} />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-600 text-primary-foreground">
                2
              </span>
            </span>
            <span className="hidden lg:inline">Notifications</span>
          </button>

          <button
            type="button"
            className="hidden items-center gap-1 text-sm text-ink transition-colors hover:text-navy sm:flex"
          >
            My Account
            <ChevronDown className="size-4" />
          </button>

          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-gold px-4 py-2 text-sm font-600 text-navy shadow-sm transition-colors hover:bg-gold-soft"
          >
            Log In
          </Link>
        </div>
      </div>
    </header>
  );
}