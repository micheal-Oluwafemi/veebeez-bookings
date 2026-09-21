"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuoteQueryOptions } from "@/services/booking-requests";
import { useBookingStore } from "@/store/useBookingStore";

export function useQuote() {
  const cart = useBookingStore((s) => s.cart);

  const { items, currency } = useMemo(() => {
    if (cart.length === 0) return { items: [] as never[], currency: "NGN" };
    const curr = cart[0]?.currency ?? "NGN";
    const mapped = cart.map((c) => ({
      service_id: c.service_id,
      quantity: c.quantity ?? 1,
      answers: c.answers.map((a) => ({ option_id: a.option_id })),
    }));
    return { items: mapped, currency: curr };
  }, [cart]);

  const query = useQuery(getQuoteQueryOptions(items, currency));

  return query;
}
