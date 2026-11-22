import { useEffect, useState } from "react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window)) return;

    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });

    if (!reduceMotion) document.documentElement.classList.add("motion-ready");
    revealItems.forEach((item) => observer.observe(item));

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length) {
        const current = visible.reduce((nearest, entry) =>
          Math.abs(entry.boundingClientRect.top) < Math.abs(nearest.boundingClientRect.top) ? entry : nearest,
        );
        setActiveSection(`#${current.target.id}`);
      }
    }, { rootMargin: "-24% 0px -65% 0px" });
    ["platform", "features", "compliance", "resources"].forEach((id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });

    const workflowSteps = Array.from(document.querySelectorAll<HTMLElement>("[data-workflow-step]"));
    const stepObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      const active = workflowSteps
        .map((step) => ({ step, distance: Math.abs(step.getBoundingClientRect().top - window.innerHeight * 0.48) }))
        .sort((a, b) => a.distance - b.distance)[0]?.step;
      workflowSteps.forEach((step) => step.classList.toggle("is-active", step === active));
    }, { threshold: 0.1, rootMargin: "-20% 0px -35% 0px" });
    workflowSteps.forEach((step) => stepObserver.observe(step));

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      stepObserver.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      <header className={`site-header sticky top-0 z-50 border-b backdrop-blur-xl ${isScrolled ? "is-scrolled border-slate-200/80 bg-white/95 shadow-[0_8px_30px_-22px_rgba(16,36,72,.35)]" : "border-transparent bg-white/80"}`}>
        <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" aria-label="TS-Flow home" className="shrink-0">
            <BrandMark variant="auth" size="md" subtitle="by Teamsource" />
          </Link>
          <div className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => <a key={item.href} href={item.href} aria-current={activeSection === item.href ? "location" : undefined} className={`nav-link text-[13px] font-medium transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${activeSection === item.href ? "is-active text-blue-700" : "text-slate-600"}`}>{item.label}</a>)}
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <Link to="/auth/login" className="text-[13px] font-semibold text-slate-700 transition hover:text-blue-700">Sign in</Link>
            <Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Get started <ArrowRight size={15}/></Link>
          </div>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 lg:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={19}/> : <Menu size={19}/>}
          </button>
        </nav>
        <div id="mobile-navigation" aria-hidden={!menuOpen} className={`mobile-navigation border-t border-slate-100 bg-white px-5 shadow-lg lg:hidden ${menuOpen ? "is-open" : ""}`}><div className="mobile-navigation-inner pb-5 pt-2"><div className="flex flex-col">{navigation.map((item) => <a key={item.href} href={item.href} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">{item.label}</a>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><Link to="/auth/login" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Sign in</Link><Link to="/auth/signup" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} className="rounded-lg bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Get started</Link></div></div></div>
      </header>

      <section className="relative overflow-hidden bg-[#f5f8fc]">
        <div className="pointer-events-none absolute -right-32 -top-48 h-[540px] w-[540px] rounded-full bg-blue-100/70 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[.92fr_1.08fr] lg:gap-10 lg:px-10 lg:py-20">
          <div className="relative z-10 max-w-xl">
            <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-blue-800 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-blue-600"/>Enterprise e-invoicing & compliance</div>
            <h1 className="hero-enter hero-enter-2 mt-6 text-balance text-[40px] font-semibold leading-[1.1] tracking-[-.055em] text-[#102448] sm:text-5xl lg:text-[56px]">Automate invoicing, compliance, and business operations in one platform.</h1>
            <p className="hero-enter hero-enter-3 mt-5 max-w-lg text-[15px] leading-7 text-slate-600 sm:text-base">Take control of your invoicing workflow with intelligent invoice management, streamlined tax compliance and real-time operational visibility.</p>
            <div className="hero-enter hero-enter-4 mt-8 flex flex-wrap items-center gap-3"><Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,.65)] transition hover:-translate-y-0.5 hover:bg-blue-800">Get started <ArrowRight size={16}/></Link><Link to="/auth/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">Sign in</Link></div>
            <div className="hero-enter hero-enter-5 mt-8 flex items-center gap-3 text-xs text-slate-500"><span className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-blue-100 text-[9px] font-bold text-blue-800">TS</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-slate-200 text-[9px] font-bold text-slate-700">N</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-emerald-100 text-[9px] font-bold text-emerald-800">✓</span></span><span>Designed for Nigerian business workflows</span></div>
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
