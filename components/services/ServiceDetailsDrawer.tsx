"use client";

import { Asterisk, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { buildCartItem } from "@/lib/booking/cart";
import { formatCurrency, formatDuration } from "@/lib/booking/format";
import { getServiceBySlugQueryOptions } from "@/services/booking-catalog-requests";
import { useServiceQuestions } from "@/hooks/useServiceQuestions";
import type {
  CartContext,
  ServiceDetail,
  ServiceListItem,
} from "@/types/booking";

interface Props {
  service: ServiceListItem;
  context: CartContext;
  open: boolean;
  onClose: () => void;
  onConfirm: (item: ReturnType<typeof buildCartItem>) => void;
}

export default function ServiceDetailsDrawer({
  service,
  context,
  open,
  onClose,
  onConfirm,
}: Props) {
  const { data: detailData, isPending } = useQuery({
    ...getServiceBySlugQueryOptions(service.slug),
    enabled: open && !!service.slug,
  });
  const detail = detailData as ServiceDetail | undefined;

  const q = useServiceQuestions(detail, service, context, onConfirm);

  useEffect(() => {
    if (!open) q.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const detailSkeleton = (
    <div className='p-6 space-y-3'>
      <Skeleton className='h-6 w-3/4' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-10 w-full' />
    </div>
  );

  const questionSkeleton = (
    <div className='p-6 space-y-3'>
      <Skeleton className='h-6 w-full' />
      <Skeleton className='h-14 w-full' />
    </div>
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}>
      <DrawerContent className='max-h-[88dvh] overflow-hidden rounded-t-[30px]! border border-black/10 bg-white p-0 text-black'>
        <div className='mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10' />
        <button
          type='button'
          onClick={onClose}
          className='absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm'
          aria-label='Close'>
          <X size={18} />
        </button>

        <div className='min-h-0 overflow-y-auto'>
          {!q.hasQuestions ? (
            <SkeletonReveal
              loading={isPending}
              skeleton={detailSkeleton}
              minHeight={320}>
              <div className='px-5 pt-3 pb-5'>
                <p className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.19em] text-[#a57865]'>
                  Service details
                </p>
                <h3 className='mt-2 font-plus-jakarta-sans tracking-tight text-lg font-medium leading-tight text-black'>
                  {q.detail?.name ?? service.name}
                </h3>
                {q.detail?.description ? (
                  <p className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-black/60'>
                    {q.detail.description}
                  </p>
                ) : null}
                <div className='mt-4 flex flex-wrap items-center gap-2'>
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-[#fdf9f5] border border-[#e8ddd0] px-3 py-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                    <Clock size={14} className='text-[#a57865]' />
                    {formatDuration(
                      q.detail?.duration_minutes ?? service.duration_minutes,
                    )}
                  </span>
                  <span className='font-sans text-base font-bold text-[#483630]'>
                    {formatCurrency(q.priceNumber)}
                  </span>
                </div>
              </div>

              <div className='mx-4 flex gap-3 pb-6'>
                <button
                  type='button'
                  onClick={onClose}
                  className='flex-1 rounded-full border border-black/15 bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-medium'>
                  Close
                </button>
                <button
                  type='button'
                  onClick={() => {
                    if (!q.effectiveDetail) {
                      const fake = {
                        service_id: service.service_id,
                        slug: service.slug,
                        name: service.name,
                        price: service.price,
                        currency: service.currency,
                        duration_minutes: service.duration_minutes,
                      } as ServiceDetail;
                      onConfirm(buildCartItem(fake, [], context));
                    } else
                      onConfirm(
                        buildCartItem(q.effectiveDetail, [], context),
                      );
                  }}
                  className='flex-1 rounded-full bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white'>
                  Add to cart
                </button>
              </div>
            </SkeletonReveal>
          ) : (
            <SkeletonReveal
              loading={isPending}
              skeleton={questionSkeleton}
              minHeight={360}>
              <div className='px-5 pt-3 pb-5'>
                <p className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.19em] text-[#a57865]'>
                  Service options
                </p>
                <h3 className='mt-2 font-plus-jakarta-sans tracking-tight text-lg font-medium leading-tight text-black'>
                  {q.detail?.name ?? service.name}
                </h3>
                {q.detail?.description ? (
                  <p className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-black/60'>
                    {q.detail.description}
                  </p>
                ) : null}
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-[#fdf9f5] border border-[#e8ddd0] px-3 py-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                    <Clock size={14} className='text-[#a57865]' />
                    {formatDuration(
                      q.detail?.duration_minutes ?? service.duration_minutes,
                    )}
                  </span>
                  <span className='font-sans text-base font-bold text-[#483630]'>
                    {formatCurrency(q.priceNumber)}
                  </span>
                </div>
                <p className='mt-3 font-plus-jakarta-sans text-sm leading-relaxed text-black/50'>
                  Answer a quick detail so we can price this service correctly.
                </p>
                {q.showProgress ? (
                  <div className='mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10'>
                    <div
                      className='h-full rounded-full bg-[#a57865] transition-all'
                      style={{
                        width: `${Math.round((q.currentStep / Math.max(q.totalQuestions, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className='px-4 pb-5'>
                <div className='rounded-2xl bg-gray-200/60 p-5'>
                  <p className='font-good-sans text-lg md:text-[20px] leading-snug tracking-tight text-black'>
                    {q.currentQuestion?.prompt}
                    {q.currentQuestion?.is_required ? (
                      <Asterisk
                        size={12}
                        strokeWidth={2.5}
                        className='ml-1 inline translate-y-[-2px] text-[#a57865]'
                      />
                    ) : (
                      <span className='ml-2 align-middle font-plus-jakarta-sans text-xs text-black/35'>
                        (optional)
                      </span>
                    )}
                  </p>
                  <div className='mt-6 grid gap-3' role='radiogroup'>
                    {q.currentQuestion?.options.map((option) => {
                      const isSelected =
                        q.selectedOptionId === option.option_id;
                      return (
                        <button
                          key={option.option_id}
                          type='button'
                          role='radio'
                          aria-checked={isSelected}
                          onClick={() => q.handleSelect(option.option_id)}
                          className={`flex items-center gap-3 rounded-xl border-[0.9px] px-4 py-3.5 text-left font-plus-jakarta-sans text-sm ${isSelected ? "border-[#a57865] bg-secondary/40" : "border-black/10 bg-white"}`}>
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#a57865] bg-white" : "border-black/15 bg-white"}`}>
                            <span
                              className={`size-2.5 rounded-full bg-[#a57865] ${isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                            />
                          </span>
                          <span className='flex-1'>
                            <span className='block'>{option.label}</span>
                            {option.extra_cost ? (
                              <span className='mt-1 block font-sans text-base font-bold text-slate-700'>
                                +{formatCurrency(Number(option.extra_cost))}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className='mt-6 flex items-center justify-between gap-3 border-t border-black/10 pt-4'>
                    <button
                      type='button'
                      onClick={q.handlePrevious}
                      disabled={!q.canGoPrev}
                      className='inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-3 font-plus-jakarta-sans text-sm font-medium disabled:opacity-40'>
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                    <button
                      type='button'
                      onClick={q.handleNext}
                      disabled={!q.canGoNext}
                      className='inline-flex items-center gap-1.5 rounded-lg bg-[#a57865] px-5 py-3 font-plus-jakarta-sans text-sm font-semibold text-white disabled:opacity-40'>
                      {q.isLast ? "Add to cart" : "Next"}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-between border-t border-black/10 bg-neutral-100 px-5 py-4'>
                <span className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50'>
                  Current total
                </span>
                <span className='text-lg font-semibold tracking-tight text-black/80 tabular-nums'>
                  {formatCurrency(q.currentTotal)}
                </span>
              </div>
            </SkeletonReveal>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
