import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  getAdminAuctions,
  getAdminProperties,
  getAuctionLots,
  createAdminLot,
  transitionAdminLot,
  deleteAdminLot,
  LOT_TRANSITION_OPTIONS,
  type AuctionLot,
} from "@/lib/backend";
import { invalidatePublicData } from "@/lib/queries/invalidate";

export const Route = createFileRoute("/admin/liens")({
  validateSearch: (s: Record<string, unknown>) => ({
    auction: typeof s.auction === "string" ? s.auction : "",
  }),
  component: LiensAdmin,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function statusTone(status: string): string {
  if (status === "live") return "bg-emerald-50 text-emerald-700";
  if (status === "closed" || status === "awarded") return "bg-navy/10 text-navy";
  if (status === "cancelled" || status === "withdrawn") return "bg-red-50 text-red-700";
  if (status === "settled") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function LiensAdmin() {
  const qc = useQueryClient();
  const { auction: searchAuction } = Route.useSearch();
  const { data: auctions = [] } = useQuery({
    queryKey: ["admin", "auctions"],
    queryFn: getAdminAuctions,
  });
  const { data: propsRows = [] } = useQuery({
    queryKey: ["admin", "properties"],
    queryFn: getAdminProperties,
  });

  const [auctionId, setAuctionId] = useState(searchAuction || "");
  const [form, setForm] = useState({
    property_id: "",
    tax_year: String(new Date().getFullYear() - 1),
    taxes_owed: "",
    starting_rate: "18",
    minimum_rate: "",
    rate_increment: "0.25",
    redemption_period_months: "24",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { data: lots = [], refetch } = useQuery({
    queryKey: ["admin", "lots", auctionId],
    queryFn: () => getAuctionLots(auctionId),
    enabled: Boolean(auctionId),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!auctionId) return toast.error("Pick an auction first");
    try {
      await createAdminLot(auctionId, {
        propertyId: form.property_id || undefined,
        startingRate: Number(form.starting_rate),
        minimumRate: form.minimum_rate ? Number(form.minimum_rate) : undefined,
        rateIncrement: Number(form.rate_increment) || undefined,
        taxesOwed: form.taxes_owed ? Number(form.taxes_owed) : undefined,
        taxYear: form.tax_year ? Number(form.tax_year) : undefined,
        redemptionPeriodMonths: Number(form.redemption_period_months) || undefined,
      });
      toast.success("Lien created");
      setForm({ ...form, property_id: "", taxes_owed: "" });
      await qc.invalidateQueries({ queryKey: ["admin", "lots", auctionId] });
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not create lien");
    }
  }

  async function changeStatus(lot: AuctionLot, next: string) {
    try {
      await transitionAdminLot(lot.id, next);
      toast.success(`Lot moved to ${next}`);
      await refetch();
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Transition failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this lot from the auction?")) return;
    try {
      await deleteAdminLot(id);
      toast.success("Lot removed");
      await refetch();
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not remove lot");
    }
  }

  const validLots = lots.filter((l) => LOT_TRANSITION_OPTIONS[l.status]?.length);

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Liens</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Attach tax liens to properties and enroll them in an auction.
      </p>

      <div className="mt-4 max-w-xs">
        <label className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
          Auction
        </label>
        <select
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="input"
        >
          <option value="">— Pick an auction —</option>
          {auctions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} ({a.state.replace(/_/g, " ")})
            </option>
          ))}
        </select>
      </div>

      {auctionId && (
        <>
          <form
            onSubmit={add}
            className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <select
              required
              value={form.property_id}
              onChange={(e) => set("property_id", e.target.value)}
              className="input"
            >
              <option value="">— Property —</option>
              {propsRows.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}, {p.city} {p.state} ({p.parcelId ?? "no parcel"})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              placeholder="Tax year"
              value={form.tax_year}
              onChange={(e) => set("tax_year", e.target.value)}
              className="input"
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Taxes owed"
              value={form.taxes_owed}
              onChange={(e) => set("taxes_owed", e.target.value)}
              className="input"
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Starting rate %"
              value={form.starting_rate}
              onChange={(e) => set("starting_rate", e.target.value)}
              className="input"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Min rate %"
              value={form.minimum_rate}
              onChange={(e) => set("minimum_rate", e.target.value)}
              className="input"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Rate increment %"
              value={form.rate_increment}
              onChange={(e) => set("rate_increment", e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Redemption months"
              value={form.redemption_period_months}
              onChange={(e) => set("redemption_period_months", e.target.value)}
              className="input"
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">
                Create lien
              </button>
            </div>
          </form>

          <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Property</th>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2">Owed</th>
                  <th className="px-4 py-2">Rate</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Next</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-hairline/50 last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {lot.image_url && (
                          <img src={lot.image_url} alt="" className="size-8 rounded-md object-cover" />
                        )}
                        <div>
                          <div className="font-500 text-navy">{lot.address ?? "Unlisted property"}</div>
                          <div className="text-xs text-ink-muted">
                            {lot.city}, {lot.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{lot.tax_year ?? "—"}</td>
                    <td className="px-4 py-2 font-600">{fmt(lot.taxes_owed)}</td>
                    <td className="px-4 py-2 text-xs">{lot.current_rate ?? lot.starting_rate}%</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusTone(lot.status)}`}>
                        {lot.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {LOT_TRANSITION_OPTIONS[lot.status]?.length ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next) void changeStatus(lot, next);
                            e.target.value = "";
                          }}
                          className="input h-8"
                        >
                          <option value="">—</option>
                          {LOT_TRANSITION_OPTIONS[lot.status].map((n) => (
                            <option key={n} value={n}>
                              {n.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => void remove(lot.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!lots.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-muted">
                      {validLots.length ? "No lots yet." : "No lots are enrolled in this auction yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}