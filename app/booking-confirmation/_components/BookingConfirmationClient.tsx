"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  Check,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  User,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ReceiptPrinter } from "@/components/ReceiptPrinter";
import type { ReceiptPrinterStage } from "@/components/ReceiptPrinter";
import { PaymentReceiptSkeleton } from "@/components/payment-receipt-skeleton";
import { getBookingByAppointmentNumberQueryOptions } from "@/services/booking-requests";
import { formatCurrency, formatDuration } from "@/lib/booking/format";
import { ApiError } from "@/lib/https";
import { useBookingStore } from "@/store/useBookingStore";
import type { BookingDetail } from "@/types/booking";

function formatScheduledAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateLabel: iso, timeLabel: "" };
  const dateLabel = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timeLabel = new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return { dateLabel, timeLabel };
}

function statusBadgeClasses(s: string) {
  const norm = s.toLowerCase().replace(/\s+/g, "_");
  switch (norm) {
    case "confirmed":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "pending":
      return "bg-[#fdf3e0] text-[#a06b12]";
    case "paid":
    case "partial":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "unpaid":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    case "cancelled":
    case "canceled":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    case "failed":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    default:
      return "bg-[#f3e8dd] text-[#8a6a5a]";
  }
}

function isCancelledStatus(s?: string | null) {
  if (!s) return false;
  const n = s.toLowerCase().trim();
  return (
    n === "cancelled" || n === "canceled" || n === "failed" || n === "no_show"
  );
}

export default function BookingConfirmationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resetBooking = useBookingStore((s) => s.resetBooking);
  const cart = useBookingStore((s) => s.cart);

  const txRef = useMemo(() => {
    const keys = [
      "tx_ref",
      "appointment_number",
      "appointmentNumber",
      "ref",
      "transaction_id",
      "txRef",
    ];
    for (const k of keys) {
      const v = searchParams.get(k);
      if (v) return v;
    }
    // also check direct param without key? fallback to first value that looks like APT-
    for (const [, v] of searchParams.entries()) {
      if (v?.startsWith("APT-")) return v;
    }
    return "";
  }, [searchParams]);

  const statusParam = (searchParams.get("status") || "").toLowerCase().trim();
  const isUrlCancelled = useMemo(
    () =>
      ["cancelled", "canceled", "failed", "failure", "error"].includes(
        statusParam,
      ),
    [statusParam],
  );

  const { data, isPending, isError, error } = useQuery({
    ...getBookingByAppointmentNumberQueryOptions(txRef),
    enabled: !!txRef,
  });

  const booking = data as BookingDetail | undefined;

  const isBookingCancelled = useMemo(() => {
    if (!booking) return false;
    return (
      isCancelledStatus(booking.status) ||
      isCancelledStatus(booking.payment_status)
    );
  }, [booking]);

  const isFailedOrCancelled = isUrlCancelled || isBookingCancelled;
  const isSuccess = !!booking && !isFailedOrCancelled && !isError;

  const [showConfetti, setShowConfetti] = useState(false);

  const queryStage = useMemo(() => {
    if (!txRef) return "error" as const;
    if (isPending) return "processing" as const;
    if (isError) return "error" as const;
    if (booking) return "complete" as const;
    return "pending" as const;
  }, [txRef, isPending, isError, booking]);

  // Display stage drives ReceiptPrinter animation: processing -> printing -> complete
  // Fixes printing animation never triggering (queryStage jumps processing -> complete)
  // Also handles cached query where booking is already available on mount.
  const [displayStage, setDisplayStage] = useState<ReceiptPrinterStage>(() => {
    if (isUrlCancelled) return "error";
    // Start as processing to guarantee printing animation even for cached data
    if (txRef) return "processing";
    return queryStage;
  });
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    hasAnimatedRef.current = false;
  }, [txRef]);

  useEffect(() => {
    if (isUrlCancelled) {
      setDisplayStage("error");
      return;
    }
    if (isBookingCancelled) {
      setDisplayStage("error");
      return;
    }
    if (queryStage === "complete") {
      // Trigger stepped printing animation once, even when data arrives instantly (cached)
      // Sequence: processing -> printing (1.75s) -> complete
      if (hasAnimatedRef.current) {
        setDisplayStage("complete");
        return;
      }
      hasAnimatedRef.current = true;
      setDisplayStage("printing");
      const t = setTimeout(() => setDisplayStage("complete"), 1750);
      return () => clearTimeout(t);
    }
    // Reset animation flag when leaving complete (e.g. new tx_ref)
    hasAnimatedRef.current = false;
    setDisplayStage(queryStage);
  }, [queryStage, isUrlCancelled, isBookingCancelled]);

  // Keep displayStage in sync when queryStage goes back to error/processing
  useEffect(() => {
    if (queryStage === "error" || queryStage === "processing") {
      setDisplayStage(queryStage);
    }
  }, [queryStage]);

  // Cart clearing: clear immediately after successful booking is verified
  const hasClearedRef = useRef(false);
  useEffect(() => {
    hasClearedRef.current = false;
  }, [txRef]);
  useEffect(() => {
    if (!isSuccess || hasClearedRef.current) return;
    if (cart.length === 0) return;
    hasClearedRef.current = true;
    // Defer to avoid state update during render
    const t = setTimeout(() => {
      resetBooking();
    }, 300);
    return () => clearTimeout(t);
  }, [isSuccess, cart.length, resetBooking]);

  // Reset confetti when navigating to cancelled/failed or new tx
  useEffect(() => {
    if (isFailedOrCancelled || displayStage !== "complete") {
      setShowConfetti(false);
    }
  }, [isFailedOrCancelled, displayStage, txRef]);

  // Confetti only on successful bookings, suppressed when ?status=cancelled
  useEffect(() => {
    if (displayStage !== "complete" || !booking) return;
    if (isFailedOrCancelled) return;
    setShowConfetti(true);
    let cancelled = false;
    import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const duration = 2200;
      const end = Date.now() + duration;
      const colors = ["#a57865", "#c9a96e", "#e8ddd0", "#483630", "#f5ece4"];
      const frame = () => {
        if (Date.now() > end || cancelled) return;
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
          scalar: 0.9,
          ticks: 150,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
          scalar: 0.9,
          ticks: 150,
        });
        requestAnimationFrame(frame);
      };
      frame();
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { x: 0.5, y: 0.55 },
        colors,
        scalar: 1.1,
        ticks: 180,
        gravity: 0.9,
        decay: 0.92,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [displayStage, booking, isFailedOrCancelled]);

  // Use displayStage alias for legacy code paths
  const stage = displayStage;

  if (!txRef) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center px-4 py-10 bg-[#F7F5F2]'>
        <div className='w-full max-w-md rounded-2xl border border-[#e8ddd0] bg-white p-8 text-center'>
          <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#fbe9e7] text-[#9f2d20]'>
            !
          </div>
          <h1 className='font-cooper text-xl text-[#1a1510]'>
            Missing booking reference
          </h1>
          <p className='mt-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
            No appointment number found in the URL. Expected{" "}
            <span className='font-mono font-semibold'>tx_ref</span> (e.g.
            APT-20260913-00008).
          </p>
          <div className='mt-6 flex flex-col gap-2'>
            <button
              type='button'
              onClick={() => router.push("/")}
              className='w-full rounded-full bg-[#1a1510] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white'>
              Back to Booking
            </button>
            <button
              type='button'
              onClick={() => router.push("/bookings")}
              className='w-full rounded-full border border-[#e8ddd0] bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPending) {
    return <PaymentReceiptSkeleton />;
  }

  if (isError) {
    const msg =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to load booking";
    return (
      <div className='min-h-screen w-full px-4 py-10 pb-24 bg-[#F7F5F2] flex flex-col items-center overflow-visible'>
        <div className='w-full max-w-sm'>
          <ReceiptPrinter.Root stage='error'>
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <p className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.12em] text-white/80'>
                  Veebeez
                </p>
                <ReceiptPrinter.Status />
              </ReceiptPrinter.Header>
              <ReceiptPrinter.Screen>
                <div className='flex items-center justify-between'>
                  <p className='font-plus-jakarta-sans text-xs text-white/70'>
                    Ref: {txRef}
                  </p>
                  <span className='rounded-full bg-white/10 px-2 py-1 font-plus-jakarta-sans text-[10px] uppercase tracking-wide text-white'>
                    Error
                  </span>
                </div>
                <div className='mt-3 flex items-center gap-2'>
                  <span className='flex-1 font-plus-jakarta-sans text-sm font-medium text-white'>
                    Verification failed
                  </span>
                </div>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>
            <ReceiptPrinter.Output>
              <ReceiptPrinter.Paper>
                <div className='text-center'>
                  <h2 className='font-cooper text-lg text-[#1a1510]'>
                    Booking not found
                  </h2>
                  <p className='mt-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                    {msg}
                  </p>
                  <p className='mt-1 font-mono text-xs text-[#8a6a5a]'>
                    {txRef}
                  </p>
                  <div className='mt-6 flex flex-col gap-2'>
                    <button
                      type='button'
                      onClick={() => router.push("/")}
                      className='w-full rounded-full bg-[#1a1510] px-6 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-white'>
                      Back to Booking
                    </button>
                    <button
                      type='button'
                      onClick={() => window.location.reload()}
                      className='w-full rounded-full border border-[#e8ddd0] px-6 py-2.5 font-plus-jakarta-sans text-sm text-[#483630]'>
                      Retry
                    </button>
                  </div>
                </div>
              </ReceiptPrinter.Paper>
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>
        </div>
      </div>
    );
  }

  if (!booking) {
    return <PaymentReceiptSkeleton />;
  }

  // ── Failed / Cancelled state ──
  // Handles both ?status=cancelled in URL and booking.status/payment_status === cancelled/failed
  if (isFailedOrCancelled) {
    const totalNumberF = Number(booking.total_amount);
    const depositF = booking.deposit_amount ?? "0.00";
    const { dateLabel: sdF, timeLabel: stF } = formatScheduledAt(
      booking.scheduled_at,
    );
    const isCancelledUrl = isUrlCancelled;
    const title = isCancelledUrl
      ? "Payment Cancelled"
      : "Booking Not Confirmed";
    const subtitle = isCancelledUrl
      ? "You left checkout before completing payment — no charge was made. Your slot is not reserved yet."
      : booking.payment_status?.toLowerCase() === "failed"
        ? "Your payment could not be completed. No booking was confirmed."
        : "This booking was cancelled. If this was unexpected, please retry or contact support.";

    return (
      <div className='min-h-screen w-full bg-[#F7F5F2] px-4 py-8 pb-24'>
        {/* Header */}
        <div className='mx-auto max-w-2xl text-center mb-6'>
          <div className='mx-auto mb-5 flex size-14 lg:size-[60px] items-center justify-center rounded-full bg-[#fbe9e7] shadow-sm'>
            <XCircle size={36} className='text-[#9f2d20]' strokeWidth={2} />
          </div>
          <h1 className='font-cooper text-[20px] md:text-[25px] leading-[1.05] text-black/80 '>
            {title}
          </h1>
          <p className='mx-auto mt-3 max-w-md font-plus-jakarta-sans text-[15px] leading-relaxed text-[#8a6a5a]'>
            {subtitle}
          </p>
          <div className='mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#e8ddd0] bg-white px-5 py-2 shadow-sm'>
            <span className='font-plus-jakarta-sans text-xs font-semibold tracking-[0.1em] text-[#483630]'>
              REF: {booking.appointment_number}
            </span>
            <span className='size-1 rounded-full bg-[#c9a96e]' />
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusBadgeClasses(booking.status)}`}>
              {booking.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusBadgeClasses(booking.payment_status)}`}>
              {booking.payment_status}
            </span>
          </div>
          <div className='mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl border border-[#f3c9c0] bg-[#fdf0ed] px-4 py-3 text-left'>
            <AlertTriangle
              size={16}
              className='mt-0.5 shrink-0 text-[#9f2d20]'
            />
            <p className='font-plus-jakarta-sans text-xs leading-relaxed text-[#7a2a1f]'>
              Your slot for{" "}
              <span className='font-semibold'>
                {sdF} at {stF}
              </span>{" "}
              is not reserved until payment is verified. Retry payment below or
              choose a new time.
            </p>
          </div>
        </div>

        <div className='flex justify-center'>
          <ReceiptPrinter.Root stage='error'>
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <p className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.14em] text-white/90'>
                  The Valerie Brand
                </p>
                <p className='font-plus-jakarta-sans text-[10px] tracking-wide text-white/60'>
                  Veebeez
                </p>
              </ReceiptPrinter.Header>
              <ReceiptPrinter.Screen>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='font-plus-jakarta-sans text-[11px] uppercase tracking-[0.12em] text-white/60'>
                      Appointment
                    </p>
                    <p className='font-mono text-sm font-semibold text-white'>
                      {booking.appointment_number}
                    </p>
                  </div>
                  <span className='inline-flex rounded-full bg-[#fbe9e7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9f2d20]'>
                    {isCancelledUrl ? "Cancelled" : booking.status}
                  </span>
                </div>
                <div className='mt-3'>
                  <ReceiptPrinter.Status>
                    {isCancelledUrl
                      ? "Payment cancelled"
                      : "Verification failed"}
                  </ReceiptPrinter.Status>
                </div>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>

            <ReceiptPrinter.Output>
              <ReceiptPrinter.Paper>
                <div className='text-center border-b border-dashed border-[#e8ddd0] pb-4'>
                  <h2 className='font-cooper text-lg text-[#1a1510]'>
                    {isCancelledUrl
                      ? "Payment not completed"
                      : "Booking cancelled"}
                  </h2>
                  <p className='mt-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                    {isCancelledUrl
                      ? "You cancelled the payment. Your booking is still pending and will be released soon."
                      : `Status: ${booking.status} · Payment: ${booking.payment_status}`}
                  </p>
                  <p className='mt-1 font-mono text-xs text-[#8a6a5a]'>
                    {txRef}
                  </p>
                </div>

                <div className='py-4 border-b border-dashed border-[#e8ddd0]'>
                  <div className='flex justify-between text-xs'>
                    <span className='font-plus-jakarta-sans text-[#8a6a5a]'>Total</span>
                    <span className='font-sans font-semibold text-[#1a1510]'>
                      {formatCurrency(totalNumberF)}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs mt-2'>
                    <span className='font-plus-jakarta-sans text-[#8a6a5a]'>Deposit</span>
                    <span className='font-plus-jakarta-sans font-semibold text-[#a57865]'>
                      {formatCurrency(Number(depositF))}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs mt-2'>
                    <span className='font-plus-jakarta-sans text-[#8a6a5a]'>
                      Scheduled
                    </span>
                    <span className='font-plus-jakarta-sans text-[#483630] text-right'>
                      {sdF} · {stF}
                    </span>
                  </div>
                </div>

                <div className='mt-4 flex flex-col gap-2'>
                  {booking.payment_link ? (
                    <a
                      href={booking.payment_link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1a1510] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white hover:bg-black'>
                      <RefreshCw size={16} />
                      Retry Payment
                    </a>
                  ) : (
                    <button
                      type='button'
                      onClick={() => router.push("/")}
                      className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1a1510] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white'>
                      <RefreshCw size={16} />
                      Try Again
                    </button>
                  )}
                  <a
                    href={`https://wa.me/2348068942333?text=${encodeURIComponent(`Hello Veebeez, I need help with booking ${booking.appointment_number} (${txRef}) - payment ${booking.payment_status}`)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex w-full items-center justify-center rounded-full border border-[#25D366]/20 bg-[#f0fdf4] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-[#128C7E] hover:bg-[#dcfce7]'>
                    Chat on WhatsApp
                  </a>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      type='button'
                      onClick={() => router.push("/")}
                      className='rounded-full border border-[#e8ddd0] bg-white px-4 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                      New Booking
                    </button>
                    <button
                      type='button'
                      onClick={() => router.push("/bookings")}
                      className='rounded-full border border-[#e8ddd0] bg-white px-4 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                      My Bookings
                    </button>
                  </div>
                </div>

                <p className='mt-4 text-center font-plus-jakarta-sans text-[11px] text-[#8a6a5a]'>
                  Need help? Visit Dulux paints Admiralty-Lekki, Lagos or chat
                  with us.
                </p>
              </ReceiptPrinter.Paper>
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>
        </div>
      </div>
    );
  }

  const totalNumber = Number(booking.total_amount);
  const subtotalNumber = Number(booking.subtotal);
  const taxNumber =
    Number(
      (booking as unknown as Record<string, unknown>).tax_amount ??
        booking.total_amount ??
        0,
    ) -
    subtotalNumber -
    Number(booking.extra_amount ?? 0);
  // Use direct fields - fallback parsing
  const tax_amount =
    (booking as unknown as { tax_amount?: string | number }).tax_amount ??
    "0.00";
  const extra_amount = booking.extra_amount ?? "0.00";
  const deposit_amount = booking.deposit_amount ?? "0.00";
  const duration = booking.duration_minutes;
  const { dateLabel: scheduledDate, timeLabel: scheduledTime } =
    formatScheduledAt(booking.scheduled_at);
  const scheduledDateObj = new Date(booking.scheduled_at);
  const isValidDate = !isNaN(scheduledDateObj.getTime());

  return (
    <div className='min-h-screen w-full bg-[#F7F5F2] px-4 py-8 pb-24 sm:pb-8 overflow-visible'>
      {/* Success header - same confetti style as ConfirmationScreen */}
      <div className='mx-auto max-w-2xl text-center mb-6'>
        <div className='mx-auto mb-5 flex size-14 lg:size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a57865] to-[#8e6655] shadow-lg shadow-[#a57865]/30'>
          <Check size={36} className='text-white' strokeWidth={2.5} />
        </div>
        <h1 className='font-cooper text-[20px] leading-[1.05] text-black/80 md:text-[36px]'>
          Booking Confirmed
        </h1>
        <p className='mx-auto mt-3 max-w-md font-plus-jakarta-sans text-[15px] leading-relaxed text-[#8a6a5a]'>
          Your payment was successful. A confirmation has been sent to your
          email — we can&apos;t wait to see you.
        </p>
        <div className='mt-5 inline-flex items-center gap-2 rounded-full border border-[#a57865]/20 bg-white px-5 py-2 shadow-sm'>
          <Sparkles size={16} className='text-[#a57865]' />
          <span className='font-plus-jakarta-sans text-xs font-semibold tracking-[0.1em] text-[#483630]'>
            REF: {booking.appointment_number}
          </span>
          <span className='size-1 rounded-full bg-[#c9a96e]' />
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusBadgeClasses(booking.payment_status)}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      <div className='flex justify-center'>
        <ReceiptPrinter.Root stage={stage} feedMotion='stepped'>
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Header>
              <p className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.14em] text-white/90'>
                The Valerie Brand
              </p>
              <p className='font-plus-jakarta-sans text-[10px] tracking-wide text-white/60'>
                Veebeez
              </p>
            </ReceiptPrinter.Header>
            <ReceiptPrinter.Screen>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='font-plus-jakarta-sans text-[11px] uppercase tracking-[0.12em] text-white/60'>
                    Appointment
                  </p>
                  <p className='font-mono text-sm font-semibold text-white'>
                    {booking.appointment_number}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusBadgeClasses(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className='mt-3'>
                <ReceiptPrinter.Status>
                  {stage === "complete" ? "Payment verified" : undefined}
                </ReceiptPrinter.Status>
              </div>
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>

          <ReceiptPrinter.Output>
            <ReceiptPrinter.Paper>
              {/* Brand + meta */}
              <div className='flex items-start justify-between gap-3 border-b border-dashed border-[#e8ddd0] pb-4'>
                <div>
                  <h2 className='font-cooper text-lg leading-none text-[#1a1510]'>
                    The Valerie Brand
                  </h2>
                  <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    Dulux paints Admiralty-Lekki, Lagos
                  </p>
                  <p className='mt-1 font-mono text-[11px] text-[#8a6a5a]'>
                    {txRef}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.12em] text-[#8a6a5a]'>
                    Date
                  </p>
                  <p className='font-plus-jakarta-sans text-xs font-medium text-[#483630]'>
                    {isValidDate
                      ? format(scheduledDateObj, "MMM d, yyyy")
                      : scheduledDate}
                  </p>
                  <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    {isValidDate
                      ? format(scheduledDateObj, "h:mm a")
                      : scheduledTime}
                  </p>
                </div>
              </div>

              {/* Date & Time + Stylist */}
              <div className='grid grid-cols-2 gap-3 py-4 border-b border-dashed border-[#e8ddd0]'>
                <div>
                  <p className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#a78a6f]'>
                    Date & Time
                  </p>
                  <p className='mt-1 flex items-center gap-1.5 font-plus-jakarta-sans text-xs font-medium text-[#1a1510]'>
                    <Calendar size={12} className='text-[#a78a6f]' />{" "}
                    {scheduledDate}
                  </p>
                  <p className='mt-1 flex items-center gap-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                    <Clock size={12} className='text-[#a78a6f]' />{" "}
                    {scheduledTime}
                    {booking.stylist_name ? (
                      <span className='text-[#8a6a5a]'>
                        · {booking.stylist_name}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#a78a6f]'>
                    Duration & Total
                  </p>
                  <p className='mt-1 font-sans text-lg font-semibold text-[#1a1510]'>
                    {formatCurrency(totalNumber)}
                  </p>
                  <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    {formatDuration(duration)} total
                  </p>
                </div>
              </div>

              {/* Services */}
              <div className='py-4 border-b border-dashed border-[#e8ddd0]'>
                <p className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#a78a6f]'>
                  Services ({booking.services?.length ?? 0})
                </p>
                <ul className='mt-3 space-y-2'>
                  {(booking.services ?? []).map((s) => (
                    <li
                      key={s.line_id ?? s.service_id}
                      className='flex items-start justify-between gap-3 rounded-lg border border-[#f3ece3] bg-[#fdfaf5] px-3 py-2.5'>
                      <div className='min-w-0'>
                        <p className='truncate font-plus-jakarta-sans text-sm font-medium text-[#1a1510]'>
                          {s.service_name}
                        </p>
                        <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                          {s.quantity > 1 ? `${s.quantity}× ` : ""}
                          {formatCurrency(Number(s.unit_price))}{" "}
                          {s.extra_cost
                            ? `+${formatCurrency(Number(s.extra_cost))} extra`
                            : ""}
                        </p>
                        {s.answers?.length ? (
                          <p className='mt-1 font-plus-jakarta-sans text-xs text-[#2d8a4f]'>
                            {s.answers
                              .map((a) => a.value_text ?? a.value)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <span className='shrink-0 font-sans text-sm font-semibold text-[#483630]'>
                        {formatCurrency(Number(s.line_total))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quote breakdown */}
              <div className='py-4 border-b border-dashed border-[#e8ddd0] space-y-2'>
                <p className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#a78a6f]'>
                  Payment Breakdown
                </p>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>Currency</span>
                  <span className='font-plus-jakarta-sans font-semibold text-[#483630]'>
                    {booking.currency}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>Subtotal</span>
                  <span className='font-plus-jakarta-sans text-[#483630]'>
                    {formatCurrency(Number(booking.subtotal))}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>
                    Extra Amount
                  </span>
                  <span className='font-plus-jakarta-sans text-[#2d8a4f]'>
                    +{formatCurrency(Number(extra_amount))}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>Tax Amount</span>
                  <span className='font-plus-jakarta-sans text-[#483630]'>
                    {formatCurrency(Number(tax_amount))}
                  </span>
                </div>
                <div className='flex justify-between border-t border-dashed border-[#e8ddd0] pt-2 text-sm'>
                  <span className='font-plus-jakarta-sans font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                    Total
                  </span>
                  <span className='font-sans font-bold text-[#1a1510]'>
                    {formatCurrency(Number(booking.total_amount))}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>
                    Deposit Paid / Due
                  </span>
                  <span className='font-plus-jakarta-sans font-semibold text-[#a57865]'>
                    {formatCurrency(Number(deposit_amount))}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='font-plus-jakarta-sans text-[#8a6a5a]'>
                    Payment Status
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClasses(booking.payment_status)}`}>
                    {booking.payment_status}
                  </span>
                </div>
              </div>

              {/* Guest / Account */}
              <div className='py-4 border-b border-dashed border-[#e8ddd0]'>
                <p className='flex items-center gap-1.5 font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#a78a6f]'>
                  <User size={11} /> {booking.customer_id ? "Account" : "Guest"}
                </p>
                <p className='mt-1.5 font-plus-jakarta-sans text-xs text-[#483630]'>
                  {booking.customer_id ? (
                    <>
                      Customer #{booking.customer_id}{" "}
                      {booking.guest_email ? (
                        <span className='text-[#8a6a5a]'>
                          ({booking.guest_email})
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className='font-medium'>
                        {booking.guest_first_name ?? ""}{" "}
                        {booking.guest_last_name ?? ""}
                      </span>{" "}
                      <span className='text-[#8a6a5a]'>
                        ({booking.guest_email ?? ""}{" "}
                        {booking.guest_phone ? `· ${booking.guest_phone}` : ""})
                      </span>
                    </>
                  )}
                </p>
                {booking.whatsapp_number ? (
                  <p className='mt-1 font-plus-jakarta-sans text-xs text-[#483630]'>
                    WhatsApp: {booking.whatsapp_number}
                  </p>
                ) : null}
                {booking.notes ? (
                  <p className='mt-2 rounded-lg bg-[#fdfaf5] border border-[#e8ddd0] px-3 py-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    “{booking.notes}”
                  </p>
                ) : null}
              </div>

              <div className='flex items-center gap-2 py-3 text-[#8a6a5a]'>
                <MapPin size={14} className='text-[#a78a6f]' />
                <p className='font-plus-jakarta-sans text-[11px]'>
                  Dulux paints Admiralty-Lekki, Fola Osibo Road, Lagos, Nigeria
                </p>
              </div>

              <div className='mt-4 flex flex-col gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    resetBooking();
                    router.push("/");
                  }}
                  className='w-full rounded-full bg-[#1a1510] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white'>
                  Book Another Appointment
                </button>
                <button
                  type='button'
                  onClick={() => router.push("/bookings")}
                  className='w-full rounded-full border border-[#e8ddd0] bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                  View My Bookings
                </button>
                {booking.payment_link ? (
                  <a
                    href={booking.payment_link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='w-full text-center rounded-full border border-[#a57865]/20 bg-[#fdfaf5] px-6 py-2.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    Payment link: {booking.payment_link.slice(0, 32)}…
                  </a>
                ) : null}
              </div>
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>
      </div>

      {showConfetti ? <span className='sr-only'>confetti</span> : null}
    </div>
  );
}
