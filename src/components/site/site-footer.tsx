import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useSiteContent } from "@/lib/site-content";
import { BrandName } from "@/components/site/site-header";

type FooterLink = { to: string; label: string; column?: string };

function isExternal(to: string) {
  return /^https?:\/\//.test(to) || to.startsWith("mailto:");
}

function FooterAnchor({ to, label }: FooterLink) {
  const cls = "text-sm text-primary-foreground/80 transition-colors hover:text-gold";
  if (isExternal(to)) {
    return (
      <a
        href={to}
        className={cls}
        target={to.startsWith("http") ? "_blank" : undefined}
        rel={to.startsWith("http") ? "noreferrer" : undefined}
      >
        {label}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  const { user, loading } = useSession();
  const {
    siteName,
    footerBlurb,
    footerLegal,
    twitterUrl,
    facebookUrl,
    instagramUrl,
    linkedinUrl,
    youtubeUrl,
  } = useSiteContent("settings");
  const { footerLinks, footerColMarketplace, footerColLearn, footerColAccount } =
    useSiteContent("navigation");
  const signedIn = !loading && !!user;
  const accountLinks: FooterLink[] = signedIn
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/dashboard/profile", label: "My Profile" },
        { to: "/dashboard/watched", label: "Watched Properties" },
        { to: "/support", label: "Contact support" },
      ]
    : [
        { to: "/auth", label: "Log in" },
        { to: "/auth", label: "Create account" },
        { to: "/support", label: "Contact support" },
      ];

  const links = (footerLinks as FooterLink[]).filter((l) => l.label && l.to);
  const marketplaceLinks = links.filter((l) => l.column === "marketplace");
  const learnLinks = links.filter((l) => l.column === "learn");

  const socials: { label: string; url: string; Icon: LucideIcon }[] = [
    { label: "X / Twitter", url: twitterUrl, Icon: Twitter },
    { label: "Facebook", url: facebookUrl, Icon: Facebook },
    { label: "Instagram", url: instagramUrl, Icon: Instagram },
    { label: "LinkedIn", url: linkedinUrl, Icon: Linkedin },
    { label: "YouTube", url: youtubeUrl, Icon: Youtube },
  ].filter((s) => s.url && s.url.trim() !== "");

  return (
    <footer className="mt-16 border-t border-hairline bg-navy-deep text-primary-foreground">
      <div className="container-tight grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="font-display text-lg font-600 text-primary-foreground">
            <BrandName name={siteName} />
          </div>
          <p className="max-w-xs text-sm text-primary-foreground/70">{footerBlurb}</p>
          {socials.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              {socials.map(({ label, url, Icon }) => (
                <a
                  key={label}
                  href={url}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-foreground/70 transition-colors hover:text-gold"
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          )}
        </div>
        <FooterCol title={footerColMarketplace} links={marketplaceLinks} />
        <FooterCol title={footerColLearn} links={learnLinks} />
        <FooterCol title={footerColAccount} links={accountLinks} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-tight flex flex-col items-start justify-between gap-2 py-5 text-xs text-primary-foreground/60 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <p>{footerLegal}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-600 uppercase tracking-[0.22em] text-gold">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={`${l.to}-${l.label}`}>
            <FooterAnchor to={l.to} label={l.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}
