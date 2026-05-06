import { Link } from "react-router-dom";

export default function LandingPage() {
  const modules = [
    ["E-Invoicing", "Create, validate, approve, and prepare invoices for NRS/FIRS compliance.", "Live"],
    ["Tax Management", "Track VAT, tax summaries, and compliance reports from one place.", "Coming soon"],
    ["Expense Tracking", "Monitor business expenses, categorize spending, and improve visibility.", "Coming soon"],
    ["Financial Reports", "View revenue, tax, invoice, and customer performance insights.", "Coming soon"],
    ["Payment Reconciliation", "Match payments with invoices and reduce manual follow-up.", "Coming soon"],
    ["API Integrations", "Connect accounting, ERP, and business systems through secure APIs.", "Planned"],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-2xl font-bold">Vexa</div>

        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#products" className="hover:text-white">Products</a>
          <a href="#api" className="hover:text-white">API Docs</a>
          <a href="#sla" className="hover:text-white">SLA</a>
          <a href="#compliance" className="hover:text-white">Compliance</a>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/auth/login" className="text-sm text-slate-300 hover:text-white">
            Sign in
          </Link>
          <Link
            to="/auth/signup"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Financial Compliance & Operations Platform
          </p>
          <h1 className="text-5xl font-bold leading-tight lg:text-6xl">
            Modern financial operations built for Nigerian businesses.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Create invoices, manage tax-ready records, approve internally, and prepare
            your business for NRS/FIRS e-invoicing compliance — all from one secure platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              NRS/FIRS Ready
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
              Built for B2B/B2G invoicing
            </span>
          </div>

          <div className="mt-8 flex gap-4">
            <Link
              to="/auth/signup"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
            >
              Start now
            </Link>
            <a
              href="#api"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white"
            >
              View API docs
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold">Compliance Dashboard</h3>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                NRS Ready
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Invoices</p>
                <p className="text-2xl font-bold">248</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Validation Rate</p>
                <p className="text-2xl font-bold">96.4%</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="text-2xl font-bold">₦12.8M</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Product Modules
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            One platform for invoicing, compliance, tax, and financial operations.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {modules.map(([title, text, tag]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">{title}</h3>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {tag}
                </span>
              </div>
              <p className="text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="compliance" className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-cyan-400 p-8 text-slate-950 lg:col-span-1">
          <h2 className="text-3xl font-bold">Built for compliance-first teams.</h2>
          <p className="mt-4">
            Vexa helps finance teams structure invoice data, validate required fields,
            and prepare submissions for NRS/FIRS workflows.
          </p>
        </div>

        <div className="grid gap-6 lg:col-span-2 md:grid-cols-2">
          {[
            ["Internal approvals", "Move invoices through review, approval, and readiness stages before submission."],
            ["Audit visibility", "Track invoice actions, user activity, status changes, and compliance events."],
            ["Structured payloads", "Generate clean JSON payloads aligned with NRS e-invoicing requirements."],
            ["Secure workspace", "Role-based access keeps company data separated across teams and tenants."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            How it works
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["1. Create", "Add customers, products, tax details, and generate invoices."],
              ["2. Approve", "Review internally and move invoices through approval workflow."],
              ["3. Submit", "Generate NRS-ready payloads and submit through secure integration."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-slate-900 p-6">
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="api" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-slate-900 p-8 md:grid-cols-2 md:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Developer Ready
            </p>
            <h2 className="mt-3 text-3xl font-bold">Power your platform with Vexa APIs.</h2>
            <p className="mt-4 text-slate-300">
              Connect external systems, ERPs, and finance tools to invoice creation,
              compliance validation, and submission workflows.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="#sla" className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">
                View API Docs
              </a>
              <Link to="/auth/signup" className="rounded-xl border border-white/20 px-5 py-3 font-semibold">
                Contact sales
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-cyan-200">
            <p>{"POST /api/invoices/submit"}</p>
            <p className="mt-3 text-slate-400">{"{"}</p>
            <p className="ml-4">"invoiceNumber": "INV-2026-00016",</p>
            <p className="ml-4">"transactionType": "B2B",</p>
            <p className="ml-4">"status": "Ready"</p>
            <p className="text-slate-400">{"}"}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
          <h2 className="text-3xl font-bold">Ready to streamline financial compliance?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Start with e-invoicing today and scale into tax management, reporting,
            and business finance automation as your organization grows.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/auth/signup" className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white">
              Get started
            </Link>
            <Link to="/auth/login" className="rounded-xl border border-slate-200 px-6 py-3 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer id="sla" className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-2xl font-bold">Vexa</h3>
            <p className="mt-3 text-sm text-slate-400">
              Financial compliance and e-invoicing platform for Nigerian businesses.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Products</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>E-Invoicing</p>
              <p>Tax Management</p>
              <p>Financial Reports</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Resources</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>API Documentation</p>
              <p>Service Level Agreement (SLA)</p>
              <p>NRS Compliance Guide</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Company</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>About</p>
              <p>Contact</p>
              <p>Security & Compliance</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}