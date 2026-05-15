import { Link } from "react-router-dom";

export default function LandingPage() {
  const modules = [
    [
      "E-Invoicing Infrastructure",
      "Generate invoices, validate compliance data, manage IRN workflows, and prepare structured submissions for NRS/FIRS.",
      "Live",
    ],
    [
      "Tax & Compliance",
      "Track VAT, monitor compliance readiness, and prepare for future FIRS reporting workflows.",
      "Coming Soon",
    ],
    [
      "Business Operations",
      "Streamline approvals, operational workflows, and finance processes across teams.",
      "Planned",
    ],
    [
      "Analytics & Reporting",
      "Monitor revenue, compliance health, invoice activity, and operational performance.",
      "Live",
    ],
    [
      "Payment Reconciliation",
      "Match invoices to payments and reduce manual finance follow-up work.",
      "Planned",
    ],
    [
      "API & ERP Integrations",
      "Connect accounting tools, ERPs, and internal systems through secure APIs.",
      "Planned",
    ],
  ];

  const workflow = [
    [
      "Create",
      "Generate invoices, customers, products, and tax-ready transaction records.",
    ],
    [
      "Approve",
      "Move transactions through internal review and operational approval workflows.",
    ],
    [
      "Validate",
      "Validate structured compliance payloads and identify issues early.",
    ],
    [
      "Submit",
      "Submit securely to external compliance systems through backend integrations.",
    ],
  ];

  const trustItems = [
    "NRS/FIRS Ready",
    "Multi-Business Support",
    "Audit Logging",
    "Role-Based Access",
    "API Integrations",
    "Enterprise Security",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
              TS
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">
                TS-Flow
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                by TeamSource
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            <a href="#platform" className="transition hover:text-white">
              Platform
            </a>

            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>

            <a href="#compliance" className="transition hover:text-white">
              Compliance
            </a>

            <a href="#developers" className="transition hover:text-white">
              Developers
            </a>

            <a href="#resources" className="transition hover:text-white">
              Resources
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/login"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>

            <Link
              to="/auth/signup"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_35%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Business Operations & Compliance Suite
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl xl:text-7xl">
              Automate invoicing, compliance, and business operations in one platform.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
              TS-Flow helps organizations manage invoicing, approvals, compliance
              workflows, reporting, and operational processes through a secure,
              enterprise-ready platform built for modern African businesses.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/auth/signup"
                className="rounded-2xl bg-cyan-400 px-7 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Start Free
              </Link>

              <a
                href="#developers"
                className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 font-semibold transition hover:bg-white/10"
              >
                Explore APIs
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <div className="rounded-2xl border border-white/10 bg-white px-5 py-4 shadow-lg">
                <img
                  src="/nrs_logo.png"
                  alt="NRS"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white px-5 py-4 shadow-lg">
                <img
                  src="/firs_logo.png"
                  alt="FIRS"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <p className="max-w-sm text-sm text-slate-400">
                Designed for secure Nigerian e-invoicing, finance workflows,
                and enterprise compliance operations.
              </p>
            </div>
          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-cyan-400/10 blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-slate-900 p-6">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Enterprise Operations Dashboard
                    </p>

                    <h3 className="mt-1 text-2xl font-bold">
                      TS-Flow Console
                    </h3>
                  </div>

                  <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400">
                    Compliance Active
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Invoices Processed", "12,842"],
                    ["Validation Success", "98.2%"],
                    ["Pending Approvals", "24"],
                    ["Monthly Revenue", "₦42.8M"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/5 bg-slate-800/70 p-5"
                    >
                      <p className="text-sm text-slate-400">
                        {label}
                      </p>

                      <p className="mt-3 text-3xl font-bold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-cyan-200">
                        Latest Compliance Activity
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        Invoice INV-2026-00018 successfully validated and queued
                        for NRS submission.
                      </p>
                    </div>

                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      Success
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-950 p-5 font-mono text-sm text-cyan-200">
                  <p>
                    Invoice → Validation → Approval → IRN → Audit Log
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM MODULES */}
      <section
        id="platform"
        className="mx-auto max-w-7xl px-6 pb-24"
      >
        <div className="mb-14 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Platform Capabilities
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight">
            A scalable operational infrastructure for modern businesses.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            Start with e-invoicing compliance today and expand into tax,
            operational workflows, reporting, integrations, and enterprise finance automation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(([title, text, tag]) => (
            <div
              key={title}
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.05]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {tag}
                </span>
              </div>

              <h3 className="text-2xl font-bold transition group-hover:text-cyan-200">
                {title}
              </h3>

              <p className="mt-4 leading-7 text-slate-300">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section
        id="workflow"
        className="mx-auto max-w-7xl px-6 pb-24"
      >
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Operational Workflow
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              Built for structured compliance and operational efficiency.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {workflow.map(([title, text], index) => (
              <div
                key={title}
                className="rounded-3xl border border-white/5 bg-slate-900/70 p-7"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-bold text-slate-950">
                  {index + 1}
                </div>

                <h3 className="text-2xl font-bold">
                  {title}
                </h3>

                <p className="mt-4 leading-7 text-slate-300">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section
        id="compliance"
        className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 lg:grid-cols-3"
      >
        <div className="rounded-[2rem] bg-cyan-400 p-10 text-slate-950">
          <p className="text-sm font-semibold uppercase tracking-wide">
            Compliance Infrastructure
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight">
            Built for compliance-first organizations.
          </h2>

          <p className="mt-6 text-lg leading-8">
            Reduce validation errors, improve operational visibility,
            and prepare financial workflows for secure digital compliance.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:col-span-2">
          {[
            [
              "Structured Compliance Payloads",
              "Generate clean invoice data structures for validation and submission workflows.",
            ],
            [
              "Operational Approvals",
              "Review and approve workflows before compliance submission.",
            ],
            [
              "Audit Visibility",
              "Track actions, validation attempts, and operational changes across teams.",
            ],
            [
              "Enterprise Security",
              "Separate tenants, users, permissions, and financial records securely.",
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7"
            >
              <h3 className="text-2xl font-bold">
                {title}
              </h3>

              <p className="mt-4 leading-7 text-slate-300">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* DEVELOPERS */}
      <section
        id="developers"
        className="mx-auto max-w-7xl px-6 pb-24"
      >
        <div className="grid items-center gap-10 rounded-[2rem] border border-white/10 bg-slate-900 p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Developer Infrastructure
            </p>

            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Integrate securely through APIs and enterprise workflows.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              TS-Flow is built to support secure integrations for invoicing,
              validation, approvals, reporting, and operational workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/api-docs"
                className="rounded-2xl bg-cyan-400 px-6 py-4 font-semibold text-slate-950"
              >
                API Documentation
              </a>

              <a
                href="/sla"
                className="rounded-2xl border border-white/10 px-6 py-4 font-semibold transition hover:bg-white/5"
              >
                View SLA
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-6 font-mono text-sm text-cyan-200">
            <p>{"POST /api/invoices/submit"}</p>

            <p className="mt-4 text-slate-500">{"{"}</p>

            <p className="ml-4">
              "invoiceNumber": "INV-2026-00016",
            </p>

            <p className="ml-4">
              "transactionType": "B2B",
            </p>

            <p className="ml-4">
              "complianceStatus": "Validated",
            </p>

            <p className="ml-4">
              "submissionStatus": "Queued"
            </p>

            <p className="text-slate-500">{"}"}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white p-10 text-slate-950 shadow-2xl md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%)]" />

          <div className="relative z-10">
            <h2 className="text-4xl font-bold leading-tight md:text-5xl">
              Ready to modernize your business operations?
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Start with compliance-ready invoicing today and scale into
              operational automation, reporting, integrations, and enterprise finance workflows.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/auth/signup"
                className="rounded-2xl bg-slate-950 px-7 py-4 font-semibold text-white transition hover:bg-slate-800"
              >
                Get Started
              </Link>

              <Link
                to="/auth/login"
                className="rounded-2xl border border-slate-200 px-7 py-4 font-semibold transition hover:bg-slate-100"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="resources"
        className="border-t border-white/10 px-6 py-14"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 font-bold text-slate-950">
                TS
              </div>

              <div>
                <h3 className="text-2xl font-bold">
                  TS-Flow
                </h3>

                <p className="text-sm text-cyan-300">
                  by TeamSource
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Business operations and compliance infrastructure platform
              built for modern organizations.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              Platform
            </h4>

            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>E-Invoicing</p>
              <p>Compliance</p>
              <p>Analytics</p>
              <p>Operations</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">
              Resources
            </h4>

            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <a href="/api-docs" className="block hover:text-white">
                API Documentation
              </a>

              <a href="/sla" className="block hover:text-white">
                Service Level Agreement
              </a>

              <p>NRS Compliance Guide</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">
              Company
            </h4>

            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>TeamSource</p>
              <p>Security & Compliance</p>
              <p>support@teamsource.net</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}