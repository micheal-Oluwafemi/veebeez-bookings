import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { GetRequest, PostRequest } from "@/lib/https";
import { bookingQueryKeys } from "./booking-catalog-requests";
import type { BookingPayload } from "@/types/booking";

function toQS(params?: Record<string, unknown>) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const placeBooking = (body: BookingPayload) =>
  PostRequest("booking-system/bookings", body);

export const getQuote = (body: import("@/types/booking").QuoteRequest) =>
  PostRequest<{ data: import("@/types/booking").QuoteResponse }>(
    "booking-system/quote",
    body,
  );

export const getBookingByAppointmentNumber = (
  appointmentNumber: string,
) =>
  GetRequest<{ data: import("@/types/booking").BookingDetail }>(
    `booking-system/bookings/${encodeURIComponent(appointmentNumber)}`,
  );

export const getQuoteQueryOptions = (
  items: { service_id: number; quantity: number; answers: { option_id: number }[] }[],
  currency: string = "NGN",
) => {
  // stable hash for queryKey
  const hash = JSON.stringify({
    c: currency,
    i: items
      .map((it) => ({
        s: it.service_id,
        q: it.quantity,
        a: [...it.answers].map((a) => a.option_id).sort((a, b) => a - b),
      }))
      .sort((a, b) => a.s - b.s),
  });
  return queryOptions({
    queryKey: bookingQueryKeys.quote(hash),
    queryFn: async () => {
      const res = await getQuote({ items, currency });
      return res.data;
    },
    enabled: items.length > 0,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

export const getBookingByAppointmentNumberQueryOptions = (
  appointmentNumber: string,
) =>
  queryOptions({
    queryKey: bookingQueryKeys.bookingByAppointmentNumber(appointmentNumber),
    queryFn: async () => {
      const res = await getBookingByAppointmentNumber(appointmentNumber);
      return (res.data ?? res) as import("@/types/booking").BookingDetail;
    },
    enabled: !!appointmentNumber,
    staleTime: 1000 * 30,
    retry: 1,
  });

export const getMyBookingsQueryOptions = (params?: {
  status?: string;
  upcoming?: boolean;
  per_page?: number;
}) =>
  queryOptions({
    queryKey: bookingQueryKeys.myBookings(params),
    queryFn: async () => {
      const res = (await GetRequest(
        `booking-system/my/bookings${toQS(params as Record<string, unknown>)}`,
      )) as { data: unknown };
      return res.data;
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

export const getMyBookingByIdQueryOptions = (id: string | number) =>
  queryOptions({
    queryKey: bookingQueryKeys.myBookingById(id),
    queryFn: async () => {
      const res = (await GetRequest(`booking-system/my/bookings/${id}`)) as {
        data: unknown;
      };
      // API returns {data: BookingDetail}
      return (res.data ?? res) as unknown;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const searchBookingsByEmail = (email: string, params?: { per_page?: number; page?: number }) =>
  GetRequest<{ data: unknown[]; meta?: unknown }>(
    `booking-system/bookings/history${toQS({ email, ...params } as Record<string, unknown>)}`,
  );

export const getSearchBookingsQueryOptions = (email: string, params?: { per_page?: number; page?: number }) =>
  queryOptions({
    queryKey: bookingQueryKeys.searchBookings(email, params),
    queryFn: async () => {
      const res = await searchBookingsByEmail(email, params);
      const data = (res as { data?: unknown })?.data ?? res;
      return Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
    },
    enabled: !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

export const rescheduleBooking = (
  bookingId: number | string,
  body: import("@/types/booking").ReschedulePayload,
) => PostRequest(`booking-system/my/bookings/${bookingId}/reschedule`, body);

export const cancelBooking = (
  bookingId: number | string,
  body?: { reason?: string },
) => PostRequest(`booking-system/my/bookings/${bookingId}/cancel`, body);
