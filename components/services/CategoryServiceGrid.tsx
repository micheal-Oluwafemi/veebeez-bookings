"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { getCollectionBySlugQueryOptions } from "@/services/booking-catalog-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { Collection } from "@/types/booking";
import ServiceCard from "./ServiceCard";

// Header + sticky search + sticky pill nav height, in px.
// Used for scroll-margin on category sections and IntersectionObserver
// so scrollIntoView / scroll-spy doesn't tuck content under stickies.
const STICKY_HEADER_OFFSET = 184;

export default function CategoryServiceGrid() {
  const selectedCollectionSlug = useBookingStore(
    (s) => s.selectedCollectionSlug,
  );
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs to each category's <section>, keyed by slug, so we can
  // (a) observe them for scroll-spy and (b) scroll to them on click.
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const navRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // While we're programmatically scrolling (from a pill click), ignore
  // the IntersectionObserver so it doesn't fight the click with a
  // different "active" category mid-scroll.
  const isClickScrolling = useRef(false);
  const clickScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    ...getCollectionBySlugQueryOptions(selectedCollectionSlug ?? ""),
    enabled: !!selectedCollectionSlug,
  });

  const collection = data as Collection | undefined;
  const categories = collection?.categories ?? [];

  // Client-side search — filters services by name/slug/category name.
  // BE has no public GET /services?search= (only admin), so this is the
  // cheapest immediate UX. When BE adds search+pagination, replace with
  // useInfiniteQuery(GET /booking-system/services?search=&per_page=).
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((cat) => {
        const catNameMatch = cat.name.toLowerCase().includes(normalizedQuery);
        const matchedServices = cat.services.filter((svc) => {
          return (
            svc.name.toLowerCase().includes(normalizedQuery) ||
            svc.slug.toLowerCase().includes(normalizedQuery) ||
            String(svc.price).toLowerCase().includes(normalizedQuery) ||
            catNameMatch
          );
        });
        return { ...cat, services: matchedServices };
      })
      .filter((cat) => cat.services.length > 0);
  }, [categories, normalizedQuery]);

  const totalFilteredServices = useMemo(
    () => filteredCategories.reduce((acc, c) => acc + c.services.length, 0),
    [filteredCategories],
  );

  const totalServices = useMemo(
    () => categories.reduce((acc, c) => acc + c.services.length, 0),
    [categories],
  );

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setMounted(false);
      setActiveCategory(null);
    }, 0);

    const revealTimer = selectedCollectionSlug
      ? setTimeout(() => {
          setMounted(true);
        }, 50)
      : null;

    return () => {
      clearTimeout(resetTimer);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [selectedCollectionSlug]);

  // Clear search when switching collections — avoids showing "no results" from previous collection
  useEffect(() => {
    setSearchQuery("");
  }, [selectedCollectionSlug]);

  // --- Scroll-spy: watch each category section, mark the one nearest
  // the top of the viewport (just below the sticky nav) as active. ---
  useEffect(() => {
    if (!mounted || categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        // Pick the entry that is intersecting and closest to the top.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const slug = visible[0].target.getAttribute("data-slug");
          if (slug) setActiveCategory(slug);
        }
      },
      {
        // Top margin accounts for the sticky nav height; bottom margin
        // keeps a narrow "detection band" near the top of the viewport
        // rather than triggering on anything anywhere on screen.
        rootMargin: `-${STICKY_HEADER_OFFSET + 8}px 0px -70% 0px`,
        threshold: 0,
      },
    );

    sectionRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [mounted, categories]);

  // Keep the active pill scrolled into view within the (horizontally
  // scrollable, on mobile) nav row.
  useEffect(() => {
    if (!activeCategory) return;
    const pill = pillRefs.current.get(activeCategory);
    pill?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  const handlePillClick = useCallback((slug: string) => {
    const section = sectionRefs.current.get(slug);
    if (!section) return;

    isClickScrolling.current = true;
    setActiveCategory(slug);

    section.scrollIntoView({ behavior: "smooth", block: "start" });

    if (clickScrollTimeout.current) clearTimeout(clickScrollTimeout.current);
    // Re-enable the observer once the smooth scroll has settled.
    clickScrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 700);
  }, []);

  if (!selectedCollectionSlug) return null;

  // Only data skeleton - heading "Select a service" stays visible (per request)
  const servicesSkeleton = (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className='h-[148px] rounded-2xl' />
      ))}
    </div>
  );

  if (isError) {
    return (
      <section id='category-service-grid' className='mt-12 font-archivo'>
        <ErrorState
          title='Services unavailable'
          message="We couldn't load services for this collection. Please try again."
          error={error}
          onRetry={() => refetch()}
          retryLabel={isFetching ? "Retrying..." : "Try again"}
        />
      </section>
    );
  }

  return (
    <section id='category-service-grid' className='pt-32 font-archivo'>
      {/* Heading — now static (not sticky) */}
      <div
        className={cn(
          "lg:mb-2 md:flex pt-5 lg:pt-0 pb-2 lg:pb-0 bg-[#f6f6f0] translate-y-2 items-center opacity-0 transition-[opacity,transform] duration-[550ms] ease-out",
          mounted && "translate-y-0 opacity-100",
        )}>
        <h3 className='lg:max-w-xl max-w-sm font-cooper font-normal! text-[25px] leading-[1.05] text-black/80 md:text-[36px]'>
          Select a service
        </h3>
      </div>

      <SkeletonReveal
        loading={isLoading}
        skeleton={servicesSkeleton}
        minHeight={260}>
        {collection ? (
          <>
            {/* Search input — sticky (replaces title stickiness) */}
            <div
              className={cn(
                "sticky top-15 lg:top-16 z-20 -mx-1 bg-[#f6f6f0]/95 px-1 py-3 backdrop-blur-sm",
                "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                "translate-y-1 opacity-0 transition-[opacity,transform] duration-[500ms] delay-[40ms] ease-out",
                mounted && "translate-y-0 opacity-100",
              )}>
              <div className='relative w-full'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a6a5a]/60' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search services...'
                  aria-label='Search services'
                  className='h-10 w-full rounded-full border border-[#e8ddd0] bg-white pl-10 pr-10 font-plus-jakarta-sans text-base text-[#483630] placeholder:text-[#8a6a5a]/50 outline-none transition focus:border-[#a57865]/50 focus:ring-2 focus:ring-[#a57865]/10'
                />
                {searchQuery && (
                  <button
                    type='button'
                    onClick={() => setSearchQuery("")}
                    aria-label='Clear search'
                    className='absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#8a6a5a] transition hover:bg-[#f3e8dd] hover:text-[#483630]'>
                    <X className='size-3.5' />
                  </button>
                )}
              </div>
              {normalizedQuery ? (
                <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a] sm:text-right'>
                  {totalFilteredServices === 0
                    ? `No results for "${searchQuery.trim()}"`
                    : `Showing ${totalFilteredServices} of ${totalServices} service${totalServices === 1 ? "" : "s"}`}
                </span>
              ) : null}
            </div>

            {/* Sticky pill nav — stays pinned under the sticky search */}
            <div
              ref={navRef}
              className={cn(
                "sticky z-10 -mx-1 mb-8 flex top-[124px]! lg:top-[128px]! items-center gap-2 overflow-x-auto px-1 py-3",
                "bg-[#faf6f0]/95 backdrop-blur-sm",
                "translate-y-1 opacity-0 transition-[opacity,transform] duration-[500ms] delay-[80ms] ease-out",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                mounted && "translate-y-0 opacity-100",
              )}>
              {(normalizedQuery ? filteredCategories : categories).map(
                (cat, i) => {
                  const isActive = activeCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      ref={(el) => {
                        if (el) pillRefs.current.set(cat.slug, el);
                        else pillRefs.current.delete(cat.slug);
                      }}
                      type='button'
                      onClick={() => handlePillClick(cat.slug)}
                      style={{
                        transitionDelay: mounted ? `${100 + i * 40}ms` : "0ms",
                      }}
                      className={cn(
                        "relative shrink-0 whitespace-nowrap rounded-lg px-5 py-2 font-plus-jakarta-sans text-[15px] font-medium transition-all duration-250",
                        isActive
                          ? "bg-black/80 text-white"
                          : "bg-transparent border border-[#e0d4c4] hover:border-white text-neutral-900 hover:text-neutral-900 hover:bg-neutral-300",
                      )}>
                      {cat.name}
                    </button>
                  );
                },
              )}
            </div>

            {/* All categories rendered together — scroll-spy above
                highlights whichever one is currently in view. */}
            {filteredCategories.length === 0 && normalizedQuery ? (
              <div className='rounded-2xl border border-dashed border-[#e8ddd0] bg-white px-6 py-12 text-center'>
                <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
                  No services match &ldquo;{searchQuery.trim()}&rdquo;
                </p>
                <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                  Try a different keyword or clear the search.
                </p>
                <button
                  type='button'
                  onClick={() => setSearchQuery("")}
                  className='mt-4 rounded-full border border-[#e8ddd0] bg-[#fdf9f5] px-4 py-2 font-plus-jakarta-sans text-xs font-medium text-[#483630] transition hover:bg-white'>
                  Clear search
                </button>
              </div>
            ) : (
              <div className='flex flex-col gap-10'>
                {(normalizedQuery ? filteredCategories : categories).map(
                  (category, catIdx) => (
                    <div
                      key={category.slug}
                      data-slug={category.slug}
                      ref={(el) => {
                        if (el) sectionRefs.current.set(category.slug, el);
                        else sectionRefs.current.delete(category.slug);
                      }}
                      style={{
                        scrollMarginTop: STICKY_HEADER_OFFSET,
                      }}
                      className='transition-opacity duration-300 ease-in-out'>
                      <div className='mb-4 flex items-center gap-4'>
                        {/* <span className='font-plus-jakarta-sans text-[11px] font-semibold tracking-[0.20em] uppercase text-[#c9a96e]'>
                      {String(catIdx + 1).padStart(2, "0")}
                    </span> */}
                        <span className='font-plus-jakarta-sans tracking-tight text-base underline-offset-2 font-medium text-[#483630]'>
                          {category.name}
                        </span>
                        {/* <div className='h-px flex-1 bg-gradient-to-r from-[#e8ddd0] to-transparent' /> */}
                        <span className='font-plus-jakarta-sans text-[9px] tracking-[0.14em] uppercase text-[#c9a96e44]'>
                          {category.services.length}{" "}
                          {category.services.length === 1
                            ? "service"
                            : "services"}
                        </span>
                      </div>

                      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                        {category.services.map((service, svcIdx) => (
                          <ServiceCard
                            key={service.slug}
                            service={service}
                            collectionSlug={collection.slug}
                            collectionId={collection.collection_id}
                            collectionName={collection.name}
                            categorySlug={category.slug}
                            categoryId={category.category_id}
                            categoryName={category.name}
                            animationDelay={mounted ? svcIdx * 50 : 0}
                            mounted={mounted}
                          />
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        ) : null}
      </SkeletonReveal>
    </section>
  );
}
