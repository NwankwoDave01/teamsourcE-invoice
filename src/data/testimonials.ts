export interface Testimonial {
  id: string;
  customerName: string;
  designation: string;
  companyName: string;
  industry: string;
  avatarInitials: string;
  avatarTone: "blue" | "teal" | "amber" | "violet";
  quote: string;
  featured: boolean;
  contentType: "illustrative" | "verified";
  storyHref?: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "amara-crestfield",
    customerName: "Amara Okafor",
    designation: "Finance Manager",
    companyName: "Crestfield Manufacturing",
    industry: "Manufacturing",
    avatarInitials: "AO",
    avatarTone: "blue",
    quote: "When finance is balancing supplier invoices with production needs, it helps to have the review steps and current status clear to the whole team. A well-organised workflow gives us a better starting point for approvals.",
    featured: true,
    contentType: "illustrative",
  },
  {
    id: "tunde-northbridge",
    customerName: "Tunde Bakare",
    designation: "Operations Director",
    companyName: "Northbridge Logistics",
    industry: "Logistics & supply chain",
    avatarInitials: "TB",
    avatarTone: "teal",
    quote: "For an operations team coordinating across routes and depots, chasing invoice updates by email can interrupt the day. A shared tracking view makes it easier to see what needs attention next.",
    featured: false,
    contentType: "illustrative",
  },
  {
    id: "chidinma-verity",
    customerName: "Chidinma Eze",
    designation: "Managing Director",
    companyName: "Verity Business Services",
    industry: "Professional services · SME",
    avatarInitials: "CE",
    avatarTone: "amber",
    quote: "Running a small services firm means keeping administration practical. Bringing invoice preparation and review into a more structured process can make responsibilities easier to follow as the business grows.",
    featured: false,
    contentType: "illustrative",
  },
  {
    id: "femi-oakwell",
    customerName: "Femi Adeyemi",
    designation: "Financial Controller",
    companyName: "Oakwell Industrial Supplies",
    industry: "Industrial equipment & distribution",
    avatarInitials: "FA",
    avatarTone: "violet",
    quote: "With orders, deliveries and finance records moving in parallel, a clear picture of invoice progress is useful for oversight. Keeping the record and its next step together helps the team coordinate follow-up.",
    featured: false,
    contentType: "illustrative",
  },
];
