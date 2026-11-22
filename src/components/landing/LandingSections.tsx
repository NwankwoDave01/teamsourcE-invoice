import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Network,
  ScrollText,
  ShieldCheck,
  UsersRound,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

const capabilities = [
  { icon: FileText, title: "Electronic invoice management", text: "Create, organise, and manage customer invoices in one focused workspace." },
  { icon: ClipboardCheck, title: "Validation & digital signing", text: "Review invoice information and follow the signing workflow before submission." },
  { icon: Network, title: "NRS e-invoicing workflows", text: "Prepare structured invoice data for the platform’s configured compliance workflow." },
  { icon: Building2, title: "Taxpayer & company management", text: "Manage company information and taxpayer details within your business workspace." },
  { icon: Gauge, title: "Invoice status tracking", text: "Follow invoice records through their available statuses and submission history." },
  { icon: ScrollText, title: "Audit trails & reporting", text: "Review operational activity and use reports to understand your invoice records." },
  { icon: UsersRound, title: "Roles & permissions", text: "Give team members access according to their assigned roles and responsibilities." },
  { icon: LockKeyhole, title: "Administrative controls", text: "Manage platform users and company workspaces through dedicated admin tools." },
];

const workflow = [
  { n: "01", icon: FileText, title: "Create an invoice", text: "Add the customer, line items, and required invoice details." },
  { n: "02", icon: ClipboardCheck, title: "Validate details", text: "Review invoice information and correct issues before proceeding." },
  { n: "03", icon: Fingerprint, title: "Sign & submit", text: "Continue through the signing and configured submission workflow." },
  { n: "04", icon: BadgeCheck, title: "Track the record", text: "Return to the invoice to follow its status and retain a clear record." },
];

const faqs = [
  { q: "What does TS-Flow do?", a: "TS-Flow brings electronic invoice creation, invoice management, validation workflows, reporting, and compliance operations into one business platform." },
  { q: "Who can use the platform?", a: "Nigerian businesses, SMEs, finance teams, accounting professionals, and organisations managing invoice and compliance workflows can create a business workspace." },
  { q: "How does electronic invoicing work?", a: "Create an invoice with your customer and transaction details, review it, then follow the available validation, signing, and submission steps in your workspace." },
  { q: "How are invoices validated and signed?", a: "TS-Flow provides invoice validation and a signing workflow. The application guides authorised users through the steps available for their account." },
  { q: "How does a business get started?", a: "Choose Get started to open the existing registration flow. To join a company that already uses TS-Flow, ask its administrator for an invitation." },
  { q: "How do I access my account?", a: "Use Sign in and enter your existing account credentials. Your access to company records depends on your assigned membership and permissions." },
];

export function ProductPreview() {
  return (
    <div className="dashboard-enter relative mx-auto w-full max-w-[610px]">
      <div className="absolute -inset-8 rounded-full bg-blue-200/50 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_90px_-35px_rgba(24,54,105,.35)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">TS</div>
            <div><p className="text-sm font-semibold text-slate-900">TS-Flow workspace</p><p className="text-xs text-slate-500">Invoice management</p></div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Workspace ready</span>
        </div>
        <div className="grid min-h-[330px] grid-cols-[118px_1fr] sm:grid-cols-[150px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
            <div className="space-y-1 text-[11px] font-medium">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2 text-blue-700"><FileText size={14} />Invoices</div>
              <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500"><UsersRound size={14} />Customers</div>
              <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500"><ScrollText size={14} />Reports</div>
              <div className="flex items-center gap-2 px-2.5 py-2 text-slate-500"><ShieldCheck size={14} />Audit logs</div>
            </div>
            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><ShieldCheck size={13} className="text-blue-600" />Compliance workflow</div>
              <div className="space-y-2"><div className="h-1.5 rounded-full bg-blue-100"><div className="h-1.5 w-2/3 rounded-full bg-blue-600" /></div><p className="text-[9px] text-slate-500">Review invoice details</p></div>
            </div>
          </aside>
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-medium text-slate-500">Business workspace / Invoices</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Your invoices</h3></div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white"><span className="text-base leading-none">+</span> New invoice</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {["All invoices", "Drafts", "In review"].map((label, index) => <div key={label} className={`rounded-xl border p-2.5 sm:p-3 ${index === 0 ? "border-blue-100 bg-blue-50/60" : "border-slate-100 bg-white"}`}><p className="text-[9px] leading-tight text-slate-500 sm:text-[10px]">{label}</p><div className={`mt-3 h-1.5 w-1/2 rounded-full ${index === 0 ? "bg-blue-200" : "bg-slate-100"}`} /></div>)}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
              <div className="grid grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[1fr_1fr_auto] sm:px-4"><span>Invoice record</span><span className="hidden sm:block">Last updated</span><span>Status</span></div>
              {["Customer invoice", "Sales invoice", "Service invoice"].map((row, index) => <div key={row} className="grid grid-cols-[1fr_auto] items-center border-b border-slate-50 px-3 py-3 last:border-0 sm:grid-cols-[1fr_1fr_auto] sm:px-4"><div className="flex min-w-0 items-center gap-2.5"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText size={13} /></div><span className="truncate text-[10px] font-medium text-slate-700 sm:text-[11px]">{row}</span></div><span className="hidden text-[10px] text-slate-400 sm:block">Invoice activity</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${index === 0 ? "bg-amber-50 text-amber-700" : index === 1 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{["In review", "Draft", "Updated"][index]}</span></div>)}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[9px] text-slate-400"><Check size={12} className="text-emerald-600" />A clear view of invoice records and their workflow</p>
          </div>
        </div>
      </div>
      <div className="dashboard-float absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg sm:flex"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileCheck2 size={18} /></div><div><p className="text-[11px] font-semibold text-slate-800">Structured workflow</p><p className="text-[10px] text-slate-500">Create · Validate · Track</p></div></div>
    </div>
  );
}

export function TrustStrip() {
  const marks = [
    { name: "NITDA", detail: "System Integrator Accredited", initials: "N" },
    { name: "ISO 27001", detail: "Certified", initials: "ISO" },
    { name: "Software Quality Assurance", detail: "Approved", initials: "SQA" },
    { name: "NRS", detail: "E-Invoicing", initials: "NRS" },
  ];
  return <section aria-label="Trust and certifications" className="border-y border-slate-200/80 bg-white"><div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10"><p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Built for business confidence and compliance</p><div className="grid grid-cols-2 gap-y-6 md:grid-cols-4">{marks.map((mark) => <div key={mark.name} data-reveal className="trust-mark flex items-center justify-center gap-3 px-2 md:border-r md:border-slate-100 last:border-0"><span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold tracking-wide text-slate-700">{mark.initials}</span><span><span className="block text-xs font-semibold text-slate-800">{mark.name}</span><span className="mt-0.5 block text-[10px] text-slate-500">{mark.detail}</span></span></div>)}</div></div></section>;
}

export function Capabilities() {
  return <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div data-reveal className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.19em] text-blue-700">One platform, connected workflows</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl lg:text-[42px]">Everything your invoice workflow needs</h2><p className="mt-4 text-base leading-7 text-slate-600">Bring everyday invoicing, compliance review, and business oversight together in one secure workspace.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(({ icon: Icon, title, text }, index) => <article key={title} data-reveal data-reveal-index={index % 4} className={`feature-card group rounded-2xl border border-slate-200/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_42px_-28px_rgba(37,99,235,.38)] focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,.12)] ${index === 0 ? "bg-blue-50/70" : "bg-white"}`}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={20} strokeWidth={1.8} /></div><h3 className="mt-5 text-[15px] font-semibold leading-6 text-slate-900">{title}</h3><p className="mt-2 text-[13px] leading-6 text-slate-600">{text}</p></article>)}</div></div></section>;
}

export function HowItWorks() {
  return <section id="platform" className="scroll-mt-24 bg-[#f5f8fc] py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div data-reveal className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.19em] text-blue-700">A simple path from draft to record</p><h2 className="mt-4 max-w-lg text-balance text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl">A clear process for every invoice</h2></div><p className="max-w-xl text-base leading-7 text-slate-600 lg:justify-self-end">Keep teams aligned with an easy-to-follow workflow, from the first invoice details through validation and status tracking.</p></div><div className="workflow-grid mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{workflow.map(({ n, icon: Icon, title, text }, index) => <article key={n} data-reveal data-reveal-index={index} data-workflow-step className="workflow-step relative rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:border-blue-200 hover:shadow-[0_12px_36px_-28px_rgba(37,99,235,.5)]"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[.14em] text-blue-700">{n}</span><Icon size={19} className="text-slate-400" strokeWidth={1.8} /></div><div className="workflow-track mt-7 h-px bg-gradient-to-r from-blue-200 to-transparent" aria-hidden="true" /><h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>{index < workflow.length - 1 && <ArrowRight size={16} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-blue-400 lg:block" />}</article>)}</div></div></section>;
}

export function SecurityAndBenefits() {
  const safeguards = ["Role-based access for business teams", "Authenticated account and session workflows", "Audit records for operational visibility", "Invoice validation and integrity checks", "Tenant-scoped company records", "Configured regulatory workflows"];
  const benefits = ["Reduce repetitive manual invoice handling", "Keep invoice records organised in one place", "See where work stands across the process", "Support more consistent compliance review"];
  return <section id="compliance" className="scroll-mt-24 bg-white py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="grid overflow-hidden rounded-[28px] bg-[#102448] lg:grid-cols-[1.08fr_.92fr]"><div data-reveal className="p-7 sm:p-10 lg:p-12"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-blue-100"><ShieldCheck size={14} />Security built into the workflow</span><h2 className="mt-6 max-w-xl text-balance text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Compliance operations, with confidence at every step.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-blue-100/75">Purposeful controls help teams manage invoice work with clear access, accountable actions, and structured review.</p><div className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">{safeguards.map((item) => <div key={item} className="flex items-start gap-2.5 text-[12px] leading-5 text-blue-50/90"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-400/20 text-blue-200"><Check size={11} /></span>{item}</div>)}</div></div><div data-reveal data-reveal-index="1" className="security-depth relative flex min-h-[300px] items-center justify-center overflow-hidden border-t border-white/10 bg-[#15315c] p-7 sm:p-10 lg:border-l lg:border-t-0"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#9bbcff 0.7px, transparent 0.7px)", backgroundSize: "18px 18px" }} aria-hidden="true"/><div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b1d39]/80 p-5 shadow-2xl backdrop-blur"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/15 text-blue-200"><LockKeyhole size={19} /></div><div><p className="text-sm font-semibold text-white">Access & activity</p><p className="text-[11px] text-blue-100/60">Business workspace</p></div></div><ArrowUpRight size={16} className="text-blue-100/60" /></div><div className="mt-5 space-y-2.5">{[["Team permissions", "Role-based"], ["Invoice review", "Recorded"], ["Company records", "Protected"]].map(([name, state]) => <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-3"><span className="text-xs text-blue-50/85">{name}</span><span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-300"><Check size={12}/>{state}</span></div>)}</div></div></div></div><div className="mt-16 grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.19em] text-blue-700">Built for the work behind every invoice</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl">More clarity for the people who keep business moving.</h2></div><div className="grid gap-3 sm:grid-cols-2">{benefits.map((item, i) => <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Check size={15}/></span><span className="text-sm font-medium leading-5 text-slate-700">{item}</span>{i === 0 && <ArrowDownRight size={15} className="ml-auto text-slate-300"/>}</div>)}</div></div></div></section>;
}

export function Faq() {
  return <section id="resources" className="scroll-mt-24 bg-[#f5f8fc] py-20 sm:py-24"><div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-10"><div data-reveal><p className="text-xs font-semibold uppercase tracking-[.19em] text-blue-700">Frequently asked questions</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl">A little more clarity.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">Learn the essentials about working with TS-Flow.</p><Link to="/api-docs" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">Explore platform resources <ArrowRight size={15}/></Link></div><div className="divide-y divide-slate-200 border-y border-slate-200">{faqs.map((item, index) => <details key={item.q} data-reveal data-reveal-index={index % 4} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">{item.q}<ChevronDown size={17} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" /></summary><p className="max-w-2xl pr-8 pt-3 text-sm leading-6 text-slate-600">{item.a}</p></details>)}</div></div></section>;
}

export function FinalCta() {
  return <section className="bg-white px-5 py-16 sm:px-8 sm:py-20"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-blue-700 px-6 py-12 text-center sm:px-12 sm:py-16"><div className="absolute -right-20 -top-40 h-96 w-96 rounded-full border border-white/10" aria-hidden="true"/><div className="absolute -right-5 -top-24 h-72 w-72 rounded-full border border-white/10" aria-hidden="true"/><div data-reveal className="relative mx-auto max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.19em] text-blue-100">Ready for a clearer workflow?</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Make invoicing simpler. Make compliance smarter.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-blue-100/85">Bring your invoicing and compliance workflows together with TS-Flow.</p><Link to="/auth/signup" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Get started <ArrowRight size={16}/></Link></div></div></section>;
}

export function SiteFooter() {
  return <footer className="border-t border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10"><div><Link to="/" className="inline-flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white">TS</span><span className="text-base font-semibold tracking-tight text-slate-950">TS-Flow</span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">Enterprise e-invoicing and compliance workflows for modern businesses.</p><a href="mailto:support@teamsource.net" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800">support@teamsource.net</a></div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-slate-900">Platform</h3><div className="mt-4 space-y-3 text-sm text-slate-600"><a className="block hover:text-blue-700" href="#features">Features</a><a className="block hover:text-blue-700" href="#platform">How it works</a><a className="block hover:text-blue-700" href="#compliance">Security & compliance</a></div></div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-slate-900">Resources</h3><div className="mt-4 space-y-3 text-sm text-slate-600"><Link className="block hover:text-blue-700" to="/api-docs">API documentation</Link><Link className="block hover:text-blue-700" to="/sla">Service level agreement</Link><Link className="block hover:text-blue-700" to="/privacy-policy">Privacy policy</Link></div></div><div><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-slate-900">Your account</h3><div className="mt-4 space-y-3 text-sm text-slate-600"><Link className="block hover:text-blue-700" to="/auth/login">Sign in</Link><Link className="block hover:text-blue-700" to="/auth/signup">Get started</Link></div></div></div><div className="border-t border-slate-100"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© {new Date().getFullYear()} Teamsource. All rights reserved.</span><span>TS-Flow · Business invoicing & compliance</span></div></div></footer>;
}
