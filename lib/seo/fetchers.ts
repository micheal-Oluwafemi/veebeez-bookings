import type { Collection, ServiceDetail } from "@/types/booking";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://backend.thevaleriebrand.co/api").replace(/\/$/, "");

async function fetchJson<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T } | T;
    // API wraps in { data: ... }
    if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
      return (json as { data: T }).data as T;
    }
    return json as T;
  } catch {
    return null;
  }
}

export async function fetchCollections(): Promise<Collection[]> {
  const data = await fetchJson<Collection[]>("booking-system/collections", 3600);
  return Array.isArray(data) ? data : [];
}

export async function fetchCollectionBySlug(slug: string): Promise<Collection | null> {
  return fetchJson<Collection>(`booking-system/collections/${encodeURIComponent(slug)}`, 3600);
}

export async function fetchServiceBySlug(slug: string): Promise<ServiceDetail | null> {
  return fetchJson<ServiceDetail>(`booking-system/services/${encodeURIComponent(slug)}`, 3600);
}

export async function fetchAllServiceSlugs(): Promise<{ slug: string; updatedAt?: string }[]> {
  const collections = await fetchCollections();
  const slugs: { slug: string; updatedAt?: string }[] = [];
  for (const col of collections) {
    try {
      const detail = await fetchCollectionBySlug(col.slug);
      const cats = detail?.categories ?? col.categories ?? [];
      for (const cat of cats) {
        for (const svc of cat.services ?? []) {
          if (svc.slug) slugs.push({ slug: svc.slug });
        }
      }
    } catch {
      // ignore
    }
  }
  // dedupe
  const seen = new Set<string>();
  return slugs.filter((s) => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });
}
