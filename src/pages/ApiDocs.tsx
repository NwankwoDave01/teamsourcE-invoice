
import { Link } from "react-router-dom";

const endpoints = [
  {
    method: "POST",
    path: "/functions/v1/nrs-submit",
    owner: "TeamSource",
    description:
      "Prepares invoice data, constructs the NRS payload, submits it for validation and signing, and processes the signed result and QR generation.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/validate",
    owner: "NRS",
    description:
      "Validates the invoice payload before the signing request.",
  },
  {
    method: "POST",
    path: "/api/v1/invoice/sign",
    owner: "NRS",
    description:
      "Signs the invoice after successful validation.",
  },
];

const payload = {
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
      street_name:
        "5th floor, Gil Group Plaza, Gbolahan Lawal Close",
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

const testResults = [
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
  ["Invoice status", "Signed"],
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

        <header className="mt-10 border-b border-white/10 pb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Technical API Documentation
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            TeamSource System Integrator API
          </h1>
          <p className="mt-4 max-w-4xl leading-7 text-slate-300">
            TeamSource integrates with the NRS e-invoicing service as a
            System Integrator (SI). The integration prepares invoice data,
            submits it for validation, requests signing, and processes the
            signed result and QR-generation workflow.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Integration workflow</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7 text-slate-300">
            <li>An authorized user initiates invoice submission in TeamSource.</li>
            <li>The server-side function reads invoice, supplier, customer, line-item, tax, and monetary records.</li>
            <li>TeamSource constructs the NRS invoice payload and submits it for validation.</li>
            <li>Following successful validation, TeamSource requests NRS signing.</li>
            <li>The signing result is processed and the invoice QR-generation workflow runs.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">API endpoints and methods</h2>
          <div className="mt-5 space-y-4">
            {endpoints.map((endpoint) => (
              <article
                key={endpoint.path}
                className="border border-white/10 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="border border-cyan-400/40 px-2 py-1 font-mono text-xs text-cyan-200">
                    {endpoint.method}
                  </span>
                  <code className="break-all text-sm">
                    {endpoint.path}
                  </code>
                  <span className="text-xs text-slate-400">
                    {endpoint.owner}
                  </span>
                </div>
                <p className="mt-3 leading-7 text-slate-300">
                  {endpoint.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            NRS endpoint paths are relative to the configured NRS service
            base URL. NRS requests are made server-side.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Authentication and security</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-300">
            <li>TeamSource submission requests use the application's configured authentication flow.</li>
            <li>NRS credentials and signing secrets remain server-side.</li>
            <li>Access tokens, API secrets, and private keys must not be exposed in public documentation.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Example NRS invoice payload</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This sandbox invoice payload includes the invoice references,
            dates, currency, supplier and customer details, payment means,
            tax calculations, monetary totals, and invoice-line details.
          </p>

          <div className="mt-5 border border-white/10 bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-300">JSON request body</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    JSON.stringify(payload, null, 2),
                  );
                }}
                className="border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
              >
                Copy JSON
              </button>
            </div>
            <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap break-words border border-white/10 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
              <code>{JSON.stringify(payload, null, 2)}</code>
            </pre>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">IRN and QR Code processing</h2>
          <p className="mt-3 leading-7 text-slate-300">
            TeamSource generates the Invoice Reference Number (IRN) using
            the invoice number, NRS service ID, and invoice issue date.
            Following successful NRS signing, the integration processes
            the signing result and QR-generation workflow for the invoice.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-300">
            <li>The IRN follows the configured NRS reference format.</li>
            <li>The IRN is associated with the invoice submitted for signing.</li>
            <li>The signed invoice workflow processes QR generation.</li>
            <li>The rendered invoice should display the corresponding IRN and QR Code.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Successful sandbox test results</h2>
          <div className="mt-5 overflow-hidden border border-white/10">
            {testResults.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
              >
                <span className="text-sm text-slate-400">{label}</span>
                <span className="break-words text-sm text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 border border-white/10 p-5">
          <h2 className="text-2xl font-bold">Payload field coverage</h2>
          <p className="mt-3 leading-7 text-slate-300">
            The payload documents business and invoice references, issue
            and due dates, invoice type, currencies, supplier and customer
            parties, delivery date, payment means, tax totals and subtotals,
            legal monetary totals, and invoice lines containing
            classification, quantity, price, discount, and line amount.
          </p>
          <p className="mt-3 leading-7 text-slate-300">
            Optional NRS fields such as notes, order and document references,
            delivery periods, and allowances or charges are supplied when
            applicable to the invoice and supported by the NRS schema.
          </p>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
          TeamSource SI integration · NRS sandbox validation and signing
        </footer>
      </div>
    </main>
  );
}
