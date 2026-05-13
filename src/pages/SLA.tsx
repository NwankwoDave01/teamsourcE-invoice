import { Link } from "react-router-dom";

export default function SLA() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to homepage
        </Link>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Service Level Agreement
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            NRS / MBS Compliant E-Invoicing Services
          </h1>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">
            This Service Level Agreement (SLA) defines the operational,
            performance, availability, and compliance commitments provided by
            TeamSource Technologies through the Flow platform for NRS/FIRS
            e-invoicing and financial compliance services.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Platform Uptime", "99.9% availability commitment"],
            ["API Availability", "Secure and reliable API access"],
            ["Real-time Validation", "Instant invoice validation workflows"],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">Service Objectives</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Continuous availability of e-invoicing services",
              "Secure transmission of taxpayer data",
              "High performance API integration with NRS",
              "Real-time invoice validation",
              "Audit-ready compliance operations",
              "Structured invoice standardization",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-slate-950 p-4"
              >
                <p className="text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold">System Integrator (SI)</h2>

            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• ERP/POS invoice extraction</li>
              <li>• NRS schema mapping</li>
              <li>• Invoice validation</li>
              <li>• IRN generation</li>
              <li>• Structured JSON formatting</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold">Application Provider (APP)</h2>

            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• API authentication management</li>
              <li>• Digital invoice signing</li>
              <li>• Secure invoice transmission</li>
              <li>• Validation response processing</li>
              <li>• Audit trail management</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Performance Standards</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-900">
                  <th className="px-5 py-4 text-left">Metric</th>
                  <th className="px-5 py-4 text-left">Target</th>
                </tr>
              </thead>

              <tbody>
                {[
                  ["API Response Time", "≤ 2 seconds"],
                  ["Invoice Submission", "≤ 3 seconds"],
                  ["NRS Acknowledgment", "≤ 5 seconds"],
                  ["Validation Processing", "Real-time"],
                ].map(([metric, value]) => (
                  <tr
                    key={metric}
                    className="border-t border-white/10 bg-slate-950"
                  >
                    <td className="px-5 py-4 text-slate-300">{metric}</td>
                    <td className="px-5 py-4 text-cyan-300">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">System Architecture</h2>

          <div className="mt-6 rounded-2xl bg-slate-950 p-6">
            <p className="text-center text-lg font-semibold text-cyan-300">
              ERP/POS → SI Layer → APP Gateway → NRS Platform → Response → Client System
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Invoice generated in ERP",
              "Mapped to NRS schema",
              "Validation checks performed",
              "Digitally signed",
              "Secure HTTPS transmission",
              "IRN & QR code returned",
            ].map((step) => (
              <div
                key={step}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Incident Management</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-900">
                  <th className="px-5 py-4 text-left">Severity</th>
                  <th className="px-5 py-4 text-left">Response</th>
                  <th className="px-5 py-4 text-left">Resolution</th>
                </tr>
              </thead>

              <tbody>
                {[
                  ["P1", "15 mins", "2 hours"],
                  ["P2", "30 mins", "6 hours"],
                  ["P3", "2 hours", "24 hours"],
                  ["P4", "4 hours", "48 hours"],
                ].map(([level, response, resolution]) => (
                  <tr
                    key={level}
                    className="border-t border-white/10 bg-slate-950"
                  >
                    <td className="px-5 py-4 text-cyan-300">{level}</td>
                    <td className="px-5 py-4 text-slate-300">{response}</td>
                    <td className="px-5 py-4 text-slate-300">{resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">Security & Encryption</h2>

            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• TLS 1.2 / TLS 1.3 encryption</li>
              <li>• HTTPS secure communication</li>
              <li>• Encrypted data storage</li>
              <li>• Digital invoice signing</li>
              <li>• Hash validation & integrity checks</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">API Security</h2>

            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• API Key authentication</li>
              <li>• HMAC-SHA256 request signing</li>
              <li>• Timestamp validation</li>
              <li>• Audit trail logging</li>
              <li>• Secure backend processing</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8">
          <h2 className="text-2xl font-bold">Governance & Compliance</h2>

          <p className="mt-5 max-w-4xl leading-8 text-slate-300">
            TeamSource Technologies maintains compliance with NRS e-Invoicing
            Guidelines, NTAA 2025 requirements, NDPR data protection standards,
            and applicable Nigerian regulatory frameworks for secure invoice
            processing and financial reporting.
          </p>
        </section>
      </div>
    </main>
  );
}