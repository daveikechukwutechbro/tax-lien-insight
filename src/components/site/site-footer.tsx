import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline bg-navy-deep text-primary-foreground">
      <div className="container-tight grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="font-display text-lg font-600">
            Chicago<span className="text-gold">TaxLien</span> Auctions
          </div>
          <p className="max-w-xs text-sm text-primary-foreground/70">
            The transparent multi-state marketplace for tax lien certificates.
            Registered bidders only. Not financial advice.
          </p>
        </div>
        <FooterCol
          title="Marketplace"
          links={[
            { to: "/auctions", label: "Upcoming auctions" },
            { to: "/search", label: "Search properties" },
            { to: "/resources", label: "Interest rates by state" },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { to: "/how-it-works", label: "How it works" },
            { to: "/resources", label: "Investor guides" },
            { to: "/about", label: "About us" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: "/auth", label: "Log in" },
            { to: "/auth", label: "Create account" },
            { to: "/resources", label: "Contact support" },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="container-tight flex flex-col items-start justify-between gap-2 py-5 text-xs text-primary-foreground/60 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Chicago TaxLien Auctions. All rights reserved.</p>
          <p>Licensed in participating US jurisdictions. Bidding subject to county rules.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-600 uppercase tracking-[0.22em] text-gold">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="text-sm text-primary-foreground/80 transition-colors hover:text-gold"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}