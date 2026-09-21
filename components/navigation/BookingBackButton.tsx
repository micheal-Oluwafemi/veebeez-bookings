"use client";

import { ArrowLeft } from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";

const BACK_LABELS: Record<number, string> = {
  2: "Back to Services",
  3: "Back to Schedule",
};

/**
 * Explicit step-level back button rendered above the breadcrumbs.
 * Breadcrumbs alone are easy to miss (and hidden on mobile), so this
 * gives users a clear, always-visible way to go back one step.
 */
export default function BookingBackButton() {
  const currentStep = useBookingStore((s) => s.currentStep);
  const prevStep = useBookingStore((s) => s.prevStep);
  const confirmation = useBookingStore((s) => s.confirmation);

  if (confirmation) return null;
  if (currentStep <= 1) return null;

  const handleBack = () => {
    prevStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type='button'
      onClick={handleBack}
      aria-label={BACK_LABELS[currentStep] ?? "Go back"}
      className='mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ddd0] bg-white px-4 py-2 font-plus-jakarta-sans text-xs font-semibold text-[#483630] shadow-sm transition hover:border-[#a57865]/50 hover:bg-[#fdf9f5] hover:text-[#a57865] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a57865]/30'>
      <ArrowLeft size={14} aria-hidden='true' />
      {BACK_LABELS[currentStep] ?? "Back"}
    </button>
  );
}
