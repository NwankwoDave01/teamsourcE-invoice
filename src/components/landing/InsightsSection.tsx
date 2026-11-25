import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { blogProvider } from "@/lib/blog-provider";
import { BlogCard } from "@/components/blog/BlogCard";

export function InsightsSection() {
  const { data: articles = [], isPending, isError } = useQuery({ queryKey: ["blog", "articles"], queryFn: () => blogProvider.getArticles() });
  return <section className="editorial insights" id="insights" aria-labelledby="insights-title"><div className="shell">
    <div className="editorial-heading"><div><p className="eyebrow">Insights &amp; blog</p><h2 id="insights-title">Insights that help your business move forward.</h2></div><p>Explore practical guidance on electronic invoicing, business operations and digital compliance.</p></div>
    {isPending ? <p className="blog-state" role="status">Loading published articles…</p> : isError ? <p className="blog-state" role="status">Insights are temporarily unavailable. Please check back soon.</p> : !blogProvider.isConfigured ? <p className="blog-state">Publishing is not configured yet. Set VITE_WORDPRESS_API_URL to connect a WordPress REST API.</p> : articles.length ? <div className="blog-grid">{articles.slice(0, 3).map((article) => <BlogCard key={article.id} article={article}/>)}</div> : <p className="blog-state">No published articles yet.</p>}
    <div className="insights-actions"><Link to="/insights" className="home-btn secondary">View All Articles <ArrowRight size={15}/></Link></div>
  </div></section>;
}
