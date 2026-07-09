import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, Wallet, Gavel, Coins } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Chicago TaxLien Auctions" },
      { name: "description", content: "Learn how to register, fund your account, bid on tax lien certificates, and collect returns." },
      { property: "og:title", content: "How Tax Lien Auctions Work" },
      { property: "og:description", content: "The four steps from registration to redemption." },
      { property: "og:url", content: "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const steps = [
    { icon: UserPlus, title: "Register", body: "Create an account and complete bidder verification for the counties you want to participate in." },
    { icon: Wallet, title: "Fund", body: "Deposit funds securely. Your deposit determines your bidding capacity for the auction." },
    { icon: Gavel, title: "Bid", body: "Bid down the interest rate on liens you want. Lowest rate wins the certificate." },
    { icon: Coins, title: "Collect", body: "When the property owner redeems, you collect the tax amount plus accrued interest." },
  ];
  return (
    <div className="container-tight py-16">
      <h1 className="font-display text-4xl font-600 text-navy sm:text-5xl">How It Works</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">Four steps from account creation to earning interest on secured tax lien certificates.</p>
      <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-hairline bg-surface p-5">
            <div className="grid size-10 place-items-center rounded-lg bg-navy text-gold"><s.icon className="size-5" strokeWidth={1.75} /></div>
            <div className="mt-4 text-xs font-600 uppercase tracking-wider text-ink-muted">Step {i + 1}</div>
            <div className="mt-1 font-display text-lg font-600 text-navy">{s.title}</div>
            <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <Link to="/auth" className="mt-10 inline-flex items-center rounded-md bg-gold px-5 py-2.5 text-sm font-600 text-navy hover:bg-gold-soft">Create your account</Link>
    </div>
  );
}