export interface Certification {
  name: string;
  detail: string;
  image: string;
  alt: string;
}

export const certifications: Certification[] = [
  { name: "NITDA", detail: "System Integrator Accredited", image: "/images/trust/nitda-logo.svg", alt: "NITDA accreditation logo placeholder" },
  { name: "ISO 27001", detail: "Certified", image: "/images/trust/iso-27001-logo.svg", alt: "ISO 27001 certification logo placeholder" },
  { name: "Software Quality Assurance", detail: "Approved", image: "/images/trust/sqa-logo.svg", alt: "Software Quality Assurance logo placeholder" },
  { name: "NRS", detail: "E-Invoicing", image: "/images/trust/nrs-logo.png", alt: "Nigeria Revenue Service logo" },
];
