import { sampleArticles } from "@/data/blogArticles";

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; src: string; alt: string; caption?: string };

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  featuredImage: string;
  imageAlt: string;
  publishedAt?: string;
  readingTime: number;
  status: "published" | "draft-sample";
  isPlaceholder: boolean;
  seo?: { description?: string; canonicalUrl?: string; socialImage?: string };
  body: ArticleBlock[];
}

export interface BlogProvider {
  getArticles(): Promise<BlogArticle[]>;
  getArticle(slug: string): Promise<BlogArticle | undefined>;
}

type WordPressPost = {
  id: number;
  slug: string;
  date?: string;
  date_gmt?: string;
  status: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  categories?: number[];
  _embedded?: {
    "wp:term"?: Array<Array<{ name?: string }>>;
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string }>;
  };
  yoast_head_json?: { description?: string; og_image?: Array<{ url?: string }> };
};

function textFromHtml(value = ""): string {
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function blocksFromHtml(value = ""): ArticleBlock[] {
  const document = new DOMParser().parseFromString(value, "text/html");
  const blocks: ArticleBlock[] = [];
  for (const node of Array.from(document.body.children)) {
    const tag = node.tagName.toLowerCase();
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if ((tag === "h2" || tag === "h3") && text) {
      blocks.push({ type: "heading", level: tag === "h2" ? 2 : 3, text });
    } else if ((tag === "ul" || tag === "ol") && text) {
      const items = Array.from(node.querySelectorAll("li")).map((item) => item.textContent?.trim() ?? "").filter(Boolean);
      if (items.length) blocks.push({ type: "list", items });
    } else if (tag === "img" || tag === "figure" || node.querySelector("img")) {
      const image = tag === "img" ? node as HTMLImageElement : node.querySelector("img");
      const src = image?.getAttribute("src");
      if (src && /^https:\/\//i.test(src)) blocks.push({ type: "image", src, alt: image?.getAttribute("alt") ?? "Article image", caption: node.querySelector("figcaption")?.textContent?.trim() });
    } else if (text) {
      blocks.push({ type: "paragraph", text });
    }
  }
  return blocks;
}

function mapWordPressPost(post: WordPressPost): BlogArticle {
  const title = textFromHtml(post.title?.rendered);
  const excerpt = textFromHtml(post.excerpt?.rendered);
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  const category = post._embedded?.["wp:term"]?.flat().find((term) => term.name)?.name ?? "Insights";
  const image = post.yoast_head_json?.og_image?.[0]?.url;
  const body = blocksFromHtml(post.content?.rendered);
  const wordCount = body.map((block) => block.type === "list" ? block.items.join(" ") : block.type === "image" ? "" : block.text).join(" ").split(/\s+/).filter(Boolean).length;
  return {
    id: `wordpress-${post.id}`,
    slug: post.slug,
    title,
    excerpt,
    category,
    featuredImage: media?.source_url ?? image ?? "",
    imageAlt: media?.alt_text || title,
    publishedAt: post.date_gmt || post.date,
    readingTime: Math.max(1, Math.ceil(wordCount / 220)),
    status: "published",
    isPlaceholder: false,
    seo: {
      description: post.yoast_head_json?.description || excerpt,
      socialImage: image,
    },
    body,
  };
}

const endpoint = import.meta.env.VITE_WORDPRESS_API_URL?.replace(/\/$/, "");

async function requestPublishedPosts(): Promise<BlogArticle[]> {
  if (!endpoint) return sampleArticles;
  const response = await fetch(`${endpoint}/wp-json/wp/v2/posts?status=publish&_embed=1&per_page=100`);
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`);
  const posts = await response.json() as WordPressPost[];
  return posts.map(mapWordPressPost).filter((article) => article.slug && article.title);
}

export const blogProvider: BlogProvider = {
  getArticles: requestPublishedPosts,
  async getArticle(slug) {
    const articles = await requestPublishedPosts();
    return articles.find((article) => article.slug === slug);
  },
};
