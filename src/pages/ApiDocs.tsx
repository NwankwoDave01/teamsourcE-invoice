
import { Link } from "react-router-dom";

const confirmedEndpoints = [
  {
    method: "POST",
    path: "/functions/v1/nrs-submit",
    owner: "TeamSource",
    purpose:
      "Authenticated application endpoint. It reads the invoice data, constructs the NRS payload, calls validation and signing, and processes the result and QR-generation workflow.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/validate",
    owner: "NRS sandbox",
    purpose:
      "Receives the standardized invoice JSON for validation before signing.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/sign",
    owner: "NRS sandbox",
    purpose:
      "Receives the invoice JSON for signing after successful validation.",
  },
];

const successfulSandboxPayload = {
  business_id: "57d0935f-5328-4476-9fbf-100c616e4358",
  irn: "INV202600057-A66F5328-20261023",
  issue_date: "2026-10-23",
  due_date: "2026-11-22",
  invoice_type_code: "381",
  invoice_kind: "B2B",
  payment_status: "PENDING",
  tax_point_date: "2026-10-26",
  document_currency_code: "NGN",
  tax_currency_code: "NGN",
  accounting_cost: "100000",
  buyer_reference: "Gibadi",
  accounting_supplier_party: {
    party_name: "Teamsource Institute",
    tin: "24086119-0001",
    email: "support@teamsource.net",
    telephone: "+2348124279747",
    business_description: "Other",
    postal_address: {
      street_name: "5th floor, Gil Group Plaza, Gbolahan Lawal Close",
      city_name: "Lagos",
      postal_zone: "100001",
      state: "Lagos",
      country: "NG",
    },
  },
  accounting_customer_party: {
    party_name: "Gibadi",
    tin: "18195809-0001",
    email: "support@gibadi.com",
    telephone: "+2348085934222",
    postal_address: {
      street_name: "5th Floor, Gbolahan Lawal Close Alausa",
      city_name: "Lagos",
      postal_zone: "100001",
      lga: "ikeja",
      state: "Lagos",
      country: "NG",
    },
  },
  actual_delivery_date: "2026-10-26",
  payment_means: [
    {
      payment_means_code: "10",
      payment_due_date: "2026-11-22",
    },
  ],
  tax_total: [
    {
      tax_amount: 7500,
      tax_subtotal: [
        {
          taxable_amount: 100000,
          tax_amount: 7500,
          tax_category: {
            id: "STANDARD_VAT",
            percent: 7.5,
          },
        },
      ],
    },
  ],
  legal_monetary_total: {
    line_extension_amount: 100000,
    tax_exclusive_amount: 100000,
    tax_inclusive_amount: 107500,
    payable_amount: 107500,
  },
  invoice_line: [
    {
      position: 0,
      hsn_code: "5913.00",
      product_category:
        "Motion picture, video and television programme distribution activities",
      discount_rate: 0,
      discount_amount: 0,
      fee_rate: 0,
      fee_amount: 0,
      invoiced_quantity: 1,
      line_extension_amount: 100000,
      item: {
        name: "Marketing",
        description: "Marketing",
        sellers_item_identification:
          "a4a64937-82ee-4615-a21a-ec1133decaa8",
      },
      price: {
        price_amount: 100000,
        base_quantity: 1,
        price_unit: "EA",
      },
    },
  ],
};

const referenceResults = [
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
  ["NRS signing response", "HTTP 201; { ok: true }"],
  ["Recorded invoice status", "Signed"],
  ["QR generation", "Reported successful"],
];

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Back to homepage
        </Link>

        <header className="mt-10 border-b border-white/10 pb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Technical API documentation
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            TeamSource System Integrator API
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            TeamSource operates as a System Integrator (SI). The application
            prepares invoice data, constructs the NRS invoice payload, submits
            it for validation, requests signing, and processes the signing
            result and QR-generation workflow. This document describes the
            existing TeamSource-to-NRS integration.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">
              01 · Authentication
            </p>

            <h2 className="mt-2 text-xl font-bold">
              TeamSource workspace
            </h2>

            <p className="mt-3 leading-7 text-slate-300">
              Authorized users work inside their TeamSource company workspace.
              Requests to the submission function use the application's
              authenticated request flow.
            </p>
          </article>

          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">
              02 · Validation
            </p>

            <h2 className="mt-2 text-xl font-bold">
              NRS invoice validation
            </h2>

            <p className="mt-3 leading-7 text-slate-300">
              The server-side integration builds the invoice JSON from the
              relevant invoice, supplier, customer, line-item, tax, and
              monetary records, then sends it to NRS for validation.
            </p>
          </article>

          <article className="border-t-2 border-cyan-400 pt-5">
            <p className="text-sm font-semibold text-cyan-300">
              03 · Signing
            </p>

            <h2 className="mt-2 text-xl font-bold">
              Signed invoice and QR
            </h2>

            <p className="mt-3 leading-7 text-slate-300">
              Following successful validation, TeamSource requests NRS signing
              and processes the signing response and QR-generation workflow.
            </p>
          </article>
        </section>

        <section className="mt-12 border-y border-white/10 py-10">
          <h2 className="text-2xl font-bold">
            Confirmed SI processing flow
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-5">
            {[
              [
                "01",
                "Authenticate",
                "An authorized user initiates the submission in TeamSource.",
              ],
              [
                "02",
                "Prepare",
                "The Edge Function reads the invoice and related records.",
              ],
              [
                "03",
                "Validate",
                "The generated invoice JSON is sent to the NRS validation endpoint.",
              ],
              [
                "04",
                "Sign",
                "The integration requests signing after successful validation.",
              ],
              [
                "05",
                "Generate QR",
                "The function processes the signing result and QR-generation workflow.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="border-l border-white/20 pl-4"
              >
                <p className="font-mono text-sm text-cyan-300">
                  {number}
                </p>

                <h3 className="mt-2 font-semibold">{title}</h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-400">
            The successful reference invoice below confirms a recorded
            successful signing response and QR-generation result. It does
            not mean that this historical invoice should be submitted again.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            API endpoints and methods
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-slate-300">
            The TeamSource Edge Function is the application-facing entry point.
            The NRS endpoints are called by the server-side function using
            the configured NRS base URL. The NRS paths below are relative
            paths, not standalone public URLs.
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
            <h3 className="font-semibold">
              Authentication and security
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>
                Authenticate requests to the TeamSource Edge Function
                through the application's configured authentication flow.
              </li>
              <li>
                NRS credentials and sensitive signing material must remain
                server-side.
              </li>
              <li>
                Do not expose access tokens, API secrets, private keys,
                or confidential credentials in public documentation.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Successful NRS sandbox invoice payload
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-slate-300">
            This example uses the actual stored invoice values from
            TeamSource invoice INV-2026-00057 and follows the field names
            and nesting produced by the current TeamSource payload builder.
            Optional fields that were absent from the invoice have not
            been populated with unrelated placeholder data.
          </p>

          <div className="mt-6 border border-white/10 bg-slate-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-cyan-200">
                  NRS invoice JSON
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Historical sandbox example · NGN · Total 107,500.00
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      JSON.stringify(successfulSandboxPayload, null, 2),
                    )
                    .catch(() => {
                      // Clipboard access may be unavailable in some browsers.
                    });
                }}
                className="border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
              >
                Copy JSON
              </button>
            </div>

            <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap break-words rounded border border-white/10 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
              <code>
                {JSON.stringify(successfulSandboxPayload, null, 2)}
              </code>
            </pre>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Important: this is a reconstructed reference payload based on
            the stored invoice and the current payload builder. It is not
            a byte-for-byte capture of the original successful Postman
            request. Confirm it against the captured request body and the
            official NRS schema before describing every field as
            independently schema-verified.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Successful sandbox test result
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-slate-300">
            The following values are recorded for the successful reference
            invoice. They provide test evidence for the documented SI
            workflow.
          </p>

          <div className="mt-6 overflow-hidden border border-white/10">
            {referenceResults.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
              >
                <span className="text-sm text-slate-400">
                  {label}
                </span>

                <span className="break-words text-sm text-slate-200">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border border-white/10 p-6">
          <h2 className="text-2xl font-bold">
            Payload structure and data integrity
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            The uploaded Postman example illustrates the broader NRS JSON
            structure, including optional document references, delivery
            periods, payment information, allowances, tax subtotals,
            monetary totals, and invoice lines. Those optional properties
            should be included in an actual invoice request when applicable
            and supported by the relevant invoice data. They should not
            be populated with unrelated dummy values merely to make an
            example appear complete.
          </p>

          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
            <li>
              Invoice numbers, IRNs, dates, amounts, and line identifiers
              must correspond to the relevant invoice.
            </li>
            <li>
              Tax subtotals and monetary totals must agree with the
              invoice's actual calculations.
            </li>
            <li>
              A historical IRN must not be reused for a new invoice.
            </li>
            <li>
              The original successful request and the official NRS
              schema are the sources of truth for final payload
              conformance.
            </li>
          </ul>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm leading-6 text-slate-400">
          Documentation scope: TeamSource System Integrator authentication,
          NRS sandbox validation, signing, invoice payload structure, and
          QR-generation workflow. This documentation does not modify the
          invoice submission function or database.
        </footer>
      </div>
    </main>
  );
}
