import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/shared/BrandMark";
import { InsightsSection } from "@/components/landing/InsightsSection";

export default function InsightsPage() {
  useEffect(() => {
    document.title = "Insights & Blog | TS-Flow";
    const description = "Practical guidance on electronic invoicing, business operations and digital compliance.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.append(meta); }
    meta.content = description;
    for (const [property, content] of [["og:title", "Insights & Blog | TS-Flow"], ["og:description", description], ["og:type", "website"]]) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.append(tag); }
      tag.content = content;
    }
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = `${window.location.origin}/insights`;
  }, []);
  return <div className="insights-page"><header className="insights-header"><div className="shell"><Link to="/" aria-label="TS-Flow home"><BrandMark variant="auth" size="md" subtitle="by Teamsource"/></Link><Link className="text-link" to="/">Back to TS-Flow</Link></div></header><main><div className="insights-page-intro"><div className="shell"><p className="eyebrow">TS-Flow journal</p><h1>Insights for more confident business workflows.</h1><p>Helpful context for electronic invoicing, business operations and digital compliance.</p></div></div><InsightsSection/></main></div>;
}
