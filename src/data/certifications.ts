export interface Certification {
  name: string;
  detail: string;
  image?: string;
  alt?: string;
}

export const certifications: Certification[] = [
  { name: "NITDA", detail: "System Integrator Accredited", image: "/images/companies/NITDA%20LOGO.svg", alt: "NITDA logo" },
  { name: "ISO 27001", detail: "Certified", image: "/images/companies/ISO%20CERTIFICATE.svg", alt: "ISO 27001 certificate" },
  { name: "NDPC", detail: "Nigeria Data Protection Commission", image: "/images/companies/NDPC%20LOGO.svg", alt: "Nigeria Data Protection Commission logo" },
  { name: "NRS", detail: "E-Invoicing", image: "/images/trust/nrs-logo.webp", alt: "Nigeria Revenue Service logo" },
];
