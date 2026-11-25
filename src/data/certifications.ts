export interface Certification {
  name: string;
  detail: string;
  image?: string;
  alt?: string;
}

export const certifications: Certification[] = [
  { name: "NITDA", detail: "System Integrator Accredited" },
  { name: "ISO 27001", detail: "Certified" },
  { name: "NDPC", detail: "Nigeria Data Protection Commission" },
  { name: "NRS", detail: "E-Invoicing", image: "/images/trust/nrs-logo.webp", alt: "Nigeria Revenue Service logo" },
];
