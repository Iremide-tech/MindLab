import type { MetadataRoute } from "next";

const siteUrl = "https://usemindlab.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing"],
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/login",
        "/signup",
        "/invite/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
