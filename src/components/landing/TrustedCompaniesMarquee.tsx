import { companyLogos } from "@/data/companyLogos";
import { BrandImageSlot } from "./BrandImageSlot";

function LogoTrack({ duplicate = false }: { duplicate?: boolean }) {
  return <div className="company-logo-track" aria-hidden={duplicate || undefined}>
    {companyLogos.map((company) => <div className="company-logo-item" key={`${duplicate ? "copy-" : ""}${company.name}`}>
      <BrandImageSlot src={company.image} alt={company.alt} label="Logo asset pending" />
    </div>)}
  </div>;
}

export function TrustedCompaniesMarquee() {
  return (
    <section className="trusted-companies" aria-labelledby="trusted-companies-title">
      <div className="shell">
        <div className="trusted-companies-heading"><div><p className="eyebrow">Trusted companies</p><h2 id="trusted-companies-title">Trusted by businesses building for the future.</h2></div><p>Supporting organisations with structured business and financial workflows.</p></div>
      </div>
      <div className="marquee-viewport" role="region" aria-label="Company logos; focus or hover to pause the animation" tabIndex={0}>
        <div className="marquee-motion" style={{ "--marquee-duration": `${Math.max(28, companyLogos.length * 7)}s` } as React.CSSProperties}><LogoTrack/><LogoTrack duplicate/></div>
      </div>
    </section>
  );
}
