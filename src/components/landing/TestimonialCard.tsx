import { ArrowUpRight, Quote } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className={`testimonial-card${testimonial.featured ? " testimonial-featured" : ""}`}>
      <div className="testimonial-card-top"><span className="testimonial-industry">{testimonial.industry}</span><Quote size={20} aria-hidden="true"/></div>
      <p className="testimonial-quote">“{testimonial.quote}”</p>
      <div className="testimonial-person">
        <span className={`testimonial-avatar avatar-${testimonial.avatarTone}`} aria-hidden="true">{testimonial.avatarInitials}</span>
        <div><h3>{testimonial.customerName}</h3><p>{testimonial.designation}</p><span className="testimonial-company">{testimonial.companyName}</span></div>
      </div>
      {testimonial.contentType === "verified" && testimonial.storyHref && <a className="text-link" href={testimonial.storyHref}>Read customer story <ArrowUpRight size={15}/></a>}
    </article>
  );
}
