import { Link } from "react-router-dom";

export default function LandingPage() {
  const modules = [
    ["E-Invoicing", "Generate invoices, validate fields, and prepare submissions for NRS/FIRS compliance.", "Live"],
    ["Tax Management", "Track VAT, tax summaries, and future FIRS reporting workflows.", "Coming soon"],
    ["Expense Management", "Organize company expenses and improve finance visibility.", "Coming soon"],
    ["Reports & Analytics", "Monitor revenue, invoice activity, compliance health, and customer trends.", "Live"],
    ["Payment Reconciliation", "Match invoices to payments and reduce finance follow-up work.", "Planned"],
    ["API Integrations", "Connect ERPs, accounting tools, and internal systems securely.", "Planned"],
  ];

  const workflow = [
    ["Create", "Add customers, products, invoice details, and tax information."],
    ["Approve", "Move invoices through review and internal approval stages."],
    ["Validate", "Generate structured NRS-ready JSON and resolve issues early."],
    ["Submit", "Send invoices through secure backend integration when enabled."],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-2xl font-bold tracking-tight">Flow</p>
            <p className="text-xs uppercase tracking-widest text-cyan-300">by TeamSource</p>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            <a href="#products" className="hover:text-white">Products</a>
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#compliance" className="hover:text-white">Compliance</a>
            <a href="#developers" className="hover:text-white">Developers</a>
            <a href="#resources" className="hover:text-white">Resources</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link
              to="/auth/signup"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Financial Compliance & Operations Platform
          </p>

          <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-6xl">
            Run compliant invoicing, tax-ready records, and finance workflows in one place.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Flow helps Nigerian businesses create invoices, manage customers and products,
            validate compliance data, and prepare for NRS/FIRS e-invoicing submission.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
              NRS/FIRS Ready
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
              B2B/B2G Finance Workflows
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
              Secure Multi-Tenant Platform
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="rounded-xl border border-white/10 bg-white px-4 py-3 shadow-sm">
           <img
            src="/nrs_logo.png"
            alt="NRS"
            className="h-8 w-auto object-contain"
           />
         </div>

          <div className="rounded-xl border border-white/10 bg-white px-4 py-3 shadow-sm">
            <img
            src="/firs_logo.png"
            alt="FIRS"
            className="h-8 w-auto object-contain"
            />
          </div>

          <p className="text-sm text-slate-400">
           Designed for Nigerian e-invoicing and compliance workflows.
          </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/auth/signup"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start now
            </Link>
            <a
              href="#developers"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              View API docs
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold">Compliance Dashboard</h3>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                NRS Ready
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Invoices", "248"],
                ["Validation Rate", "96.4%"],
                ["Pending Review", "18"],
                ["Revenue", "₦12.8M"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-slate-950 p-4 text-sm text-cyan-200">
              <p className="font-mono">Invoice validated → IRN generated → Status signed</p>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Platform Modules
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            More than invoicing — a growing finance operations suite.
          </h2>
          <p className="mt-4 text-slate-300">
            Start with e-invoicing compliance today, then expand into tax, reports,
            expense management, reconciliation, and integrations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {modules.map(([title, text, tag]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10">
              <div className="mb-4 flex items-center justify-between gap-4">
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

      <section id="workflow" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            How it works
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {workflow.map(([title, text], index) => (
              <div key={title} className="rounded-2xl bg-slate-900 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 font-bold text-slate-950">
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compliance" className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-3">
        <div className="rounded-3xl bg-cyan-400 p-8 text-slate-950">
          <h2 className="text-3xl font-bold">Built for compliance-first finance teams.</h2>
          <p className="mt-4">
            Structure invoice data, reduce errors, and prepare for NRS/FIRS validation
            through secure approval workflows.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:col-span-2">
          {[
            ["Structured Payloads", "Generate invoice data in clean JSON format for compliance review."],
            ["Approval Workflow", "Control invoice readiness before submission to external systems."],
            ["Audit Visibility", "Track actions, status movement, and submission attempts."],
            ["Tenant Security", "Separate companies, users, roles, and financial records safely."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="developers" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-slate-900 p-8 md:grid-cols-2 md:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Developer Ready
            </p>
            <h2 className="mt-3 text-3xl font-bold">Connect your systems through secure APIs.</h2>
            <p className="mt-4 text-slate-300">
              Flow is designed to support future API access for invoice creation,
              validation, submission workflows, and integration with ERPs or accounting tools.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="/api-docs" className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">
                API Documentation
              </a>
              <a href="/sla" className="rounded-xl border border-white/20 px-5 py-3 font-semibold">
                View SLA
              </a>
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
          <h2 className="text-3xl font-bold">Ready to simplify financial compliance?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Start with e-invoicing today and scale into tax management, reporting,
            and finance automation as your organization grows.
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

      <footer id="resources" className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-2xl font-bold">Flow</h3>
            <p className="mt-3 text-sm text-slate-400">
              Financial compliance and e-invoicing platform by TeamSource.
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
              <p>Service Level Agreement</p>
              <p>NRS Compliance Guide</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Company</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>About TeamSource</p>
              <p>Contact</p>
              <p>Security & Compliance</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}