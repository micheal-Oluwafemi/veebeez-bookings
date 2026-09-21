import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/constants";
import { fetchAllServiceSlugs, fetchCollections } from "@/lib/seo/fetchers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/#faq`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  try {
    const [collections, serviceSlugs] = await Promise.all([fetchCollections(), fetchAllServiceSlugs()]);
    const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
      url: `${SITE_URL}/collections/${encodeURIComponent(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    const serviceRoutes: MetadataRoute.Sitemap = serviceSlugs.map((s) => ({
      url: `${SITE_URL}/services/${encodeURIComponent(s.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    return [...staticRoutes, ...collectionRoutes, ...serviceRoutes];
  } catch {
    return staticRoutes;
  }
}
