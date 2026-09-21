"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { ErrorState } from "@/components/ui/error-state";
import { getCollectionsQueryOptions } from "@/services/booking-catalog-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { Collection } from "@/types/booking";
import { getOptimizedImageUrl, shouldUnoptimize } from "@/lib/image";

export default function CollectionGrid() {
  const selectedCollectionSlug = useBookingStore(
    (s) => s.selectedCollectionSlug,
  );
  const setCollectionSlug = useBookingStore((s) => s.setCollectionSlug);
  const [shouldScroll, setShouldScroll] = useState(false);

  const { data, isPending, isError, error, refetch, isFetching } = useQuery(
    getCollectionsQueryOptions(),
  );
  const collections = (data as Collection[] | undefined) ?? [];

  useEffect(() => {
    if (!selectedCollectionSlug || !shouldScroll) return;
    const raf = requestAnimationFrame(() => {
      const target = document.getElementById("category-service-grid");
      if (!target) return;
      setTimeout(() => {
        window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      }, 400);
      setShouldScroll(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedCollectionSlug, shouldScroll]);

  // Precise skeleton — mirrors actual card: h-36 sm:h-55, rounded-xl, gradient image bg, top-right dot, bottom title + meta
  const collectionsSkeleton = (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className='relative w-full h-36 sm:h-55 p-4 flex flex-col justify-between overflow-hidden rounded-xl bg-gray-200/70'>
          {/* top-right active dot placeholder */}
          {/* <div className='self-end'>
            <Skeleton className='size-5 rounded-full' />
          </div> */}
          <div className='space-y-2'>
            <Skeleton className='h-5 w-3/4 rounded-md' />
            <Skeleton className='h-3 w-1/2 rounded-md opacity-80' />
          </div>
        </div>
      ))}
    </div>
  );

  if (isError) {
    return (
      <section>
        <ErrorState
          title='Collections unavailable'
          message="We couldn't load collections. Please check your connection and try again."
          error={error}
          onRetry={() => refetch()}
          retryLabel={isFetching ? "Retrying..." : "Try again"}
        />
      </section>
    );
  }

  return (
    <section>
      <SkeletonReveal
        loading={isPending}
        skeleton={collectionsSkeleton}
        minHeight={260}>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {collections.map((collection, idx) => {
            const isActive = selectedCollectionSlug === collection.slug;
            const totalServices = collection.service_count ?? 0;
            const categoryCount = collection.category_count ?? 0;
            const img = getOptimizedImageUrl(
              collection.image_url,
              "/imgs/image-4.webp",
            );

            return (
              <button
                key={collection.slug}
                type='button'
                onClick={() => {
                  setShouldScroll(true);
                  setCollectionSlug(collection.slug);
                }}
                aria-label={`Select ${collection.name} collection`}
                aria-pressed={isActive}
                className='relative w-full h-36 sm:h-55 p-4 flex items-start justify-end flex-col overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/50'>
                <Image
                  src={img}
                  alt={`${collection.name} — beauty services at Veebeez, Lekki Phase 1, Lagos`}
                  fill
                  sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px'
                  style={{ objectFit: "cover", objectPosition: "50% 30%" }}
                  priority={idx < 3}
                  loading={idx < 3 ? "eager" : "lazy"}
                  unoptimized={shouldUnoptimize(img)}
                />
                <div
                  className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-black/10'
                  aria-hidden='true'
                />
                <div className='border-2 border-white size-5 flex items-center justify-center absolute top-3 right-3 rounded-full z-10'>
                  <div
                    className={`size-3 rounded-full bg-white transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
                  />
                </div>

                <div className='relative z-10'>
                  <span className='relative block font-plus-jakarta-sans text-base md:text-[19px] leading-tight text-white font-medium'>
                    {collection.name}
                  </span>
                  {/* <span className='relative mt-1 block font-plus-jakarta-sans text-[8px] uppercase tracking-[0.1em] text-white/45'>
                    {categoryCount} categories{" "}
                    <br className='md:hidden block' /> {totalServices} services
                  </span> */}
                </div>
              </button>
            );
          })}
        </div>
      </SkeletonReveal>
    </section>
  );
}
