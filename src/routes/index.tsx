import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Tag,
  MapPin,
  DollarSign,
  Gavel,
  Users2,
  Check,
  Search,
  SlidersHorizontal,
  Eye,
  ShieldCheck,
  ChevronDown,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Upcoming Tax Lien Auction — Chicago TaxLien Auctions" },
      {
        name: "description",
        content:
          "150 properties across 12 counties scheduled for the next multi-state tax lien auction. Register now to bid on secured tax lien certificates.",
      },
      { property: "og:title", content: "Upcoming Tax Lien Auction" },
      {
        property: "og:description",
        content:
          "Browse 150 scheduled properties across 12 counties. Register to bid on tax lien certificates yielding up to 18%.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

// Mock data — Phase 2 replaces with server functions + database.
const AUCTION_DATE = new Date("2026-08-14T14:00:00Z"); // 10:00 AM EST

type ScheduledProperty = {
  id: string;
  address: string;
  cityState: string;
  type: string;
  propertyType: "Residential" | "Land" | "Commercial";
  county: string;
  parcelId: string;
  taxesOwed: number;
  interestRate: number;
  minBid: number;
  status: "Upcoming" | "Live" | "Closed";
  image: string;
};

const PROPERTIES: ScheduledProperty[] = [
  {
    id: "P-0010",
    address: "123 Oak Street",
    cityState: "Anytown, FL 32101",
    type: "Single Family Residence",
    propertyType: "Residential",
    county: "Franklin",
    parcelId: "22-05-17-1234-0000-0010",
    taxesOwed: 5642.18,
    interestRate: 15,
    minBid: 5642.18,
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=240&q=60",
  },
  {
    id: "P-0020",
    address: "456 Maple Avenue",
    cityState: "Anytown, FL 32102",
    type: "Single Family Residence",
    propertyType: "Residential",
    county: "Franklin",
    parcelId: "22-05-17-1234-0000-0020",
    taxesOwed: 3210.75,
    interestRate: 15,
    minBid: 3210.75,
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=240&q=60",
  },
  {
    id: "P-0030",
    address: "789 Pine Road",
    cityState: "Anytown, FL 32103",
    type: "Vacant Land",
    propertyType: "Land",
    county: "Franklin",
    parcelId: "22-05-17-1234-0000-0030",
    taxesOwed: 8987.64,
    interestRate: 15,
    minBid: 8987.64,
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=240&q=60",
  },
  {
    id: "P-0040",
    address: "321 Cedar Lane",
    cityState: "Anytown, FL 32104",
    type: "Single Family Residence",
    propertyType: "Residential",
    county: "Franklin",
    parcelId: "22-05-17-1234-0000-0040",
    taxesOwed: 2150.0,
    interestRate: 15,
    minBid: 2150.0,
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=240&q=60",
  },
  {
    id: "P-0050",
    address: "654 Birch Boulevard",
    cityState: "Anytown, FL 32105",
    type: "Single Family Residence",
    propertyType: "Residential",
    county: "Franklin",
    parcelId: "22-05-17-1234-0000-0050",
    taxesOwed: 4875.9,
    interestRate: 15,
    minBid: 4875.9,
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=240&q=60",
  },
];

function HomePage() {
  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-10">
        <HeroRow />
        <StatsRow />
        <FilterBar />
        <PropertyTable />
        <RegisterBanner />
      </div>
    </div>
  );
}

function HeroRow() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-end">
      <div>
        <h1 className="font-display text-4xl font-600 tracking-tight text-navy sm:text-5xl">
          Upcoming Tax Lien Auction
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-muted">
          These properties are scheduled for auction. Register now and be ready to bid
          on secured tax lien certificates.
        </p>
      </div>
      <HeroCard
        icon={<CalendarDays className="size-6 text-navy" strokeWidth={1.75} />}
        label="Auction Date"
        primary={AUCTION_DATE.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        secondary="10:00 AM (EST)"
      />
      <CountdownCard />
    </section>
  );
}

function HeroCard({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-surface px-5 py-4 shadow-sm">
      <div className="grid size-11 place-items-center rounded-lg bg-navy/5">{icon}</div>
      <div>
        <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">
          {label}
        </div>
        <div className="font-display text-lg font-600 text-navy leading-tight">
          {primary}
        </div>
        <div className="text-xs text-ink-muted">{secondary}</div>
      </div>
    </div>
  );
}

function CountdownCard() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, AUCTION_DATE.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-surface px-5 py-4 shadow-sm">
      <div className="grid size-11 place-items-center rounded-lg bg-navy/5">
        <Clock className="size-6 text-navy" strokeWidth={1.75} />
      </div>
      <div>
        <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">
          Auction Starts In
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5 font-display text-2xl font-600 tabular-nums text-destructive">
          <TimePart n={days} />
          <Sep />
          <TimePart n={hrs} />
          <Sep />
          <TimePart n={mins} />
          <Sep />
          <TimePart n={secs} />
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1.5 text-[10px] font-600 uppercase tracking-wider text-ink-muted">
          <span>Days</span>
          <span>Hrs</span>
          <span>Mins</span>
          <span>Secs</span>
        </div>
      </div>
    </div>
  );
}

function TimePart({ n }: { n: number }) {
  return <span className="min-w-[2ch] text-center">{String(n).padStart(2, "0")}</span>;
}
function Sep() {
  return <span className="text-destructive/60">:</span>;
}

function StatsRow() {
  return (
    <section className="mt-6 grid gap-4 rounded-xl border border-hairline bg-surface p-6 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={<Tag className="size-6" strokeWidth={1.5} />}
          value="150"
          label={<>Properties<br />Scheduled</>}
        />
        <Stat
          icon={<MapPin className="size-6" strokeWidth={1.5} />}
          value="12"
          label={<>Counties<br />Included</>}
        />
        <Stat
          icon={<DollarSign className="size-6" strokeWidth={1.5} />}
          value="$785,420.00"
          label="Total Taxes Owed"
        />
        <Stat
          icon={<Gavel className="size-6" strokeWidth={1.5} />}
          value="Aug 14, 2026"
          label="Auction Date"
        />
        <Stat
          icon={<Users2 className="size-6" strokeWidth={1.5} />}
          value="248"
          label={<>Registered<br />Bidders</>}
        />
      </div>
      <WhyInvestCard />
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-navy/60">{icon}</div>
      <div>
        <div className="font-display text-xl font-600 text-navy leading-tight">
          {value}
        </div>
        <div className="mt-0.5 text-xs leading-tight text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function WhyInvestCard() {
  const items = [
    "Earn interest up to 18% or more",
    "Secured by real estate",
    "Low investment minimums",
    "Potential for high returns",
  ];
  return (
    <div className="rounded-lg bg-navy-deep p-5 text-primary-foreground lg:w-[300px]">
      <div className="text-sm font-600 text-gold">Why Invest in Tax Liens?</div>
      <ul className="mt-3 space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-xs text-primary-foreground/85">
            <Check className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={2.5} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/resources"
        className="mt-3 inline-flex items-center gap-1 text-xs font-500 text-gold hover:underline"
      >
        Learn More <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function FilterBar() {
  return (
    <section className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
      <div className="relative min-w-[280px] flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Search by Address, City, County or Parcel ID..."
          className="h-10 w-full rounded-md border border-hairline bg-surface pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </div>
      <SelectPill label="All Counties" />
      <SelectPill label="All Property Types" />
      <SelectPill label="All Amounts" />
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline px-3 text-sm font-500 text-ink hover:border-navy hover:text-navy"
      >
        <SlidersHorizontal className="size-4" />
        More Filters
      </button>
      <button
        type="button"
        className="ml-auto inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-600 text-primary-foreground shadow-sm transition-colors hover:bg-navy-deep"
      >
        Apply Filters
      </button>
    </section>
  );
}

function SelectPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 min-w-[170px] items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-3 text-sm text-ink hover:border-navy"
    >
      <span>{label}</span>
      <ChevronDown className="size-4 text-ink-muted" />
    </button>
  );
}

function PropertyTable() {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-600 text-navy">
        Scheduled Properties ({PROPERTIES.length})
      </h2>
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-alt text-left text-xs font-600 uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3">Property Details</th>
                <th className="px-3 py-3">County</th>
                <th className="px-3 py-3">Parcel ID</th>
                <th className="px-3 py-3 text-right">Taxes Owed</th>
                <th className="px-3 py-3 text-right">
                  <span className="inline-flex items-center gap-1">
                    Interest Rate <Info className="size-3.5 text-ink-muted/70" />
                  </span>
                </th>
                <th className="px-3 py-3 text-right">Min. Bid</th>
                <th className="px-3 py-3">Property Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {PROPERTIES.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-hairline/60 last:border-b-0 hover:bg-surface-alt/60"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={`${p.address} exterior`}
                        loading="lazy"
                        className="size-12 rounded-md object-cover"
                      />
                      <div>
                        <div className="font-600 text-navy">{p.address}</div>
                        <div className="text-xs text-ink-muted">{p.cityState}</div>
                        <div className="text-xs text-ink-muted">{p.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-ink">{p.county}</td>
                  <td className="px-3 py-4 font-mono text-xs text-ink-muted">
                    {p.parcelId}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums text-ink">
                    {fmt(p.taxesOwed)}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums text-ink">
                    {p.interestRate.toFixed(2)}%
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums font-600 text-navy">
                    {fmt(p.minBid)}
                  </td>
                  <td className="px-3 py-4 text-ink">{p.propertyType}</td>
                  <td className="px-3 py-4">
                    <span className="inline-flex items-center rounded-full bg-navy/5 px-2.5 py-1 text-xs font-500 text-navy">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Link
                      to="/properties/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-500 text-ink transition-colors hover:border-navy hover:text-navy"
                    >
                      <Eye className="size-3.5" /> View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RegisterBanner() {
  return (
    <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-gold-soft bg-gold-soft/40 p-6 sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-gold text-navy">
          <ShieldCheck className="size-6" strokeWidth={1.75} />
        </div>
        <div>
          <div className="font-display text-lg font-600 text-navy">
            Register now to participate in the auction.
          </div>
          <p className="text-sm text-ink-muted">
            Create an account, add funds, and be ready to bid when the auction goes live.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/auth"
          className="inline-flex items-center rounded-md bg-navy px-5 py-2.5 text-sm font-600 text-primary-foreground hover:bg-navy-deep"
        >
          Create Account
        </Link>
        <Link
          to="/how-it-works"
          className="inline-flex items-center rounded-md border border-navy/20 bg-surface px-5 py-2.5 text-sm font-600 text-navy hover:border-navy"
        >
          How It Works
        </Link>
      </div>
    </section>
  );
}
