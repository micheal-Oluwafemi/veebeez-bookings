import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/bookings", "/search-bookings", "/booking-confirmation", "/api/"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "PerplexityBot", "Claude-Web", "Google-Extended"],
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
