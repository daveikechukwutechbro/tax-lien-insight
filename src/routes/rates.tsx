import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Percent,
  Scale,
  Landmark,
  MapPin,
  TrendingUp,
  Info,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/rates")({
  head: () => ({
    meta: [
      { title: "Interest Rates by State — Auction Ledger" },
      {
        name: "description",
        content:
          "The statutory tax lien interest rate, how it is set, and any minimum for every US state and DC — lien, hybrid, and deed jurisdictions.",
      },
      { property: "og:title", content: "Tax Lien Interest Rates by State" },
      {
        property: "og:description",
        content:
          "Real statutory tax lien interest rates for all 50 states and DC, with how each rate is set.",
      },
      { property: "og:url", content: "/rates" },
    ],
    links: [{ rel: "canonical", href: "/rates" }],
  }),
  component: RatesPage,
});

type RateModel = "lien" | "hybrid" | "deed";

type StateRate = {
  state: string;
  model: RateModel;
  rate: string;
  how: string;
  min: string;
  note?: string;
};

const DEED: StateRate = {
  rate: "—",
  how: "No investor interest",
  min: "—",
};

const STATE_RATES: StateRate[] = [
  { state: "Alaska", model: "deed", ...DEED },
  { state: "Alabama", model: "hybrid", rate: "12% max", how: "Bid down at auction", min: "No floor" },
  { state: "Arkansas", model: "deed", ...DEED },
  { state: "Arizona", model: "lien", rate: "16% max", how: "Bid down at auction", min: "No floor" },
  { state: "California", model: "deed", ...DEED },
  { state: "Colorado", model: "lien", rate: "14% max", how: "Fixed by statute", min: "None" },
  { state: "Connecticut", model: "deed", ...DEED },
  { state: "District of Columbia", model: "lien", rate: "18% max", how: "Fixed by statute", min: "None" },
  { state: "Delaware", model: "deed", ...DEED },
  { state: "Florida", model: "hybrid", rate: "18% max", how: "Bid down at auction", min: "5%", note: "Also runs a tax deed path." },
  { state: "Georgia", model: "deed", ...DEED },
  { state: "Hawaii", model: "deed", ...DEED, note: "No investor tax-sale auction; delinquent liens stay with the county." },
  { state: "Iowa", model: "lien", rate: "24% max", how: "Fixed by statute", min: "None", note: "Highest ceiling in the country." },
  { state: "Idaho", model: "deed", ...DEED },
  { state: "Illinois", model: "lien", rate: "9% max", how: "Bid down at auction", min: "No floor", note: "One- or three-year redemption by property type." },
  { state: "Indiana", model: "lien", rate: "15% max", how: "Flat penalty", min: "10%", note: "Penalty paid on redemption rather than compounding interest." },
  { state: "Kansas", model: "deed", ...DEED },
  { state: "Kentucky", model: "lien", rate: "12% max", how: "Fixed by statute", min: "None" },
  { state: "Louisiana", model: "lien", rate: "12% max", how: "Bid down at auction", min: "8.4%", note: "Resets under Acts 2024 No. 774, effective Jan 1, 2026." },
  { state: "Massachusetts", model: "deed", ...DEED },
  { state: "Maryland", model: "lien", rate: "20% max", how: "Set by county law", min: "6%", note: "Statute sets a default; counties may go higher." },
  { state: "Maine", model: "deed", ...DEED },
  { state: "Michigan", model: "deed", ...DEED },
  { state: "Minnesota", model: "deed", ...DEED },
  { state: "Missouri", model: "lien", rate: "10% max", how: "Fixed by statute", min: "None" },
  { state: "Mississippi", model: "lien", rate: "18% max", how: "Fixed by statute", min: "None" },
  { state: "Montana", model: "lien", rate: "10% max", how: "Fixed by statute", min: "None" },
  { state: "North Carolina", model: "deed", ...DEED },
  { state: "North Dakota", model: "deed", ...DEED },
  { state: "Nebraska", model: "lien", rate: "14% max", how: "Fixed by statute", min: "None" },
  { state: "New Hampshire", model: "deed", ...DEED },
  { state: "New Jersey", model: "lien", rate: "18% max", how: "Bid down at auction", min: "None" },
  { state: "New Mexico", model: "deed", ...DEED },
  { state: "Nevada", model: "deed", ...DEED },
  { state: "New York", model: "deed", ...DEED },
  { state: "Ohio", model: "hybrid", rate: "18% max", how: "Bid down at auction", min: "No floor", note: "Also runs a tax deed / foreclosure path." },
  { state: "Oklahoma", model: "deed", ...DEED },
  { state: "Oregon", model: "deed", ...DEED },
  { state: "Pennsylvania", model: "deed", ...DEED },
  { state: "Rhode Island", model: "deed", ...DEED },
  { state: "South Carolina", model: "deed", ...DEED },
  { state: "South Dakota", model: "lien", rate: "10% max", how: "Bid down at auction", min: "None" },
  { state: "Tennessee", model: "deed", ...DEED },
  { state: "Texas", model: "deed", ...DEED },
  { state: "Utah", model: "deed", ...DEED },
  { state: "Virginia", model: "deed", ...DEED },
  { state: "Vermont", model: "deed", ...DEED },
  { state: "Washington", model: "deed", ...DEED },
  { state: "Wisconsin", model: "deed", ...DEED },
  { state: "West Virginia", model: "lien", rate: "12% max", how: "Fixed by statute", min: "None", note: "Roughly 1% per month on redemption." },
  { state: "Wyoming", model: "lien", rate: "15% max", how: "Fixed by statute", min: "None" },
].sort((a, b) => a.state.localeCompare(b.state));

const MODEL_LABEL: Record<RateModel, { label: string; badge: string }> = {
  lien: { label: "Lien", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  hybrid: { label: "Hybrid", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  deed: { label: "Deed", badge: "bg-slate-100 text-slate-500 ring-slate-200" },
};

const lienStates = STATE_RATES.filter((s) => s.model !== "deed");

function RatesPage() {
  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-14">
          <div className="flex items-center gap-2 text-gold">
            <Percent className="size-5" />
            <span className="text-xs uppercase tracking-[0.24em]">State Reference</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-600">Interest rates by state</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">
            The statutory interest a tax lien certificate can earn, how that rate is set, and any
            minimum — for every US state and DC. Rates are statutory ceilings and were checked
            against state law; confirm the current figure with the county before you bid.
          </p>
        </div>
      </section>

      <section className="container-tight py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<TrendingUp className="size-5" />} label="States that pay interest" value={`${lienStates.length} of 51`} />
          <StatCard icon={<Percent className="size-5" />} label="Highest ceiling" value="Iowa — 24%" />
          <StatCard icon={<Scale className="size-5" />} label="Most common method" value="Bid down at auction" />
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="grid grid-cols-[1fr_5.5rem_9.5rem_5.5rem_1fr] gap-x-3 border-b border-hairline bg-navy/[0.03] px-4 py-3 text-xs font-600 uppercase tracking-[0.14em] text-ink-muted sm:grid-cols-[1fr_5.5rem_11rem_6rem_1.5fr]">
            <div>State</div>
            <div>Model</div>
            <div className="hidden sm:block">Max investor rate</div>
            <div>How set</div>
            <div className="hidden sm:block">Minimum / Notes</div>
          </div>
          <div className="divide-y divide-hairline">
            {STATE_RATES.map((s) => {
              const badge = MODEL_LABEL[s.model];
              return (
                <div
                  key={s.state}
                  className="grid grid-cols-[1fr_5.5rem_9.5rem_5.5rem_1fr] items-center gap-x-3 px-4 py-3 text-sm sm:grid-cols-[1fr_5.5rem_11rem_6rem_1.5fr]"
                >
                  <div className="font-600 text-navy">{s.state}</div>
                  <div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-600 ring-1 ${badge.badge}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="hidden font-600 text-ink sm:block">{s.rate}</div>
                  <div className="text-xs text-ink sm:text-sm">{s.how}</div>
                  <div className="hidden text-xs text-ink-muted sm:block">
                    {s.min}
                    {s.note ? <span className="mt-0.5 block leading-snug text-ink-muted/80">{s.note}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-hairline bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">
              <Info className="size-5" />
            </div>
            <div className="text-sm leading-relaxed text-ink">
              <span className="font-600 text-navy">How to read this table.</span>{" "}
              <span className="font-600">Lien</span> states sell the right to collect unpaid taxes;
              the owner repays you with interest, so the rate above is your return ceiling.{" "}
              <span className="font-600">Hybrid</span> states run both a lien sale and a separate
              deed path. <span className="font-600">Deed</span> states sell the property itself and
              pay no investor interest — your return comes from acquiring the property, not from a
              statutory rate. In <span className="font-600">bid-down</span> states bidders compete
              by accepting a lower rate at the auction, so the effective yield is usually well below
              the ceiling. Where the mechanism is <span className="font-600">set by county law</span>,
              the figure is the highest confirmed county rate rather than a statewide cap.
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-ink-muted">
          Sources: state statutes cited to official legislative sources (e.g., A.R.S. Title 42,
          Fla. Stat. Ch. 197, Iowa Code §447.1, 35 ILCS 200/21-215, RSMo §140.340, Ohio Rev. Code Ch.
          5721, D.C. Code §47-1348) and cross-checked Sep 2026. Rules and rates change — always
          verify with the county treasurer before bidding. Not financial advice.
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <QuickLink icon={<MapPin className="size-5" />} title="Browse counties by state" desc="Live jurisdictions and upcoming sales." to="/states" />
          <QuickLink icon={<BookOpen className="size-5" />} title="Investor guides" desc="Lien vs deed, redemption, and due diligence." to="/resources" />
          <QuickLink icon={<Landmark className="size-5" />} title="How auctions work" desc="Bid-down process, deposits, and awards." to="/how-it-works" />
        </div>

        <div className="mt-8">
          <Link to="/" className="text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
        <div className="mt-0.5 font-display font-600 text-navy">{value}</div>
      </div>
    </div>
  );
}

function QuickLink({ icon, title, desc, to }: { icon: React.ReactNode; title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-navy">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">{icon}</div>
      <div>
        <div className="font-600 text-navy">{title}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{desc}</div>
      </div>
    </Link>
  );
}