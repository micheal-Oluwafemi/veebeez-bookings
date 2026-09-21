import type { QuoteResponse } from "@/types/booking";

/**
 * The minimum amount the customer must pay now.
 *
 * The backend returns `deposit_amount: 0` when no partial deposit is allowed
 * for the selected services — i.e. a 0 minimum means full payment is
 * required, not that the customer may pay nothing. In that case the
 * effective minimum is the full quoted total.
 */
export function getEffectiveDepositMin(
  quote: Pick<QuoteResponse, "deposit_amount" | "total_amount"> | null | undefined,
): number {
  if (!quote) return 0;
  const deposit = Number(quote.deposit_amount) || 0;
  if (deposit > 0) return deposit;
  return Number(quote.total_amount) || 0;
}
