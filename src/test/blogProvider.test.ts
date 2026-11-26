import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishedPost = {
  id: 101,
  slug: "cash-flow",
  status: "publish",
  date: "2026-11-25T10:00:00",
  date_gmt: "2026-11-25T10:00:00",
  categories: [178, 12],
  title: { rendered: "Cash &amp; flow" },
  excerpt: { rendered: "<p>Practical <strong>guidance</strong>.</p>" },
  content: {
    rendered: "<h2>Plan ahead</h2><p>Keep a clear view.</p><ul><li>Review invoices</li><li>Track payments</li></ul><figure><img src=\"https://teamsource.net/photo.jpg\" alt=\"Ledger\"/><figcaption>Example ledger</figcaption></figure>",
  },
  _embedded: {
    "wp:term": [[
      { id: 12, name: "General", taxonomy: "category" },
      { id: 178, name: "TS-Flow Insights", taxonomy: "category" },
    ], []],
    "wp:featuredmedia": [{ source_url: "https://teamsource.net/featured.jpg", alt_text: "Invoice dashboard" }],
  },
};

function response(posts: unknown[], totalPages = 1) {
  return {
    ok: true,
    headers: new Headers({ "X-WP-TotalPages": String(totalPages) }),
    json: async () => posts,
  };
}

describe("WordPress blog provider", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_WORDPRESS_API_URL", "https://teamsource.net/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("requests only published category articles and maps embedded article content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([
      publishedPost,
      { ...publishedPost, id: 102, slug: "other", categories: [12] },
      { ...publishedPost, id: 103, slug: "draft", status: "draft" },
    ]));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { blogProvider } = await import("@/lib/blog-provider");
    const articles = await blogProvider.getArticles();
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);

    expect(requestedUrl.pathname).toBe("/wp-json/wp/v2/posts");
    expect(requestedUrl.searchParams.get("categories")).toBe("178");
    expect(requestedUrl.searchParams.get("status")).toBe("publish");
    expect(requestedUrl.searchParams.get("_embed")).toBe("1");
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: "Cash & flow",
      excerpt: "Practical guidance.",
      category: "TS-Flow Insights",
      featuredImage: "https://teamsource.net/featured.jpg",
      imageAlt: "Invoice dashboard",
      publishedAt: "2026-11-25T10:00:00",
      status: "published",
    });
    expect(articles[0].body).toEqual([
      { type: "heading", level: 2, text: "Plan ahead" },
      { type: "paragraph", text: "Keep a clear view." },
      { type: "list", items: ["Review invoices", "Track payments"] },
      { type: "image", src: "https://teamsource.net/photo.jpg", alt: "Ledger", caption: "Example ledger" },
    ]);
  });

  it("filters detail lookups by the TS-Flow category and published status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([{ ...publishedPost, categories: [12] }]));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { blogProvider } = await import("@/lib/blog-provider");
    expect(await blogProvider.getArticle("cash-flow")).toBeUndefined();
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get("slug")).toBe("cash-flow");
    expect(requestedUrl.searchParams.get("categories")).toBe("178");
    expect(requestedUrl.searchParams.get("status")).toBe("publish");
    expect(requestedUrl.searchParams.get("_embed")).toBe("1");
  });

  it("loads every page and keeps the newest articles first", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...publishedPost,
      id: index + 1,
      slug: `article-${index + 1}`,
      date_gmt: `2026-11-${String(25 - Math.floor(index / 10)).padStart(2, "0")}T10:00:00`,
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(firstPage, 2))
      .mockResolvedValueOnce(response([{ ...publishedPost, id: 101, slug: "older-article", date_gmt: "2026-10-25T10:00:00" }], 2));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { blogProvider } = await import("@/lib/blog-provider");
    const articles = await blogProvider.getArticles();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get("page")).toBe("1");
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get("page")).toBe("2");
    expect(articles).toHaveLength(101);
    expect(articles[0].publishedAt).toBe("2026-11-25T10:00:00");
    expect(articles.at(-1)?.slug).toBe("older-article");
  });
});
