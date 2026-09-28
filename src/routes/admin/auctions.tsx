import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getAdminAuctions,
  getCounties,
  createAdminAuction,
  transitionAdminAuction,
  AUCTION_TRANSITION_OPTIONS,
  type AdminAuction,
} from "@/lib/backend";
import { invalidatePublicData } from "@/lib/queries/invalidate";

export const Route = createFileRoute("/admin/auctions")({
  component: AuctionsAdmin,
});

function statusTone(status: string): string {
  if (status === "live") return "bg-emerald-50 text-emerald-700";
  if (status === "draft" || status === "scheduled") return "bg-amber-50 text-amber-700";
  if (status === "cancelled" || status === "withdrawn") return "bg-red-50 text-red-700";
  if (status === "archived") return "bg-slate-100 text-slate-500";
  return "bg-navy/5 text-navy";
}

function AuctionsAdmin() {
  const qc = useQueryClient();
  const countyMap = useQuery({ queryKey: ["admin", "counties"], queryFn: getCounties });
  const counties = countyMap.data ?? [];
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "auctions"],
    queryFn: getAdminAuctions,
  });

  const [title, setTitle] = useState("");
  const [county, setCounty] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAdminAuction({
        title,
        jurisdictionId: county || undefined,
        startsAt: starts ? new Date(starts).toISOString() : undefined,
        endsAt: ends ? new Date(ends).toISOString() : undefined,
      });
      toast.success("Auction created");
      setTitle(""); setCounty(""); setStarts(""); setEnds("");
      await qc.invalidateQueries({ queryKey: ["admin", "auctions"] });
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not create auction");
    }
  }

  async function transition(r: AdminAuction, next: string) {
    try {
      await transitionAdminAuction(r.id, r.state, next);
      toast.success(`Auction moved to ${next}`);
      await qc.invalidateQueries({ queryKey: ["admin", "auctions"] });
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Transition failed");
    }
  }

  const countyName = (id: string | null) =>
    counties.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Auctions</h2>
      <form
        onSubmit={add}
        className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
        />
        <select value={county} onChange={(e) => setCounty(e.target.value)} className="input">
          <option value="">— County —</option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.stateCode ?? ""}
            </option>
          ))}
        </select>
        <input
          required
          type="datetime-local"
          value={starts}
          onChange={(e) => setStarts(e.target.value)}
          className="input"
        />
        <input
          required
          type="datetime-local"
          value={ends}
          onChange={(e) => setEnds(e.target.value)}
          className="input"
        />
        <div className="sm:col-span-2 lg:col-span-4">
          <button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">
            Create auction
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">County</th>
              <th className="px-4 py-2">Starts</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Next</th>
              <th className="px-4 py-2 text-right">Lots</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                <td className="px-4 py-2 font-500 text-navy">
                  {r.title}
                  {!r.published && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                      hidden
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{countyName(r.jurisdictionId)}</td>
                <td className="px-4 py-2 text-xs">
                  {r.startsAt ? new Date(r.startsAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusTone(r.state)}`}>
                    {r.state.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {AUCTION_TRANSITION_OPTIONS[r.state]?.length ? (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next) void transition(r, next);
                        e.target.value = "";
                      }}
                      className="input h-8"
                    >
                      <option value="">—</option>
                      {AUCTION_TRANSITION_OPTIONS[r.state].map((n) => (
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
                  <Link
                    to="/admin/liens"
                    search={{ auction: r.id }}
                    className="text-navy hover:underline"
                  >
                    Manage lots
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}