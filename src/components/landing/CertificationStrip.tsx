import { certifications } from "@/data/certifications";
import { BrandImageSlot } from "./BrandImageSlot";

export function CertificationStrip() {
  return (
    <section className="certification-strip" aria-label="Accreditations and certifications">
      <div className="shell">
        <p className="eyebrow">Built for business confidence and compliance</p>
        <div className="certification-grid">
          {certifications.map((credential) => (
            <article className="certification-item" key={credential.name}>
              <BrandImageSlot src={credential.image} alt={credential.alt} label="Logo asset pending" />
              <div><h3>{credential.name}</h3><p>{credential.detail}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
