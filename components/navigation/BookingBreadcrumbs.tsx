"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/store/useBookingStore";
import type { BookingStep } from "@/types/booking";

const STEPS: { id: BookingStep; label: string; shortLabel: string }[] = [
  { id: 1, label: "Services", shortLabel: "Services" },
  { id: 2, label: "Services & Schedule", shortLabel: "Schedule" },
  { id: 3, label: "Your Details", shortLabel: "Details" },
];

export default function BookingBreadcrumbs() {
  const currentStep = useBookingStore((s) => s.currentStep);
  const setStep = useBookingStore((s) => s.setStep);
  const confirmation = useBookingStore((s) => s.confirmation);

  const isConfirmed = !!confirmation;
  if (isConfirmed) return null;

  return (
    <nav
      aria-label='Booking progress'
      className='mb-5 hidden md:block w-full overflow-x-auto scrollbar-none'>
      <ol className='flex items-center gap-1 sm:gap-1.5'>
        {STEPS.map((step, idx) => {
          const isCurrent = currentStep === step.id;
          const isCompletedOrActive = step.id <= currentStep;
          const isAccessible = step.id <= currentStep;

          return (
            <li key={step.id} className='flex items-center gap-1 sm:gap-1.5'>
              <button
                type='button'
                disabled={!isAccessible}
                onClick={() => {
                  if (isAccessible) {
                    setStep(step.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={cn(
                  "rounded-full px-1 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a57865]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F3]",
                  isAccessible ? "cursor-pointer" : "cursor-default",
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isAccessible}>
                <span
                  className={cn(
                    "whitespace-nowrap font-dmsans text-[13px] transition sm:text-sm",
                    isCompletedOrActive
                      ? "font-semibold text-neutral-800 opacity-100"
                      : "font-normal text-[#483630] opacity-40 hover:opacity-70",
                  )}>
                  <span className='sm:hidden'>{step.shortLabel}</span>
                  <span className='hidden sm:inline'>{step.label}</span>
                </span>
              </button>

              {idx < STEPS.length - 1 && (
                <ChevronRight
                  size={14}
                  className='shrink-0 text-black/50'
                  aria-hidden='true'
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
