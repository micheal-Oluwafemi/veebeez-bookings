import { Suspense } from "react";
import { PaymentReceiptSkeleton } from "@/components/payment-receipt-skeleton";
import BookingConfirmationClient from "./_components/BookingConfirmationClient";

export const dynamic = "force-dynamic";

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<PaymentReceiptSkeleton />}>
      <BookingConfirmationClient />
    </Suspense>
  );
}
