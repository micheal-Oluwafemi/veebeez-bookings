"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ui/error-state";
import {
  buildMonthDays,
  formatMonthRange,
  isPastDate,
  isSameDate,
} from "@/lib/booking/calendar";
import { getCalendarQueryOptions } from "@/services/booking-calendar-requests";
import { useBookingStore } from "@/store/useBookingStore";
import type { CalendarDay } from "@/types/booking";

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface BookingCalendarProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  stylistId?: number | null;
  hasStylistSelection?: boolean;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  selectedVariant?: "brand" | "gray";
  originalDate?: Date | null;
}

export default function BookingCalendar(props: BookingCalendarProps = {}) {
  const cart = useBookingStore((s) => s.cart);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const configuringItem =
    configuringItemIndex !== null && configuringItemIndex < cart.length
      ? cart[configuringItemIndex]
      : null;
  const updateCartItemSchedule = useBookingStore((s) => s.updateCartItemSchedule);
  const storeDate = useBookingStore((s) => s.selectedDate);
  const storeSetDate = useBookingStore((s) => s.setDate);
  const storeStylistId = useBookingStore((s) => s.selectedStylistId);
  const storeHasStylistSelection = useBookingStore(
    (s) => s.hasStylistSelection,
  );

  // per-item: derive selectedDate from configuringItem's scheduled_at if present, else fallback to global
  const configuringDate = (() => {
    if (configuringItem?.scheduled_at) {
      const d = new Date(configuringItem.scheduled_at.replace(" ", "T"));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  })();
  const effectiveStoreDate = configuringDate ?? storeDate;
  const selectedDate = props.value !== undefined ? props.value : effectiveStoreDate;
  // per-item write: keep global shim in sync for TimeSlotGrid's availability query
  const setDate = (date: Date) => {
    if (props.onChange) {
      props.onChange(date);
      return;
    }
    if (configuringItem) {
      // preserve time if already set for this item
      const existingTime = configuringItem.scheduled_at
        ? (configuringItem.scheduled_at.split(" ")[1]?.slice(0, 5) ?? null)
        : null;
      if (existingTime) {
        updateCartItemSchedule(configuringItem.service_id, {
          date,
          timeSlot: { value: existingTime, label: existingTime },
        });
      } else {
        // date only — store pending date via global shim; scheduled_at stays null until time chosen
        // updateCartItemSchedule with date alone would null scheduled_at, so just keep global for now
        // we still call update to clear stale scheduled_at if any
        updateCartItemSchedule(configuringItem.service_id, { scheduled_at: null });
      }
    }
    // always keep legacy global in sync (TimeSlotGrid reads it for availability date)
    storeSetDate(date);
  };
  // per-item stylist scoping for calendar day-disabling (no service_id, per Phase 2 spec)
  const selectedStylistId =
    props.stylistId !== undefined
      ? props.stylistId
      : configuringItem
        ? configuringItem.stylist_id
        : storeStylistId;
  const hasStylistSelection =
    props.hasStylistSelection !== undefined
      ? props.hasStylistSelection
      : configuringItem
        ? true
        : storeHasStylistSelection;
  const selectedVariant = props.selectedVariant ?? "brand";
  const originalDate = props.originalDate ?? null;
  const [internalMonth, setInternalMonth] = useState(() => new Date());
  const month = props.month ?? internalMonth;
  const setMonth = props.onMonthChange ?? setInternalMonth;

  const monthData = useMemo(() => buildMonthDays(month), [month]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-NG", {
        month: "long",
        year: "numeric",
      }).format(month),
    [month],
  );

  const { startDate, endDate } = useMemo(
    () => formatMonthRange(month),
    [month],
  );

  const {
    data: calendar,
    isError: isCalendarError,
    error: calendarError,
    refetch: refetchCalendar,
    isFetching: isCalendarFetching,
  } = useQuery({
    ...getCalendarQueryOptions(selectedStylistId ?? null, startDate, endDate),
    enabled: hasStylistSelection,
  });

  const daysMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    const cal = calendar as unknown as { days?: CalendarDay[] } | undefined;
    const days =
      (cal as { days?: CalendarDay[] })?.days ??
      (calendar as unknown as CalendarDay[] | undefined) ??
      [];
    // calendar may be {days:[]} or the data itself is CalendarResponse
    const actualDays: CalendarDay[] = Array.isArray(calendar)
      ? (calendar as CalendarDay[])
      : ((calendar as { days?: CalendarDay[] })?.days ?? []);
    // fallback: if we got CalendarResponse shape directly
    const list: CalendarDay[] = Array.isArray(actualDays) ? actualDays : [];
    // also handle case where GetRequest returned data envelope already unwrapped to CalendarResponse
    if (
      list.length === 0 &&
      calendar &&
      typeof calendar === "object" &&
      "days" in (calendar as unknown as Record<string, unknown>)
    ) {
      return new Map(
        ((calendar as unknown as { days: CalendarDay[] }).days ?? []).map(
          (d) => [d.day, d],
        ),
      );
    }
    return new Map(list.map((d) => [d.day, d]));
  }, [calendar]);

  // Simpler: build map from calendar response regardless of envelope
  const calendarDays = useMemo(() => {
    if (!calendar) return new Map<string, CalendarDay>();
    const raw = calendar as unknown as {
      days?: CalendarDay[];
      data?: { days: CalendarDay[] };
    };
    const days: CalendarDay[] | undefined =
      (raw as { days?: CalendarDay[] }).days ??
      (raw as { data?: { days: CalendarDay[] } }).data?.days;
    if (!days) return daysMap;
    return new Map(days.map((d) => [d.day, d]));
  }, [calendar, daysMap]);

  const finalMap = calendarDays.size > 0 ? calendarDays : daysMap;

  const changeMonth = (direction: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + direction, 1);
    (setMonth as unknown as (d: Date) => void)(next);
  };

  return (
    <div>
      <div className='mb-4 flex items-center justify-between'>
        <button
          type='button'
          onClick={() => changeMonth(-1)}
          className='flex size-8 items-center justify-center border border-[#a57865]/20 text-[#483630] transition-colors hover:border-[#a57865] hover:text-[#a57865]'
          aria-label='Previous month'>
          <ChevronLeft size={16} />
        </button>
        <span className='font-plus-jakarta-sans text-lg font-medium text-[#483630]'>
          {monthLabel}
        </span>
        <button
          type='button'
          onClick={() => changeMonth(1)}
          className='flex size-8 items-center justify-center border border-[#a57865]/20 text-[#483630] transition-colors hover:border-[#a57865] hover:text-[#a57865]'
          aria-label='Next month'>
          <ChevronRight size={16} />
        </button>
      </div>

      {!hasStylistSelection ? (
        <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
          Select a professional first to see availability.
        </p>
      ) : null}

      {hasStylistSelection && isCalendarError ? (
        <div className='mt-4'>
          <ErrorState
            variant='inline'
            title='Calendar unavailable'
            message="We couldn't load the calendar. Please try again."
            error={calendarError}
            onRetry={() => refetchCalendar()}
            retryLabel={isCalendarFetching ? "Retrying..." : "Try again"}
          />
        </div>
      ) : null}

      <div className='grid grid-cols-7 gap-1'>
        {WEEK_LABELS.map((label) => (
          <div
            key={label}
            className='pb-2 text-center font-plus-jakarta-sans text-[9px] uppercase tracking-[0.12em] text-black'>
            {label}
          </div>
        ))}
        {monthData.leadingBlanks.map((blank) => (
          <div key={blank} />
        ))}
        {monthData.days.map((date) => {
          const iso = toISO(date);
          const calDay = finalMap.get(iso);
          const past = isPastDate(date);
          // if calendar loaded, use its flags; otherwise fall back to past check only (no SALON_HOURS)
          const salonClosed = calDay ? calDay.salon_closed : false;
          const blocked = calDay ? calDay.blocked : false;
          const available = calDay ? calDay.available : !past && !salonClosed;
          const disabled =
            past || salonClosed || blocked || (calDay ? !available : false);
          const isClosedVisual = (salonClosed || blocked) && !past;
          const isOriginal = originalDate
            ? isSameDate(originalDate, date)
            : false;
          const isSelected = selectedDate
            ? isSameDate(selectedDate, date)
            : false;
          const isNewlySelected =
            isSelected &&
            (!isOriginal ||
              (originalDate && selectedDate
                ? !isSameDate(originalDate, selectedDate)
                : true));
          const isToday = isSameDate(new Date(), date);

          let selectedClass = "";
          if (isOriginal && !isNewlySelected) {
            selectedClass = "border-[#d6d6d6] bg-[#e8e8e8] text-[#1a1510]";
          } else if (isSelected) {
            selectedClass =
              selectedVariant === "gray"
                ? "border-[#d6d6d6] bg-[#e8e8e8] text-[#1a1510]"
                : "border-[#a57865] bg-[#a57865] text-white";
            // For reschedule with originalDate, newly selected should be primary even when variant is gray
            if (originalDate && isNewlySelected) {
              selectedClass = "border-[#a57865] bg-[#a57865] text-white";
            }
          }

          return (
            <button
              key={date.toISOString()}
              type='button'
              disabled={disabled}
              onClick={() => setDate(date)}
              className={`aspect-square rounded-full border text-sm transition-colors ${
                isSelected || isOriginal
                  ? selectedClass || "border-[#a57865] bg-[#a57865] text-white"
                  : "border-transparent text-black hover:border-[#a57865]/50 hover:text-[#a57865]"
              } ${disabled ? "cursor-not-allowed opacity-25 hover:border-transparent" : ""} ${isClosedVisual ? "line-through" : ""} ${isToday && !isSelected && !isOriginal ? "text-[#a57865]" : ""}`}
              aria-label={iso}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
