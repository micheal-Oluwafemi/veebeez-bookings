import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { GetRequest } from "@/lib/https";
import type { CalendarResponse } from "@/types/booking";

export const bookingQueryKeys = {
  collections: ["booking", "collections"] as const,
  collectionBySlug: (slug: string) => ["booking", "collections", slug] as const,
  serviceBySlug: (slug: string) => ["booking", "services", slug] as const,
  stylists: ["booking", "stylists"] as const,
  salonHours: ["booking", "salon-hours"] as const,
  calendar: (stylistId: number | null, start: string, end: string) =>
    ["booking", "calendar", stylistId ?? "any", start, end] as const,
  myBookings: (params?: Record<string, unknown>) =>
    ["booking", "my-bookings", params ?? {}] as const,
  myBookingById: (id: string | number) =>
    ["booking", "my-bookings", String(id)] as const,
  quote: (hash: string) => ["booking", "quote", hash] as const,
  bookingByAppointmentNumber: (num: string) =>
    ["booking", "by-appointment-number", num] as const,
  searchBookings: (email: string, params?: Record<string, unknown>) =>
    ["booking", "search", email, params ?? {}] as const,
};

export const getCollectionsQueryOptions = () =>
  queryOptions({
    queryKey: bookingQueryKeys.collections,
    queryFn: async () => {
      const res = (await GetRequest("booking-system/collections")) as {
        data: unknown;
      };
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

export const getCollectionBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: bookingQueryKeys.collectionBySlug(slug),
    queryFn: async () => {
      const res = (await GetRequest(`booking-system/collections/${slug}`)) as {
        data: unknown;
      };
      return res.data;
    },
    enabled: !!slug,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

export const getServiceBySlugQueryOptions = (slug: string | null) =>
  queryOptions({
    queryKey: bookingQueryKeys.serviceBySlug(slug ?? ""),
    queryFn: async () => {
      const res = (await GetRequest(`booking-system/services/${slug}`)) as {
        data: unknown;
      };
      return res.data;
    },
    enabled: !!slug,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

export const getStylistsQueryOptions = () =>
  queryOptions({
    queryKey: bookingQueryKeys.stylists,
    queryFn: async () => {
      const res = (await GetRequest("booking-system/stylists")) as {
        data: unknown;
      };
      return res.data;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

export const getSalonHoursQueryOptions = () =>
  queryOptions({
    queryKey: bookingQueryKeys.salonHours,
    queryFn: async () => {
      const res = (await GetRequest("booking-system/salon-hours")) as {
        data: unknown;
      };
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
