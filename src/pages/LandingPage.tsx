import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/shared/BrandMark";
import {
  Capabilities,
  Faq,
  FinalCta,
  HowItWorks,
  ProductPreview,
  SecurityAndBenefits,
  SiteFooter,
  TrustStrip,
} from "@/components/landing/LandingSections";

const navigation = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Compliance", href: "#compliance" },
  { label: "Resources", href: "#resources" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" aria-label="TS-Flow home" className="shrink-0">
            <BrandMark variant="auth" size="md" subtitle="by Teamsource" />
          </Link>
          <div className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => <a key={item.href} href={item.href} className="text-[13px] font-medium text-slate-600 transition hover:text-blue-700">{item.label}</a>)}
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <Link to="/auth/login" className="text-[13px] font-semibold text-slate-700 transition hover:text-blue-700">Sign in</Link>
            <Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Get started <ArrowRight size={15}/></Link>
          </div>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={19}/> : <Menu size={19}/>}
          </button>
        </nav>
        {menuOpen && <div id="mobile-navigation" className="border-t border-slate-100 bg-white px-5 pb-5 pt-2 shadow-lg lg:hidden"><div className="flex flex-col">{navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700">{item.label}</a>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><Link to="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">Sign in</Link><Link to="/auth/signup" onClick={() => setMenuOpen(false)} className="rounded-lg bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white">Get started</Link></div></div>}
      </header>

      <section className="relative overflow-hidden bg-[#f5f8fc]">
        <div className="pointer-events-none absolute -right-32 -top-48 h-[540px] w-[540px] rounded-full bg-blue-100/70 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[.92fr_1.08fr] lg:gap-10 lg:px-10 lg:py-20">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-blue-800 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-blue-600"/>Enterprise e-invoicing & compliance</div>
            <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.1] tracking-[-.055em] text-[#102448] sm:text-5xl lg:text-[56px]">Automate invoicing, compliance, and business operations in one platform.</h1>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-slate-600 sm:text-base">Take control of your invoicing workflow with intelligent invoice management, streamlined tax compliance and real-time operational visibility.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3"><Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,.65)] transition hover:-translate-y-0.5 hover:bg-blue-800">Get started <ArrowRight size={16}/></Link><Link to="/auth/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">Sign in</Link></div>
            <div className="mt-8 flex items-center gap-3 text-xs text-slate-500"><span className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-blue-100 text-[9px] font-bold text-blue-800">TS</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-slate-200 text-[9px] font-bold text-slate-700">N</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-emerald-100 text-[9px] font-bold text-emerald-800">✓</span></span><span>Designed for Nigerian business workflows</span></div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <TrustStrip />
      <Capabilities />
      <HowItWorks />
      <SecurityAndBenefits />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
