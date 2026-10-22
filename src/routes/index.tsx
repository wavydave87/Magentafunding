import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Calculator, FileCheck2 } from "lucide-react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magenta Portal — Funding Offers & Partner Applications" },
      {
        name: "description",
        content:
          "The internal Magenta tool for building funding offers, sending them as a secure link, and recording every client acceptance.",
      },
      { property: "og:title", content: "Magenta Portal" },
      {
        property: "og:description",
        content:
          "Build funding offers, send them as a secure link, and record every client acceptance.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Calculator,
    title: "Live offer math",
    body: "Presets, payments, fees and early-payoff savings recalculate as you type — the same formulas as the original tool.",
  },
  {
    icon: ShieldCheck,
    title: "Commission stays internal",
    body: "Buy rate and upsell never leave the rep dashboard. Clients only ever see the derived sell rate.",
  },
  {
    icon: FileCheck2,
    title: "A real record",
    body: "Every acceptance and uploaded closing document is stored against the deal, not lost in an email thread.",
  },
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader
        right={
          <Button asChild>
            <Link to="/auth">Rep sign in</Link>
          </Button>
        }
      />

      <main className="flex-1">
        <section className="bg-brand-wash">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Internal tool
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">
              <span className="text-brand-gradient">Client offers</span> that are a
              link, not an attachment.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Build the structure once, send one secure offer page, and see the
              moment a merchant accepts and uploads their closing documents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Sign in to build an offer</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-elevated p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-xl">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <BrandFooter />
    </div>
  );
}
