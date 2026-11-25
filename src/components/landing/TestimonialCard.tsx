import { ArrowUpRight, Quote } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";
import { BrandImageSlot } from "./BrandImageSlot";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className={`testimonial-card${testimonial.featured ? " testimonial-featured" : ""}`}>
      <div className="testimonial-card-top"><Quote size={20} aria-hidden="true"/><BrandImageSlot src={testimonial.companyLogo} alt={`${testimonial.companyName} logo placeholder`} label="Company logo pending" /></div>
      <p className="testimonial-quote">“{testimonial.quote}”</p>
      {testimonial.isPlaceholder && <p className="sample-disclaimer">Sample content · Not a verified customer endorsement</p>}
      <div className="testimonial-person"><BrandImageSlot src={testimonial.avatar} alt={`${testimonial.customerName} profile image placeholder`} label="Profile image pending" className="testimonial-avatar"/><div><h3>{testimonial.customerName}</h3><p>{testimonial.designation} · {testimonial.companyName}</p></div></div>
      {testimonial.storyHref && <a className="text-link" href={testimonial.storyHref}>Read customer story <ArrowUpRight size={15}/></a>}
    </article>
  );
}
