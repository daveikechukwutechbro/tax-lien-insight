import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyDetailQuery, type PropertyDetail as PD } from "@/lib/queries/property-detail";
import { useSession } from "@/hooks/use-session";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, FileText, MapPin } from "lucide-react";
import { addWatchItem, placeBidApi, getLotEligibility, removeWatchlistItem } from "@/lib/backend";
import { watchlistQuery, profileQuery, dashboardSummaryQuery } from "@/lib/queries/dashboard";

export type PropertySearch = { lot?: string; auction?: string };

export const Route = createFileRoute("/properties/$id")({
  validateSearch: (s): PropertySearch => ({
    lot: typeof s.lot === "string" ? s.lot : undefined,
    auction: typeof s.auction === "string" ? s.auction : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Property Details — Auction Ledger` },
      { name: "description", content: `Tax lien property details, assessed values, documents, and live bidding.` },
      { property: "og:title", content: `Property Details` },
      { property: "og:url", content: `/properties/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/properties/${params.id}` }],
  }),
  component: PropertyDetail,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function PropertyDetail() {
  const { id } = Route.useParams();
  const { lot, auction } = Route.useSearch();
  const { data, isLoading, error } = useQuery(propertyDetailQuery(id, { lotId: lot, auctionId: auction }));
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: watched = [] } = useQuery(watchlistQuery(user?.id));

  const lien = data?.lien ?? null;
  const watching = watched?.find((w) => w.lot_id === lien?.id || w.property_id === data?.id) ?? null;

  async function toggleWatch() {
    if (!user) return toast.error("Sign in to save properties");
    try {
      if (watching) {
        await removeWatchlistItem(watching.id);
        toast.success("Removed from watchlist");
      } else {
        if (!lien?.id) return toast.error("Watch is available once the property is in an auction");
        await addWatchItem({ lotId: lien.id });
        toast.success("Added to watchlist");
      }
      qc.invalidateQueries({ queryKey: ["dashboard", "watchlist"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    } catch (err) {
      toast.error((err as Error).message ?? "Could not update watchlist");
    }
  }

  if (isLoading) return <div className="container-tight py-16 text-ink-muted">Loading…</div>;
  if (error || !data) return (
    <div className="container-tight py-16">
      <h1 className="font-display text-3xl text-navy">Property not found</h1>
      <Link to="/" className="mt-4 inline-flex text-sm text-navy underline">← Back</Link>
    </div>
  );

  const p = data;
  const gallery = [p.image_url, ...p.gallery_urls].filter(Boolean) as string[];

  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <Link to="/" className="text-xs font-500 text-ink-muted hover:text-navy">← Back to auctions</Link>
        <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="rounded-xl border border-hairline bg-surface p-4">
              {gallery[0] ? <img src={gallery[0]} alt={p.address} className="aspect-[16/10] w-full rounded-lg object-cover" /> : <div className="aspect-[16/10] w-full rounded-lg bg-surface-alt" />}
              {gallery.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {gallery.slice(1, 5).map((u) => <img key={u} src={u} alt="" className="aspect-square w-full rounded-md object-cover" />)}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-hairline bg-surface p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted"><MapPin className="size-4" /> {p.county.name || "County"}, {p.county.state}</div>
              <h1 className="mt-1 font-display text-3xl font-600 text-navy">{p.address}</h1>
              <div className="text-sm text-ink-muted">{p.city}, {p.state} {p.zip} · Parcel {p.parcel_id ?? "—"}</div>
              {p.description && <p className="mt-4 text-sm leading-6 text-ink">{p.description}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-sm sm:grid-cols-4">
                <Field label="Type" value={<span className="capitalize">{p.property_type ?? "—"}</span>} />
                <Field label="Year Built" value={p.year_built ?? "—"} />
                <Field label="Living Area" value={p.living_area_sqft ? `${p.living_area_sqft.toLocaleString()} sq ft` : "—"} />
                <Field label="Lot Size" value={p.lot_size_acres ? `${p.lot_size_acres} ac` : "—"} />
                <Field label="Beds" value={p.bedrooms ?? "—"} />
                <Field label="Baths" value={p.bathrooms ?? "—"} />
                <Field label="Assessed" value={p.assessed_value ? fmt(p.assessed_value) : "—"} />
                <Field label="Use Type" value={p.use_type ?? "—"} />
              </dl>
              {(p.owner_name || p.owner_mailing_address) && (
                <div className="mt-5 rounded-lg bg-surface-alt p-4 text-sm">
                  <div className="text-xs uppercase tracking-wider text-ink-muted">Owner of Record</div>
                  {p.owner_name && <div className="mt-1 font-500 text-navy">{p.owner_name}</div>}
                  {p.owner_mailing_address && <div className="text-ink-muted">{p.owner_mailing_address}</div>}
                </div>
              )}
            </div>

            {p.documents.length > 0 && (
              <div className="mt-4 rounded-xl border border-hairline bg-surface p-5">
                <h2 className="font-display text-lg font-600 text-navy">Documents</h2>
                <ul className="mt-3 space-y-2">
                  {p.documents.map((d) => (
                    <li key={d.id}>
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm text-navy hover:bg-surface-alt">
                        <FileText className="size-4" /> <span className="flex-1">{d.name}</span> <span className="text-xs text-ink-muted uppercase">{d.kind}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <BidPanel property={p} watching={!!watching} onToggleWatch={toggleWatch} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs uppercase tracking-wider text-ink-muted">{label}</dt><dd className="mt-0.5 font-500 text-navy">{value}</dd></div>;
}

function BidPanel({ property, watching, onToggleWatch }: { property: PD; watching: boolean; onToggleWatch: () => void }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const hydrated = useHydrated();
  const lien = property.lien;
  const auction = lien?.auction;
  const [rate, setRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: summary } = useQuery(dashboardSummaryQuery(user?.id));
  const isVerified = !!profile?.verified;

  const { data: eligibility } = useQuery<{ eligible: boolean; reasons: string[] } | null>({
    queryKey: ["bid-eligibility", user?.id, lien?.id],
    enabled: !!user?.id && !!lien?.id,
    queryFn: async () => (lien?.id ? getLotEligibility(lien.id) : null),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!hydrated || !auction?.starts_at) return;
    const tick = () => setRemaining(Math.max(0, new Date(auction.starts_at).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [hydrated, auction]);

  async function placeBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Sign in to place a bid");
    if (!lien) return;
    setSubmitting(true);
    setErrorCode(null);
    const requestId = `${user.id}:${lien.id}:${Date.now()}`;
    try {
      await placeBidApi({
        lotId: lien.id,
        rate: Number(rate),
        amount: lien.taxes_owed,
        idempotencyKey: requestId,
      });
      setRate("");
      qc.invalidateQueries({ queryKey: ["property"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "bids"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Bid placed");
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setErrorCode(e.code ?? null);
      toast.error(e.message ?? "Bid rejected");
    } finally {
      setSubmitting(false);
    }
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining / 3_600_000) % 24);
  const minutes = Math.floor((remaining / 60_000) % 60);
  const isLive = auction?.status === "live";
  const eligReasons: string[] = eligibility?.reasons ?? [];
  const insufficientFunds = !!lien && (summary?.funds.available ?? 0) < lien.taxes_owed;
  if (insufficientFunds && !eligReasons.includes("INSUFFICIENT_FUNDS")) eligReasons.push("INSUFFICIENT_FUNDS");

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <div className="text-xs uppercase tracking-wider text-ink-muted">{isLive ? "Live Auction" : "Auction Starts In"}</div>
        {auction?.starts_at ? (
          <>
            {!isLive && hydrated && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Cell label="Days" value={days} /><Cell label="Hours" value={hours} /><Cell label="Min" value={minutes} />
              </div>
            )}
            <div className="mt-3 text-xs text-ink-muted">{new Date(auction.starts_at).toLocaleString()}</div>
          </>
        ) : <div className="mt-2 text-sm text-ink-muted">Not yet scheduled</div>}

        {lien && (
          <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-sm">
            <Row label="Taxes Owed" value={fmt(lien.taxes_owed)} />
            <Row label="Minimum Bid" value={fmt(lien.min_bid)} />
            <Row label="Starting Rate" value={`${lien.starting_rate.toFixed(2)}%`} />
            <Row label="Current Rate" value={lien.current_rate !== null ? `${lien.current_rate.toFixed(2)}%` : "—"} />
            <Row label="Tax Year" value={lien.tax_year ?? "—"} />
            <Row label="Redemption" value={`${lien.redemption_period_months} mo`} />
          </dl>
        )}

        {lien && isLive ? (
          <form onSubmit={placeBid} className="mt-4 space-y-2 border-t border-hairline pt-4">
            {user && eligReasons.length > 0 && (
              <div className="rounded-md border border-gold/40 bg-gold/10 p-3 text-xs text-navy">
                <div className="font-600">Not eligible to bid</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {eligReasons.map((r) => {
                    const links: Record<string, string> = {
                      KYC_REQUIRED: "/dashboard/verify",
                      REGISTRATION_REQUIRED: "/auctions",
                      INSUFFICIENT_FUNDS: "/dashboard/funds",
                    };
                    return (
                      <li key={r}>
                        {r}
                        {links[r] && (
                          <>
                            {" "}· <Link to={links[r]} className="font-600 underline">Fix →</Link>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <label className="text-xs uppercase tracking-wider text-ink-muted">Your Interest Rate (%)</label>
            <input type="number" step="0.25" min="0" max={lien.starting_rate} required value={rate} onChange={(e) => setRate(e.target.value)} className="h-10 w-full rounded-md border border-hairline px-3 text-sm" />
            <button type="submit" disabled={submitting || !isVerified || (eligReasons.length > 0)} className="h-10 w-full rounded-md bg-navy text-sm font-600 text-primary-foreground disabled:opacity-60">
              {submitting ? "Placing…" : "Place Bid"}
            </button>
            {errorCode && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorCode} — the bid was rejected. See the message above for details.
              </div>
            )}
          </form>
        ) : lien && (
          <div className="mt-4 rounded-md border border-hairline bg-surface-alt p-3 text-xs text-ink-muted">
            Bidding opens when the auction goes live.
          </div>
        )}

        <button onClick={onToggleWatch} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-hairline text-sm font-500 text-navy hover:bg-surface-alt">
          {watching ? <><BookmarkCheck className="size-4" /> Watching</> : <><Bookmark className="size-4" /> Add to Watchlist</>}
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><dt className="text-ink-muted">{label}</dt><dd className="font-600 text-navy tabular-nums">{value}</dd></div>;
}
function Cell({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-navy text-primary-foreground py-2"><div className="font-display text-xl font-600">{String(value).padStart(2, "0")}</div><div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div></div>;
}