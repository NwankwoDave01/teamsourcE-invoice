import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { BlogArticle } from "@/lib/blog-provider";
import { useState } from "react";

export function BlogCard({ article }: { article: BlogArticle }) {
  const [imageUnavailable, setImageUnavailable] = useState(!article.featuredImage);
  return (
    <article className="blog-card">
      <Link to={`/insights/${article.slug}`} className={`blog-card-image${imageUnavailable ? " is-empty" : ""}`} aria-label={`Read ${article.title}`}>
        {!imageUnavailable && <img src={article.featuredImage} alt={article.imageAlt} loading="lazy" onError={() => setImageUnavailable(true)} />}
        {imageUnavailable && <span className="blog-image-fallback" aria-hidden="true">TS-Flow Insights</span>}
      </Link>
      <div className="blog-card-body"><div className="blog-card-meta"><span>{article.category}</span><span><Clock3 size={13}/>{article.readingTime} min read</span></div>
        <h3><Link to={`/insights/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p>
        <div className="blog-card-foot"><span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : article.isPlaceholder ? "Draft sample" : "Date unavailable"}</span><Link to={`/insights/${article.slug}`} className="text-link">Read Article <ArrowRight size={15}/></Link></div>
      </div>
    </article>
  );
}
