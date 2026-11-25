import { ArrowLeft, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ArticleBlock, BlogArticle } from "@/lib/blog-provider";
import { BlogCard } from "./BlogCard";

function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return <div className="article-body">{blocks.map((block, index) => {
    if (block.type === "heading") return block.level === 2 ? <h2 key={index}>{block.text}</h2> : <h3 key={index}>{block.text}</h3>;
    if (block.type === "list") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
    if (block.type === "image") return <figure key={index}><img src={block.src} alt={block.alt} loading="lazy"/>{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    return <p key={index}>{block.text}</p>;
  })}</div>;
}

function updateArticleMetadata(article: BlogArticle) {
  document.title = `${article.title} | TS-Flow Insights`;
  const description = article.seo?.description || article.excerpt;
  const canonical = article.seo?.canonicalUrl || `${window.location.origin}/insights/${article.slug}`;
  const absoluteImage = (value: string) => {
    try { return value ? new URL(value, window.location.origin).href : ""; }
    catch { return ""; }
  };
  const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.append(element); }
    element.content = content;
  };
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", article.title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:type"]', "property", "og:type", "article");
  const imageUrl = absoluteImage(article.seo?.socialImage || article.featuredImage);
  if (imageUrl) {
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);
  }
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", article.title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) { canonicalLink = document.createElement("link"); canonicalLink.rel = "canonical"; document.head.append(canonicalLink); }
  canonicalLink.href = canonical;
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: article.title, description, image: imageUrl || undefined, datePublished: article.publishedAt || undefined, mainEntityOfPage: canonical };
  let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-tsflow-article]');
  if (!script) { script = document.createElement("script"); script.type = "application/ld+json"; script.dataset.tsflowArticle = "true"; document.head.append(script); }
  script.textContent = JSON.stringify(schema);
}

export function BlogArticleLayout({ article, related }: { article: BlogArticle; related: BlogArticle[] }) {
  const [imageUnavailable, setImageUnavailable] = useState(!article.featuredImage);
  useEffect(() => { updateArticleMetadata(article); }, [article]);
  return <main className="insights-page article-page"><div className="shell article-shell">
    <Link to="/insights" className="article-back"><ArrowLeft size={16}/> Back to Insights</Link>
    <article>
      <header className="article-header"><span className="article-category">{article.category}</span><h1>{article.title}</h1><p className="article-excerpt">{article.excerpt}</p><div className="article-byline">{article.publishedAt && <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>}<span><Clock3 size={14}/>{article.readingTime} min read</span>{article.isPlaceholder && <span className="sample-disclaimer">Draft sample · not approved for publication</span>}</div></header>
      <figure className={`article-featured-image${imageUnavailable ? " is-empty" : ""}`}>{!imageUnavailable && <img src={article.featuredImage} alt={article.imageAlt} onError={() => setImageUnavailable(true)}/>} {imageUnavailable && <span aria-hidden="true">Featured image asset pending</span>}</figure>
      <ArticleBody blocks={article.body}/>
    </article>
    {!!related.length && <section className="related-articles"><div className="editorial-heading"><div><p className="eyebrow">Keep exploring</p><h2>Related insights</h2></div></div><div className="blog-grid">{related.map((item) => <BlogCard key={item.id} article={item}/>)}</div></section>}
  </div></main>;
}
