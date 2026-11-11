import type { MetadataRoute } from "next";

const siteUrl = "https://usemindlab.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing"],
      // Keep these crawlable so search engines can read their noindex metadata.
      disallow: ["/api/", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
