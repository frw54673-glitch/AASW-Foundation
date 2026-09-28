import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

export type ApprovedTestimonial = {
  quote: string;
  name: string;
  role?: string;
  organisation?: string;
};

export function TestimonialsCarousel({ testimonials }: { testimonials: readonly ApprovedTestimonial[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const canSlide = testimonials.length > 1;

  useEffect(() => {
    if (!canSlide) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % testimonials.length), 6500);
    return () => window.clearInterval(timer);
  }, [canSlide, testimonials.length]);

  if (testimonials.length === 0) return null;
  const active = testimonials[activeIndex] ?? testimonials[0];

  return <section className="section section-sand testimonials-section" aria-labelledby="testimonial-heading"><div className="container testimonials-shell"><div className="testimonials-intro"><p className="eyebrow"><span className="eyebrow-dot" />Voices shared with permission</p><h2 id="testimonial-heading">People speak best<br /><em>in their own words.</em></h2><p>These reflections are published only after the individual or organisation has approved the exact wording and attribution.</p></div><div className="testimonial-stage" aria-live="polite"><Quote className="testimonial-quote-mark" size={42} strokeWidth={1.4} aria-hidden="true" /><div className="testimonial-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>{testimonials.map((testimonial, index) => <article className="testimonial-slide" aria-hidden={index !== activeIndex} key={`${testimonial.name}-${index}`}><blockquote>“{testimonial.quote}”</blockquote><footer><strong>{testimonial.name}</strong>{(testimonial.role || testimonial.organisation) && <span>{[testimonial.role, testimonial.organisation].filter(Boolean).join(" · ")}</span>}</footer></article>)}</div>{canSlide && <div className="testimonial-controls"><button type="button" aria-label="Show previous testimonial" onClick={() => setActiveIndex((index) => (index - 1 + testimonials.length) % testimonials.length)}><ChevronLeft size={18} /></button><div className="testimonial-dots" aria-label={`Testimonial ${activeIndex + 1} of ${testimonials.length}`}>{testimonials.map((testimonial, index) => <button type="button" aria-label={`Show testimonial ${index + 1}`} aria-current={index === activeIndex} className={index === activeIndex ? "testimonial-dot-active" : ""} key={`${testimonial.name}-dot-${index}`} onClick={() => setActiveIndex(index)} />)}</div><button type="button" aria-label="Show next testimonial" onClick={() => setActiveIndex((index) => (index + 1) % testimonials.length)}><ChevronRight size={18} /></button></div>}</div></div></section>;
}
