import { Link } from "react-router-dom";

const onboardingFields = [
  ["businessAddress", "Full registered business address"],
  ["businessAddressLg", "Local government area"],
  ["businessAddressStreetName", "Registered street name"],
  ["businessCity", "Registered business city"],
  ["businessCountry", "Business country code"],
  ["businessPostalCode", "Registered postal code"],
  ["businessState", "Registered business state"],
  ["contactEmail", "Operational contact email"],
  ["entityFirsId", "Entity FIRS identifier"],
  ["businessFirsId", "Business FIRS identifier"],
  ["businessWebhookUrl", "Proposed callback destination"],
  ["contractId", "TeamSource ↔ APP relationship identifier"],
];

const pendingItems = [
  "APP endpoint URL and HTTP method",
  "How contractId is transported",
  "Exact APP request and response schemas",
  "Callback or webhook contract and its authentication",
  "Downstream invoice status lifecycle",
  "Any APP-specific secret or authentication requirement",
];

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to homepage
        </Link>

        <header className="mt-10 border-b border-white/10 pb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Integration brief
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            TeamSource SI → APP Architecture
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            A factual overview for general managers and implementation stakeholders. This page documents
            what is confirmed and separates it from the APP contract details still required for launch.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">Customer access</p>
            <h2 className="mt-2 text-xl font-bold">Native TeamSource authentication</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Customers sign in to TeamSource and work inside their company workspace. No separate taxpayer
              portal login is part of the confirmed flow.
            </p>
          </article>
          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">TeamSource role</p>
            <h2 className="mt-2 text-xl font-bold">System Integrator</h2>
            <p className="mt-3 leading-7 text-slate-300">
              TeamSource captures, validates, and standardizes invoice information using the standard NRS
              invoice schema.
            </p>
          </article>
          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">Handoff</p>
            <h2 className="mt-2 text-xl font-bold">Configured APP</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Approved invoices are intended to be sent to the configured Access Point Provider. The APP
              contract needed for that handoff has not yet been confirmed.
            </p>
          </article>
        </section>

        <section className="mt-12 border-y border-white/10 py-10">
          <h2 className="text-2xl font-bold">Confirmed operating flow</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Sign in", "The customer uses native TeamSource authentication."],
              ["02", "Prepare", "TeamSource maps the invoice to the standard NRS invoice schema."],
              ["03", "Approve", "The invoice completes the existing internal workflow."],
              ["04", "Handoff", "The approved invoice is intended for the configured APP."],
            ].map(([number, title, text]) => (
              <div key={number} className="border-l border-white/20 pl-4">
                <p className="font-mono text-sm text-cyan-300">{number}</p>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Invoice payload and IRN</h2>
            <p className="mt-4 leading-7 text-slate-300">
              The invoice payload remains based on the standard NRS invoice schema. TeamSource can preview
              this standardized payload before any APP handoff.
            </p>
            <div className="mt-6 border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">IRN format</p>
              <code className="mt-3 block overflow-x-auto text-cyan-200">
                invoice number + Service ID + YYYYMMDD
              </code>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Contract identifier</h2>
            <p className="mt-4 leading-7 text-slate-300">
              <code className="text-cyan-200">contractId</code> identifies the TeamSource ↔ APP
              relationship. It is an integration identifier, not a password, API key, or secret.
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Its exact location in an APP request remains pending until the transport contract is supplied.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Confirmed APP onboarding fields</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            These names are confirmed for onboarding. Their final server-side storage and transmission are
            pending the APP contract.
          </p>
          <div className="mt-6 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingFields.map(([field, description]) => (
              <div key={field} className="bg-slate-950 p-4">
                <code className="text-sm text-cyan-200">{field}</code>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border border-amber-300/30 bg-amber-300/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">Not live</p>
          <h2 className="mt-2 text-2xl font-bold">APP contract details are still pending</h2>
          <p className="mt-4 max-w-4xl leading-7 text-slate-300">
            The APP integration cannot be treated as live until the provider confirms the following items.
            TeamSource does not publish or imply substitute endpoints while these details remain open.
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {pendingItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-slate-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}