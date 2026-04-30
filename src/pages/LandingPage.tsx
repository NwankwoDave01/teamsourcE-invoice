import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-2xl font-bold">Vexa</div>
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
            E-Invoicing & Compliance Suite
          </p>
          <h1 className="text-5xl font-bold leading-tight lg:text-6xl">
            Modern invoicing built for Nigerian businesses.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Create invoices, manage customers and products, approve internally,
            and prepare your business for NRS/FIRS e-invoicing compliance.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              to="/auth/signup"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
            >
              Start now
            </Link>
            <Link
              to="/auth/login"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
          <div className="rounded-2xl bg-white p-6 text-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold">Invoice Dashboard</h3>
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
                <p className="text-sm text-slate-500">Validated</p>
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

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          ["Create invoices", "Build professional invoices with customers, products, VAT and totals."],
          ["Internal approvals", "Review and approve invoices before compliance submission."],
          ["NRS/FIRS ready", "Prepare structured invoice data for e-invoicing validation."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 text-slate-300">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}