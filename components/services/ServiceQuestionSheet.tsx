"use client";

import { Asterisk, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { buildCartItem } from "@/lib/booking/cart";
import { formatCurrency } from "@/lib/booking/format";
import type {
  CartAnswer,
  CartContext,
  Option,
  Question,
  ServiceDetail,
} from "@/types/booking";

interface Props {
  service: ServiceDetail | null;
  isPending: boolean;
  context: CartContext;
  onClose: () => void;
  onConfirm: (item: ReturnType<typeof buildCartItem>) => void;
}

export default function ServiceQuestionSheet({
  service,
  isPending,
  context,
  onClose,
  onConfirm,
}: Props) {
  const initialQueue: Question[] = useMemo(
    () => service?.questions ?? [],
    [service],
  );

  const [queue, setQueue] = useState<Question[]>(() => initialQueue);
  const [history, setHistory] = useState<
    Array<{ question: Question; option: Option }>
  >([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  useEffect(() => {
    if (service?.questions) {
      setQueue(service.questions);
      setHistory([]);
      setSelectedOptionId(null);
    }
  }, [service]);

  const currentQuestion = queue[0] ?? null;

  const runningExtra = useMemo(() => {
    const histExtra = history.reduce(
      (t, h) => t + (h.option.extra_cost ?? 0),
      0,
    );
    const pendingOpt = currentQuestion?.options.find(
      (o) => o.option_id === selectedOptionId,
    );
    const pendingExtra = pendingOpt?.extra_cost ?? 0;
    return histExtra + (selectedOptionId ? pendingExtra : 0);
  }, [history, currentQuestion, selectedOptionId]);

  const histExtraOnly = useMemo(
    () => history.reduce((t, h) => t + (h.option.extra_cost ?? 0), 0),
    [history],
  );

  const priceNumber = service
    ? typeof service.price === "string"
      ? Number(service.price)
      : service.price
    : 0;
  const currentTotal = priceNumber + runningExtra;
  const committedTotal = priceNumber + histExtraOnly;

  const totalQuestions = history.length + queue.length;
  const currentStep = history.length + 1;
  const showProgress = totalQuestions > 1;
  const isLast = queue.length === 1;
  const canGoNext = selectedOptionId !== null;
  const canGoPrev = history.length > 0;
  const isSingleToggle =
    currentQuestion?.options.length === 1 &&
    currentQuestion !== null &&
    !currentQuestion.is_required;

  const handleSelect = (id: number) => {
    if (isSingleToggle) {
      setSelectedOptionId((prev) => (prev === id ? null : id));
    } else {
      setSelectedOptionId(id);
    }
  };

  const handleNext = () => {
    if (!currentQuestion || selectedOptionId === null || !service) return;
    const opt = currentQuestion.options.find(
      (o) => o.option_id === selectedOptionId,
    );
    if (!opt) return;

    const newHistory = [...history, { question: currentQuestion, option: opt }];
    const remaining = queue.slice(1);
    const newQueue = opt.follow_up_question
      ? [opt.follow_up_question, ...remaining]
      : remaining;

    if (newQueue.length === 0) {
      const answers: CartAnswer[] = newHistory.map((h) => ({
        option_id: h.option.option_id,
        label: h.option.label,
        value: h.option.value,
        extra_cost: h.option.extra_cost,
      }));
      onConfirm(buildCartItem(service, answers, context));
      return;
    }

    setHistory(newHistory);
    setQueue(newQueue);
    setSelectedOptionId(null);
  };

  const handlePrevious = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    let newQueue = [...queue];
    if (
      last.option.follow_up_question &&
      newQueue[0]?.question_id === last.option.follow_up_question.question_id
    ) {
      newQueue = newQueue.slice(1);
    }
    newQueue = [last.question, ...newQueue];
    setHistory(newHistory);
    setQueue(newQueue);
    setSelectedOptionId(last.option.option_id);
  };

  // Precise skeleton mimicking final layout
  const sheetSkeleton = (
    <div className='flex flex-col gap-0'>
      <div className='px-6 pt-7 pb-5 sm:px-7 space-y-3'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='h-5 w-3/4' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-5/6' />
      </div>
      <div className='mx-4 sm:mx-7 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 space-y-4'>
        {showProgress ? (
          <div className='flex items-center justify-between'>
            <Skeleton className='h-3 w-24' />
          </div>
        ) : null}
        {showProgress ? (
          <Skeleton className='h-1.5 w-full rounded-full' />
        ) : null}
        <Skeleton className='h-7 w-full' />
        <Skeleton className='h-7 w-2/3' />
        <div className='mt-6 grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-[58px] rounded-xl' />
          <Skeleton className='h-[58px] rounded-xl' />
        </div>
        <div className='mt-6 flex items-center justify-between border-t border-black/10 pt-4'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-9 w-20 rounded-full' />
        </div>
      </div>
      <div className='mt-5 flex items-center justify-between border-t border-black/10 bg-black/[0.02] px-6 py-4 sm:px-7'>
        <Skeleton className='h-3 w-20' />
        <Skeleton className='h-6 w-24' />
      </div>
    </div>
  );

  const shouldShowEmpty = !isPending && (!service || !currentQuestion);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <AlertDialogContent className='max-w-[calc(100%-2rem)]! gap-0 overflow-hidden rounded-3xl border border-black/10 bg-white p-0 text-black shadow-[0_24px_80px_-28px_rgba(0,0,0,0.4)] sm:max-w-xl!'>
        <button
          type='button'
          onClick={onClose}
          className='absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm transition-all duration-200 hover:border-black hover:bg-black hover:text-white active:scale-95'
          aria-label='Close service options'>
          <X size={18} />
        </button>

        <SkeletonReveal
          loading={isPending}
          skeleton={sheetSkeleton}
          minHeight={520}>
          {shouldShowEmpty ? (
            <div className='p-6 text-center font-plus-jakarta-sans text-sm text-black/50'>
              No questions available.
            </div>
          ) : (
            <>
              <AlertDialogHeader className='grid-rows-none place-items-start gap-0 px-6 pb-5 pt-7 text-left sm:px-7'>
                <div>
                  <p className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a57865]'>
                    Service options
                  </p>
                  <AlertDialogTitle className='mt-2 max-w-[calc(100%-3rem)] font-plus-jakarta-sans text-base leading-tight font-semibold text-black text-xl'>
                    {service?.name}
                  </AlertDialogTitle>
                  <AlertDialogDescription className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-black/50'>
                    Answer a quick detail so we can price this service
                    correctly.
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>

              <div className='mx-4 rounded-2xl bg-gray-200/60 p-5  sm:mx-7 sm:p-6'>
                {showProgress ? (
                  <div className='mb-4 flex items-center justify-between gap-4'>
                    <span className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50'>
                      Question {currentStep} of {totalQuestions}
                    </span>
                  </div>
                ) : null}

                {showProgress ? (
                  <div className='mb-4 h-1.5 w-full overflow-hidden rounded-full bg-black/10'>
                    <div
                      className='h-full rounded-full bg-[#a57865] transition-all duration-300 ease-out'
                      style={{
                        width: `${Math.round((currentStep / Math.max(totalQuestions, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}

                <p className='max-w-xl font-good-sans text-[20px] tracking-tight leading-snug text-black sm:text-xl'>
                  {currentQuestion?.prompt}
                  {currentQuestion?.is_required ? (
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

                <div
                  className='mt-6 grid gap-3 sm:grid-cols-2'
                  role='radiogroup'>
                  {currentQuestion?.options.map((option) => {
                    const isSelected = selectedOptionId === option.option_id;
                    return (
                      <button
                        key={option.option_id}
                        type='button'
                        role='radio'
                        aria-checked={isSelected}
                        onClick={() => handleSelect(option.option_id)}
                        className={`group flex items-center gap-3 rounded-xl border-[0.9px] px-4 py-3.5 text-left font-plus-jakarta-sans text-sm transition-all duration-200 active:scale-[0.98] ${
                          isSelected
                            ? "border-[#a57865] bg-secondary/40"
                            : "border-black/10 bg-white text-black hover:-translate-y-0.5 hover:bg-[#a57865]/5"
                        }`}>
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            isSelected
                              ? "border-[#a57865] bg-white"
                              : "border-black/15 bg-white"
                          }`}>
                          <span
                            className={`size-2.5 rounded-full bg-[#a57865] transition-all ${
                              isSelected
                                ? "scale-100 opacity-100"
                                : "scale-0 opacity-0"
                            }`}
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
                    onClick={handlePrevious}
                    disabled={!canGoPrev}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-3 font-plus-jakarta-sans text-sm font-medium text-black/80 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-black'>
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <button
                    type='button'
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className='inline-flex items-center gap-1.5 rounded-lg px-5 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 bg-[#a57865]'>
                    {isLast ? "Add to cart" : "Next"}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className='mt-5 flex items-center justify-between border-t border-black/10 px-6 py-4 sm:px-7 bg-neutral-100'>
                <span className='font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50'>
                  Current total
                </span>
                <span className=' text-xl tracking-tight font-semibold text-black/80 tabular-nums'>
                  {formatCurrency(currentTotal)}
                </span>
              </div>
            </>
          )}
        </SkeletonReveal>
      </AlertDialogContent>
    </AlertDialog>
  );
}
