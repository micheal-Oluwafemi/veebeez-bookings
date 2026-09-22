"use client";

import { useEffect, useRef, useState } from "react";
import { computeCartTotals } from "@/lib/booking/cart";
import {
  formatCurrency,
  formatDateLabel,
  formatDuration,
} from "@/lib/booking/format";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/store/useBookingStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { motion } from "framer-motion";
import { BsCart3 } from "react-icons/bs";
import { Loader2, X } from "lucide-react";
import AuthGate from "@/components/auth/AuthGate";
import { showToast } from "@/components/toast/app-toast";
import { useQuote } from "@/hooks/useQuote";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { PriceInput } from "@/components/PriceInput";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getStylistsQueryOptions } from "@/services/booking-catalog-requests";
import {
  requestFocusNextUnscheduled,
  requestNextService,
} from "@/lib/booking/schedule-focus";
import { getEffectiveDepositMin } from "@/lib/booking/deposit";
import type { Stylist } from "@/types/booking";

interface MobileBookingActionBarProps {
  visible: boolean;
  onContinue: () => void;
  isConfirming?: boolean;
}

export default function MobileBookingActionBar({
  visible,
  onContinue,
  isConfirming = false,
}: MobileBookingActionBarProps) {
  const cart = useBookingStore((state) => state.cart);
  // Don't show until a service is selected — hide when cart empty (per request)
  const effectiveVisible = visible && cart.length > 0;
  const currentStep = useBookingStore((state) => state.currentStep);
  const configuringItemIndex = useBookingStore(
    (state) => state.configuringItemIndex,
  );
  const allConfigured = cart.length > 0 && cart.every((i) => !!i.scheduled_at);
  const hasStylistSelection = allConfigured; // compat alias for legacy checks
  const totals = computeCartTotals(cart);
  const {
    data: quote,
    isLoading: isQuoteLoading,
    isError: isQuoteError,
    error: quoteError,
    refetch: refetchQuote,
    isFetching: isQuoteFetching,
  } = useQuote();
  const depositInput = useBookingStore((s) => s.depositInput);
  const setDepositInput = useBookingStore((s) => s.setDepositInput);
  const displayTotal = quote ? quote.total_amount : totals.subtotal;
  const displayDuration = quote
    ? quote.duration_minutes
    : totals.totalDurationMinutes;
  const itemLabel = cart.length === 1 ? "1 item" : `${cart.length} items`;
  const [error, setError] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [depositTouched, setDepositTouched] = useState(false);
  // per-item — legacy globals replaced; derive from cart for display
  const selectedDate = cart[0]?.scheduled_at ? new Date(cart[0].scheduled_at.replace(" ", "T")) : null;
  const selectedTimeSlot = cart[0]?.scheduled_at
    ? { value: cart[0].scheduled_at.split(" ")[1]?.slice(0, 5) ?? "", label: cart[0].scheduled_at.split(" ")[1]?.slice(0, 5) ?? "" }
    : null;
  const guestDetails = useBookingStore((s) => s.guestDetails);
  const nextStep = useBookingStore((s) => s.nextStep);
  const confirmBooking = useBookingStore((s) => s.confirmBooking);
  const token = useCustomerAuthStore((s) => s.token);
  const user = useCustomerAuthStore((s) => s.user);
  const isAuthenticated = !!token && !!user;
  const canConfirmStep4 = isAuthenticated
    ? allConfigured && cart.length > 0 && !!guestDetails.whatsappNumber.trim()
    : confirmBooking();
  const canConfirmStep3 = canConfirmStep4;
  const { data: stylistsData } = useQuery(getStylistsQueryOptions());
  const stylists = (stylistsData as Stylist[] | undefined) ?? [];
  // aggregate stylist label for per-item cart
  const stylistLabel = (() => {
    if (cart.length === 0) return null;
    if (!allConfigured) return `${cart.filter((i) => i.scheduled_at).length}/${cart.length} scheduled`;
    const firstId = cart[0].stylist_id;
    const allSame = cart.every((c) => c.stylist_id === firstId);
    if (allSame) {
      if (firstId === null) return "Any Professional";
      const s = stylists.find((x) => x.stylist_id === firstId);
      return s?.display_name ?? "—";
    }
    return `${cart.length} professionals`;
  })();
  // deposit_amount: 0 means no partial deposit — full payment is the minimum.
  // An empty field is invalid too, so it can't slip past the minimum check.
  const effectiveDepositMin = quote ? getEffectiveDepositMin(quote) : 0;
  const depositError =
    quote && (depositInput == null || depositInput < effectiveDepositMin)
      ? `Deposit must be at least ${formatCurrency(effectiveDepositMin)}`
      : quote &&
          depositInput !== null &&
          quote.total_amount !== undefined &&
          depositInput > quote.total_amount
        ? `Deposit cannot exceed ${formatCurrency(quote.total_amount)}`
        : "";

  // Only editable once every service is scheduled AND the user has moved
  // past the services-picking step (step 1).
  const canEditDeposit = allConfigured && currentStep > 1;

  // sync deposit input default — and refill it only when a recalculated
  // quote arrives while the field is empty (deposit_amount: 0 means full
  // payment is the minimum). Must NOT react to depositInput itself, or
  // clearing the field to type a new amount would instantly snap back.
  const depositQuoteKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quote) return;
    const key = `${quote.deposit_amount}:${quote.total_amount}`;
    const recalculated =
      depositQuoteKeyRef.current !== null &&
      depositQuoteKeyRef.current !== key;
    depositQuoteKeyRef.current = key;
    const isEmpty = useBookingStore.getState().depositInput == null;
    if (!depositTouched || (recalculated && isEmpty)) {
      setDepositInput(getEffectiveDepositMin(quote));
    }
  }, [quote?.deposit_amount, quote?.total_amount, depositTouched, setDepositInput, quote]);

  useEffect(() => {
    if (cart.length > 0) setError("");
  }, [cart.length]);

  const reviewScrollRef = useRef<HTMLDivElement>(null);

  // Reset touched only when cart composition changes — not on drawer open/close.
  // The previous `if (!reviewOpen) setDepositTouched(false)` would silently revert
  // a manually-typed deposit to the default right as the drawer closed (reviewOpen: false
  // → depositTouched false → sync effect fires → overwrites depositInput).
  useEffect(() => {
    setDepositTouched(false);
  }, [cart.length]);

  // Auto-scroll review drawer to bottom when it opens (and after quote loads)
  useEffect(() => {
    if (!reviewOpen) return;

    let cancelled = false;
    let raf: number | undefined;
    let t0: number | undefined;
    let t1: number | undefined;
    let t2: number | undefined;

    const scrollToBottom = () => {
      const target = reviewScrollRef.current;
      if (!target) return false;
      // Only scroll if content is actually scrollable and not already at bottom
      if (target.scrollHeight <= target.clientHeight) return true;
      target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      return true;
    };

    const attempt = () => {
      if (cancelled) return;
      const el = reviewScrollRef.current;
      if (!el) {
        raf = requestAnimationFrame(attempt);
        return;
      }
      // Double rAF ensures drawer mount + quote SkeletonReveal paint
      raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) scrollToBottom();
        }),
      );
      t1 = window.setTimeout(() => {
        if (!cancelled) scrollToBottom();
      }, 380);
      t2 = window.setTimeout(() => {
        if (!cancelled) scrollToBottom();
      }, 750);
    };

    // Delay start slightly to allow Drawer portal + animation to mount the scroll node
    t0 = window.setTimeout(attempt, 60);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reviewOpen, quote, isQuoteLoading]);

  const scrollToTop = () => {
    const lenis = (
      window as unknown as { lenis?: { scrollTo: (t: number) => void } }
    ).lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (cart.length === 0) {
        const msg = "Please select at least one service";
        showToast("error", "Missing selection", msg);
        setError(msg);
        return;
      }
    }
    if (currentStep === 2) {
      if (!allConfigured) {
        // Continue acts as the wizard's Next button: step one service
        // forward in order until the last service, then jump to whatever
        // is still unscheduled — never just block with an error.
        const from = configuringItemIndex ?? 0;
        setError("");
        if (from < cart.length - 1) {
          const target = cart[from + 1];
          requestNextService();
          showToast(
            "info",
            "Next service",
            `${target.service_name} — pick a professional and time`,
          );
        } else {
          const un = cart.filter((i) => !i.scheduled_at);
          const nextName = un[0]?.service_name ?? "service";
          requestFocusNextUnscheduled();
          showToast(
            "info",
            "Continue scheduling",
            un.length > 1
              ? `Next up: ${nextName} (+${un.length - 1} more)`
              : `Next up: ${nextName} — pick a time to continue`,
          );
        }
        return;
      }
      if (!isAuthenticated) {
        setAuthGateOpen(true);
        return;
      }
    }
    if (currentStep === 3) {
      const missing: string[] = [];
      if (!allConfigured) {
        const un = cart.filter((i) => !i.scheduled_at).map((i) => i.service_name);
        missing.push(un.length ? `schedule: ${un.join(", ")}` : "schedule");
      }
      if (cart.length === 0) missing.push("service");
      if (!isAuthenticated) {
        if (!guestDetails.firstName.trim()) missing.push("first name");
        if (!guestDetails.lastName.trim()) missing.push("last name");
        if (!guestDetails.email.trim()) missing.push("email");
        if (!guestDetails.phone.trim()) missing.push("phone");
      }
      if (!guestDetails.whatsappNumber.trim()) missing.push("whatsapp");
      if (missing.length) {
        showToast(
          "error",
          "Complete your details",
          `Missing: ${missing.join(", ")}`,
        );
        setError(`Missing: ${missing.join(", ")}`);
        return;
      }
      if (isQuoteLoading) {
        showToast("error", "Please wait", "Calculating quote...");
        return;
      }
      if (!quote) {
        showToast("error", "Quote required", "Unable to validate deposit");
        return;
      }
      if (depositError) {
        showToast("error", "Invalid deposit", depositError);
        setDepositTouched(true);
        setError(depositError);
        return;
      }
      // Validation passed – show review drawer instead of immediately paying
      setError("");
      setReviewOpen(true);
      return;
    }
    setError("");
    onContinue();
  };

  const handleDrawerConfirm = () => {
    if (isQuoteError || !quote) {
      showToast("error", "Quote required", "Unable to validate deposit");
      return;
    }
    if (depositError) {
      showToast("error", "Invalid deposit", depositError);
      setDepositTouched(true);
      return;
    }
    if (isQuoteLoading) {
      showToast("error", "Please wait", "Calculating quote...");
      return;
    }
    setReviewOpen(false);
    // small delay for drawer close animation before redirect
    setTimeout(() => {
      scrollToTop();
      onContinue();
    }, 150);
  };

  return (
    <>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={
          effectiveVisible ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 34,
          mass: 0.9,
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[99] md:hidden",
          "border-t border-[#ece4dc] bg-white px-5 py-3 shadow-[0_-12px_32px_-24px_rgba(15,12,11,0.65)]",
          !effectiveVisible && "pointer-events-none",
        )}
        aria-hidden={!effectiveVisible}>
        <div className='mx-auto flex max-w-md flex-col gap-2'>
          <div className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
              <p className='truncate font-plus-jakarta-sans text-base font-bold leading-tight text-[#483630]'>
                {formatCurrency(Number(displayTotal))}
              </p>

              <div className='flex gap-1'>
                <BsCart3 />

                <p className='mt-0.5 truncate font-plus-jakarta-sans text-sm leading-tight text-[#8a6a5a]'>
                  {itemLabel} &bull; {formatDuration(displayDuration)}
                </p>
              </div>
            </div>

            {currentStep === 3 ? (
              <button
                type='button'
                onClick={handleContinue}
                disabled={isConfirming || isQuoteLoading || !!depositError || !quote}
                className='inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#8e6655] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'>
                {isConfirming ? (
                  <>
                    <Loader2 size={16} className='animate-spin' /> Booking...
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </button>
            ) : (
              <button
                type='button'
                onClick={handleContinue}
                className='inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-base font-semibold text-white hover:bg-[#8e6655]'>
                Continue
                <img
                  src='/icons/right-arrow.svg'
                  alt='Continue to the next booking step'
                  className='invert size-4'
                />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Review Drawer – mobile only, shows quote summary before payment */}
      <Drawer
        open={reviewOpen}
        onOpenChange={(open) => {
          // The Confirm & Pay bar is disabled while the deposit is invalid
          // and this drawer is the only place to edit it — so keep the user
          // here until the amount is valid instead of locking them out.
          if (!open && depositError && depositTouched) return;
          setReviewOpen(open);
        }}>
        <DrawerContent
          aria-describedby={undefined}
          className='p-0 bg-white! rounded-t-[28px]! max-h-[80vh] overflow-hidden flex flex-col md:hidden'>
          <div className='mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-[#e8ddd0]' />
          <div className='flex items-center justify-between px-5 py-4 border-b border-[#e8ddd0] bg-white shrink-0'>
            <div>
              <h3 className='font-cooper text-lg leading-none text-[#1a1510]'>
                Review your booking
              </h3>
              <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                {cart.length} {cart.length === 1 ? "service" : "services"}{" "}
                &bull; {formatDuration(displayDuration)}
              </p>
            </div>
            <button
              type='button'
              onClick={() => {
                if (depositError && depositTouched) return;
                setReviewOpen(false);
              }}
              disabled={!!(depositError && depositTouched)}
              aria-label='Close review'
              title={
                depositError && depositTouched
                  ? depositError
                  : "Close review"
              }
              className='flex size-8 items-center justify-center rounded-full border border-[#e8ddd0] bg-white text-[#483630] disabled:cursor-not-allowed disabled:opacity-40'>
              <X size={14} />
            </button>
          </div>

          <div
            ref={reviewScrollRef}
            className='flex-1 overflow-y-auto px-4 py-4 space-y-4'
            data-lenis-prevent>
            {/* Selected Services */}
            <div className='rounded-2xl border border-[#e8ddd0] bg-white p-4'>
              <p className='font-plus-jakarta-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a57865]'>
                Selected Services
              </p>
              <div className='mt-3 space-y-2'>
                {cart.map((item) => {
                  const extra = item.answers.reduce(
                    (s, a) => s + (a.extra_cost ?? 0),
                    0,
                  );
                  return (
                    <div
                      key={item.service_id}
                      className='flex items-start justify-between gap-3 rounded-xl border border-[#f3ece3] bg-[#fdfaf5] px-3 py-3'>
                      <div className='min-w-0'>
                        <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630] truncate'>
                          {item.service_name}
                        </p>
                        <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                          {formatDuration(item.duration_minutes)}
                        </p>
                        {item.answers.length ? (
                          <p className='mt-1 font-plus-jakarta-sans text-xs text-[#2d8a4f]'>
                            {item.answers.map((a) => a.label).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className='shrink-0 text-right'>
                        <p className='font-sans text-sm font-semibold text-[#483630]'>
                          {formatCurrency(Number(item.unit_price))}
                        </p>
                        {extra ? (
                          <p className='font-plus-jakarta-sans text-xs text-[#2d8a4f]'>
                            +{formatCurrency(extra)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className='mt-3 space-y-1.5 border-t border-[#f3ece3] pt-3'>
                {cart.map((item) => {
                  const isConf = !!item.scheduled_at;
                  const st = item.stylist_id !== null ? stylists.find((s) => s.stylist_id === item.stylist_id) : null;
                  const sName = item.stylist_id === null ? "Any Professional" : (st?.display_name ?? `Stylist #${item.stylist_id}`);
                  let tLabel: string | null = null;
                  if (isConf && item.scheduled_at) {
                    try {
                      const d = new Date(item.scheduled_at.replace(" ", "T"));
                      tLabel = `${new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" }).format(d)} · ${new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;
                    } catch { tLabel = item.scheduled_at; }
                  }
                  return (
                    <div key={item.service_id} className='flex items-center justify-between gap-2'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a] truncate'>{item.service_name}</span>
                      <span className={isConf ? "font-plus-jakarta-sans text-xs font-medium text-[#2f6b47]" : "font-plus-jakarta-sans text-xs italic text-[#a78a6f]"}>
                        {isConf ? `${sName} · ${tLabel}` : "Not scheduled"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quote Summary */}
            <div className='rounded-2xl border border-[#e8ddd0] bg-white p-4'>
              <p className='font-plus-jakarta-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a57865]'>
                Quote Summary
              </p>
              {isQuoteLoading ? (
                <div className='mt-3 space-y-2'>
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-3/4' />
                  <Skeleton className='h-10 w-full rounded-xl' />
                </div>
              ) : isQuoteError || !quote ? (
                <ErrorState
                  variant='inline'
                  tone='quote'
                  title='Quote failed'
                  error={quoteError}
                  message='We could not calculate the price. Please try again.'
                  onRetry={() => refetchQuote()}
                  retryLabel={isQuoteFetching ? "Retrying..." : "Try again"}
                />
              ) : (
                <>
                  <div className='mt-3 space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs uppercase tracking-[0.08em] text-[#8a6a5a]'>
                        Currency
                      </span>
                      <span className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                        {quote.currency}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        Subtotal
                      </span>
                      <span className='font-plus-jakarta-sans text-sm text-[#483630]'>
                        {formatCurrency(Number(quote.subtotal))}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        Tax
                      </span>
                      <span className='font-plus-jakarta-sans text-sm text-[#483630]'>
                        {formatCurrency(Number(quote.tax_amount ?? 0))}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        Extra
                      </span>
                      <span className='font-plus-jakarta-sans text-sm font-medium text-[#2d8a4f]'>
                        +{formatCurrency(Number(quote.extra_amount))}
                      </span>
                    </div>
                    <div className='flex justify-between border-t border-[#e8ddd0] pt-2 mt-1'>
                      <span className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                        Total
                      </span>
                      <span className='font-sans text-base font-bold text-[#483630]'>
                        {formatCurrency(Number(quote.total_amount))}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        Duration
                      </span>
                      <span className='font-plus-jakarta-sans text-sm text-[#483630]'>
                        {formatDuration(quote.duration_minutes)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        Min Deposit
                      </span>
                      <span className='font-plus-jakarta-sans text-sm font-semibold text-[#a57865]'>
                        {formatCurrency(effectiveDepositMin)}
                      </span>
                    </div>
                  </div>
                  <div className='mt-4'>
                    <label className='mb-1.5 block font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                      Deposit Amount <span className='text-[#9f2d20]'>*</span>
                    </label>
                    <PriceInput
                      value={depositInput}
                      disabled={!canEditDeposit}
                      readOnly={!canEditDeposit}
                      onValueChange={(val) => {
                        if (!canEditDeposit) return;
                        setDepositInput(val);
                        setDepositTouched(true);
                      }}
                      onBlur={() => {
                        if (!canEditDeposit) return;
                        setDepositTouched(true);
                      }}
                      placeholder={String(effectiveDepositMin)}
                      prefix='₦'
                      className={cn(
                        "w-full rounded-xl border bg-white px-3 py-2.5 font-sans text-base! text-[#483630] outline-none! placeholder:text-[#b89a85]/60 h-auto shadow-none disabled:cursor-not-allowed disabled:bg-[#f3ece3]/60 disabled:text-[#8a6a5a]",
                        depositError && depositTouched
                          ? "border-[#9f2d20]"
                          : "border-[#e8ddd0]",
                      )}
                      aria-invalid={!!(depositError && depositTouched)}
                    />
                    <p className='mt-1.5 font-sans text-[11px] text-[#8a6a5a]'>
                      Minimum deposit:{" "}
                      {formatCurrency(effectiveDepositMin)} • Total:{" "}
                      {formatCurrency(Number(quote.total_amount))}
                    </p>
                    {!canEditDeposit ? (
                      <p className='mt-1.5 font-plus-jakarta-sans text-[11px] font-medium text-[#a06b12]'>
                        Editable once every service is scheduled with a professional.
                      </p>
                    ) : depositError && depositTouched ? (
                      <p className='mt-1.5 font-plus-jakarta-sans text-xs font-medium text-[#9f2d20]'>
                        {depositError}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className='shrink-0 border-t border-[#e8ddd0] bg-white px-4 py-4'>
            <div className='flex items-baseline justify-between'>
              <span className='font-plus-jakarta-sans text-[10px] uppercase tracking-[0.1em] text-[#666]'>
                Total to pay now
              </span>
              <span className='font-sans text-lg font-bold text-[#483630]'>
                {formatCurrency(
                  Number(
                    quote
                      ? (depositInput ?? effectiveDepositMin)
                      : displayTotal,
                  ),
                )}
              </span>
            </div>
            <p className='mt-1 text-right font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
              Balance{" "}
              <b>
                {quote
                  ? formatCurrency(
                      Number(quote.total_amount) -
                        Number(depositInput ?? effectiveDepositMin ?? 0),
                    )
                  : "-"}{" "}
              </b>
              due at salon
            </p>
            <button
              type='button'
              onClick={handleDrawerConfirm}
              disabled={
                isConfirming || isQuoteLoading || !!depositError || !quote
              }
              className='mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3.5 font-plus-jakarta-sans text-sm font-semibold text-white transition hover:bg-[#8e6655] active:scale-[0.97] disabled:opacity-60'>
              {isConfirming ? (
                <>
                  <Loader2 size={16} className='animate-spin' /> Processing...
                </>
              ) : (
                "Confirm & Pay"
              )}
            </button>
            <p className='mt-2 text-center font-plus-jakarta-sans text-[11px] text-[#8a6a5a]'>
              You’ll be redirected to secure checkout
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      <AuthGate
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        onGuestContinue={() => {
          setAuthGateOpen(false);
          setTimeout(() => {
            // step transition scrolls via the page's currentStep effect
            nextStep();
          }, 250);
        }}
      />
    </>
  );
}
