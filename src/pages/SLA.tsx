import { Link } from "react-router-dom";

export default function SLA() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to homepage
        </Link>

        {/* 1. Header & Intro */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Service Level Agreement
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            NRS / MBS Compliant E-Invoicing Services
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-white/10 py-4">
            <span className="text-slate-400">Public Access:</span>
            <a href="https://teamsource.net/sla" className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-200">
              teamsource.net/sla
            </a>
          </div>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">
            This Service Level Agreement (SLA) defines the service commitments of Teamsource Technologies 
            (Accredited SI & APP) in delivering e-Invoicing services to taxpayers under the Nigeria Revenue 
            Service (NRS) Electronic Fiscal System via the Merchant Buyer Solution (MBS) platform. 
            NRS e-invoicing mandates that all invoices must be generated, validated, and transmitted 
            electronically before they are legally valid.
          </p>
        </section>

        {/* 2. Service Objectives & Availability */}
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Platform Uptime", "≥ 99.9% availability commitment"],
            ["API Availability", "≥ 99.9% secure and reliable access"],
            ["Maintenance Window", "00:00 – 04:00 WAT (Daily)"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </section>

        {/* 3. Scope of Services (SI & APP) */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-cyan-300">System Integrator (SI)</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• Extract invoice data from ERP/POS systems</li>
              <li>• Map data to NRS schema (UBL / JSON format)</li>
              <li>• Generate Invoice Reference Number (IRN)</li>
              <li>• Validate invoice data before submission</li>
              <li>• Standardize invoices into required format</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold text-cyan-300">Application Provider (APP)</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              <li>• Authenticate and manage API access</li>
              <li>• Digitally sign invoices</li>
              <li>• Transmit invoices securely to NRS</li>
              <li>• Receive validation response (QR code, CSID)</li>
              <li>• Maintain transaction logs and audit trails</li>
            </ul>
          </div>
        </section>

        {/* 4. Performance Standards Table */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Performance Standards</h2>
          <p className="mt-2 text-slate-400 text-sm italic">Invoices must be transmitted and validated instantly per NRS requirements.</p>
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
                  ["Failover Capability", "Automatic"],
                ].map(([metric, value]) => (
                  <tr key={metric} className="border-t border-white/10 bg-slate-950">
                    <td className="px-5 py-4 text-slate-300">{metric}</td>
                    <td className="px-5 py-4 text-cyan-300 font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. System Architecture & Process Flow */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">Data Flow Architecture</h2>
          <div className="mt-6 rounded-2xl bg-slate-950 p-6 border border-cyan-400/10">
            <p className="text-center text-lg font-semibold text-cyan-300">
              ERP/POS → SI Layer → APP Gateway → NRS Platform → Response → Client System
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold mb-4">Process Flow</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex gap-3"><span className="text-cyan-300">01</span> Invoice generated in ERP/POS</li>
                <li className="flex gap-3"><span className="text-cyan-300">02</span> Data mapped to NRS (UBL/JSON)</li>
                <li className="flex gap-3"><span className="text-cyan-300">03</span> Validation checks & Digital Signing</li>
                <li className="flex gap-3"><span className="text-cyan-300">04</span> Secure API Transmission (HTTPS)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">NRS Response Includes:</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex gap-3 text-cyan-50">✓ Invoice Reference Number (IRN)</li>
                <li className="flex gap-3 text-cyan-50">✓ QR Code</li>
                <li className="flex gap-3 text-cyan-50">✓ Cryptographic Stamp</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Incident Management Table */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Incident Management</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-900">
                  <th className="px-5 py-4 text-left">Severity</th>
                  <th className="px-5 py-4 text-left">Description</th>
                  <th className="px-5 py-4 text-left">Response</th>
                  <th className="px-5 py-4 text-left">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["P1", "Full outage", "15 mins", "2 hours"],
                  ["P2", "Major disruption", "30 mins", "6 hours"],
                  ["P3", "Partial issue", "2 hours", "24 hours"],
                  ["P4", "Minor issue", "4 hours", "48 hours"],
                ].map(([level, desc, response, resolution]) => (
                  <tr key={level} className="border-t border-white/10 bg-slate-950">
                    <td className="px-5 py-4 text-cyan-300 font-bold">{level}</td>
                    <td className="px-5 py-4 text-slate-300">{desc}</td>
                    <td className="px-5 py-4 text-slate-300">{response}</td>
                    <td className="px-5 py-4 text-slate-300">{resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Security & Data Management Grid */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold mb-5">Security & API Safety</h2>
            <ul className="space-y-3 text-slate-300">
              <li>• TLS 1.2 / 1.3 & HTTPS encryption</li>
              <li>• HMAC-SHA256 request signing</li>
              <li>• API Key authentication & Anti-replay</li>
              <li>• Hash validation for Data Integrity</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold mb-5">Data Management</h2>
            <ul className="space-y-3 text-slate-300">
              <li>• Daily backup frequency</li>
              <li>• Retention per NRS law standards</li>
              <li>• 100% Audit Log capture</li>
              <li>• UBL / JSON / XML standardization</li>
            </ul>
          </div>
        </section>

        {/* 8. Infrastructure, Support & Compliance */}
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">Infrastructure</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Integrated with Microsoft Azure Cloud, Zoho ERP, and redundant secure API gateways for enterprise-grade delivery.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">Support Services</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              24/7 technical support and real-time monitoring via Email, Phone, and Ticket-based helpdesk systems.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">Service Credits</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Uptime &lt; 99.9%: 5% Credit<br/>
              Uptime &lt; 98%: 10% Credit<br/>
              Uptime &lt; 95%: 20% Credit
            </p>
          </div>
        </section>

        {/* 9. Taxpayer Responsibilities */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Customer (Taxpayer) Responsibilities</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Provide accurate and truthful invoice data",
              "Maintain compatible internal ERP/POS systems",
              "Ensure proper usage of provided APIs",
              "Comply with all active Nigeria tax regulations",
            ].map((resp) => (
              <div key={resp} className="flex items-start gap-3 text-slate-300">
                <span className="text-cyan-300 mt-1">→</span>
                <p>{resp}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Governance & Final Declaration */}
        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8">
          <h2 className="text-2xl font-bold">Governance & Accredited Declaration</h2>
          <p className="mt-5 max-w-4xl leading-8 text-slate-300">
            Teamsource Technologies confirms full compliance with NRS & MBS standards as a capable SI & APP provider. 
            All taxpayer data is protected under the Nigeria Data Protection Regulation (NDPR) and NRS policies. 
            This SLA is governed by the Nigeria Tax Administration Act (NTAA 2025) and NRS e-Invoicing Guidelines.
          </p>
          
          {/* Approval Section */}
          <div className="mt-10 grid gap-8 border-t border-white/10 pt-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase text-cyan-300">Teamsource Technologies</p>
              <div className="mt-4 h-px w-full bg-white/20"></div>
              <p className="mt-2 text-xs text-slate-500">Authorized Signatory & Date</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-cyan-300">Taxpayer / NRS Authority</p>
              <div className="mt-4 h-px w-full bg-white/20"></div>
              <p className="mt-2 text-xs text-slate-500">Authorized Signatory & Date</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}