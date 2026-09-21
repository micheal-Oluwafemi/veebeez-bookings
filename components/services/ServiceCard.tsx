"use client";

import { Check, Clock, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { buildCartItem } from "@/lib/booking/cart";
import { formatCurrency, formatDuration } from "@/lib/booking/format";
import { getServiceBySlugQueryOptions } from "@/services/booking-catalog-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { ServiceDetail, ServiceListItem } from "@/types/booking";
import ServiceDetailsDialog from "./ServiceDetailsDialog";
import ServiceDetailsDrawer from "./ServiceDetailsDrawer";

interface ServiceCardProps {
  service: ServiceListItem;
  collectionSlug: string;
  collectionId: number;
  collectionName: string;
  categorySlug: string;
  categoryId: number;
  categoryName: string;
  animationDelay?: number;
  mounted?: boolean;
}

export default function ServiceCard({
  service,
  collectionSlug,
  collectionId,
  collectionName,
  categorySlug,
  categoryId,
  categoryName,
  animationDelay = 0,
  mounted = true,
}: ServiceCardProps) {
  const cart = useBookingStore((s) => s.cart);
  const addToCart = useBookingStore((s) => s.addToCart);
  // 3) Dialog flicker fix: wait for mount before reading media query (SSR returns false)
  // Otherwise `detailsOpen && isDesktop` is false on first paint and dialog never mounts on desktop.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const isDesktopQuery = useMediaQuery({ query: "(min-width: 1024px)" });
  const isDesktop = hasMounted ? isDesktopQuery : false;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [openAsDesktop, setOpenAsDesktop] = useState<boolean | null>(null);
  const [pressing, setPressing] = useState(false);

  // fetch only when modal will be shown (needs description or questions)
  const { data: detail } = useQuery({
    ...getServiceBySlugQueryOptions(service.slug),
    enabled: !!(service.has_questions || service.has_description),
  });
  const serviceDetail = detail as ServiceDetail | undefined;

  const isInCart = useMemo(
    () => cart.some((item) => item.service_id === service.service_id),
    [cart, service.service_id],
  );

  const context = { categoryId, categoryName, collectionId, collectionName };

  const handleToggle = () => {
    if (isInCart) {
      const fakeDetail = {
        service_id: service.service_id,
        slug: service.slug,
        name: service.name,
        price: service.price,
        currency: service.currency,
        duration_minutes: service.duration_minutes,
      } as ServiceDetail;
      addToCart(buildCartItem(fakeDetail, [], context));
      return;
    }
    // Bypass modal when no questions and no description -> direct add (OR gate)
    if (!service.has_questions && !service.has_description) {
      const fakeDetail = {
        service_id: service.service_id,
        slug: service.slug,
        name: service.name,
        price: service.price,
        currency: service.currency,
        duration_minutes: service.duration_minutes,
      } as ServiceDetail;
      addToCart(buildCartItem(fakeDetail, [], context));
      return;
    }
    // capture desktop flag at open time to avoid mid-open flip (hasMounted guards SSR)
    setOpenAsDesktop(isDesktop);
    setDetailsOpen(true);
  };

  const priceNumber =
    typeof service.price === "string" ? Number(service.price) : service.price;

  const hasExtraFee = useMemo(() => {
    const detailQuestions = serviceDetail?.questions;
    if (!detailQuestions?.length) return false;
    return detailQuestions.some((q) =>
      q.options.some((o) => o.extra_cost != null && Number(o.extra_cost) > 0),
    );
  }, [serviceDetail]);

  const showFrom = hasExtraFee || service.pricing_type === "starting_at";

  return (
    <>
      <div
        style={{ transitionDelay: `${animationDelay}ms` }}
        className={cn(
          "group relative bg-white! flex translate-y-3.5 flex-col justify-between overflow-hidden rounded-2xl border-2 opacity-0 transition-all duration-300 ease-out cursor-pointer select-none",
          "min-h-[148px] p-4",
          mounted && "translate-y-0 opacity-100",
          !isInCart && [
            "border-neutral-200/70 bg-[#FAF7F3]",
            "hover:shadow-[0_6px_28px_-6px_rgba(180,140,80,0.15)]",
            "hover:bg-[#fdfaf5]",
          ],
          isInCart && [
            "border-[#c9a96e] bg-[#fdf7ee]",
            "shadow-[0_6px_28px_-6px_rgba(180,140,80,0.22)]",
          ],
          pressing && "scale-[0.985]",
        )}
        onClick={handleToggle}
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        onMouseLeave={() => setPressing(false)}
        onTouchStart={() => setPressing(true)}
        onTouchEnd={() => setPressing(false)}
        role='button'
        tabIndex={0}
        aria-pressed={isInCart}
        aria-label={isInCart ? `Remove ${service.name}` : `Add ${service.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}>
        {/* <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
            isInCart ? "bg-[#c9a96e] opacity-100" : "opacity-0",
          )}
        /> */}

        <div className='flex items-start justify-between gap-3'>
          <div>
            <h4
              className={cn(
                "font-plus-jakarta-sans tracking-tight text-base font-normal transition-colors duration-200 flex-1 pr-1",
                isInCart
                  ? "text-neutral-900"
                  : "text-neutral-700 group-hover:text-[#3a2520]",
              )}>
              {service.name}
            </h4>

            <span className='flex items-center gap-1 mt-1 font-plus-jakarta-sans tracking-tight text-[15px]'>
              <Clock size={12} className='shrink-0' />
              {formatDuration(service.duration_minutes)}
            </span>
          </div>

          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-250 mt-0.5",
              isInCart
                ? "border-[#c9a96e] bg-primary text-white shadow-[0_2px_10px_-2px_rgba(180,140,80,0.45)]"
                : [
                    "border-[#e0d4c4] text-[#483630]",
                    "group-hover:border-[#c9a96e] group-hover:text-[#c9a96e] group-hover:bg-[#c9a96e0a]",
                  ],
            )}>
            {isInCart ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <Plus size={16} strokeWidth={2} />
            )}
          </div>
        </div>

        <div className='flex-1' />

        <div className='mt-4'>
          <div className='flex items-baseline gap-1.5 mb-2'>
            {showFrom && (
              <span className='text-[10px] font-medium text-[#b89a85]'>
                From
              </span>
            )}
            <span
              className={cn(
                "font-sans tracking-tight text-base font-bold leading-none transition-colors duration-200",
                isInCart ? "text-[#483630]/90" : "text-[#7a5c51]/90",
              )}>
              {formatCurrency(priceNumber)}
            </span>
          </div>

          {/* <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            {hasQuestions ? (
              <span className='flex items-center gap-1 font-plus-jakarta-sans text-[12px] font-medium uppercase text-[#7db88a]'>
                <IoSparklesSharp size={12} className='shrink-0' />
                Options
              </span>
            ) : null}
          </div> */}
        </div>

        <span
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-300",
            "bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,110,0.06)_0%,transparent_65%)]",
            isInCart ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
      </div>

      {detailsOpen && (openAsDesktop ?? isDesktop) && (
        <ServiceDetailsDialog
          service={service}
          context={context}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setOpenAsDesktop(null);
          }}
          onConfirm={(item) => {
            addToCart(item);
            setDetailsOpen(false);
            setOpenAsDesktop(null);
          }}
        />
      )}
      {detailsOpen && !(openAsDesktop ?? isDesktop) && (
        <ServiceDetailsDrawer
          service={service}
          context={context}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setOpenAsDesktop(null);
          }}
          onConfirm={(item) => {
            addToCart(item);
            setDetailsOpen(false);
            setOpenAsDesktop(null);
          }}
        />
      )}
    </>
  );
}
