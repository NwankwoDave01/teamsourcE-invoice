
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

const confirmedEndpoints = [
  {
    method: "POST",
    path: "/functions/v1/nrs-submit",
    owner: "TeamSource",
    purpose:
      "Authenticated TeamSource Edge Function that prepares the invoice payload and runs the configured NRS sandbox submission flow.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/validate",
    owner: "NRS sandbox",
    purpose:
      "Validates the standardized invoice payload before signing.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/sign",
    owner: "NRS sandbox",
    purpose:
      "Signs the invoice after successful validation. A successful signing response does not establish APP transmission or clearance.",
  },
];

const pendingItems = [
  "APP endpoint URL and HTTP method",
  "How contractId is transported",
  "Exact APP request and response schemas",
  "Callback or webhook contract and its authentication",
  "Downstream invoice status lifecycle",
  "Any APP-specific secret or authentication requirement",
  "APP acceptance, delivery, and clearance acknowledgement rules",
];

const referenceInvoice = [
  ["Invoice number", "INV-2026-00057"],
  ["Invoice ID", "2c99ae12-9b87-421a-bf0c-af8de49bf679"],
  ["IRN", "INV202600057-A66F5328-20261023"],
  ["Environment", "NRS sandbox"],
  ["Invoice type code", "381"],
  ["Currency", "NGN"],
  ["Subtotal", "100,000.00"],
  ["VAT rate", "7.5%"],
  ["VAT amount", "7,500.00"],
  ["Total payable", "107,500.00"],
  ["Signing result", "HTTP 201; signing successful"],
  ["QR generation", "Reported successful for this reference invoice"],
  ["APP transmission", "Not performed by the documented SI signing flow"],
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
            API documentation
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            TeamSource SI → NRS → APP Integration
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            This document separates the existing, tested TeamSource-to-NRS
            sandbox signing flow from the APP integration that still requires
            a confirmed provider contract. It records verified behavior without
            inventing APP endpoints or claiming that transmission or clearance
            has occurred.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">
              Customer access
            </p>
            <h2 className="mt-2 text-xl font-bold">
              Native TeamSource authentication
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              Authorized users work within their TeamSource company workspace.
              The documented submission function uses authenticated TeamSource
              access; NRS credentials remain server-side.
            </p>
          </article>

          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">
              Current integration
            </p>
            <h2 className="mt-2 text-xl font-bold">
              NRS sandbox validation and signing
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              TeamSource prepares the invoice payload, sends it for validation,
              and then requests signing. QR generation is part of the existing
              signing workflow.
            </p>
          </article>

          <article className="border-t-2 border-amber-300 pt-5">
            <p className="text-sm font-semibold text-amber-200">
              Future integration
            </p>
            <h2 className="mt-2 text-xl font-bold">
              APP transmission and acknowledgement
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              The APP handoff is not confirmed by the successful sandbox
              signing record. Its endpoint, authentication, request contract,
              and response lifecycle must be supplied by the provider.
            </p>
          </article>
        </section>

        <section className="mt-12 border-y border-white/10 py-10">
          <h2 className="text-2xl font-bold">Current confirmed flow</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-5">
            {[
              [
                "01",
                "Authenticate",
                "An authorized user submits through TeamSource.",
              ],
              [
                "02",
                "Build payload",
                "The Edge Function maps invoice and line-item data into the NRS request schema.",
              ],
              [
                "03",
                "Validate",
                "The payload is sent to the configured NRS validation endpoint.",
              ],
              [
                "04",
                "Sign and generate QR",
                "The function requests signing and processes the returned signing result and QR workflow.",
              ],
              [
                "05",
                "Track status",
                "TeamSource stores the resulting invoice status and available signing metadata. APP delivery is separate.",
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="border-l border-white/20 pl-4">
                <p className="font-mono text-sm text-cyan-300">{number}</p>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-400">
            Important: a successful NRS validation or signing response is not
            proof that an invoice has been transmitted to an APP, accepted by
            an APP, or cleared by the relevant authority.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Confirmed endpoint sequence</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            These paths describe the existing integration sequence. The NRS
            paths are relative to the configured NRS base URL. They are not
            complete public URLs and should not be called directly from
            browser code.
          </p>

          <div className="mt-6 space-y-4">
            {confirmedEndpoints.map((endpoint) => (
              <article
                key={endpoint.path}
                className="border border-white/10 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="border border-cyan-400/40 px-2 py-1 font-mono text-xs text-cyan-200">
                    {endpoint.method}
                  </span>
                  <code className="break-all text-sm text-white">
                    {endpoint.path}
                  </code>
                  <span className="text-xs text-slate-400">
                    {endpoint.owner}
                  </span>
                </div>
                <p className="mt-3 leading-7 text-slate-300">
                  {endpoint.purpose}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 border border-white/10 p-5">
            <h3 className="font-semibold">Authentication and secrets</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>
                Call the TeamSource Edge Function using the application's
                configured authenticated request flow.
              </li>
              <li>
                Keep NRS credentials, private keys, certificates, and other
                sensitive integration secrets on the server.
              </li>
              <li>
                Do not publish access tokens, API keys, certificates, private
                keys, or production payloads containing confidential customer
                information in this documentation.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">
              Invoice payload and IRN
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              The existing Edge Function constructs the NRS payload from the
              invoice record, its line items, customer and supplier details,
              applicable tax information, and monetary totals. The generated
              request should be treated as the source of truth for the actual
              serialized payload.
            </p>
            <div className="mt-6 border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reference IRN
              </p>
              <code className="mt-3 block break-all text-cyan-200">
                INV202600057-A66F5328-20261023
              </code>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                This is the IRN recorded for the successful sandbox reference
                invoice. Do not assume that every invoice uses the same value
                or generate IRNs by hardcoding this example.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              Confirmed successful sandbox reference
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              The following values identify a previously successful signing
              record. They are reference evidence, not a reusable invoice
              payload or proof of APP clearance.
            </p>
            <div className="mt-5 overflow-hidden border border-white/10">
              {referenceInvoice.map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="break-words text-sm text-slate-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Confirmed APP onboarding fields
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            These field names are documented as the proposed onboarding
            configuration. Their exact persistence, validation, and transmission
            behavior must be verified against the application implementation
            and the APP's supplied contract.
          </p>
          <div className="mt-6 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingFields.map(([field, description]) => (
              <div key={field} className="bg-slate-950 p-4">
                <code className="break-all text-sm text-cyan-200">
                  {field}
                </code>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border border-white/10 p-5">
            <h3 className="font-semibold">
              How contractId should be treated
            </h3>
            <p className="mt-3 leading-7 text-slate-300">
              <code className="text-cyan-200">contractId</code> identifies the
              TeamSource ↔ APP relationship. It is an integration identifier,
              not a password or API secret. Its exact location in a request,
              header, or URL must not be guessed; use the transport mechanism
              specified by the APP provider.
            </p>
          </div>
        </section>

        <section className="mt-12 border border-amber-300/30 bg-amber-300/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">
            Pending provider confirmation
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            APP transmission is not yet documented as live
          </h2>
          <p className="mt-4 max-w-4xl leading-7 text-slate-300">
            The existing successful NRS sandbox signing flow must remain
            distinct from the future APP integration. Do not add speculative
            APP URLs, authentication headers, payload fields, or status
            transitions. Confirm the following details with the APP provider
            before implementing or describing the handoff as operational.
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {pendingItems.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm text-slate-200"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm leading-6 text-slate-400">
          Documentation scope: current TeamSource-to-NRS sandbox validation
          and signing behavior, plus pending APP integration requirements.
          This page does not replace the provider's API specification or
          authorize changes to the invoice submission workflow.
        </footer>
      </div>
    </main>
  );
}
