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
  isConfigured: boolean;
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
    "wp:term"?: Array<Array<{ id?: number; name?: string; taxonomy?: string }>>;
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
  const category = post._embedded?.["wp:term"]?.flat().find((term) => term.id === TS_FLOW_CATEGORY_ID && term.taxonomy === "category")?.name ?? "TS-Flow Insights";
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
const TS_FLOW_CATEGORY_ID = 178;
const POSTS_PER_PAGE = 100;

async function requestPublishedPosts(): Promise<BlogArticle[]> {
  if (!endpoint) return [];
  const articles: BlogArticle[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      categories: String(TS_FLOW_CATEGORY_ID),
      status: "publish",
      _embed: "1",
      per_page: String(POSTS_PER_PAGE),
      page: String(page),
      orderby: "date",
      order: "desc",
    });
    const response = await fetch(`${endpoint}/wp-json/wp/v2/posts?${params}`);
    if (!response.ok) throw new Error(`WordPress returned ${response.status}`);
    const posts = await response.json() as WordPressPost[];
    articles.push(
      ...posts
        .filter((post) => post.status === "publish" && post.categories?.includes(TS_FLOW_CATEGORY_ID))
        .map(mapWordPressPost)
        .filter((article) => article.slug && article.title),
    );
    const totalPages = Number(response.headers.get("X-WP-TotalPages"));
    if ((Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages) || posts.length < POSTS_PER_PAGE) break;
  }
  return articles.sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
}

async function requestPublishedPost(slug: string): Promise<BlogArticle | undefined> {
  if (!endpoint) return undefined;
  const params = new URLSearchParams({
    slug,
    categories: String(TS_FLOW_CATEGORY_ID),
    status: "publish",
    _embed: "1",
    per_page: "1",
  });
  const response = await fetch(`${endpoint}/wp-json/wp/v2/posts?${params}`);
  if (!response.ok) throw new Error(`WordPress returned ${response.status} while looking up article "${slug}"`);
  const posts = await response.json() as WordPressPost[];
  const post = posts.find((item) => item.status === "publish" && item.slug === slug && item.categories?.includes(TS_FLOW_CATEGORY_ID));
  return post ? mapWordPressPost(post) : undefined;
}

export const blogProvider: BlogProvider = {
  isConfigured: Boolean(endpoint),
  getArticles: requestPublishedPosts,
  getArticle: requestPublishedPost,
};
