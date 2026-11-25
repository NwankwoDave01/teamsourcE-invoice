import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/shared/BrandMark';
import { Faq, FinalCta, PlatformEcosystem, ProductPreview, SiteFooter } from '@/components/landing/LandingSections';
import { TrustedCompaniesMarquee } from '@/components/landing/TrustedCompaniesMarquee';
import { CertificationStrip } from '@/components/landing/CertificationStrip';
import { CustomerStories } from '@/components/landing/CustomerStories';
import { InsightsSection } from '@/components/landing/InsightsSection';
import { WorkflowOverview, CategoryNav } from '@/components/landing/TrustNavigation';
import { ProductShowcases } from '@/components/landing/ProductShowcases';
import '@/components/landing/home.css';

const navigation = [['Platform','#platform'],['Products','#products'],['Compliance','#security'],['Use cases','#stories'],['Insights','#insights'],['Resources','#insights']];
const categories = [['E-Invoicing','e-invoicing'],['Banking','banking'],['Accounting','accounting'],['Human Resources','human-resources'],['Inventory','inventory'],['Sales','sales'],['Security & Compliance','security']] as const;
function AccountLinks() { return <div className="account-links"><Link to="/auth/login">Sign in</Link><Link className="home-btn" to="/auth/signup">Get started <ArrowRight size={15}/></Link></div>; }
function Navigation() {
  const [open,setOpen]=useState(false); const [scrolled,setScrolled]=useState(false); const menu=useRef<HTMLDetailsElement>(null); const toggle=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const close=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node)&&menu.current)menu.current.open=false};document.addEventListener('pointerdown',close);return ()=>document.removeEventListener('pointerdown',close)},[]);
  useEffect(()=>{const update=()=>setScrolled(window.scrollY>12);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);
  return <header className={'home-header'+(scrolled?' scrolled':'')} onKeyDown={e=>{if(e.key==='Escape'){if(open){setOpen(false);toggle.current?.focus()}if(menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus()}}}}><div className="shell nav-inner"><Link to="/" aria-label="TS-Flow home"><BrandMark variant="auth" size="md" subtitle="by Teamsource"/></Link><nav aria-label="Main navigation" className="desktop-nav">{navigation.map(([name,href])=>name==='Products'?<details ref={menu} key={name}><summary>{name}<ChevronDown size={13}/></summary><div>{categories.map(([label,id])=><a key={id} href={'#'+id} onClick={()=>{if(menu.current)menu.current.open=false}}>{label}</a>)}</div></details>:<a key={name} href={href}>{name}</a>)}</nav><AccountLinks/><button ref={toggle} className="menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>{open&&<nav id="mobile-nav" aria-label="Mobile navigation" onClick={()=>setOpen(false)}>{navigation.map(([name,href])=><a key={name} href={href}>{name}</a>)}<div className="mobile-product-links" aria-label="Product modules">{categories.map(([label,id])=><a key={id} href={'#'+id}>{label}</a>)}</div><AccountLinks/></nav>}</header>
}
export default function LandingPage(){return <div className="ts-home font-sans"><a className="sr-only focus:not-sr-only" href="#platform">Skip to content</a><Navigation/><main>
  <section className="relative overflow-hidden bg-[#f5f8fc]" id="platform">
    <div className="pointer-events-none absolute -right-32 -top-48 h-[540px] w-[540px] rounded-full bg-blue-100/70 blur-3xl" aria-hidden="true" />
    <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[.92fr_1.08fr] lg:gap-10 lg:px-10 lg:py-20">
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-blue-800 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-blue-600"/>Enterprise e-invoicing &amp; compliance</div>
        <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.1] tracking-[-.055em] text-[#102448] sm:text-5xl lg:text-[56px]">Automate invoicing, compliance, and business operations in one platform.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">Take control of your invoicing workflow with intelligent invoice management, streamlined tax compliance and real-time operational visibility.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3"><Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,.65)] transition hover:-translate-y-0.5 hover:bg-blue-800">Get started <ArrowRight size={16}/></Link><Link to="/auth/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">Sign in</Link></div>
        <div className="mt-8 flex items-center gap-3 text-xs text-slate-500"><span className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-blue-100 text-[9px] font-bold text-blue-800">TS</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-slate-200 text-[9px] font-bold text-slate-700">N</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f8fc] bg-emerald-100 text-[9px] font-bold text-emerald-800">✓</span></span><span>Designed for Nigerian business workflows</span></div>
      </div>
      <ProductPreview />
    </div>
  </section>
  <PlatformEcosystem/><TrustedCompaniesMarquee/><CertificationStrip/><CategoryNav categories={categories}/><ProductShowcases/><WorkflowOverview/><CustomerStories/><InsightsSection/><Faq/><FinalCta/></main><SiteFooter/></div>}
