import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BrandMark } from "@/components/shared/BrandMark";
import { BlogArticleLayout } from "@/components/blog/BlogArticleLayout";
import { blogProvider } from "@/lib/blog-provider";

export default function BlogArticlePage() {
  const { slug = "" } = useParams();
  const { data: article, isPending, isError } = useQuery({ queryKey: ["blog", "article", slug], queryFn: () => blogProvider.getArticle(slug), enabled: Boolean(slug) });
  const { data: articles = [] } = useQuery({ queryKey: ["blog", "articles"], queryFn: () => blogProvider.getArticles(), enabled: Boolean(article) });
  const related = articles.filter((item) => item.slug !== slug).slice(0, 2);
  if (isPending) return <main className="insights-page"><p className="blog-state" role="status">Loading article…</p></main>;
  if (isError || !article) return <main className="insights-page"><header className="insights-header"><div className="shell"><Link to="/" aria-label="TS-Flow home"><BrandMark variant="auth" size="md" subtitle="by Teamsource"/></Link><Link className="text-link" to="/insights">Back to Insights</Link></div></header><section className="article-not-found"><p className="eyebrow">{isError ? "Insights unavailable" : "Article unavailable"}</p><h1>{isError ? "We couldn't load this article." : "We couldn't find that article."}</h1><p>{isError ? "Please try again later." : "It may have moved or is not currently published."}</p><Link className="home-btn" to="/insights">Explore Insights</Link></section></main>;
  return <div className="insights-page"><header className="insights-header"><div className="shell"><Link to="/" aria-label="TS-Flow home"><BrandMark variant="auth" size="md" subtitle="by Teamsource"/></Link><Link className="text-link" to="/insights">All Insights</Link></div></header><BlogArticleLayout article={article} related={related}/></div>;
}
