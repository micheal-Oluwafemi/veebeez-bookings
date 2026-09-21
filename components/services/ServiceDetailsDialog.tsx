"use client";

import { Asterisk, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

export default function ServiceDetailsDialog({
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
    <div className='flex flex-col gap-4 p-6'>
      <Skeleton className='h-6 w-3/4' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-5/6' />
      <Skeleton className='h-10 w-full rounded-xl' />
    </div>
  );

  const questionSkeleton = (
    <div className='flex flex-col gap-0'>
      <div className='px-6 pt-7 pb-5 space-y-3'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='h-5 w-3/4' />
        <Skeleton className='h-4 w-full' />
      </div>
      <div className='mx-6 rounded-2xl border border-black/10 bg-white p-5 space-y-4'>
        <Skeleton className='h-7 w-full' />
        <div className='grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-[58px] rounded-xl' />
          <Skeleton className='h-[58px] rounded-xl' />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}>
      <DialogContent className='max-w-[calc(100%-2rem)]! gap-0 overflow-hidden rounded-3xl border border-black/10 bg-white p-0 text-black shadow-[0_24px_80px_-28px_rgba(0,0,0,0.4)] sm:max-w-xl! max-h-[90vh] overflow-y-auto'>
        <button
          type='button'
          onClick={onClose}
          className='absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm transition hover:bg-black hover:text-white'
          aria-label='Close'>
          <X size={18} />
        </button>

        {!q.hasQuestions ? (
          <SkeletonReveal
            loading={isPending}
            skeleton={detailSkeleton}
            minHeight={360}>
            <div className='px-6 pt-7 pb-6 sm:px-7'>
              <p className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a57865]'>
                Service details
              </p>
              <h3 className='mt-2 font-plus-jakarta-sans text-xl font-semibold leading-tight text-black'>
                {q.detail?.name ?? service.name}
              </h3>
              {q.detail?.description ? (
                <p className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-black/60'>
                  {q.detail.description}
                </p>
              ) : null}
              <div className='mt-4 flex flex-wrap items-center gap-3'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[#fdf9f5] border border-[#e8ddd0] px-3 py-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                  <Clock size={14} className='text-[#a57865]' />
                  {formatDuration(
                    q.detail?.duration_minutes ?? service.duration_minutes,
                  )}
                </span>
                <span className='font-sans text-lg font-bold text-[#483630]'>
                  {formatCurrency(q.priceNumber)}
                  {q.detail?.pricing_type === "starting_at" ? (
                    <span className='ml-1 text-xs font-normal text-[#8a6a5a]'>
                      From
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
            <div className='flex gap-3 p-6 pt-4'>
              <button
                type='button'
                onClick={onClose}
                className='flex-1 rounded-full border border-black/15 bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-medium hover:bg-black/[0.04]'>
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
                    onConfirm(buildCartItem(q.effectiveDetail, [], context));
                }}
                className='flex-1 rounded-full bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white hover:bg-[#8e6655]'>
                Add to cart
              </button>
            </div>
          </SkeletonReveal>
        ) : (
          <SkeletonReveal
            loading={isPending}
            skeleton={questionSkeleton}
            minHeight={520}>
            <div className='px-6 pb-5 pt-7 text-left sm:px-7'>
              <p className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a57865]'>
                Service options
              </p>
              <h3 className='mt-2 max-w-[calc(100%-3rem)] font-plus-jakarta-sans text-xl font-semibold leading-tight text-black'>
                {q.effectiveDetail?.name ?? service.name}
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
              <p className='mt-4 font-plus-jakarta-sans text-sm leading-relaxed text-black/50'>
                Answer a quick detail so we can price this service correctly.
              </p>
            </div>
            <div className='mx-4 rounded-2xl bg-gray-200/60 p-5 sm:mx-7 sm:p-6'>
              {q.showProgress ? (
                <>
                  <div className='mb-4 flex items-center justify-between'>
                    <span className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50'>
                      Question {q.currentStep} of {q.totalQuestions}
                    </span>
                  </div>
                  <div className='mb-4 h-1.5 w-full overflow-hidden rounded-full bg-black/10'>
                    <div
                      className='h-full rounded-full bg-[#a57865] transition-all duration-300'
                      style={{
                        width: `${Math.round((q.currentStep / Math.max(q.totalQuestions, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              ) : null}
              <p className='max-w-xl font-good-sans text-[20px] tracking-tight leading-snug text-black sm:text-xl'>
                {q.currentQuestion?.prompt}
                {q.currentQuestion?.is_required ? (
                  <Asterisk
                    size={12}
                    strokeWidth={2.5}
                    className='ml-1 inline translate-y-[-2px] text-[#a57865]'
                    aria-label='required'
                  />
                ) : (
                  <span className='ml-2 align-middle font-plus-jakarta-sans text-xs font-normal text-black/35'>
                    (optional)
                  </span>
                )}
              </p>
              <div className='mt-6 grid gap-3 sm:grid-cols-2' role='radiogroup'>
                {q.currentQuestion?.options.map((option) => {
                  const isSelected = q.selectedOptionId === option.option_id;
                  return (
                    <button
                      key={option.option_id}
                      type='button'
                      role='radio'
                      aria-checked={isSelected}
                      onClick={() => q.handleSelect(option.option_id)}
                      className={`group flex items-center gap-3 rounded-xl border-[0.9px] px-4 py-3.5 text-left font-plus-jakarta-sans text-sm transition active:scale-[0.98] ${isSelected ? "border-[#a57865] bg-secondary/40" : "border-black/10 bg-white text-black hover:bg-[#a57865]/5"}`}>
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected ? "border-[#a57865] bg-white" : "border-black/15 bg-white"}`}>
                        <span
                          className={`size-2.5 rounded-full bg-[#a57865] transition-all ${isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                        />
                      </span>
                      <span className='flex-1'>
                        <span className='block font-normal leading-snug'>
                          {option.label}
                        </span>
                        {option.extra_cost ? (
                          <span className='mt-1 block text-base font-bold text-slate-700 font-sans tabular-nums'>
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
                  className='inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-3 font-plus-jakarta-sans text-sm font-medium text-black/80 transition disabled:opacity-40 hover:border-black'>
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <button
                  type='button'
                  onClick={q.handleNext}
                  disabled={!q.canGoNext}
                  className='inline-flex items-center gap-1.5 rounded-lg bg-[#a57865] px-5 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition disabled:opacity-40'>
                  {q.isLast ? "Add to cart" : "Next"}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className='mt-5 flex items-center justify-between border-t border-black/10 px-6 py-4 sm:px-7 bg-neutral-100'>
              <span className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50'>
                Current total
              </span>
              <span className='text-xl tracking-tight font-semibold text-black/80 tabular-nums'>
                {formatCurrency(q.currentTotal)}
              </span>
            </div>
          </SkeletonReveal>
        )}
      </DialogContent>
    </Dialog>
  );
}
