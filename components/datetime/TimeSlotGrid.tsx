"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { formatTime } from "@/lib/booking/format";
import { scrollToElementId } from "@/lib/booking/schedule-focus";
import { getAvailabilityQueryOptions } from "@/services/booking-availability-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { TimeSlot } from "@/types/booking";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TimeSlotGrid() {
  const cart = useBookingStore((s) => s.cart);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const configuringItem =
    configuringItemIndex !== null && configuringItemIndex < cart.length
      ? cart[configuringItemIndex]
      : null;
  const updateCartItemSchedule = useBookingStore((s) => s.updateCartItemSchedule);
  // legacy fallbacks when no item is being configured (Step3DateTime before Phase 3 merge)
  const legacySelectedDate = useBookingStore((s) => s.selectedDate);
  const legacySelectedTimeSlot = useBookingStore((s) => s.selectedTimeSlot);
  const legacySelectedStylistId = useBookingStore((s) => s.selectedStylistId);
  const legacyHasStylistSelection = useBookingStore((s) => s.hasStylistSelection);
  const legacySetTimeSlot = useBookingStore((s) => s.setTimeSlot);

  // per-item scoping: date from global shim (BookingCalendar writes there) or from item's scheduled_at
  const selectedDate = (() => {
    if (configuringItem?.scheduled_at) {
      const d = new Date(configuringItem.scheduled_at.replace(" ", "T"));
      if (!isNaN(d.getTime())) return d;
    }
    return legacySelectedDate;
  })();
  const selectedStylistId = configuringItem ? configuringItem.stylist_id : legacySelectedStylistId;
  const hasStylistSelection = configuringItem ? true : legacyHasStylistSelection;
  // per-item service/duration for availability query (not summed cart duration)
  const serviceId = configuringItem ? configuringItem.service_id : null;
  const serviceName = configuringItem ? configuringItem.service_name : null;

  const dateStr = selectedDate ? toISO(selectedDate) : null;

  const {
    data: availability,
    isError: isAvailabilityError,
    error: availabilityError,
    refetch: refetchAvailability,
    isFetching: isAvailabilityFetching,
  } = useQuery({
    ...getAvailabilityQueryOptions(dateStr, selectedStylistId ?? null, serviceId),
    enabled: hasStylistSelection && !!dateStr && (configuringItem ? true : !!selectedDate),
  });

  const slots: TimeSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    if (!hasStylistSelection) return [];
    if (!availability?.slots) return [];
    return availability.slots.map((raw) => {
      // raw is "Y-m-d H:i:s" — extract HH:MM
      const timePart = raw.split(" ")[1]?.slice(0, 5) ?? raw.slice(11, 16);
      const [hStr, mStr] = timePart.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      return {
        value: timePart,
        label: Number.isFinite(h) && Number.isFinite(m) ? formatTime(h, m) : timePart,
      } as TimeSlot;
    });
  }, [selectedDate, hasStylistSelection, availability]);

  // Reveal the times once they're ready for a newly picked date. The
  // fixed-delay scroll in BookingCalendar fires while availability may
  // still be loading (landing mid-layout or nowhere); this guarantees the
  // scroll happens after the slots actually paint. Mount-guarded so
  // revisiting an already-scheduled service doesn't yank the page down.
  const revealedForDateRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (revealedForDateRef.current === undefined) {
      revealedForDateRef.current = dateStr;
      return;
    }
    if (!dateStr) {
      revealedForDateRef.current = null;
      return;
    }
    if (slots.length > 0 && revealedForDateRef.current !== dateStr) {
      revealedForDateRef.current = dateStr;
      scrollToElementId("timeslot-grid", 96);
    }
  }, [dateStr, slots.length]);

  const selectedTimeSlot = (() => {
    if (configuringItem?.scheduled_at) {
      const tp = configuringItem.scheduled_at.split(" ")[1]?.slice(0, 5) ?? "";
      return tp ? ({ value: tp, label: tp } as TimeSlot) : null;
    }
    return legacySelectedTimeSlot;
  })();

  const handleSelectSlot = (slot: TimeSlot) => {
    if (configuringItem && selectedDate) {
      updateCartItemSchedule(configuringItem.service_id, { date: selectedDate, timeSlot: slot });
    } else {
      legacySetTimeSlot(slot);
    }
  };

  const isLoadingTimes =
    hasStylistSelection && !!selectedDate && isAvailabilityFetching;

  return (
    <div id='timeslot-grid' className='scroll-mt-24'>
      <div className='mb-3 font-plus-jakarta-sans text-lg tracking-tight font-medium text-[#483630]'>
        Pick a time
      </div>
      <div className='relative' aria-busy={isLoadingTimes}>
        {!hasStylistSelection ? (
          <p className='font-plus-jakarta-sans text-sm italic text-[#8a6a5a]'>
            Select a professional first.
          </p>
        ) : !selectedDate ? (
          <p className='font-plus-jakarta-sans text-sm italic text-[#8a6a5a]'>
            Select a date to see available times.
          </p>
        ) : isAvailabilityError ? (
          <ErrorState
            variant='inline'
            title='Times unavailable'
            message="We couldn't load available times for this date. Please try again."
            error={availabilityError}
            onRetry={() => refetchAvailability()}
            retryLabel={isAvailabilityFetching ? "Retrying..." : "Try again"}
          />
        ) : slots.length > 0 ? (
          <div className='grid grid-cols-2 gap-2'>
            {slots.map((slot) => {
              const isSelected = selectedTimeSlot?.value === slot.value;
              return (
                <button
                  key={slot.value}
                  type='button'
                  onClick={() => handleSelectSlot(slot)}
                  className={`border px-3 py-3 text-center rounded-md font-plus-jakarta-sans text-sm transition-colors ${
                    isSelected
                      ? "border-[#a57865] bg-[#a57865] text-white"
                      : "border-[#a57865]/15 text-[#483630] hover:border-[#a57865]/50 hover:text-[#a57865]"
                  }`}>
                  {slot.label}
                </button>
              );
            })}
          </div>
        ) : isLoadingTimes ? (
          <div className='grid grid-cols-2 gap-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='h-[46px] animate-pulse rounded-md bg-[#f3ece3]'
              />
            ))}
          </div>
        ) : (
          <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-white px-4 py-8 text-center'>
            <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
              No times available
            </p>
            <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
              {serviceName
                ? `No slots for ${serviceName} on this date — try another professional or date.`
                : "Try another date — this day is fully booked or closed."}
            </p>
          </div>
        )}

        {/* Overlayed loading spinner while availability is being fetched */}
        {isLoadingTimes ? (
          <div className='absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]'>
            <div className='flex items-center gap-2 rounded-full border border-[#e8ddd0] bg-white px-4 py-2 shadow-sm'>
              <Loader2 size={16} className='animate-spin text-[#a57865]' />
              <span className='font-plus-jakarta-sans text-xs font-medium text-[#483630]'>
                Loading times…
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
