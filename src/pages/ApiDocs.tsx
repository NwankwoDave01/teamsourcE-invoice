import { Link } from "react-router-dom";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/invoices/validate",
    description: "Validate invoice data against NRS/FIRS compliance rules before submission.",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/submit",
    description: "Submit a validated invoice payload for NRS processing.",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/{irn}/status",
    description: "Retrieve the latest validation/submission status for an invoice.",
  },
];

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to homepage
        </Link>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Developer Documentation
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Flow API Documentation
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Flow by TeamSource provides secure API access for e-invoicing,
            invoice validation, IRN generation, submission tracking, and NRS/FIRS
            compliance workflows.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Authentication", "API Key, client secret, and secure backend authentication."],
            ["Environment", "Sandbox and production environments for staged testing."],
            ["Security", "HTTPS, TLS encryption, signed requests, and audit trails."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">Base URLs</h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-sm text-cyan-200">
              Sandbox: https://sandbox-api.flow.teamsource.net
            </div>
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-sm text-cyan-200">
              Production: https://api.flow.teamsource.net
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            Final base URLs may vary depending on NRS/FIRS onboarding configuration.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Available Endpoints</h2>

          <div className="mt-6 space-y-4">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.path}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-cyan-400 px-3 py-1 text-sm font-bold text-slate-950">
                    {endpoint.method}
                  </span>
                  <code className="text-cyan-200">{endpoint.path}</code>
                </div>
                <p className="mt-3 text-slate-300">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">Sample Request</h2>

            <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-cyan-200">
{`{
  "invoiceNumber": "INV-2026-00016",
  "invoiceTypeCode": "380",
  "transactionType": "B2B",
  "currencyCode": "NGN",
  "supplier": {
    "tin": "NG-12345678",
    "legalName": "TeamSource Technologies"
  },
  "buyer": {
    "tin": "NG-87654321",
    "legalName": "Sample Buyer Ltd"
  },
  "lines": [
    {
      "description": "Consulting Service",
      "quantity": 1,
      "unitCode": "EA",
      "unitPrice": 20000,
      "taxRate": 7.5
    }
  ]
}`}
            </pre>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">Sample Response</h2>

            <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-cyan-200">
{`{
  "status": true,
  "message": "Invoice validated successfully",
  "data": {
    "irn": "INV202600016-SVC001-20260506",
    "submissionStatus": "validated",
    "qrCode": "base64-encoded-qr-data",
    "csid": "NRS-CSID-123456"
  }
}`}
            </pre>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Response Codes</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["200", "Request processed successfully."],
              ["400", "Invalid request or missing invoice fields."],
              ["401", "Authentication failed."],
              ["403", "User is not authorized to perform this action."],
              ["422", "Invoice validation failed."],
              ["500", "Server or integration error."],
            ].map(([code, text]) => (
              <div key={code} className="rounded-xl bg-slate-900 p-4">
                <p className="font-mono text-cyan-300">{code}</p>
                <p className="mt-1 text-sm text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8">
          <h2 className="text-2xl font-bold">Security Notice</h2>
          <p className="mt-4 max-w-4xl text-slate-300">
            API keys, client secrets, certificates, and private keys must never be
            exposed in frontend applications. All NRS/FIRS API communication is
            handled through secure backend services and Supabase Edge Functions.
          </p>
        </section>
      </div>
    </main>
  );
}