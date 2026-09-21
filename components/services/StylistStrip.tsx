"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { getStylistsQueryOptions } from "@/services/booking-catalog-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { Stylist } from "@/types/booking";
import { getOptimizedImageUrl, shouldUnoptimize } from "@/lib/image";
import { scrollToElementId } from "@/lib/booking/schedule-focus";
import { RxShuffle } from "react-icons/rx";

export default function StylistStrip() {
  const selectedCollectionSlug = useBookingStore(
    (s) => s.selectedCollectionSlug,
  );
  const cart = useBookingStore((s) => s.cart);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const updateCartItemSchedule = useBookingStore((s) => s.updateCartItemSchedule);
  // per-item scoping — when a cart item is being configured, read/write that item's stylist
  const configuringItem =
    configuringItemIndex !== null && configuringItemIndex < cart.length
      ? cart[configuringItemIndex]
      : null;
  // legacy fallbacks for when no item is being configured (Step2Professional before Phase 3 merge)
  const legacySelectedStylistId = useBookingStore((s) => s.selectedStylistId);
  const legacySetStylistId = useBookingStore((s) => s.setStylistId);
  const selectedStylistId = configuringItem ? configuringItem.stylist_id : legacySelectedStylistId;
  const setStylistId = (id: number | null) => {
    if (configuringItem) {
      updateCartItemSchedule(configuringItem.service_id, { stylist_id: id });
    } else {
      legacySetStylistId(id);
    }
  };
  // picking a stylist advances the flow — reveal the date picker below
  // (no-op wherever the schedule anchors don't exist)
  const selectStylistAndReveal = (id: number | null) => {
    setStylistId(id);
    window.setTimeout(() => scrollToElementId("schedule-date", 80), 180);
  };
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    getStylistsQueryOptions(),
  );
  const stylists = (data as Stylist[] | undefined) ?? [];

  useEffect(() => {
    const resetTimer = setTimeout(() => setMounted(false), 0);
    const revealTimer =
      cart.length > 0 ? setTimeout(() => setMounted(true), 50) : null;
    return () => {
      clearTimeout(resetTimer);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [cart.length, stylists.length]);

  if (cart.length === 0) {
    return (
      <section className='mt-12 font-plus-jakarta-sans' id='stylist-strip'>
        <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-[#fdf9f5] px-6 py-10 text-center'>
          <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
            Select a service first
          </p>
          <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
            Professionals are shown based on your selected services.
          </p>
        </div>
      </section>
    );
  }

  const canPerform = (stylist: Stylist) => {
    // Phase 2: scope to the ONE service being configured (its slug), not every cart item
    if (configuringItem) {
      return stylist.service_slugs.includes(configuringItem.service_slug);
    }
    // legacy fallback when no item is being configured (e.g. Step2Professional standalone)
    if (cart.length === 0) return true;
    const cartSlugs = cart.map((c) => c.service_slug);
    return cartSlugs.every((slug) => stylist.service_slugs.includes(slug));
  };

  const availableStylists = stylists.filter(canPerform);

  const stylistsSkeleton = (
    <div className='grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className='h-32 rounded-2xl' />
      ))}
    </div>
  );

  return (
    <section className='font-plus-jakarta-sans' id='stylist-strip'>
      {isError ? (
        <ErrorState
          title='Stylists unavailable'
          message="We couldn't load professionals. Please try again."
          error={error}
          onRetry={() => refetch()}
          retryLabel={isFetching ? "Retrying..." : "Try again"}
        />
      ) : (
        <SkeletonReveal
          loading={isLoading}
          skeleton={stylistsSkeleton}
          minHeight={220}>
          <div
            className='grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3'
            ref={containerRef}>
            {/* No preference */}
            {(() => {
              const isActive =
                selectedStylistId === null &&
                useBookingStore.getState().hasStylistSelection;
              // use selector snapshot instead of getState for reactivity
              return null;
            })()}
            <NoPreferenceCard
              selectedStylistId={selectedStylistId}
              setStylistId={selectStylistAndReveal}
              mounted={mounted}
              index={0}
            />
            {availableStylists.map((stylist, i) => {
              const isActive = selectedStylistId === stylist.stylist_id;
              const idx = i + 1;

              const buttonBaseClasses =
                "group relative translate-y-3.5 rounded-2xl cursor-pointer overflow-hidden p-0 text-left opacity-0 outline-none transition-[opacity,transform,border-color,box-shadow,background-color] duration-500 ease-out hover:-translate-y-0.5";

              const variantClasses =
                "border border-[#e8ddd0] bg-[#fdf9f5] hover:shadow-[0_4px_10px_-10px_rgba(180,140,80,0.18)] hover:border-[#c9a96e]";
              const activeClasses = isActive
                ? "border-primary border-[2px] bg-primary/10 shadow-[0_8px_40px_-8px_rgba(180,140,80,0.28)]"
                : "";

              return (
                <button
                  key={stylist.slug}
                  type='button'
                  onClick={() => selectStylistAndReveal(stylist.stylist_id)}
                  className={cn(
                    buttonBaseClasses,
                    variantClasses,
                    activeClasses,
                    mounted && "translate-y-0 opacity-100",
                  )}
                  style={{ transitionDelay: `${80 + idx * 60}ms` }}
                  aria-pressed={isActive}>
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(201,169,110,0.07)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100",
                      isActive && "opacity-100",
                    )}
                  />

                  <div className='relative flex flex-col gap-3.5 px-4 pb-4 pt-4.5'>
                    <div className='relative size-12 rounded-full'>
                      <div className='relative size-full overflow-hidden rounded-full bg-[#e8ddd0] flex items-center justify-center'>
                        {stylist.avatar_url ? (
                          (() => {
                            const sUrl = getOptimizedImageUrl(
                              stylist.avatar_url,
                            );
                            return (
                              <Image
                                src={sUrl}
                                alt={`${stylist.display_name} — ${stylist.title} at Veebeez, Lekki`}
                                width={48}
                                height={48}
                                className='size-full rounded-full object-cover'
                                loading='lazy'
                                unoptimized={shouldUnoptimize(sUrl)}
                              />
                            );
                          })()
                        ) : (
                          <span className='font-plus-jakarta-sans text-lg font-semibold text-[#483630]'>
                            {stylist.initials}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='flex flex-col gap-0.5'>
                      <span className='flex items-center gap-1 lg:font-plus-jakarta-sans font-good-sans tracking-tight text-base lg:text-lg font-medium leading-[1.2] text-neutral-800'>
                        {stylist.display_name}
                      </span>
                      <span className='mt-0.5 text-[10px] font-good-sans font-medium uppercase tracking-[0.11em] text-[#767676]'>
                        {stylist.title}
                      </span>
                    </div>

                    {/* <div
                      className={cn(
                        "flex items-center justify-between border-t border-[#e8ddd0] pt-3 transition-colors duration-300",
                        isActive && "border-[#c9a96e44]",
                      )}>
                      <p className='font-plus-jakarta-sans text-sm'>
                        {disabled ? "Unavailable" : "View Profile"}
                      </p>
                      <span
                        className={cn(
                          "flex size-[20px] shrink-0 items-center justify-center rounded-full border border-[#e0d4c4] transition-colors duration-200",
                          isActive && "border-[#c9a96e] bg-[#c9a96e]",
                        )}
                        aria-hidden='true'>
                        <CheckIcon
                          className={cn(
                            "size-3 scale-75 opacity-0 text-white transition-[opacity,transform] duration-200",
                            isActive && "scale-100 opacity-100",
                          )}
                        />
                      </span>
                    </div> */}
                  </div>
                </button>
              );
            })}
          </div>
        </SkeletonReveal>
      )}
    </section>
  );
}

function NoPreferenceCard({
  selectedStylistId,
  setStylistId,
  mounted,
  index,
}: {
  selectedStylistId: number | null;
  setStylistId: (id: number | null) => void;
  mounted: boolean;
  index: number;
}) {
  const cart = useBookingStore((s) => s.cart);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const configuringItem =
    configuringItemIndex !== null && configuringItemIndex < cart.length
      ? cart[configuringItemIndex]
      : null;
  const legacyHasSelection = useBookingStore((s) => s.hasStylistSelection);
  // per-item: "any" (null) is valid selection when an item is being configured
  const hasSelection = configuringItem ? true : legacyHasSelection;
  const isActive = selectedStylistId === null && hasSelection;

  return (
    <button
      type='button'
      onClick={() => setStylistId(null)}
      className={cn(
        "group relative translate-y-3.5 rounded-2xl cursor-pointer overflow-hidden p-0 text-left opacity-0 outline-none transition-[opacity,transform,border-color,box-shadow,background-color] duration-500 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#c9a96e]/50",
        "border border-[#e8ddd0] bg-[#fdf9f5] hover:shadow-[0_4px_10px_-10px_rgba(180,140,80,0.18)] hover:border-[#c9a96e]",
        isActive &&
          "border-primary border-[2px] bg-primary/10 shadow-[0_4px_10px_-10px_rgba(180,140,80,0.28)]",
        mounted && "translate-y-0 opacity-100",
      )}
      style={{ transitionDelay: `${80 + index * 60}ms` }}
      aria-pressed={isActive}>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(201,169,110,0.07)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100",
          isActive && "opacity-100",
        )}
      />
      <div className='relative flex flex-col gap-3.5 px-4 pb-4 pt-4.5'>
        <div className='relative size-12 rounded-full bg-[#5a3f33] flex items-center justify-center'>
          {/* <span className='text-white text-xl'>*</span> */}
          <RxShuffle size={20} color='white' />
        </div>
        <div className='flex flex-col gap-0.5'>
          <span className='font-plus-jakarta-sans tracking-tight text-base lg:text-lg font-medium leading-[1.2] text-neutral-800'>
            Any Professional
          </span>
          <span className='mt-0.5 text-[11px] font-good-sans font-medium uppercase tracking-[0.11em] text-[#767676]'>
            Maximum availability
          </span>
        </div>
        {/* <div
          className={cn(
            "flex items-center justify-between border-t border-[#e8ddd0] pt-3",
            isActive && "border-[#c9a96e44]",
          )}>
          <p className='font-plus-jakarta-sans text-sm'>Select</p>
          <span
            className={cn(
              "flex size-[20px] shrink-0 items-center justify-center rounded-full border border-[#e0d4c4] transition-colors duration-200",
              isActive && "border-[#c9a96e] bg-[#c9a96e]",
            )}
            aria-hidden='true'>
            <CheckIcon
              className={cn(
                "size-3 scale-75 opacity-0 text-white transition-[opacity,transform] duration-200",
                isActive && "scale-100 opacity-100",
              )}
            />
          </span>
        </div> */}
      </div>
    </button>
  );
}
