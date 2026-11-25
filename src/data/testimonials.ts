export interface Testimonial {
  id: string;
  customerName: string;
  designation: string;
  companyName: string;
  companyLogo: string;
  avatar: string;
  quote: string;
  featured: boolean;
  isPlaceholder: boolean;
  storyHref?: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "sample-one",
    customerName: "Sample Customer One",
    designation: "Finance Lead (sample role)",
    companyName: "Sample Company",
    companyLogo: "",
    avatar: "",
    quote: "A clear view of invoice status helps our team keep routine follow-up in one place. This sample quotation demonstrates the presentation only and was not supplied by a customer.",
    featured: true,
    isPlaceholder: true,
  },
  {
    id: "sample-two",
    customerName: "Sample Customer Two",
    designation: "Operations Manager (sample role)",
    companyName: "Sample Company",
    companyLogo: "",
    avatar: "",
    quote: "Structured steps make it easier to see what needs review next. This is illustrative sample content, not a verified customer endorsement.",
    featured: false,
    isPlaceholder: true,
  },
  {
    id: "sample-three",
    customerName: "Sample Customer Three",
    designation: "Business Administrator (sample role)",
    companyName: "Sample Company",
    companyLogo: "",
    avatar: "",
    quote: "Keeping team access and activity visible can support a more organised workflow. This is sample content for layout testing only.",
    featured: false,
    isPlaceholder: true,
  },
];
