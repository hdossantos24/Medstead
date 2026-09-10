import Link from "next/link";
import { InstallHint } from "@/components/install-hint";
import { CopyAddress } from "@/components/copy-address";
import { Icon } from "@/components/icons";
import { Badge, Button, Card } from "@/components/ui";
import {
  CONTACT_ORDERS,
  HOW_IT_WORKS,
  SERVICES,
  TAGLINE,
  WAREHOUSE,
  warehouseAddressFor,
} from "@/lib/constants";

export default function HomePage() {
  const sampleAddress = warehouseAddressFor("Your Full Name");

  return (
    <div>
      <InstallHint />
      <section className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-semibold text-brand-green-light">
              Now accepting shipments — Freeport, Nassau, and hard-to-reach destinations.
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              Ship medical cargo <span className="text-brand-green-light">Faster.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              Send packages to our Fort Lauderdale warehouse and we forward them — Express Air,
              Standard Sea, Freeport &amp; Nassau pickup, and customs support included. Bahamas
              freight is a live product. Hard-to-reach medical transport is too.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/book" variant="green">
                Get Started Free
              </Button>
              <Button href="/book" variant="blue">
                Get a Quote
              </Button>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-8 text-navy-950 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/medstead-logo.png" alt="MedStead Transport" className="mx-auto h-52 w-auto sm:h-60" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                  Invoice / pay later
                </p>
                <p className="mt-1 text-sm font-semibold">No card charged here</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                  3–7 days
                </p>
                <p className="mt-1 text-sm font-semibold">FLL → destination</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 text-sm text-white/80 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            <p>3–5 days Express Air</p>
            <p>5–7 days Standard Sea</p>
            <p>FLL hub → Freeport &amp; Nassau</p>
            <p>24/7 live tracking</p>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">
          What we offer
        </p>
        <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-navy-950 md:text-4xl">
          Our Services
        </h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-green" />
        <p className="mx-auto mt-4 max-w-2xl text-center text-navy-800/70">
          Everything you need to ship from the US to the Bahamas and other hard-to-reach
          destinations — all in one place.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Card
              key={s.id}
              className={`p-6 ${"highlight" in s && s.highlight ? "border-t-4 border-t-brand-green" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
                    s.badgeTone === "green" ? "bg-forest-100 text-forest-700" : "bg-blue-50 text-brand-blue"
                  }`}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                {s.badge && <Badge tone={s.badgeTone}>{s.badge}</Badge>}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-navy-950">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-navy-800/70">{s.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-navy-950">Four steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step}>
                <p className="text-sm font-semibold text-brand-green">{step.step}</p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-800/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-navy-900/10 bg-navy-950 text-white">
          <div className="bg-brand-green px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em]">
            Your US address
          </div>
          <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div>
              <p className="text-lg font-semibold leading-8">{sampleAddress}</p>
              <p className="mt-3 text-sm text-white/70">
                Orders: {CONTACT_ORDERS} · Hub: {WAREHOUSE.city}, {WAREHOUSE.state}
              </p>
            </div>
            <div className="md:justify-self-end">
              <CopyAddress text={sampleAddress} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-light">
            Hard-to-reach medical transport
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            Medicine and supplies to communities other networks leave behind.
          </h2>
          <p className="mt-4 max-w-2xl text-white/70">
            This is a freight product, not a pharmacy. There is no drug catalog on this site. Book
            medical cargo the same way you book Bahamas freight. {TAGLINE}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/book" variant="green">
              Book medical cargo
            </Button>
            <Link href={`mailto:${CONTACT_ORDERS}`} className="inline-flex min-h-tap items-center text-sm font-semibold text-white/80 hover:text-white">
              {CONTACT_ORDERS}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
