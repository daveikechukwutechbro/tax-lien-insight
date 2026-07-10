import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Bookmark, CalendarDays, MapPin, FileText, DollarSign,
  Gavel, Home as HomeIcon, Info, Clock,
} from "lucide-react";
import { propertyDetailQuery } from "@/lib/queries/property-detail";
import { useSession } from "@/hooks/use-session";
import { useHydrated } from "@/hooks/use-hydrated";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/properties/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(propertyDetailQuery(params.id)),
  head: ({ params }) => ({
    meta: [
      { title: `Property ${params.id.slice(0, 8)} — TaxLien Auctions` },
      { name: "description", content: "Full property, tax lien, and auction details." },
      { property: "og:title", content: "Tax Lien Property Details" },
      { property: "og:url", content: `/properties/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/properties/${params.id}` }],
  }),
  component: PropertyDetailPage,
  errorComponent: ({ error }) => (
    <div className="container-tight py-20 text-center">
      <h1 className="font-display text-2xl font-600 text-navy">Property not found</h1>
      <p className="mt-2 text-sm text-ink-muted">{error.message}</p>
      <Link to="/" className="mt-4 inline-block text-sm text-navy underline">Back to auctions</Link>
    </div>
  ),
  notFoundComponent: () => <div className="container-tight py-20 text-center">Not found</div>,
});

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function PropertyDetailPage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(propertyDetailQuery(id));
  const { user } = useSession();
  const qc = useQueryClient();
  const [watching, setWatching] = useState(false);

  async function toggleWatch() {
    if (!user) return toast.error("Sign in to watch this property");
    setWatching(true);
    const { error } = await supabase.from("watchlist").insert({
      property_id: p.id, user_id: user.id,
    });
    setWatching(false);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["dashboard", "watchlist"] });
    toast.success("Added to watchlist");
  }

  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-navy">Auctions</Link>
          <span>›</span>
          <span>Property Details</span>
        </nav>

        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm text-ink hover:border-navy hover:text-navy">
          <ArrowLeft className="size-4" /> Back to Properties
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="relative overflow-hidden rounded-xl border border-hairline bg-surface-alt">
                {p.image_url ? (
                  <img src={p.image_url} alt={`${p.address} exterior`} className="aspect-[4/3] w-full object-cover" />
                ) : <div className="aspect-[4/3] w-full bg-surface-alt" />}
                <span className="absolute left-3 top-3 rounded bg-navy px-2 py-1 text-[10px] font-600 uppercase text-primary-foreground">
                  {p.property_type}
                </span>
              </div>
              <div>
                <h1 className="font-display text-3xl font-600 text-navy">{p.address}</h1>
                <div className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                  <MapPin className="size-3.5" /> {p.city}, {p.state} {p.zip} · {p.county.name} County
                </div>
                <div className="mt-1 text-xs text-ink-muted">Parcel ID: <span className="font-mono">{p.parcel_id}</span></div>

                {p.lien && (
                  <div className="mt-4 rounded-lg border border-gold-soft bg-gold-soft/30 p-3">
                    <div className="flex items-center gap-2 text-xs font-500 text-navy">
                      <CalendarDays className="size-4" /> This property is scheduled for auction
                    </div>
                    <div className="mt-1 text-sm font-600 text-navy">
                      {p.lien.auction && new Date(p.lien.auction.starts_at).toLocaleString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
                      })}
                    </div>
                  </div>
                )}

                {p.lien && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <MetaCell icon={<DollarSign className="size-4" />} label="Taxes Owed" value={fmtMoney(p.lien.taxes_owed)} />
                    <MetaCell icon={<Info className="size-4" />} label="Interest Rate" value={`${(p.lien.current_rate ?? p.lien.starting_rate).toFixed(2)}%`} />
                    <MetaCell icon={<Gavel className="size-4" />} label="Minimum Bid" value={fmtMoney(p.lien.min_bid)} />
                    <MetaCell icon={<HomeIcon className="size-4" />} label="Property Type" value={p.property_type} />
                    <MetaCell icon={<Clock className="size-4" />} label="Redemption Period" value={`${p.lien.redemption_period_months} months`} />
                    <MetaCell icon={<CalendarDays className="size-4" />} label="Tax Year" value={String(p.lien.tax_year)} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <InfoCard title="Property Details">
                <Row k="Property Type" v={p.property_type} />
                <Row k="Use Type" v={p.use_type ?? "—"} />
                <Row k="Year Built" v={p.year_built ?? "—"} />
                <Row k="Living Area" v={p.living_area_sqft ? `${p.living_area_sqft.toLocaleString()} sq ft` : "—"} />
                <Row k="Lot Size" v={p.lot_size_acres ? `${p.lot_size_acres} acres` : "—"} />
                <Row k="Bed / Bath" v={p.bedrooms !== null ? `${p.bedrooms} / ${p.bathrooms}` : "—"} />
              </InfoCard>
              <InfoCard title="Description">
                <p className="text-sm leading-relaxed text-ink">
                  {p.description ?? "No description provided."}
                </p>
                <div className="mt-3 rounded-md bg-navy/5 p-2 text-xs text-navy">
                  Note: This is a lien only. You are not buying the property. The owner retains all
                  rights of ownership during the redemption period.
                </div>
              </InfoCard>
              <InfoCard title="Owner & Assessed Value">
                <Row k="Owner" v={p.owner_name ?? "—"} />
                <Row k="Mailing" v={p.owner_mailing_address ?? "—"} />
                <div className="my-3 h-px bg-hairline" />
                <Row k="Land Value" v={p.land_value !== null ? fmtMoney(p.land_value) : "—"} />
                <Row k="Improvement" v={p.improvement_value !== null ? fmtMoney(p.improvement_value) : "—"} />
                <Row k="Assessed Value" v={p.assessed_value !== null ? fmtMoney(p.assessed_value) : "—"} />
              </InfoCard>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-hairline">
              <div className="bg-navy px-5 py-3 text-sm font-600 text-primary-foreground">Auction Information</div>
              <div className="space-y-4 bg-surface p-5">
                {p.lien?.auction ? (
                  <>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-ink-muted">Auction Date</div>
                      <div className="mt-1 font-display text-lg font-600 text-navy">
                        {new Date(p.lien.auction.starts_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {new Date(p.lien.auction.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" })}
                      </div>
                    </div>
                    <AuctionCountdown target={new Date(p.lien.auction.starts_at)} />
                  </>
                ) : <p className="text-sm text-ink-muted">Not scheduled.</p>}
                <div className="border-t border-hairline pt-3 text-sm">
                  <div className="flex justify-between"><span className="text-ink-muted">Number of Bids</span><span className="font-600">0</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-ink-muted">Current Rate</span><span className="font-600">{p.lien?.current_rate !== null && p.lien?.current_rate !== undefined ? `${p.lien.current_rate.toFixed(2)}%` : "N/A"}</span></div>
                </div>
                <button
                  disabled={!p.lien?.auction || p.lien.auction.status !== "live"}
                  className="w-full rounded-md bg-success px-4 py-2.5 text-sm font-600 text-white disabled:bg-muted disabled:text-ink-muted"
                >
                  {p.lien?.auction?.status === "live" ? "Place Bid" : "Place Bid When Auction Starts"}
                </button>
                <button onClick={toggleWatch} disabled={watching} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-500 text-navy hover:border-navy">
                  <Bookmark className="size-4" /> Add to Watchlist
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-hairline bg-surface p-5">
              <div className="text-sm font-600 text-navy">Documents</div>
              <ul className="mt-3 space-y-2">
                {p.documents.length === 0 ? (
                  <li className="text-xs text-ink-muted">No documents uploaded yet.</li>
                ) : (
                  p.documents.map((d) => (
                    <li key={d.id}>
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between text-sm text-ink hover:text-navy">
                        <span className="flex items-center gap-2"><FileText className="size-4" /> {d.name}</span>
                        <span className="text-xs text-ink-muted">↓</span>
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AuctionCountdown({ target }: { target: Date }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = hydrated ? Math.max(0, target.getTime() - now) : 0;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-muted">Auction Starts In</div>
      <div className="mt-1 flex gap-2 font-display text-2xl font-600 tabular-nums text-destructive">
        <Part n={d} l="Days" /><Sep /><Part n={h} l="Hrs" /><Sep /><Part n={m} l="Mins" /><Sep /><Part n={s} l="Secs" />
      </div>
    </div>
  );
}
function Part({ n, l }: { n: number; l: string }) {
  return (
    <div className="text-center">
      <div>{String(n).padStart(2, "0")}</div>
      <div className="text-[10px] font-600 uppercase tracking-wider text-ink-muted">{l}</div>
    </div>
  );
}
function Sep() { return <span className="text-destructive/60">:</span>; }

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">{icon} {label}</div>
      <div className="mt-0.5 font-600 text-navy capitalize">{value}</div>
    </div>
  );
}
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="text-sm font-600 text-navy">{title}</div>
      <div className="mt-3 space-y-1.5 text-sm">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between text-sm"><span className="text-ink-muted">{k}:</span><span className="font-500 text-ink">{v}</span></div>;
}