"use client";

import { useBookingStore } from "@/store/useBookingStore";
import type { BookingStep } from "@/types/booking";

const STEPS: { step: BookingStep; num: string; label: string }[] = [
  { step: 1, num: "01", label: "Services" },
  { step: 2, num: "02", label: "Date & Time" },
  { step: 3, num: "03", label: "Your Details" },
];

export default function StepTabStrip() {
  const currentStep = useBookingStore((state) => state.currentStep);
  const setStep = useBookingStore((state) => state.setStep);

  return (
    <div className='mb-10 flex border-b border-gray-300 lg:mb-12'>
      {STEPS.map((item) => {
        const isActive = item.step === currentStep;
        const isDone = item.step < currentStep;

        return (
          <button
            key={item.step}
            type='button'
            onClick={() => setStep(item.step)}
            className={`p-3 pl-5 flex min-w-0 flex-1 flex-col items-start gap-1 text-left transition-colors ${
              isActive
                ? "bg-[#a57865] rounded-l-2xl"
                : isDone
                  ? "border-gray-400"
                  : "border-transparent"
            }`}
            aria-current={isActive ? "step" : undefined}>
            <span
              className={`font-plus-jakarta-sans text-[14px] uppercase tracking-[0.22em] ${
                isActive ? "text-white" : "text-gray-600"
              }`}>
              {item.num}
            </span>
            <span
              className={`font-plus-jakarta-sans text-[20px] tracking-tight sm:text-[20px] ${
                isActive
                  ? "text-white"
                  : isDone
                    ? "text-gray-500"
                    : "text-gray-500"
              }`}>
              {item.label}
            </span>
            <span
              className={`text-[10px] text-gray-500 ${isDone ? "opacity-100" : "opacity-0"}`}>
              *
            </span>
          </button>
        );
      })}
    </div>
  );
}
