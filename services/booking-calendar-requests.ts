import { queryOptions } from "@tanstack/react-query";
import { GetRequest } from "@/lib/https";
import { bookingQueryKeys } from "./booking-catalog-requests";
import type { CalendarResponse } from "@/types/booking";

export const getCalendarQueryOptions = (
  stylistId: number | null,
  startDate: string,
  endDate: string,
) =>
  queryOptions({
    queryKey: bookingQueryKeys.calendar(stylistId, startDate, endDate),
    queryFn: async () => {
      const qs = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (stylistId) qs.set("stylist_id", String(stylistId));
      const res = (await GetRequest(`booking-system/calendar?${qs.toString()}`)) as { data: CalendarResponse };
      // API may return { data: CalendarResponse } nested or directly CalendarResponse; handle both
      const data = res.data as unknown;
      // If res.data has .days, it's the CalendarResponse; else unwrap one more level
      if (data && typeof data === "object" && "days" in (data as Record<string, unknown>)) {
        return data as CalendarResponse;
      }
      return data as CalendarResponse;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 3,
  });
