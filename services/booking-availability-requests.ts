import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { GetRequest } from "@/lib/https";

export interface AvailabilityResponse {
  date: string;
  duration_minutes: number;
  slots: string[]; // "Y-m-d H:i:s" e.g. "2026-09-22 09:00:00"
}

export const availabilityQueryKeys = {
  availability: (date: string, stylistId: number | null, serviceId: number | null) =>
    ["booking", "availability", date, stylistId ?? "any", serviceId ?? "any"] as const,
};

export const getAvailabilityQueryOptions = (
  date: string | null | undefined,
  stylistId: number | null,
  serviceId: number | null,
) =>
  queryOptions({
    queryKey: availabilityQueryKeys.availability(date ?? "", stylistId, serviceId),
    queryFn: async () => {
      const qs = new URLSearchParams({ date: date! });
      if (stylistId !== null && stylistId !== undefined) qs.set("stylist_id", String(stylistId));
      if (serviceId !== null && serviceId !== undefined) qs.set("service_id", String(serviceId));
      // omit duration_minutes when service_id is sent — service duration is used (per API doc)
      const res = (await GetRequest(`booking-system/availability?${qs.toString()}`)) as {
        data: AvailabilityResponse;
      };
      const data = (res as { data: AvailabilityResponse }).data ?? (res as unknown as AvailabilityResponse);
      // normalize: ensure slots is array
      if (data && typeof data === "object" && Array.isArray((data as AvailabilityResponse).slots)) {
        return data as AvailabilityResponse;
      }
      return data as AvailabilityResponse;
    },
    enabled: !!date,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
