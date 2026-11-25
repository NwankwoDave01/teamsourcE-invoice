import { testimonials } from "@/data/testimonials";
import { TestimonialCard } from "./TestimonialCard";

export function CustomerStories() {
  const featured = testimonials.find((item) => item.featured);
  const supporting = testimonials.filter((item) => !item.featured);
  if (!featured) return null;
  return (
    <section className="editorial customer-stories" id="stories" aria-labelledby="customer-stories-title">
      <div className="shell">
        <div className="editorial-heading"><div><p className="eyebrow">Customer stories</p><h2 id="customer-stories-title">Business workflows, from different perspectives.</h2></div><p>Explore how different teams think about bringing clarity to everyday finance and operations.</p></div>
        <p className="stories-disclosure">Illustrative customer stories: These fictional profiles and quotations demonstrate potential TS-Flow use cases. They are not actual customer testimonials.</p>
        <div className="customer-story-layout"><TestimonialCard testimonial={featured}/><div className="supporting-testimonials">{supporting.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial}/>)}</div></div>
      </div>
    </section>
  );
}
