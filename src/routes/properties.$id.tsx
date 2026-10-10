import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyDetailQuery, type PropertyDetail as PD } from "@/lib/queries/property-detail";
import { useSession } from "@/hooks/use-session";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, FileText, MapPin, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { addWatchItem, placeBidApi, getLotEligibility, removeWatchlistItem } from "@/lib/backend";
import { watchlistQuery, profileQuery, dashboardSummaryQuery } from "@/lib/queries/dashboard";
import { SmartBackButton } from "@/components/site/smart-back";

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
  const { user, loading: sessionLoading } = useSession();
  const hydrated = useHydrated();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: watched = [] } = useQuery(watchlistQuery(user?.id));

  const lien = data?.lien ?? null;
  const watching = watched?.find((w) => w.id === lien?.id || w.property_id === data?.id) ?? null;

  async function toggleWatch() {
    if (!hydrated) return;
    if (!user) {
      toast.error("Sign in to save properties", { description: "You'll return to this property after you log in." });
      router.navigate({ to: "/auth", search: { redirect: `/properties/${id}`, mode: "login" } });
      return;
    }
    if (!sessionLoading && !lien?.id) {
      toast.error(data ? "This property has no scheduled auction yet — check back soon." : "Couldn't load the property's auction. Please try again.");
      return;
    }
    try {
      if (watching) {
        await removeWatchlistItem(watching.id);
        toast.success("Removed from watchlist");
      } else {
        if (!lien?.id) return;
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
      <SmartBackButton to="/search" className="mt-4 inline-flex text-sm text-navy underline underline-offset-4" />
    </div>
  );

  const p = data;
  const gallery = [p.image_url, ...p.gallery_urls].filter(Boolean) as string[];
  const [mainIdx, setMainIdx] = useState(0);
  const mainSafe = mainIdx < gallery.length ? mainIdx : 0;
  const [viewer, setViewer] = useState<number | null>(null);
  const media = [
    ...gallery.map((url) => ({ type: "image" as const, url })),
    ...(p.video_url ? [{ type: "video" as const, url: p.video_url }] : []),
  ];

  const taxesOwed = lien?.taxes_owed ?? p.property_taxes_owed ?? null;
  const interestRate =
    lien?.current_rate != null ? lien.current_rate : lien?.starting_rate != null ? lien.starting_rate : p.property_interest_rate ?? null;
  const taxYear = lien?.tax_year ?? p.property_tax_year ?? null;
  const redemptionMonths = lien?.redemption_period_months ?? p.property_redemption_months ?? null;

  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <SmartBackButton
          to={auction ? `/auctions/${auction}` : "/search"}
          label={auction ? "← Back to auction" : "← Back to search"}
          className="text-xs font-500 text-ink-muted hover:text-navy"
        />
        <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="rounded-xl border border-hairline bg-surface p-4">
              {gallery[mainSafe] ? (
                <button
                  type="button"
                  onClick={() => setViewer(mainSafe)}
                  className="group relative block w-full cursor-zoom-in"
                  title="View full screen"
                >
                  <img
                    src={gallery[mainSafe]}
                    alt={p.address}
                    className="aspect-[16/10] w-full rounded-lg bg-surface-alt object-contain"
                  />
                  <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-500 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="size-3.5" /> Full screen
                  </span>
                </button>
              ) : (
                <div className="aspect-[16/10] w-full rounded-lg bg-surface-alt" />
              )}
              {gallery.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {gallery.map((u, i) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setMainIdx(i)}
                      className={`overflow-hidden rounded-md border-2 ${i === mainSafe ? "border-navy" : "border-transparent"}`}
                    >
                      <img src={u} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {p.video_url && (
                <div className="relative mt-3">
                  <video
                    src={p.video_url}
                    controls
                    preload="metadata"
                    className="aspect-video w-full rounded-lg bg-black"
                  />
                  <button
                    type="button"
                    onClick={() => setViewer(gallery.length)}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-500 text-white hover:bg-black/80"
                    title="Play full screen"
                  >
                    <Maximize2 className="size-3.5" /> Full screen
                  </button>
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
                {taxesOwed != null && <Field label="Taxes Owed" value={fmt(taxesOwed)} />}
                {interestRate != null && <Field label="Interest Rate" value={`${interestRate.toFixed(2)}%`} />}
                {taxYear != null && <Field label="Tax Year" value={taxYear} />}
                {redemptionMonths != null && <Field label="Redemption" value={`${redemptionMonths} mo`} />}
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
      {viewer !== null && media[viewer] && (
        <PropertyLightbox
          media={media}
          index={viewer}
          onClose={() => setViewer(null)}
          onIndex={setViewer}
        />
      )}
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

type MediaItem = { type: "image" | "video"; url: string };

function PropertyLightbox({
  media,
  index,
  onClose,
  onIndex,
}: {
  media: MediaItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const item = media[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && media.length > 1) onIndex((index + 1) % media.length);
      else if (e.key === "ArrowLeft" && media.length > 1) onIndex((index - 1 + media.length) % media.length);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, media.length, onClose, onIndex]);

  if (!item) return null;
  const prev = (index - 1 + media.length) % media.length;
  const next = (index + 1) % media.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"
        aria-label="Close"
      >
        <X className="size-5" />
      </button>

      {media.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onIndex(prev); }}
          className="absolute left-3 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"
          aria-label="Previous"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}

      {item.type === "image" ? (
        <img
          src={item.url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain"
        />
      ) : (
        <video
          src={item.url}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92vh] max-w-[95vw] rounded-lg bg-black"
        />
      )}

      {media.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onIndex(next); }}
          className="absolute right-3 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"
          aria-label="Next"
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs font-500 text-white">
          {index + 1} / {media.length}
        </div>
      )}
    </div>
  );
}