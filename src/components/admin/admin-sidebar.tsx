import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Gavel,
  FileText,
  Home,
  MapPin,
  Activity,
  Wallet,
  ClipboardCheck,
  BadgeCheck,
  Users,
  Files,
  SlidersHorizontal,
  FileEdit,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

type Item = { to: string; label: string; icon: LucideIcon; exact?: boolean };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Listings",
    items: [
      { to: "/admin/auctions", label: "Auctions", icon: Gavel },
      { to: "/admin/liens", label: "Liens", icon: FileText },
      { to: "/admin/properties", label: "Properties", icon: Home },
      { to: "/admin/counties", label: "Counties", icon: MapPin },
    ],
  },
  {
    label: "Funding",
    items: [
      { to: "/admin/bids", label: "Bids", icon: Activity },
      { to: "/admin/funds", label: "Fund Requests", icon: Wallet },
      { to: "/admin/registrations", label: "Registrations", icon: ClipboardCheck },
    ],
  },
  {
    label: "Verification",
    items: [
      { to: "/admin/kyc", label: "KYC Review", icon: BadgeCheck },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/documents", label: "Documents", icon: Files },
    ],
  },
  {
    label: "Content & Site",
    items: [
      { to: "/admin/content/settings", label: "Settings", icon: SlidersHorizontal },
      { to: "/admin/content/pages", label: "Pages", icon: FileEdit },
    ],
  },
  {
    label: "System",
    items: [{ to: "/admin/audit", label: "Audit Log", icon: ScrollText }],
  },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1.5 text-[10px] font-600 uppercase tracking-widest text-ink-muted">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                activeOptions={{ exact }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-500 text-ink transition-colors hover:bg-surface-alt hover:text-navy"
                activeProps={{
                  className: "bg-navy text-white shadow-sm hover:bg-navy hover:text-white font-600",
                }}
              >
                <Icon className="size-4" strokeWidth={2} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}