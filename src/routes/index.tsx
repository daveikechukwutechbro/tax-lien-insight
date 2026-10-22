import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { scheduledAuctionQuery, type ScheduledPropertyRow } from "@/lib/queries/auctions";
import { loaderPrefetch } from "@/lib/queries/prefetch";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSession } from "@/hooks/use-session";
import { useSiteContent } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { BACKEND_URL } from "@/lib/backend-proxy";
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
  Eye,
  ShieldCheck,
  Info,
  ArrowRight,
} from "lucide-react";

const DEFAULT_HOME_SEO = {
  seoTitle: "Upcoming Tax Lien Auction — Auction Ledger",
  seoDescription:
    "Browse upcoming multi-state tax lien auctions. Register to bid on secured tax lien certificates.",
};

type HomeHeadData = { seoTitle: string; seoDescription: string };

async function fetchHomeSeo(queryClient: QueryClient): Promise<HomeHeadData> {
  try {
    const isServer = typeof window === "undefined";
    const url = isServer ? `${BACKEND_URL}/api/v1/site-content/home` : "/api/v1/site-content/home";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(isServer ? 1500 : 6000),
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { slug?: string; body?: Record<string, unknown>; updatedAt?: string | null };
      };
      const data = json.data;
      if (data && typeof data.body === "object" && data.body !== null) {
        // Seed the content query so useSiteContent("home") doesn't refetch.
        queryClient.setQueryData(["site-content", "home"], {
          slug: "home",
          body: data.body,
          updatedAt: data.updatedAt ?? null,
        });
        const b = data.body as { seoTitle?: unknown; seoDescription?: unknown };
        return {
          seoTitle:
            typeof b.seoTitle === "string" && b.seoTitle.trim()
              ? b.seoTitle
              : DEFAULT_HOME_SEO.seoTitle,
          seoDescription:
            typeof b.seoDescription === "string" && b.seoDescription.trim()
              ? b.seoDescription
              : DEFAULT_HOME_SEO.seoDescription,
        };
      }
    }
  } catch {
    // timeout/offline — fall through to defaults
  }
  return DEFAULT_HOME_SEO;
}

export const Route = createFileRoute("/")({
  pendingMs: 300,
  pendingComponent: () => <PageSkeleton rows={6} />,
  loader: async ({ context }) => {
    // SSR fetch of the admin-edited home SEO so Google reads the copy the
    // admin typed in Content → Pages → Home, not a hardcoded string.
    const seo = await fetchHomeSeo(context.queryClient);
    await loaderPrefetch(() => context.queryClient.ensureQueryData(scheduledAuctionQuery))();
    return { seo };
  },
  head: ({ loaderData }) => {
    const { seoTitle, seoDescription } = loaderData?.seo ?? DEFAULT_HOME_SEO;
    return {
      meta: [
        { title: seoTitle },
        { name: "description", content: seoDescription },
        { property: "og:title", content: seoTitle },
        { property: "og:description", content: seoDescription },
        { property: "og:url", content: "/" },
      ],
      links: [{ rel: "canonical", href: "/" }],
    };
  },
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="container-tight py-20 text-center">
      <h1 className="font-display text-2xl font-600 text-navy">We couldn't load auctions</h1>
      <p className="mt-2 text-sm text-ink-muted">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-tight py-20 text-center">
      <h1 className="font-display text-2xl font-600 text-navy">No auctions scheduled</h1>
    </div>
  ),
});

function HomePage() {
  const { data, isPending, isError, refetch } = useQuery(scheduledAuctionQuery);
  const content = useSiteContent("home");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  if (isPending && !data) return <PageSkeleton rows={6} />;

  if (isError && !data) {
    return (
      <div className="container-tight py-20 text-center">
        <h1 className="font-display text-2xl font-600 text-navy">
          We couldn't load upcoming auctions
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Something went wrong on our end. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 inline-flex items-center rounded-md bg-navy px-5 py-2.5 text-sm font-600 text-primary-foreground shadow-sm transition-colors hover:bg-navy-deep"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return <PageSkeleton rows={6} />;
  const auctionDate = data.nextStartsAt ? new Date(data.nextStartsAt) : null;
  const properties = applyFilters(data.properties, filters);
  const filtersActive =
    filters.search.trim() !== "" ||
    filters.county !== "" ||
    filters.type !== "" ||
    filters.amount !== "";

  return (
    <div className="bg-background pb-16">
      <PageSeo title={content.seoTitle} description={content.seoDescription} />
      <div className="container-tight pt-10">
        <HeroRow
          auctionDate={auctionDate}
          showAuctionDate={content.showAuctionDate}
          showCountdown={content.showCountdown}
        />
        {content.showStats && (
          <StatsRow
            totalProperties={data.totalProperties}
            totalCounties={data.totalCounties}
            totalTaxesOwed={data.totalTaxesOwed}
            auctionDate={auctionDate}
          />
        )}
        {content.showFilterBar && (
          <FilterBar properties={data.properties} filters={filters} onChange={setFilters} />
        )}
        <PropertyTable properties={properties} filtersActive={filtersActive} />
        {content.showRegisterBanner && <RegisterBanner />}
      </div>
    </div>
  );
}

type Filters = { search: string; county: string; type: string; amount: string };
const EMPTY_FILTERS: Filters = { search: "", county: "", type: "", amount: "" };

const AMOUNT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Amounts" },
  { value: "lt5", label: "Under $5,000" },
  { value: "5to15", label: "$5,000 – $15,000" },
  { value: "gt15", label: "Over $15,000" },
];

function applyFilters(rows: ScheduledPropertyRow[], f: Filters): ScheduledPropertyRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((p) => {
    if (q) {
      const haystack =
        `${p.address} ${p.city} ${p.state} ${p.zip} ${p.county} ${p.parcel_id}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.county && p.county !== f.county) return false;
    if (f.type && p.property_type !== f.type) return false;
    if (f.amount) {
      const dollars = p.taxes_owed / 100;
      if (f.amount === "lt5" && dollars >= 5000) return false;
      if (f.amount === "5to15" && (dollars < 5000 || dollars > 15000)) return false;
      if (f.amount === "gt15" && dollars <= 15000) return false;
    }
    return true;
  });
}

function HeroRow({
  auctionDate,
  showAuctionDate,
  showCountdown,
}: {
  auctionDate: Date | null;
  showAuctionDate: boolean;
  showCountdown: boolean;
}) {
  const { heroTitle, heroSubtitle } = useSiteContent("home");
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-end">
      <div>
        <h1 className="font-display text-4xl font-600 tracking-tight text-navy sm:text-5xl">
          {heroTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-muted">{heroSubtitle}</p>
      </div>
      {auctionDate && showAuctionDate && (
        <HeroCard
          icon={<CalendarDays className="size-6 text-navy" strokeWidth={1.75} />}
          label="Auction Date"
          primary={auctionDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          secondary={auctionDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
            timeZone: "America/New_York",
          })}
        />
      )}
      {auctionDate && showCountdown && <CountdownCard target={auctionDate} />}
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
        <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">{label}</div>
        <div className="font-display text-lg font-600 text-navy leading-tight">{primary}</div>
        <div className="text-xs text-ink-muted">{secondary}</div>
      </div>
    </div>
  );
}

function CountdownCard({ target }: { target: Date }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = hydrated ? Math.max(0, target.getTime() - now) : 0;
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

function StatsRow({
  totalProperties,
  totalCounties,
  totalTaxesOwed,
  auctionDate,
}: {
  totalProperties: number;
  totalCounties: number;
  totalTaxesOwed: number;
  auctionDate: Date | null;
}) {
  const money = (totalTaxesOwed / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <section className="mt-6 grid gap-4 rounded-xl border border-hairline bg-surface p-6 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={<Tag className="size-6" strokeWidth={1.5} />}
          value={String(totalProperties)}
          label={
            <>
              Properties
              <br />
              Scheduled
            </>
          }
        />
        <Stat
          icon={<MapPin className="size-6" strokeWidth={1.5} />}
          value={String(totalCounties)}
          label={
            <>
              Counties
              <br />
              Included
            </>
          }
        />
        <Stat
          icon={<DollarSign className="size-6" strokeWidth={1.5} />}
          value={money}
          label="Total Taxes Owed"
        />
        <Stat
          icon={<Gavel className="size-6" strokeWidth={1.5} />}
          value={
            auctionDate
              ? auctionDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "TBD"
          }
          label="Auction Date"
        />
        <Stat
          icon={<Users2 className="size-6" strokeWidth={1.5} />}
          value="—"
          label={
            <>
              Registered
              <br />
              Bidders
            </>
          }
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
        <div className="font-display text-xl font-600 text-navy leading-tight">{value}</div>
        <div className="mt-0.5 text-xs leading-tight text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function WhyInvestCard() {
  const { whyInvest } = useSiteContent("home");
  const items = whyInvest.map((i) => i.text);
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

function FilterBar({
  properties,
  filters,
  onChange,
}: {
  properties: ScheduledPropertyRow[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const counties = Array.from(
    new Set(properties.map((p) => p.county).filter((c) => c && c !== "—")),
  ).sort();
  const active =
    filters.search.trim() !== "" ||
    filters.county !== "" ||
    filters.type !== "" ||
    filters.amount !== "";
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });

  return (
    <section className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
      <div className="relative min-w-[240px] flex-1 sm:min-w-[280px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search by Address, City, County or Parcel ID..."
          className="h-10 w-full rounded-md border border-hairline bg-surface pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </div>
      <FilterSelect label="County" value={filters.county} onChange={(v) => set("county", v)}>
        <option value="">All Counties</option>
        {counties.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Property type" value={filters.type} onChange={(v) => set("type", v)}>
        <option value="">All Property Types</option>
        <option value="residential">Residential</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
      </FilterSelect>
      <FilterSelect label="Amount" value={filters.amount} onChange={(v) => set("amount", v)}>
        {AMOUNT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </FilterSelect>
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        disabled={!active}
        className="ml-auto inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-600 text-primary-foreground shadow-sm transition-colors hover:bg-navy-deep disabled:opacity-40"
      >
        Reset
      </button>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 min-w-[140px] grow rounded-md border border-hairline bg-surface px-3 text-sm text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 sm:min-w-[170px] sm:grow-0"
    >
      {children}
    </select>
  );
}

function PropertyTable({
  properties,
  filtersActive,
}: {
  properties: ScheduledPropertyRow[];
  filtersActive: boolean;
}) {
  const fmt = (n: number) =>
    (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (properties.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-hairline bg-surface p-10 text-center">
        <p className="text-sm text-ink-muted">
          {filtersActive
            ? "No properties match your filters. Try clearing them."
            : "No properties for auction yet. Check back soon."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-600 text-navy">
        Liens for Auction ({properties.length})
      </h2>
      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {properties.map((p) => (
          <PropertyCard key={p.lien_id} p={p} fmt={fmt} />
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block">
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
                {properties.map((p) => (
                  <tr
                    key={p.lien_id}
                    className="border-b border-hairline/60 last:border-b-0 hover:bg-surface-alt/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={`${p.address} exterior`}
                            loading="lazy"
                            className="size-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="size-12 rounded-md bg-surface-alt" />
                        )}
                        <div>
                          <div className="font-600 text-navy">{p.address}</div>
                          <div className="text-xs text-ink-muted">
                            {p.city}, {p.state} {p.zip}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {p.description ?? p.property_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-ink">{p.county}</td>
                    <td className="px-3 py-4 font-mono text-xs text-ink-muted">{p.parcel_id}</td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">
                      {fmt(p.taxes_owed)}
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">
                      {(p.current_rate ?? p.starting_rate).toFixed(2)}%
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums font-600 text-navy">
                      {fmt(p.min_bid)}
                    </td>
                    <td className="px-3 py-4 text-ink capitalize">{p.property_type}</td>
                    <td className="px-3 py-4">
                      <StatusPill status={p.auction_status} />
                    </td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        to="/properties/$id"
                        params={{ id: p.property_id }}
                        search={{ lot: p.lien_id, auction: p.auction_id }}
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
      </div>
    </section>
  );
}

function PropertyCard({ p, fmt }: { p: ScheduledPropertyRow; fmt: (n: number) => string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-center gap-3">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={`${p.address} exterior`}
            loading="lazy"
            className="size-12 rounded-md object-cover"
          />
        ) : (
          <div className="size-12 rounded-md bg-surface-alt" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-600 text-navy">{p.address}</div>
          <div className="text-xs text-ink-muted">
            {p.city}, {p.state} {p.zip}
          </div>
          <div className="text-xs text-ink-muted">{p.description ?? p.property_type}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-ink-muted">Taxes Owed</div>
          <div className="font-600 text-navy tabular-nums">{fmt(p.taxes_owed)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-muted">Interest Rate</div>
          <div className="font-600 text-navy tabular-nums">
            {(p.current_rate ?? p.starting_rate).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Min. Bid</div>
          <div className="font-600 text-navy tabular-nums">{fmt(p.min_bid)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Status</div>
          <StatusPill status={p.auction_status} />
        </div>
      </div>
      <div className="mt-3">
        <Link
          to="/properties/$id"
          params={{ id: p.property_id }}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-500 text-ink transition-colors hover:border-navy hover:text-navy"
        >
          <Eye className="size-3.5" /> View Details
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ScheduledPropertyRow["auction_status"] }) {
  const map = {
    draft: { bg: "bg-muted", fg: "text-ink-muted", label: "Draft" },
    scheduled: { bg: "bg-navy/5", fg: "text-navy", label: "Upcoming" },
    live: { bg: "bg-success-soft", fg: "text-success", label: "Live" },
    closed: { bg: "bg-muted", fg: "text-ink-muted", label: "Closed" },
    canceled: { bg: "bg-destructive/10", fg: "text-destructive", label: "Canceled" },
  }[status];
  return (
    <span
      className={`inline-flex items-center rounded-full ${map.bg} px-2.5 py-1 text-xs font-500 ${map.fg}`}
    >
      {map.label}
    </span>
  );
}

function RegisterBanner() {
  const { user, loading } = useSession();
  const { ctaTitle, ctaSubtitle } = useSiteContent("home");
  const signedIn = !loading && !!user;
  return (
    <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-gold-soft bg-gold-soft/40 p-6 sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-gold text-navy">
          {signedIn ? (
            <Check className="size-6" strokeWidth={1.75} />
          ) : (
            <ShieldCheck className="size-6" strokeWidth={1.75} />
          )}
        </div>
        <div>
          <div className="font-display text-lg font-600 text-navy">
            {signedIn ? "You're all set to bid." : ctaTitle}
          </div>
          <p className="text-sm text-ink-muted">
            {signedIn
              ? "Add funds to your ledger, review the properties below, and place your bids when the auction goes live."
              : ctaSubtitle}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to={signedIn ? "/dashboard" : "/auth"}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-600 text-primary-foreground hover:bg-navy-deep"
        >
          {signedIn ? "Go to Dashboard" : "Create Account"}
          <ArrowRight className="size-4" />
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
