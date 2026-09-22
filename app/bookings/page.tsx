"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/booking/format";
import { ApiError } from "@/lib/https";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { Lottie } from "lottie-react";
import bookingAnimation from "@/public/booking.json";
import {
  bookingQueryKeys,
  getCollectionsQueryOptions,
} from "@/services/booking-catalog-requests";
import { getCalendarQueryOptions } from "@/services/booking-calendar-requests";
import { getAvailabilityQueryOptions } from "@/services/booking-availability-requests";
import { GetRequest } from "@/lib/https";
import {
  cancelBooking,
  getMyBookingByIdQueryOptions,
  getMyBookingsQueryOptions,
  rescheduleBooking,
} from "@/services/booking-requests";
import { generateSlotsFromIntervals } from "@/lib/booking/timeSlots";
import { formatTime } from "@/lib/booking/format";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { getStylistsQueryOptions } from "@/services/booking-catalog-requests";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import BookingDetailsContent from "@/components/bookings/BookingDetailsContent";
import { useRouter } from "next/navigation";
import { buildCartItem } from "@/lib/booking/cart";
import { useBookingStore } from "@/store/useBookingStore";
import BookingCalendar from "@/components/datetime/BookingCalendar";
import type { BookingDetail } from "@/types/booking";
import Link from "next/link";
import { Search } from "lucide-react";

type FilterValue =
  | "All"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "no_show";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "All", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No Show" },
];

const SCHEDULED_AT_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function normalizeStatus(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_");
}

function formatStatusLabel(s: string) {
  const norm = normalizeStatus(s);
  return norm
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadgeClasses(s: string) {
  switch (normalizeStatus(s)) {
    case "confirmed":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "pending":
      return "bg-[#fdf3e0] text-[#a06b12]";
    case "in_progress":
      return "bg-[#e7eef8] text-[#2c5aa0]";
    case "completed":
      return "bg-[#eee9f7] text-[#5b3f9e]";
    case "no_show":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    default:
      return "bg-[#f3e8dd] text-[#8a6a5a]";
  }
}

function isFutureDate(iso: string | null | undefined) {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getTime() > Date.now() + 60_000;
}

function canReschedule(status: string, scheduled: string | null | undefined) {
  const norm = normalizeStatus(status);
  return (
    (norm === "pending" || norm === "confirmed") && isFutureDate(scheduled)
  );
}

function canCancel(status: string, scheduled: string | null | undefined) {
  const norm = normalizeStatus(status);
  return (
    (norm === "pending" || norm === "confirmed") && isFutureDate(scheduled)
  );
}

function canRebook(status: string, scheduled: string | null | undefined) {
  const norm = normalizeStatus(status);
  if (norm === "cancelled" || norm === "completed" || norm === "no_show")
    return true;
  if (
    !isFutureDate(scheduled) &&
    (norm === "pending" || norm === "confirmed" || norm === "in_progress")
  )
    return true;
  return false;
}

function validateReschedule(scheduled_at: string, notes: string) {
  const errors: { scheduled_at?: string; notes?: string } = {};
  const trimmed = scheduled_at.trim();
  if (!trimmed) {
    errors.scheduled_at = "Scheduled time is required";
  } else if (!SCHEDULED_AT_RE.test(trimmed)) {
    errors.scheduled_at = "Use Y-m-d H:i:s e.g. 2026-09-10 14:00:00";
  } else {
    const d = new Date(trimmed.replace(" ", "T"));
    if (isNaN(d.getTime())) errors.scheduled_at = "Invalid date";
    else if (d.getTime() < Date.now() - 60000)
      errors.scheduled_at = "Cannot reschedule to the past";
  }
  if (notes.length > 500) errors.notes = "Notes max 500 characters";
  return errors;
}

function StylistPickerForReschedule({
  serviceId,
  value,
  initialValue,
  onChange,
}: {
  serviceId: number | null;
  value: number | null | undefined;
  initialValue: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  const { data: stylistsData, isLoading: isStylistsLoading } = useQuery(getStylistsQueryOptions());
  const stylists = (stylistsData as import("@/types/booking").Stylist[] | undefined) ?? [];
  const { data: serviceData, isLoading: isServiceLoading } = useQuery({
    queryKey: ["booking", "service", serviceId ?? "none"],
    queryFn: async () => {
      if (!serviceId) return null;
      const res = (await GetRequest(`booking-system/services/${serviceId}`)) as { data?: Record<string, unknown> };
      const d = (res as { data?: Record<string, unknown> }).data ?? (res as unknown as Record<string, unknown>);
      return d as { slug?: string } | null;
    },
    enabled: !!serviceId,
    staleTime: Infinity,
  });
  const serviceSlug = (serviceData as { slug?: string } | null)?.slug;
  const filteredStylists = React.useMemo(() => {
    if (!serviceSlug) return stylists;
    const filtered = stylists.filter((s) => s.service_slugs.includes(serviceSlug));
    // always keep current stylist visible even if filter would hide them (e.g. data drift)
    if (initialValue != null && !filtered.some((s) => s.stylist_id === initialValue)) {
      const current = stylists.find((s) => s.stylist_id === initialValue);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [stylists, serviceSlug, initialValue]);
  const effectiveValue = value !== undefined ? value : initialValue ?? null;
  const isLoading = isStylistsLoading || (!!serviceId && isServiceLoading && !serviceSlug);
  if (isLoading) return <div className='h-10 rounded-xl bg-white border border-[#e8ddd0] animate-pulse' />;
  // If no stylist can perform this service (shouldn't happen), fall back to showing Any only with helper
  const showEmptyHint = serviceSlug && filteredStylists.length === 0;
  return (
    <div>
      <p className='mb-2 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
        Stylist <span className='font-normal normal-case tracking-normal text-[#8a6a5a]'>(optional — keep current if unchanged)</span>
      </p>
      {showEmptyHint ? (
        <p className='mb-2 rounded-lg bg-[#fdf3e0] px-3 py-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
          No alternative professional is assigned to this service — only the current stylist and “Any” are available.
        </p>
      ) : null}
      <div className='grid grid-cols-1 gap-2'>
        <button
          type='button'
          onClick={() => onChange(null)}
          className={cn(
            "rounded-xl border px-4 py-3 text-left font-plus-jakarta-sans text-sm",
            effectiveValue === null ? "border-[#a57865] bg-[#fdf9f5] text-[#483630]" : "border-[#e8ddd0] bg-white text-[#483630] hover:border-[#a57865]/30",
          )}>
          Any Professional — Maximum availability
          {initialValue === null ? <span className='ml-2 text-xs text-[#8a6a5a]'>(current)</span> : null}
        </button>
        {filteredStylists.map((s) => {
          const isActive = effectiveValue === s.stylist_id;
          const isInitial = initialValue === s.stylist_id;
          return (
            <button
              key={s.stylist_id}
              type='button'
              onClick={() => onChange(s.stylist_id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left",
                isActive ? "border-[#a57865] bg-[#fdf9f5]" : "border-[#e8ddd0] bg-white hover:border-[#a57865]/30",
              )}>
              <span className='font-plus-jakarta-sans text-sm font-medium text-[#1a1510]'>{s.display_name}</span>
              <span className='ml-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>{s.title}</span>
              {isInitial ? <span className='ml-2 text-xs text-[#8a6a5a]'>(current)</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const token = useCustomerAuthStore((s) => s.token);
  const hasHydrated = useCustomerAuthStore((s) => s._hasHydrated);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [rescheduleId, setRescheduleId] = useState<string | number | null>(
    null,
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    scheduled_at?: string;
    notes?: string;
  }>({});
  const [touched, setTouched] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(
    undefined,
  );
  const [rescheduleTime, setRescheduleTime] = useState("10:00:00");
  const [initialScheduledAt, setInitialScheduledAt] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  // per-line reschedule (Phase 6)
  const [rescheduleSelectedLineId, setRescheduleSelectedLineId] = useState<number | null>(null);
  const [rescheduleLineStylistId, setRescheduleLineStylistId] = useState<number | null | undefined>(undefined);
  const [initialRescheduleLineStylistId, setInitialRescheduleLineStylistId] = useState<number | null | undefined>(undefined);
  const [cancelId, setCancelId] = useState<string | number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const [selectedBookingId, setSelectedBookingId] = useState<
    string | number | null
  >(null);
  const [hasMounted, setHasMounted] = useState(false);
  React.useEffect(() => setHasMounted(true), []);
  const isDesktopQuery = useMediaQuery({ query: "(min-width: 768px)" });
  const isDesktop = hasMounted ? isDesktopQuery : false;

  React.useEffect(() => {
    if (rescheduleDate) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const ymd = `${rescheduleDate.getFullYear()}-${pad(rescheduleDate.getMonth() + 1)}-${pad(rescheduleDate.getDate())}`;
      const t = rescheduleTime || "00:00:00";
      const normalizedTime = t.split(":").length === 2 ? `${t}:00` : t;
      const combined = `${ymd} ${normalizedTime}`;
      setScheduledAt(combined);
      if (touched) setFieldErrors(validateReschedule(combined, notes));
    } else if (!rescheduleDate && rescheduleTime) {
      if (touched) setFieldErrors(validateReschedule("", notes));
    }
  }, [rescheduleDate, rescheduleTime]);

  const { data, isPending, isError, error } = useQuery({
    ...getMyBookingsQueryOptions(),
    enabled: !!token,
  });

  const bookings = data as unknown as
    | { data?: unknown[] }
    | unknown[] as unknown;
  const list: Record<string, unknown>[] = Array.isArray(bookings)
    ? (bookings as Record<string, unknown>[])
    : ((bookings as { data?: Record<string, unknown>[] })?.data ?? []);

  // Singular booking fetch for details view
  const {
    data: bookingDetailData,
    isPending: isDetailPending,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    ...getMyBookingByIdQueryOptions(selectedBookingId as string | number),
    enabled: !!token && selectedBookingId !== null,
  });

  const bookingDetail =
    (bookingDetailData as unknown as
      | BookingDetail
      | Record<string, unknown>
      | null) ?? null;
  // Fallback to list item if detail hasn't loaded yet (optimistic)
  const fallbackDetail = useMemo(() => {
    if (!selectedBookingId) return null;
    return (
      list.find(
        (b) =>
          String(b.appointment_id ?? (b as { id?: unknown }).id) ===
          String(selectedBookingId),
      ) ?? null
    );
  }, [list, selectedBookingId]);
  const displayBooking =
    (bookingDetail as Record<string, unknown>) ?? fallbackDetail;

  // Singular for reschedule — ensures accurate duration/stylist/services synchronization
  const { data: rescheduleDetailData } = useQuery({
    ...getMyBookingByIdQueryOptions(rescheduleId as string | number),
    enabled: !!token && rescheduleId !== null,
  });
  const rescheduleDetail = rescheduleDetailData as unknown as Record<
    string,
    unknown
  > | null;

  const filteredList = useMemo(() => {
    if (activeFilter === "All") return list;
    return list.filter(
      (b) => normalizeStatus(String(b.status ?? "")) === activeFilter,
    );
  }, [list, activeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: list.length };
    FILTERS.forEach((f) => {
      if (f.value === "All") return;
      c[f.value] = list.filter(
        (b) => normalizeStatus(String(b.status ?? "")) === f.value,
      ).length;
    });
    return c;
  }, [list]);

  const isDirty = useMemo(() => {
    if (!rescheduleId) return false;
    if (rescheduleSelectedLineId === null) return false;
    const stylistChanged = rescheduleLineStylistId !== initialRescheduleLineStylistId;
    return (
      scheduledAt.trim() !== initialScheduledAt.trim() ||
      notes.trim() !== initialNotes.trim() ||
      stylistChanged
    );
  }, [scheduledAt, notes, initialScheduledAt, initialNotes, rescheduleId, rescheduleSelectedLineId, rescheduleLineStylistId, initialRescheduleLineStylistId]);

  const originalDate = useMemo(() => {
    if (!initialScheduledAt) return null;
    const d = new Date(initialScheduledAt.replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }, [initialScheduledAt]);
  const originalTime = useMemo(
    () => (initialScheduledAt ? initialScheduledAt.split(" ")[1] : null),
    [initialScheduledAt],
  );

  // Reschedule derived from singular detail (optimized) with list fallback
  const rescheduleBookingData = useMemo(() => {
    if (rescheduleDetail) return rescheduleDetail as Record<string, unknown>;
    return (
      list.find(
        (b) =>
          String(b.appointment_id ?? (b as { id?: unknown }).id) ===
          String(rescheduleId),
      ) ?? null
    );
  }, [list, rescheduleId, rescheduleDetail]);

  const rescheduleStylistId = useMemo(
    () =>
      rescheduleBookingData
        ? ((rescheduleBookingData.stylist_id as number | null) ?? null)
        : null,
    [rescheduleBookingData],
  );
  const rescheduleDuration = useMemo(
    () =>
      rescheduleBookingData
        ? Number(
            (rescheduleBookingData as { duration_minutes?: number })
              .duration_minutes ?? 30,
          )
        : 30,
    [rescheduleBookingData],
  );

  // per-line reschedule helpers (Phase 6)
  const rescheduleServices = useMemo(() => {
    const services = (rescheduleBookingData as { services?: unknown[] })?.services as Array<Record<string, unknown>> | undefined;
    return Array.isArray(services) ? services : [];
  }, [rescheduleBookingData]);

  const selectedRescheduleLine = useMemo(() => {
    if (rescheduleSelectedLineId === null) return null;
    return (rescheduleServices.find((s) => Number(s.line_id) === rescheduleSelectedLineId) as Record<string, unknown> | null) ?? null;
  }, [rescheduleServices, rescheduleSelectedLineId]);

  const rescheduleLineServiceId = useMemo(
    () => (selectedRescheduleLine ? Number((selectedRescheduleLine as { service_id?: unknown }).service_id ?? 0) : null),
    [selectedRescheduleLine],
  );
  const rescheduleLineDuration = useMemo(
    () => (selectedRescheduleLine ? Number((selectedRescheduleLine as { duration_minutes?: unknown }).duration_minutes ?? 30) : 30),
    [selectedRescheduleLine],
  );

  // auto-select first line when drawer opens
  React.useEffect(() => {
    if (rescheduleId !== null && rescheduleServices.length > 0 && rescheduleSelectedLineId === null) {
      const first = rescheduleServices[0] as Record<string, unknown>;
      setRescheduleSelectedLineId(Number(first.line_id));
      const stylist = (first.stylist_id as number | null) ?? null;
      setRescheduleLineStylistId(stylist);
      setInitialRescheduleLineStylistId(stylist);
      const sched = first.scheduled_at as string | undefined;
      if (sched) {
        const d = new Date(sched.replace(" ", "T"));
        if (!isNaN(d.getTime())) {
          setRescheduleDate(d);
          const pad = (n: number) => String(n).padStart(2, "0");
          const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          setRescheduleTime(time);
          setScheduledAt(sched.slice(0, 19));
          setInitialScheduledAt(sched.slice(0, 19));
          setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
      setTouched(false);
      setFieldErrors({});
    }
  }, [rescheduleId, rescheduleServices]);

  // when selected line changes, sync date/time/stylist to that line's current values
  React.useEffect(() => {
    if (rescheduleSelectedLineId !== null && selectedRescheduleLine) {
      const sched = selectedRescheduleLine.scheduled_at as string | undefined;
      const stylist = (selectedRescheduleLine.stylist_id as number | null) ?? null;
      setRescheduleLineStylistId(stylist);
      setInitialRescheduleLineStylistId(stylist);
      if (sched) {
        const d = new Date(sched.replace(" ", "T"));
        if (!isNaN(d.getTime())) {
          setRescheduleDate(d);
          const pad = (n: number) => String(n).padStart(2, "0");
          const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          setRescheduleTime(time);
          setScheduledAt(sched.slice(0, 19));
          setInitialScheduledAt(sched.slice(0, 19));
          setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          setTouched(false);
          setFieldErrors({});
          return;
        }
      }
      setRescheduleDate(undefined);
      setRescheduleTime("10:00:00");
      setScheduledAt("");
      setInitialScheduledAt("");
      setTouched(false);
      setFieldErrors({});
    }
  }, [rescheduleSelectedLineId]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const { startDate: calStart, endDate: calEnd } = useMemo(() => {
    const m = rescheduleDate ?? calendarMonth;
    const start = new Date(m.getFullYear(), m.getMonth(), 1);
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const toISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: toISO(start), endDate: toISO(end) };
  }, [rescheduleDate, calendarMonth]);
  const { data: rescheduleCalendar } = useQuery({
    ...getCalendarQueryOptions(rescheduleStylistId ?? null, calStart, calEnd),
    enabled: !!rescheduleId,
  });
  const rescheduleDays = useMemo(() => {
    const raw = rescheduleCalendar as unknown as
      | {
          days?: {
            day: string;
            available: boolean;
            blocked: boolean;
            salon_closed: boolean;
            intervals: { start: string; end: string }[] | null;
          }[];
        }
      | undefined;
    const listDays = (raw as { days?: unknown[] })?.days ?? [];
    return listDays as {
      day: string;
      available: boolean;
      blocked: boolean;
      salon_closed: boolean;
      intervals: { start: string; end: string }[] | null;
    }[];
  }, [rescheduleCalendar]);

  // per-line availability (Phase 6) — replaces calendar intervals for slot generation
  const rescheduleDateStr = useMemo(() => {
    if (!rescheduleDate) return null;
    return `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, "0")}-${String(rescheduleDate.getDate()).padStart(2, "0")}`;
  }, [rescheduleDate]);

  const rescheduleEffectiveStylistId = useMemo(() => {
    if (rescheduleLineStylistId !== undefined) return rescheduleLineStylistId;
    return selectedRescheduleLine ? ((selectedRescheduleLine.stylist_id as number | null) ?? null) : rescheduleStylistId;
  }, [rescheduleLineStylistId, selectedRescheduleLine, rescheduleStylistId]);

  const {
    data: rescheduleAvailability,
    isFetching: isAvailabilityFetching,
    isError: isAvailabilityError,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useQuery({
    ...getAvailabilityQueryOptions(rescheduleDateStr, rescheduleEffectiveStylistId ?? null, rescheduleLineServiceId),
    enabled: !!rescheduleSelectedLineId && !!rescheduleDateStr,
  });

  const availableSlots = useMemo(() => {
    if (!rescheduleDate || !rescheduleAvailability?.slots) return [];
    return rescheduleAvailability.slots.map((raw) => {
      const timePart = raw.split(" ")[1]?.slice(0, 5) ?? raw.slice(11, 16);
      const [hStr, mStr] = timePart.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      return {
        value: timePart,
        label: Number.isFinite(h) && Number.isFinite(m) ? formatTime(h, m) : timePart,
      } as import("@/types/booking").TimeSlot;
    });
  }, [rescheduleDate, rescheduleAvailability]);

  React.useEffect(() => {
    if (!rescheduleDate) {
      setRescheduleTime("10:00:00");
      return;
    }
  }, [rescheduleDate]);

  const bookingsSkeleton = (
    <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='flex flex-col rounded-2xl border border-[#e8ddd0] bg-white p-5'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='mt-3 h-5 w-20 rounded-full' />
          <div className='mt-4 space-y-2.5'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </div>
          <Skeleton className='mt-4 h-6 w-full' />
          <div className='mt-4 flex gap-2'>
            <Skeleton className='h-9 flex-1 rounded-lg' />
            <Skeleton className='h-9 flex-1 rounded-lg' />
          </div>
        </div>
      ))}
    </div>
  );

  const resetReschedule = () => {
    setRescheduleId(null);
    setScheduledAt("");
    setRescheduleDate(undefined);
    setRescheduleTime("10:00:00");
    setInitialScheduledAt("");
    setInitialNotes("");
    setNotes("");
    setFieldErrors({});
    setTouched(false);
    setRescheduleSelectedLineId(null);
    setRescheduleLineStylistId(undefined);
    setInitialRescheduleLineStylistId(undefined);
  };

  const rescheduleMut = useMutation({
    mutationFn: ({
      id,
      services,
      notes: n,
    }: {
      id: string | number;
      services: { line_id: number; scheduled_at: string; stylist_id?: number | null }[];
      notes?: string;
    }) => rescheduleBooking(id, { services, ...(n ? { notes: n } : {}) }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey:
          bookingQueryKeys.myBookings() as unknown as readonly unknown[],
      });
      queryClient.invalidateQueries({
        queryKey: bookingQueryKeys.myBookingById(
          vars.id,
        ) as unknown as readonly unknown[],
      });
      resetReschedule();
    },
  });

  // Auto-dismiss reschedule error after 4s so it doesn't stay stagnant
  // Also clear fieldErrors so Save doesn't stay enabled with stale field-level text
  React.useEffect(() => {
    if (rescheduleMut.isError) {
      const t = setTimeout(() => {
        rescheduleMut.reset();
        setFieldErrors({});
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [rescheduleMut.isError, rescheduleMut]);

  const cancelMut = useMutation({
    mutationFn: (id: string | number) => cancelBooking(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey:
          bookingQueryKeys.myBookings() as unknown as readonly unknown[],
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: bookingQueryKeys.myBookingById(
            id,
          ) as unknown as readonly unknown[],
        });
      }
      setCancelId(null);
      // also close details if it was the cancelled booking
      if (
        selectedBookingId !== null &&
        String(selectedBookingId) === String(id)
      ) {
        setSelectedBookingId(null);
      }
    },
  });

  const handleRescheduleSubmit = () => {
    if (rescheduleSelectedLineId === null) {
      setFieldErrors({ scheduled_at: "Select a service to reschedule" });
      return;
    }
    const errs = validateReschedule(scheduledAt, notes);
    setFieldErrors(errs);
    setTouched(true);
    if (Object.keys(errs).length) return;
    const trimmedNotes = notes.trim();
    const stylistForPayload =
      rescheduleLineStylistId !== undefined
        ? rescheduleLineStylistId
        : (selectedRescheduleLine?.stylist_id as number | null) ?? null;
    // only send stylist_id if changed or explicitly selected; omit if unchanged to keep current (spec: omitted = keep current)
    const shouldSendStylist =
      rescheduleLineStylistId !== undefined && rescheduleLineStylistId !== initialRescheduleLineStylistId;
    rescheduleMut.mutate({
      id: rescheduleId!,
      services: [
        {
          line_id: rescheduleSelectedLineId,
          scheduled_at: scheduledAt.trim(),
          ...(shouldSendStylist ? { stylist_id: stylistForPayload } : {}),
        },
      ],
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    });
  };

  const handleRebook = async (b: Record<string, unknown>) => {
    const rawServices = (b.services ??
      (b as { items?: unknown[] }).items ??
      []) as Array<Record<string, unknown>>;
    const cartItems: import("@/types/booking").CartLineItem[] = (
      await Promise.all(
        rawServices.map(async (s) => {
          const serviceId = Number(s.service_id ?? s.id);
          if (!Number.isFinite(serviceId)) return null;
          const fallbackSlug = String(
            s.service_slug ?? s.slug ?? `service-${serviceId}`,
          );
          const name = String(
            s.service_name ?? s.name ?? `Service ${serviceId}`,
          );
          const priceRaw = s.unit_price ?? s.price ?? s.line_total ?? 0;
          const price =
            typeof priceRaw === "string"
              ? Number(priceRaw)
              : (priceRaw as number);
          const duration = Number(
            s.duration_minutes ??
              (s as { durationMinutes?: unknown }).durationMinutes ??
              30,
          );
          const currency = String(s.currency ?? b.currency ?? "NGN");
          const answersRaw = (s.answers ?? []) as Array<
            Record<string, unknown>
          >;
          const answers = answersRaw.map((a) => ({
            option_id: Number(a.option_id ?? a.id),
            label: String(a.value_text ?? a.label ?? a.value ?? ""),
            value: String(a.value ?? ""),
            extra_cost: a.extra_cost != null ? Number(a.extra_cost) : null,
          }));

          let enrichedSlug = fallbackSlug;
          let enrichedPrice = Number.isFinite(price) ? price : 0;
          let enrichedDuration = Number.isFinite(duration) ? duration : 30;
          let ctx = {
            categoryId: Number(
              (s as { category_id?: unknown }).category_id ??
                (s as { categoryId?: unknown }).categoryId ??
                0,
            ),
            categoryName: String(
              (s as { category_name?: unknown }).category_name ??
                (s as { categoryName?: unknown }).categoryName ??
                "",
            ),
            collectionId: Number(
              (s as { collection_id?: unknown }).collection_id ??
                (s as { collectionId?: unknown }).collectionId ??
                0,
            ),
            collectionName: String(
              (s as { collection_name?: unknown }).collection_name ??
                (s as { collectionName?: unknown }).collectionName ??
                "",
            ),
          };
          try {
            const svc = (await GetRequest(
              `booking-system/services/${serviceId}`,
            )) as unknown as { data?: Record<string, unknown> };
            const d =
              (svc as { data?: Record<string, unknown> })?.data ??
              (svc as Record<string, unknown>);
            if (d && typeof d === "object") {
              if (typeof d.slug === "string") enrichedSlug = d.slug as string;
              if (d.price != null) {
                const ap =
                  typeof d.price === "string"
                    ? Number(d.price)
                    : (d.price as number);
                if (Number.isFinite(ap) && enrichedPrice === 0)
                  enrichedPrice = ap;
              }
              if (d.duration_minutes != null) {
                const ad = Number(d.duration_minutes as number);
                if (Number.isFinite(ad)) enrichedDuration = ad;
              }
              if (typeof d.category_slug === "string" && !ctx.categoryName)
                ctx.categoryName = d.category_slug as string;
            }
          } catch {
            // ignore, use fallbacks
          }

          const fakeDetail = {
            service_id: serviceId,
            slug: enrichedSlug,
            name,
            price: enrichedPrice,
            currency,
            duration_minutes: enrichedDuration,
          } as unknown as import("@/types/booking").ServiceDetail;
          try {
            return buildCartItem(fakeDetail, answers, ctx);
          } catch {
            return {
              service_id: serviceId,
              service_slug: enrichedSlug,
              service_name: name,
              quantity: 1,
              unit_price: enrichedPrice,
              currency,
              duration_minutes: enrichedDuration,
              category_id: ctx.categoryId,
              category_name: ctx.categoryName,
              collection_id: ctx.collectionId,
              collection_name: ctx.collectionName,
              answers,
              stylist_id: null,
              scheduled_at: null,
            } as import("@/types/booking").CartLineItem;
          }
        }),
      )
    ).filter((x): x is import("@/types/booking").CartLineItem => x !== null);

    let inferredCollectionSlug =
      (rawServices[0]?.collection_slug as string | undefined) ??
      ((b as { collection_slug?: string }).collection_slug as
        | string
        | undefined) ??
      null;

    if (!inferredCollectionSlug && cartItems.length) {
      try {
        let cached = queryClient.getQueryData<unknown>(
          bookingQueryKeys.collections,
        ) as
          | Array<{
              slug: string;
              categories?: Array<{
                services?: Array<{ service_id: number; slug: string }>;
              }>;
            }>
          | undefined;
        if (!cached) {
          try {
            cached = (await queryClient.ensureQueryData(
              getCollectionsQueryOptions(),
            )) as unknown as Array<{
              slug: string;
              categories?: Array<{
                services?: Array<{ service_id: number; slug: string }>;
              }>;
            }>;
          } catch {
            cached = undefined;
          }
        }
        if (Array.isArray(cached)) {
          for (const col of cached) {
            for (const cat of col.categories ?? []) {
              for (const svc of cat.services ?? []) {
                if (
                  cartItems.some(
                    (ci) =>
                      ci.service_id === svc.service_id ||
                      ci.service_slug === svc.slug,
                  )
                ) {
                  inferredCollectionSlug = col.slug;
                  break;
                }
              }
              if (inferredCollectionSlug) break;
            }
            if (inferredCollectionSlug) break;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!inferredCollectionSlug && cartItems.length) {
      try {
        const firstId = cartItems[0].service_id;
        const svc = (await GetRequest(
          `booking-system/services/${firstId}`,
        )) as unknown as { data?: Record<string, unknown> };
        const d =
          (svc as { data?: Record<string, unknown> })?.data ??
          (svc as Record<string, unknown>);
        if (
          d &&
          typeof (d as Record<string, unknown>).collection_slug === "string"
        ) {
          inferredCollectionSlug = (d as Record<string, unknown>)
            .collection_slug as string;
        }
      } catch {
        // ignore
      }
    }

    useBookingStore.setState({
      selectedCollectionSlug: inferredCollectionSlug,
      cart: cartItems,
      configuringItemIndex: cartItems.length ? 0 : null,
      currentStep: cartItems.length ? 2 : 1,
      confirmation: null,
      guestDetails: useBookingStore.getState().guestDetails,
    });

    router.push("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  const handleDetailsRebook = (b: Record<string, unknown>) => {
    const toRebook = b;
    setSelectedBookingId(null);
    setTimeout(() => handleRebook(toRebook), 150);
  };

  if (!hasHydrated) {
    return (
      <section className='lg:px-6 lg:py-12 flex items-center justify-center'>
        <div className='mx-auto w-full rounded-2xl pt-5 text-center'>
          <Skeleton className='w-full aspect-[1.4/1] max-h-[360px] rounded-xl' />
          <Skeleton className='mt-6 h-7 md:h-8 w-56 mx-auto rounded-md' />
          <Skeleton className='mx-auto mt-3 h-4 w-full max-w-sm rounded-md' />
          <Skeleton className='mx-auto mt-2 h-4 w-5/6 max-w-sm rounded-md' />
          <div className='mt-6 flex flex-col items-center gap-2'>
            <Skeleton className='h-7 w-48 rounded-full' />
            <Skeleton className='h-3 w-40 rounded-md' />
          </div>
        </div>
      </section>
    );
  }

  if (!token) {
    return (
      <section className='lg:px-6 lg:py-12 flex items-center justify-center'>
        <div className='mx-auto w-full rounded-2xl pt-5 text-center'>
          <div className='flex items-center justify-center'>
            <div className='w-[90%] lg:w-[30%]'>
              <Lottie
                src={bookingAnimation}
                loop
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
          <h1 className=' font-cooper text-xl md:text-2xl lg:text-3xl leading-none text-[#1a1510]'>
            My Bookings
          </h1>
          <p className='mx-auto mt-3 md:max-w-sm max-w-xs font-plus-jakarta-sans text-sm md:text-base leading-relaxed text-[#8a6a5a]'>
            Your bookings are locked. Sign in to view, reschedule or cancel your
            appointments.
          </p>

          <div className='flex justify-center mt-6'>
            <Link
              href='/search-bookings'
              // onClick={() => setMobileOpen(false)}
              className={`flex items-center  w-fit gap-3 rounded-full px-4 py-3.5 font-plus-jakarta-sans text-[15px] font-medium transition-colors duration-200 bg-white shadow-sm shadow-[#8B5E4D]/25`}>
              <Search size={16} className='text-[#C9A96E]' />
              Find my bookings
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (isError)
    return (
      <section className='px-6 py-12 flex items-center justify-center'>
        <div className='mx-auto w-full max-w-md text-center'>
          <Lottie
            src={bookingAnimation}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
          <h2 className='mt-3 font-cooper text-xl md:text-2xl leading-none text-[#1a1510]'>
            Something went wrong
          </h2>
          <p className='mx-auto mt-3 max-w-sm font-plus-jakarta-sans text-sm leading-relaxed text-[#8a6a5a]'>
            We couldn&apos;t load your bookings. Please check your connection
            and try again.
          </p>
          <div className='mx-auto w-fit mt-4 max-w-sm rounded-lg bg-[#9f2d20]/10 px-3 py-2'>
            <p className='font-plus-jakarta-sans text-sm font-medium text-[#9f2d20]'>
              {error instanceof ApiError
                ? error.message
                : "Failed to load bookings"}
            </p>
          </div>
          <button
            type='button'
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey:
                  bookingQueryKeys.myBookings() as unknown as readonly unknown[],
              })
            }
            className='mt-6 inline-flex items-center justify-center rounded-full bg-[#3a2520] px-6 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a1510]'>
            Try again
          </button>
        </div>
      </section>
    );

  const isDetailsOpen = selectedBookingId !== null;
  const detailContent = (
    <BookingDetailsContent
      booking={displayBooking as unknown as BookingDetail}
      isPending={isDetailPending && !fallbackDetail}
      isError={isDetailError}
      errorMessage={
        detailError instanceof ApiError
          ? detailError.message
          : detailError instanceof Error
            ? detailError.message
            : undefined
      }
      onClose={() => setSelectedBookingId(null)}
      onRebook={handleDetailsRebook}
    />
  );

  return (
    <section className='bg-[#FAF7F3] min-h-screen block-spacing lg:px-6 py-7 lg:py-12'>
      <h3 className='lg:max-w-xl max-w-sm font-cooper font-normal text-[26px] leading-[1.05] text-black/80 md:text-[36px]'>
        My Bookings
      </h3>

      <div className='mt-6 -mx-6 px-6'>
        <div
          role='tablist'
          aria-label='Filter bookings by status'
          className='flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-2 touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            const count = counts[f.value] ?? 0;
            return (
              <button
                key={f.value}
                role='tab'
                aria-selected={isActive}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "snap-start shrink-0 whitespace-nowrap rounded-full border pr-2.5 pl-4 py-2 font-plus-jakarta-sans text-xs font-medium transition inline-flex items-center",
                  isActive
                    ? "bg-black/80 border-none text-white shadow-sm"
                    : "border-[#e8ddd0] bg-white text-[#483630] hover:border-[#a57865]/50 hover:bg-[#fdf9f5]",
                )}>
                {f.label}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] shrink-0",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#f3e8dd] text-[#8a6a5a]",
                  )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SkeletonReveal
        loading={isPending}
        skeleton={bookingsSkeleton}
        minHeight={320}>
        {filteredList.length === 0 ? (
          <div className='flex justify-center items-center mt-7'>
            <div className='flex flex-col items-center gap-3'>
              <img
                src='/icons/calendar.png'
                alt='calendar-icon'
                className='siz h-10'
              />
              <p className=' font-plus-jakarta-sans text-base text-[#8a6a5a]'>
                {list.length === 0
                  ? "No bookings yet."
                  : `No ${activeFilter.replace("_", " ")} bookings.`}
              </p>
            </div>
          </div>
        ) : (
          <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
            {filteredList.map((b) => {
              const id = (b.appointment_id ?? (b as { id?: unknown }).id) as
                | string
                | number;
              const number = (b.appointment_number ??
                (b as { number?: unknown }).number) as string;
              const scheduled = (b.scheduled_at ??
                (b as { scheduled?: unknown }).scheduled) as string;
              const status = (b.status ?? "") as string;
              const total = (b.total_amount ??
                (b as { totalAmount?: unknown }).totalAmount ??
                "0") as string | number;

              const scheduledDate = scheduled ? new Date(scheduled) : null;
              const isValidDate =
                scheduledDate && !isNaN(scheduledDate.getTime());
              const dateStr = isValidDate
                ? format(scheduledDate as Date, "EEE, MMM d, yyyy")
                : scheduled
                  ? String(scheduled)
                  : "—";
              const timeStr = isValidDate
                ? format(scheduledDate as Date, "h:mm a")
                : "—";

              return (
                <div
                  key={String(id)}
                  role='button'
                  tabIndex={0}
                  onClick={() => setSelectedBookingId(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedBookingId(id);
                    }
                  }}
                  className='flex flex-col group rounded-2xl border border-[#e8ddd0] bg-white p-5 cursor-pointer hover:shadow-md hover:border-[#a57865]/30 transition text-left focus:outline-none focus:ring-2 focus:ring-[#a57865]/20'>
                  <div className='flex items-start justify-between gap-3'>
                    <p className='font-plus-jakarta-sans text-xs uppercase tracking-[0.06em] font-medium'>
                      {number}
                    </p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.08em]",
                        statusBadgeClasses(status),
                      )}>
                      {formatStatusLabel(status)}
                    </span>
                  </div>

                  <dl className='mt-4 space-y-2 border-t border-[#f3ece3] pt-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                        Date
                      </dt>
                      <dd className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                        {dateStr}
                      </dd>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                        Time
                      </dt>
                      <dd className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                        {timeStr}
                      </dd>
                    </div>
                  </dl>

                  <div className='mt-4 flex items-center justify-between border-t border-[#f3ece3] pt-4'>
                    <span className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                      Total
                    </span>
                    <span className='font-sans text-lg font-semibold text-[#483630]'>
                      {formatCurrency(Number(total))}
                    </span>
                  </div>

                  {(() => {
                    const showReschedule = canReschedule(status, scheduled);
                    const showCancel = canCancel(status, scheduled);
                    const showRebook = canRebook(status, scheduled);
                    if (!showReschedule && !showCancel && !showRebook)
                      return null;
                    return (
                      <div className='mt-4 flex gap-2'>
                        {showReschedule && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              setRescheduleId(id);
                              // per-line: let effects auto-select first service and sync its date/time/stylist
                              setRescheduleSelectedLineId(null);
                              setRescheduleLineStylistId(undefined);
                              setInitialRescheduleLineStylistId(undefined);
                              setRescheduleDate(undefined);
                              setCalendarMonth(new Date());
                              setRescheduleTime("10:00:00");
                              setScheduledAt("");
                              setInitialScheduledAt("");
                              const initNotes =
                                typeof b.notes === "string"
                                  ? (b.notes as string)
                                  : "";
                              setNotes(initNotes);
                              setInitialNotes(initNotes);
                              setFieldErrors({});
                              setTouched(false);
                            }}
                            className='flex-1 rounded-full border border-[#e8ddd0] bg-white px-4 py-3 font-plus-jakarta-sans text-sm whitespace-nowrap hover:bg-[#fdf9f5] transition'>
                            Reschedule
                          </button>
                        )}
                        {showCancel && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelId(id);
                            }}
                            className='flex-1 rounded-full lg:group-hover:bg-[#9f2d20] lg:bg-[#9f2d20]/40 bg-[#9f2d20]/80 transition-colors px-4 py-3 font-plus-jakarta-sans text-sm text-white whitespace-nowrap'>
                            Cancel
                          </button>
                        )}
                        {showRebook && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRebook(b);
                            }}
                            className='flex-1 rounded-full bg-[#3a2520] px-4 py-3 font-plus-jakarta-sans text-sm font-semibold text-white whitespace-nowrap hover:bg-[#1a1510] transition'>
                            Rebook
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </SkeletonReveal>

      <AlertDialog
        open={rescheduleId !== null}
        onOpenChange={(open) => {
          if (!open) resetReschedule();
        }}>
        <AlertDialogContent className='bg-[#FFFBF8] w-full! md:max-w-[500px] p-0 gap-0 overflow-hidden rounded-2xl border border-[#e8ddd0] shadow-xl'>
          <div className='bg-white px-6 pt-6 pb-4 border-b border-[#f3ece3]'>
            <AlertDialogHeader className='space-y-1.5 p-0'>
              <AlertDialogTitle className='text-[22px] leading-none text-[#1a1510]'>
                Reschedule booking
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className='flex justify-center'>
              {rescheduleBookingData ? (
                <div className='mt-4 flex items-center gap-2 rounded-full bg-[#fdf9f5] border border-[#f3ece3] w-fit px-3 py-1.5'>
                  <span className='size-1.5 rounded-full bg-[#a57865] animate-pulse' />
                  <span className='font-plus-jakarta-sans text-xs font-medium text-[#483630]'>
                    REF:{" "}
                    {String(
                      rescheduleBookingData.appointment_number ??
                        (rescheduleBookingData as { id?: unknown }).id ??
                        "",
                    )}
                  </span>
                  <span className='text-[#e8ddd0]'>•</span>
                  <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    {rescheduleBookingData.duration_minutes
                      ? `${rescheduleBookingData.duration_minutes} mins`
                      : ""}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

           <div
            data-lenis-prevent
            className='px-6 pt-5 space-y-5  max-h-[50vh] overflow-y-auto bg-[#FFFBF8]'>
            {/* Line picker (per-service) */}
            {rescheduleServices.length > 0 ? (
              <div>
                <p className='mb-2 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                  Select service to reschedule {rescheduleServices.length > 1 ? `(${rescheduleServices.length})` : ""}
                </p>
                <div className='space-y-2'>
                  {rescheduleServices.map((svc) => {
                    const lineId = Number(svc.line_id);
                    const isSelected = rescheduleSelectedLineId === lineId;
                    const name = (svc.service_name as string) ?? `Service ${lineId}`;
                    const stylistName = (svc.stylist_name as string | null) ?? (svc.stylist_id === null ? "Any Professional" : `Stylist #${svc.stylist_id}`);
                    const sched = (svc.scheduled_at as string | undefined) ?? "";
                    let timeLabel = "";
                    if (sched) {
                      try {
                        const d = new Date(sched.replace(" ", "T"));
                        timeLabel = `${new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" }).format(d)} · ${new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;
                      } catch {
                        timeLabel = sched.slice(0, 16);
                      }
                    }
                    return (
                      <button
                        key={lineId}
                        type='button'
                        onClick={() => setRescheduleSelectedLineId(lineId)}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition",
                          isSelected
                            ? "border-[#a57865] bg-[#a57865]/10"
                            : "border-[#e8ddd0] bg-white hover:border-[#a57865]/30",
                        )}>
                        <p className='font-plus-jakarta-sans text-sm font-medium text-[#1a1510]'>{name}</p>
                        <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                          {stylistName} {timeLabel ? `· ${timeLabel}` : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.scheduled_at && !rescheduleSelectedLineId ? (
                  <p className='mt-2 font-plus-jakarta-sans text-xs text-[#9f2d20]'>{fieldErrors.scheduled_at}</p>
                ) : null}
              </div>
            ) : null}

            {/* Stylist picker for selected line (optional) */}
            {selectedRescheduleLine ? (
              <StylistPickerForReschedule
                serviceId={rescheduleLineServiceId}
                value={rescheduleLineStylistId}
                initialValue={initialRescheduleLineStylistId}
                onChange={(v) => {
                  setRescheduleLineStylistId(v);
                  setTouched(true);
                }}
              />
            ) : null}

            <div className='rounded-2xl bg-gray-100 p-4'>
              <BookingCalendar
                value={rescheduleDate ?? null}
                onChange={(d) => {
                  setRescheduleDate(d);
                  setTouched(true);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const t = rescheduleTime || "00:00:00";
                  const normalizedTime =
                    t.split(":").length === 2 ? `${t}:00` : t;
                  const combined = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${normalizedTime}`;
                  setRescheduleTime("");
                  setFieldErrors(validateReschedule(combined, notes));
                }}
                stylistId={rescheduleEffectiveStylistId ?? null}
                hasStylistSelection={!!rescheduleSelectedLineId}
                selectedVariant='gray'
                originalDate={originalDate}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
              />
            </div>

            <div>
              {!rescheduleSelectedLineId ? (
                <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-white px-4 py-6 text-center'>
                  <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>Select a service above to see available times</p>
                </div>
              ) : (
                <>
              <p className='mb-2 flex items-center gap-2 font-plus-jakarta-sans text-xs font-semibold uppercase text-[#483630]'>
                Available times <span className='text-[#9f2d20]'>*</span>
                {rescheduleDate && availableSlots.length > 0 && (
                  <span className='ml-1 rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#2f6b47]'>
                    {availableSlots.length} slots
                  </span>
                )}
              </p>
              {isAvailabilityError ? (
                <div className='rounded-xl border border-[#e8ddd0] bg-white px-4 py-6 text-center'>
                  <p className='font-plus-jakarta-sans text-sm font-medium text-[#9f2d20]'>{(availabilityError as Error)?.message ?? "Failed to load times"}</p>
                  <button type='button' onClick={() => refetchAvailability()} className='mt-2 rounded-full border border-[#e8ddd0] bg-white px-4 py-2 font-plus-jakarta-sans text-xs'>Try again</button>
                </div>
              ) : rescheduleDate ? (
                availableSlots.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-white px-4 py-8 text-center'>
                    <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
                      No times available
                    </p>
                    <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Try another date — this day is fully booked or closed.
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                    {availableSlots.map((s) => {
                      const isSelected =
                        rescheduleTime === `${s.value}:00` ||
                        rescheduleTime === s.value;
                      const isOriginalSlot =
                        !!originalDate &&
                        !!rescheduleDate &&
                        originalDate.getFullYear() ===
                          rescheduleDate.getFullYear() &&
                        originalDate.getMonth() === rescheduleDate.getMonth() &&
                        originalDate.getDate() === rescheduleDate.getDate() &&
                        !!originalTime &&
                        (s.value === originalTime.slice(0, 5) ||
                          `${s.value}:00` === originalTime);
                      const isNewlySelected = isSelected && !isOriginalSlot;
                      return (
                        <button
                          key={s.value}
                          type='button'
                          onClick={() => {
                            const t = `${s.value}:00`;
                            setRescheduleTime(t);
                            setTouched(true);
                            const pad = (n: number) =>
                              String(n).padStart(2, "0");
                            const d = rescheduleDate!;
                            const combined = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${t}`;
                            setFieldErrors(validateReschedule(combined, notes));
                          }}
                          className={cn(
                            "rounded-full border px-3 py-2.5 font-plus-jakarta-sans text-xs font-medium transition-all active:scale-[0.97]",
                            isNewlySelected
                              ? "border-[#a57865] bg-[#a57865] text-white shadow-sm"
                              : isOriginalSlot
                                ? "border-[#d6d6d6] bg-[#e8e8e8] text-[#1a1510] shadow-sm"
                                : "border-[#e8ddd0] bg-white text-[#483630] hover:border-[#a57865] hover:bg-[#fdf9f5] hover:shadow-sm",
                          )}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-white px-4 py-6 text-center'>
                  <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                    Select a date to see available times
                  </p>
                </div>
              )}
                </>
              )}
            </div>

            <div className=''>
              <label
                htmlFor='notes'
                className='mb-2 flex items-center justify-between font-plus-jakarta-sans text-xs font-semibold uppercase text-[#483630]'>
                <span>
                  Notes{" "}
                  <span className='font-normal normal-case tracking-normal text-[#8a6a5a]'>
                    (optional)
                  </span>
                </span>
                <span className='font-plus-jakarta-sans text-[11px] font-normal normal-case tracking-normal text-[#8a6a5a]'>
                  {notes.length}/500
                </span>
              </label>
              <textarea
                id='notes'
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (touched)
                    setFieldErrors(
                      validateReschedule(scheduledAt, e.target.value),
                    );
                }}
                placeholder='Add a reason for rescheduling (e.g. Traffic, moving later)'
                rows={3}
                maxLength={500}
                aria-invalid={!!fieldErrors.notes}
                className={cn(
                  "w-full resize-none rounded-xl border bg-[#fdf9f5] px-3.5 py-3 font-plus-jakarta-sans text-[13px] leading-relaxed text-[#483630] placeholder:text-[#b89a85]/60 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#a57865]/20",
                  fieldErrors.notes
                    ? "border-[#9f2d20] focus:border-[#9f2d20] focus:ring-[#9f2d20]/20"
                    : "border-[#e8ddd0] focus:border-[#a57865]",
                )}
              />
              {fieldErrors.notes ? (
                <p className='mt-2 font-plus-jakarta-sans text-xs text-[#9f2d20]'>
                  {fieldErrors.notes}
                </p>
              ) : null}
            </div>
          </div>

          <div className='flex flex-col gap-2 border-t border-[#f3ece3] bg-[#fdf9f5] px-6 py-4'>
            <div className='flex shrink-0 gap-2 justify-end'>
              <button
                type='button'
                onClick={resetReschedule}
                className='rounded-full border border-[#e8ddd0] bg-white px-5 py-2.5 font-plus-jakarta-sans text-sm font-medium text-[#483630] hover:bg-[#fdf9f5] transition'>
                Cancel
              </button>
              <button
                type='button'
                disabled={rescheduleMut.isPending || !isDirty}
                onClick={handleRescheduleSubmit}
                title={!isDirty ? "No changes to save" : undefined}
                className='rounded-full bg-black/80 px-6 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50'>
                {rescheduleMut.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>

            {rescheduleMut.isError ? (
              <p className='rounded-xl bg-[#9f2d20]/10 px-4 py-3 font-plus-jakarta-sans text-sm text-[#9f2d20]'>
                {(rescheduleMut.error as Error).message}
              </p>
            ) : null}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}>
        <AlertDialogContent className='bg-white max-w-[400px]!'>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='mt-4 flex lg:flow-row flex-col-reverse lg:justify-end gap-2'>
            <button
              type='button'
              onClick={() => setCancelId(null)}
              className='rounded-full border border-[#e8ddd0] px-4 py-3 font-plus-jakarta-sans text-sm'>
              Keep
            </button>
            <button
              type='button'
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate(cancelId!)}
              className='rounded-full bg-[#9f2d20] px-4 py-3 font-plus-jakarta-sans text-sm text-white disabled:opacity-50'>
              {cancelMut.isPending ? "Cancelling..." : "Confirm cancel"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking Details: Dialog on desktop, Drawer on mobile, with SkeletonReveal + Add to Calendar */}
      {isDesktop ? (
        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedBookingId(null);
          }}>
          <DialogContent className='bg-white max-w-[560px]! p-0 gap-0 overflow-hidden rounded-2xl border border-[#e8ddd0] shadow-xl max-h-[85vh] flex flex-col'>
            {detailContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={isDetailsOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedBookingId(null);
          }}>
          <DrawerContent className=' overflow-hidden rounded-t-[28px]! border border-black/10 bg-white p-0 text-black'>
            <div className='mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10' />
            <div className='min-h-0 overflow-y-auto flex flex-col max-h-[88dvh]'>
              {detailContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </section>
  );
}
