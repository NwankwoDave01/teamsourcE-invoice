import { testimonials } from "@/data/testimonials";
import { TestimonialCard } from "./TestimonialCard";

export function CustomerStories() {
  const featured = testimonials.find((item) => item.featured);
  const supporting = testimonials.filter((item) => !item.featured);
  if (!featured) return null;
  return (
    <section className="editorial customer-stories" id="stories" aria-labelledby="customer-stories-title">
      <div className="shell">
        <div className="editorial-heading"><div><p className="eyebrow">Customer stories</p><h2 id="customer-stories-title">Businesses moving forward with TS-Flow.</h2></div><p>Discover how structured invoicing and business workflows can help organisations operate with greater clarity.</p></div>
        <div className="customer-story-layout"><TestimonialCard testimonial={featured}/><div className="supporting-testimonials">{supporting.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial}/>)}</div></div>
      </div>
    </section>
  );
}
