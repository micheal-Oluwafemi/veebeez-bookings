"use client";

import {
  ArrowLeft,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { showToast } from "@/components/toast/app-toast";
import { computeCartTotals } from "@/lib/booking/cart";
import {
  formatCurrency,
  formatDateLabel,
  formatDuration,
} from "@/lib/booking/format";
import { cn } from "@/lib/utils";
import {
  getCollectionBySlugQueryOptions,
  getStylistsQueryOptions,
} from "@/services/booking-catalog-requests";
import { useBookingStore } from "@/store/useBookingStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import type { Collection, Stylist } from "@/types/booking";
import { RxShuffle } from "react-icons/rx";
import { FiInstagram } from "react-icons/fi";
import AuthGate from "@/components/auth/AuthGate";
import { useQuote } from "@/hooks/useQuote";
import { PriceInput } from "@/components/PriceInput";
import { ErrorState } from "@/components/ui/error-state";
import { getOptimizedImageUrl, shouldUnoptimize } from "@/lib/image";
import { BUSINESS } from "@/lib/seo/constants";
import {
  requestFocusNextUnscheduled,
  requestNextService,
} from "@/lib/booking/schedule-focus";
import { getEffectiveDepositMin } from "@/lib/booking/deposit";
import Image from "next/image";

interface CartPanelProps {
  variant?: "sidebar" | "page";
  onBack?: () => void;
  onConfirm?: () => void;
  showFinalAction?: boolean;
  isConfirming?: boolean;
}

export default function CartPanel({
  variant = "sidebar",
  onBack,
  onConfirm,
  showFinalAction = false,
  isConfirming = false,
}: CartPanelProps) {
  const selectedCollectionSlug = useBookingStore(
    (s) => s.selectedCollectionSlug,
  );
  const cart = useBookingStore((s) => s.cart);
  const totals = computeCartTotals(cart);
  // per-item scheduling (Phase 3) — replaces global stylist/date/time
  const allConfigured = cart.length > 0 && cart.every((i) => !!i.scheduled_at);
  const configuredCount = cart.filter((i) => !!i.scheduled_at).length;
  // compat aliases for legacy UI helpers (will be removed after verification)
  const hasStylistSelection = allConfigured;
  const selectedStylistId = cart[0]?.stylist_id ?? null;
  const selectedDate = cart[0]?.scheduled_at ? new Date(cart[0].scheduled_at.replace(" ", "T")) : null;
  const selectedTimeSlot = cart[0]?.scheduled_at
    ? { value: cart[0].scheduled_at.split(" ")[1]?.slice(0, 5) ?? "", label: cart[0].scheduled_at.split(" ")[1]?.slice(0, 5) ?? "" }
    : null;
  // legacy shims still in store (compat) — keep readings for verification step, not used for UI
  const legacySelectedStylistId = useBookingStore((s) => s.selectedStylistId);
  const legacyHasStylistSelection = useBookingStore((s) => s.hasStylistSelection);
  const legacySelectedDate = useBookingStore((s) => s.selectedDate);
  const legacySelectedTimeSlot = useBookingStore((s) => s.selectedTimeSlot);
  const isPage = variant === "page";
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
  const [depositTouched, setDepositTouched] = useState(false);

  const { data: collectionData, isLoading: collectionLoading } = useQuery({
    ...getCollectionBySlugQueryOptions(selectedCollectionSlug ?? ""),
    enabled: !!selectedCollectionSlug,
  });
  const collection = collectionData as Collection | undefined;

  const { data: stylistsData } = useQuery(getStylistsQueryOptions());
  const stylists = (stylistsData as Stylist[] | undefined) ?? [];
  // per-item aggregate for CollectionBlock banner
  const stylistLabel = (() => {
    if (cart.length === 0) return null;
    if (!allConfigured) return `${configuredCount}/${cart.length} scheduled`;
    const firstId = cart[0].stylist_id;
    const allSame = cart.every((c) => c.stylist_id === firstId);
    if (allSame) {
      if (firstId === null) return "Any Professional";
      const s = stylists.find((x) => x.stylist_id === firstId);
      return s?.display_name ?? `Stylist #${firstId}`;
    }
    return `${cart.length} professionals`;
  })();
  const stylistInitials = (() => {
    if (cart.length === 0) return "";
    const firstId = cart[0].stylist_id;
    const allSame = cart.every((c) => c.stylist_id === firstId);
    if (allSame && firstId !== null) {
      return stylists.find((s) => s.stylist_id === firstId)?.initials ?? "";
    }
    return "";
  })();
  const isNoPreference = allConfigured && cart.length > 0 && cart.every((c) => c.stylist_id === null) && cart.every((c) => c.stylist_id === cart[0].stylist_id);

  const currentStep = useBookingStore((s) => s.currentStep);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const confirmation = useBookingStore((s) => s.confirmation);
  const nextStep = useBookingStore((s) => s.nextStep);
  const confirmBooking = useBookingStore((s) => s.confirmBooking);
  const clearCart = useBookingStore((s) => s.clearCart);
  const setStep = useBookingStore((s) => s.setStep);
  const token = useCustomerAuthStore((s) => s.token);
  const user = useCustomerAuthStore((s) => s.user);
  const isAuthenticated = !!token && !!user;
  const [actionError, setActionError] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const servicesEndRef = useRef<HTMLDivElement>(null);
  const prevQuoteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (cart.length > 0) setActionError("");
  }, [cart.length, allConfigured]);

  // Keep the deposit defaulted to the effective minimum. The store nulls
  // depositInput whenever scheduling changes, so we also re-default on
  // entering the confirm step — otherwise the field can appear blank there.
  // Clearing the field to type never snaps back (touched → no refill).
  const depositQuoteKeyRef = useRef<string | null>(null);
  const prevStepForDepositRef = useRef(currentStep);
  useEffect(() => {
    if (!quote) return;
    const key = `${quote.deposit_amount}:${quote.total_amount}`;
    const recalculated =
      depositQuoteKeyRef.current !== null &&
      depositQuoteKeyRef.current !== key;
    depositQuoteKeyRef.current = key;
    const enteredConfirm =
      prevStepForDepositRef.current !== currentStep && currentStep === 3;
    prevStepForDepositRef.current = currentStep;
    const isEmpty = depositInput == null;
    if (
      !depositTouched ||
      (recalculated && isEmpty) ||
      (enteredConfirm && isEmpty)
    ) {
      setDepositInput(getEffectiveDepositMin(quote));
    }
  }, [
    quote,
    quote?.deposit_amount,
    quote?.total_amount,
    currentStep,
    depositTouched,
    depositInput,
    setDepositInput,
  ]);

  // reset touched and deposit when cart changes (handled via store reset)
  useEffect(() => {
    setDepositTouched(false);
  }, [cart.length]);

  const depositMin = quote ? getEffectiveDepositMin(quote) : 0;
  const depositMax = quote?.total_amount ?? undefined;
  // Only editable once every service is scheduled AND the user has moved
  // past the services-picking step (step 1). While still choosing services
  // the field stays locked.
  const canEditDeposit = allConfigured && currentStep > 1;
  // An empty deposit is invalid too — otherwise a cleared field could slip
  // past the "at least the minimum" check
  const depositError =
    quote && (depositInput == null || depositInput < depositMin)
      ? `Deposit must be at least ${formatCurrency(depositMin)}`
      : quote &&
          depositInput !== null &&
          depositMax !== undefined &&
          depositInput > depositMax
        ? `Deposit cannot exceed ${formatCurrency(depositMax)}`
        : "";

  const displayTotal = quote ? quote.total_amount : totals.subtotal;
  const displayCurrency = quote?.currency ?? cart[0]?.currency ?? "NGN";

  const guestDetails = useBookingStore((s) => s.guestDetails);
  const canContinueStep1 = cart.length > 0;
  const canContinueStep2 = allConfigured;
  // old step 3 (Date&Time) merged into step 2 — keep alias for compat
  const canContinueStep3 = allConfigured;
  // Phase 3: step 3 is now Your Details (was step 4). Gate on per-item schedule + whatsapp.
  const canConfirmStep4 = isAuthenticated
    ? allConfigured && cart.length > 0 && !!guestDetails.whatsappNumber.trim()
    : confirmBooking();
  // keep legacy alias canConfirmStep3 for new wizard
  const canConfirmStep3 = canConfirmStep4;

  const getMissingStep4 = () => {
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
    return missing;
  };

  const handleSidebarContinue = () => {
    if (currentStep === 1) {
      if (cart.length === 0) {
        const msg = "Please select at least one service";
        showToast("error", "Missing selection", msg);
        setActionError(msg);
        return;
      }
      if (cart.length > 0 && isQuoteLoading) {
        showToast("error", "Please wait", "Calculating quote...");
        return;
      }
      if (isQuoteError) {
        showToast("error", "Quote failed", "Unable to get quote, please retry");
        return;
      }
      setActionError("");
      // viewport reset is handled post-transition by the page's currentStep effect
      nextStep();
      return;
    }
    if (currentStep === 2) {
      if (!allConfigured) {
        // Continue acts as the wizard's Next button: step one service
        // forward in order until the last service, then jump to whatever
        // is still unscheduled — never just block with an error.
        const from = configuringItemIndex ?? 0;
        setActionError("");
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
      setActionError("");
      if (!isAuthenticated) {
        setAuthGateOpen(true);
        return;
      }
      // viewport reset is handled post-transition by the page's currentStep effect
      nextStep();
      return;
    }
    // legacy step 3 (DateTime) kept for migrated users — treat as step 2
    if (currentStep === 3 && !allConfigured) {
      // if somehow still on old step 3 without allConfigured, delegate to step 2 logic
      if (!allConfigured) {
        showToast("error", "Schedule required", "Please schedule all services");
        setActionError("Please schedule all services");
        return;
      }
    }
    if (currentStep === 3) {
      const missing = getMissingStep4();
      if (missing.length) {
        const label = missing.join(", ");
        showToast("error", "Complete your details", `Missing: ${label}`);
        setActionError(`Missing: ${label}`);
        return;
      }
      if (isQuoteLoading) {
        showToast("error", "Please wait", "Calculating quote...");
        return;
      }
      if (isQuoteError || !quote) {
        showToast(
          "error",
          "Quote required",
          "Unable to validate deposit without quote",
        );
        return;
      }
      if (depositError) {
        showToast("error", "Invalid deposit", depositError);
        setDepositTouched(true);
        return;
      }
      setActionError("");
      onConfirm?.();
    }
  };

  // Auto-scroll after quote is fetched and rendered (not on service select)
  useEffect(() => {
    if (isQuoteLoading || !quote || cart.length === 0) return;

    // Build stable key for quote + cart identity to avoid duplicate scrolls
    const key = JSON.stringify({
      total: quote.total_amount,
      deposit: quote.deposit_amount,
      currency: quote.currency,
      subtotal: quote.subtotal,
      len: cart.length,
      ids: cart.map((c) => c.service_id).sort((a, b) => a - b),
    });

    if (prevQuoteKeyRef.current === key) return;
    prevQuoteKeyRef.current = key;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Double rAF ensures quote summary DOM + framer-motion paint before scrolling
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
        // Fallback: ensure servicesEnd anchor is at bottom of scroll container
        servicesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    });

    const timeoutId = window.setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, 220);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timeoutId);
    };
  }, [quote, isQuoteLoading, cart.length, cart]);

  // Reset quote key when cart empties so next add will scroll again
  useEffect(() => {
    if (cart.length === 0) prevQuoteKeyRef.current = null;
  }, [cart.length]);

  // Entering Confirm & Pay: bring the payment card's deposit input into
  // view (the input only renders at step 3, at the bottom of the card).
  const prevStepScrollRef = useRef(currentStep);
  useEffect(() => {
    const enteredConfirm =
      prevStepScrollRef.current !== currentStep && currentStep === 3;
    prevStepScrollRef.current = currentStep;
    if (!enteredConfirm) return;

    const scrollPaymentIntoView = () => {
      const container = scrollContainerRef.current;
      if (isPage || !container) {
        const lenis = (
          window as unknown as { lenis?: { scrollTo: (to: number) => void } }
        ).lenis;
        if (lenis?.scrollTo) lenis.scrollTo(document.body.scrollHeight);
        else
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        return;
      }
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    };

    // double rAF so the step-3 deposit block is painted before measuring
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollPaymentIntoView);
    });
    const timeoutId = window.setTimeout(scrollPaymentIntoView, 260);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timeoutId);
    };
  }, [currentStep, isPage]);

  return (
    <aside
      data-lenis-prevent
      className={cn(
        "bg-white",
        isPage
          ? "min-h-screen rounded-none shadow-none"
          : "rounded-2xl shadow-xl w-full lg:flex lg:flex-col lg:overflow-hidden lg:max-h-[calc(100vh-150px)] lg:h-auto pr-3 pl-1!",
      )}>
      {isPage && onBack ? (
        <div className='px-1 pb-4'>
          <button
            type='button'
            onClick={onBack}
            className='flex items-center gap-2 font-plus-jakarta-sans text-[11px] uppercase tracking-[0.18em] text-[#483630] transition hover:text-[#a57865]'>
            <ArrowLeft size={15} /> Back to details
          </button>
        </div>
      ) : null}

      <div className='border-b border-[#c9a96e2e] p-0 lg:p-4 shrink-0'>
        <div className='flex items-stretch gap-3.5'>
          <div className='relative shrink-0'>
            <img
              src='/banners/version-1.png'
              alt='Veebeez Hair Salon'
              className='h-28 w-24 rounded-2xl object-cover object-right shadow-sm sm:h-24 sm:w-28'
            />
            {/* <span className='absolute -bottom-1.5 -right-1.5 rounded-full bg-[#a57865] px-2 py-0.5 font-dm-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-[#c9a96e] shadow'>
              Salon
            </span> */}
          </div>

          <div className='flex min-w-0 flex-1 flex-col justify-center'>
            <h2 className='font-medium font-cooper  text-[19px] text-[#483630]'>
              The Valerie Brand
            </h2>
            {/* <p className='mt-0.5 font-dm-sans text-sm italic text-[#a78a6f]'>
              Glowing through you
            </p> */}

            <div className='mt-3 flex flex-col gap-1.5'>
              <div className='flex items-center gap-2'>
                {/* <span className='flex size-[26px] w-[30px] shrink-0 items-center justify-center rounded-md bg-[#EEDED3]'>
                  <Clock size={13} className='text-[#a78a6f]' />
                </span> */}
                <p className='font-plus-jakarta-sans text-[12px] text-[#483630]'>
                  <span className='font-semibold'>Opens</span> 9AM&ndash;7PM
                  &middot; Mon&ndash;Sat
                </p>
              </div>

              <div className='flex items-start gap-2'>
                {/* <span className='flex size-[26px] w-[30px] shrink-0 items-center justify-center rounded-md'> */}
                <MapPin size={20} className='text-[#a78a6f]' />
                {/* </span> */}
                <h2 className='font-plus-jakarta-sans text-[13px] leading-[1.15] tracking-wide text-[#483630]'>
                  Dulux paints Admiralty-Lekki, Fola Osibo Road, Lagos, Nigeria
                </h2>
              </div>

              <div className='flex items-center gap-2'>
                <FiInstagram size={20} className='shrink-0 text-[#a78a6f]' />
                <a
                  href={BUSINESS.instagram}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-plus-jakarta-sans text-[13px] font-medium tracking-wide text-[#a57865] underline underline-offset-2 hover:text-[#8e6655]'>
                  {BUSINESS.instagramHandle}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className='flex flex-col gap-5 lg:pr-4 lg:pl-5 px-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto'>
        {selectedCollectionSlug ? (
          <SkeletonReveal
            loading={collectionLoading}
            skeleton={<Skeleton className='w-full h-52 rounded-2xl' />}
            minHeight={208}>
            <CollectionBlock
              collection={collection ?? null}
              stylistLabel={stylistLabel}
              stylistInitials={stylistInitials}
              hasStylistSelection={hasStylistSelection}
              isNoPreference={isNoPreference}
            />
          </SkeletonReveal>
        ) : (
          <CollectionBlock
            collection={null}
            stylistLabel={stylistLabel}
            stylistInitials={stylistInitials}
            hasStylistSelection={hasStylistSelection}
            isNoPreference={isNoPreference}
          />
        )}

        <Divider />

        {cart.length > 0 && (
          <div>
            <SectionLabel label='Schedule' />
            <div className='mt-2 space-y-1.5'>
              {cart.map((item) => {
                const isConf = !!item.scheduled_at;
                const st = item.stylist_id !== null ? stylists.find((s) => s.stylist_id === item.stylist_id) : null;
                const stylistName = item.stylist_id === null ? "Any Professional" : (st?.display_name ?? `Stylist #${item.stylist_id}`);
                let timeLabel: string | null = null;
                if (isConf && item.scheduled_at) {
                  try {
                    const d = new Date(item.scheduled_at.replace(" ", "T"));
                    timeLabel = `${new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" }).format(d)} · ${new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;
                  } catch {
                    timeLabel = item.scheduled_at;
                  }
                }
                return (
                  <div key={item.service_id} className='flex items-center justify-between rounded-lg border border-[#f3ece3] bg-[#fdfaf5] px-3 py-2'>
                    <span className='font-plus-jakarta-sans text-xs font-medium text-[#483630] truncate'>{item.service_name}</span>
                    <span className={isConf ? "font-plus-jakarta-sans text-xs font-medium text-[#2f6b47] truncate" : "font-plus-jakarta-sans text-xs italic text-[#a78a6f]"}>
                      {isConf ? `${stylistName} · ${timeLabel}` : "Not scheduled"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <SectionLabel label='Selected Services' />
            {cart.length > 0 && (
              <button
                type='button'
                onClick={() => {
                  clearCart();
                  // Store already resets currentStep to 1; ensure UI reflects it
                  // setStep is guarded to only go backwards — 1 <= currentStep always holds here
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label='Clear all selected services'
                title='Clear all services'
                className='inline-flex items-center gap-1.5 rounded-full border border-[#e8ddd0] bg-white px-3 py-1.5 font-plus-jakarta-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a6a5a] transition hover:border-[#9f2d20]/30 hover:bg-[#fef2f2] hover:text-[#9f2d20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f2d20]/20'>
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>

          <AnimatePresence mode='popLayout' initial={false}>
            {cart.length ? (
              <motion.div
                key='cart-populated'
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className='overflow-hidden'>
                <motion.div layout className='space-y-3'>
                  <AnimatePresence initial={false}>
                    {cart.map((item, idx) => {
                      const extra = item.answers.reduce(
                        (s, a) => s + (a.extra_cost ?? 0),
                        0,
                      );
                      const isConf = !!item.scheduled_at;
                      const st = item.stylist_id !== null ? stylists.find((s) => s.stylist_id === item.stylist_id) : null;
                      const stylistName = item.stylist_id === null ? "Any Professional" : (st?.display_name ?? `Stylist #${item.stylist_id}`);
                      let schedLabel: string | null = null;
                      if (isConf && item.scheduled_at) {
                        try {
                          const d = new Date(item.scheduled_at.replace(" ", "T"));
                          schedLabel = `${new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" }).format(d)} · ${new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;
                        } catch {
                          schedLabel = item.scheduled_at;
                        }
                      }
                      return (
                        <motion.div
                          key={item.service_id}
                          layout
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{
                            duration: 0.38,
                            ease: [0.22, 1, 0.36, 1],
                            delay: idx * 0.04,
                          }}
                          className='relative rounded-lg border border-[#c9a96e2e] bg-[#c9a96e2e]/40 p-3 pr-5'>
                          <div className='mt-1 flex items-start justify-between gap-3'>
                            <div>
                              <h3 className='font-plus-jakarta-sans font-medium text-[15px] text-[#483630]'>
                                {item.service_name}
                              </h3>
                              <p className='mt-1 font-good-sans text-xs text-[#555]'>
                                {formatDuration(item.duration_minutes)}
                              </p>
                              {item.answers.length ? (
                                <div className='mt-2 space-y-1'>
                                  {item.answers.map((answer) => (
                                    <p
                                      key={answer.option_id}
                                      className='font-commons-pro text-[11px] text-[#2d8a4f]'>
                                      {answer.label}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              {isConf ? (
                                <p className='mt-2 font-plus-jakarta-sans text-xs font-medium text-[#2f6b47]'>
                                  {stylistName} · {schedLabel}
                                </p>
                              ) : (
                                <p className='mt-2 font-plus-jakarta-sans text-xs italic text-[#a06b12]'>
                                  Not scheduled
                                </p>
                              )}
                            </div>
                            <div className='shrink-0 text-right font-inter font-semibold tracking-tighter text-base text-[#483630]'>
                              {formatCurrency(Number(item.unit_price))}
                              {extra ? (
                                <span className='mt-1 block font-good-sans text-[12px] text-[#2d8a4f] tracking-normal'>
                                  +{extra}{" "}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key='cart-empty'
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className='overflow-hidden hidden'>
                <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-[#fdf9f5] px-4 py-8 text-center'>
                  <div className='mx-auto flex size-10 items-center justify-center rounded-full bg-white shadow-sm'>
                    <ShoppingBag size={18} className='text-[#a78a6f]' />
                  </div>
                  <p className='mt-3 font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
                    No services selected
                  </p>
                  <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    Pick a service to get started
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div ref={servicesEndRef} />

        {/* Quote Summary */}
        {cart.length > 0 ? (
          <div className='rounded-2xl border border-[#e8ddd0] bg-[#fdfaf5] p-4 space-y-3'>
            <SectionLabel label='Quote Summary' />
            {isQuoteLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            ) : isQuoteError ? (
              <ErrorState
                variant='inline'
                tone='quote'
                title='Quote failed'
                error={quoteError}
                message='We could not calculate the price. Please try again.'
                onRetry={() => refetchQuote()}
                retryLabel={isQuoteFetching ? "Retrying..." : "Try again"}
              />
            ) : quote ? (
              <>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs uppercase tracking-[0.08em] text-[#8a6a5a]'>
                      Currency
                    </span>
                    <span className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                      {quote.currency}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Subtotal
                    </span>
                    <span className='font-sans text-sm text-[#483630]'>
                      {formatCurrency(Number(quote.subtotal))}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Tax
                    </span>
                    <span className='font-sans text-sm text-[#483630]'>
                      {formatCurrency(Number(quote.tax_amount ?? 0))}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Extra
                    </span>
                    <span className='font-sans text-sm font-medium text-[#2d8a4f]'>
                      +{formatCurrency(Number(quote.extra_amount))}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2 border-t border-[#e8ddd0] pt-2 mt-1'>
                    <span className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                      Total
                    </span>
                    <span className='font-sans text-base font-bold text-[#483630]'>
                      {formatCurrency(Number(quote.total_amount))}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Duration
                    </span>
                    <span className='font-plus-jakarta-sans text-sm text-[#483630]'>
                      {formatDuration(quote.duration_minutes)}
                    </span>
                  </div>
                  <div className='flex justify-between col-span-2'>
                    <span className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Min Deposit
                    </span>
                    <span className='font-sans text-sm font-semibold text-[#a57865]'>
                      {formatCurrency(depositMin)}
                    </span>
                  </div>
                </div>

                {currentStep === 3 ? (
                  <>
                    <Divider />

                    <div>
                      <label className='mb-1.5 block font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                        Deposit Amount <span className='text-[#9f2d20]'>*</span>
                      </label>
                      <PriceInput
                        value={depositInput}
                        disabled={!canEditDeposit}
                        onValueChange={(val) => {
                          if (!canEditDeposit) return;
                          setDepositInput(val);
                          setDepositTouched(true);
                        }}
                        onBlur={() => {
                          if (!canEditDeposit) return;
                          setDepositTouched(true);
                        }}
                        placeholder={String(depositMin)}
                        prefix='₦'
                        className={cn(
                          "w-full rounded-xl border bg-white px-3 py-2.5 font-sans text-base! text-[#483630] outline-none! placeholder:text-[#b89a85]/60 ring-0! h-auto shadow-none disabled:cursor-not-allowed disabled:bg-[#f3ece3]/60 disabled:text-[#8a6a5a]",
                          depositError && depositTouched
                            ? "border-[#9f2d20]"
                            : "border-[#e8ddd0]",
                        )}
                        aria-invalid={!!(depositError && depositTouched)}
                      />
                      <p className='mt-1.5 font-sans text-[11px] text-[#8a6a5a]'>
                        Minimum deposit:{" "}
                        {formatCurrency(depositMin)} • Total:{" "}
                        {formatCurrency(Number(quote.total_amount))}
                      </p>
                      {depositError && depositTouched ? (
                        <p className='mt-1 font-plus-jakarta-sans text-[11px] font-medium text-[#9f2d20]'>
                          {depositError}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {/* <Divider /> */}
      </div>

      <div className='px-4 py-3 shrink-0 border-t border-[#a57865]/10 lg:border-t-0'>
        <div className='flex items-baseline justify-between'>
          <p className='font-dm-sans text-[10px] uppercase tracking-[0.1em] font-medium text-[#666666]'>
            {quote ? "Total" : "Total"}
          </p>
          <p className='font-sans font-semibold tracking-tight text-xl text-[#483630]'>
            {cart.length ? formatCurrency(Number(displayTotal)) : "-"}
          </p>
        </div>
        {cart.length && quote ? (
          <p className='mt-1 text-right font-plus-jakarta-sans text-xs font-medium text-[#666666]'>
            {formatDuration(quote.duration_minutes)} total
          </p>
        ) : cart.length ? (
          <p className='mt-1 text-right font-plus-jakarta-sans text-xs text-[#666666]'>
            {formatDuration(totals.totalDurationMinutes)} total
          </p>
        ) : null}
        {isQuoteLoading && cart.length ? (
          <p className='mt-1 text-right font-plus-jakarta-sans text-[11px] text-[#8a6a5a] animate-pulse'>
            Updating quote...
          </p>
        ) : null}
      </div>

      {/* Unified lg Continue — stepper (hidden on mobile, MobileBookingActionBar handles lg:hidden) */}
      {!isPage ? (
        <div className='hidden lg:block shrink-0 border-t border-[#a57865]/15 bg-white px-4 py-4'>
          {currentStep === 1 ? (
            <>
              <button
                type='button'
                onClick={handleSidebarContinue}
                className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-base font-semibold text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#8e6655] active:scale-[0.97] disabled:opacity-70'>
                Continue
                <img
                  src='/icons/right-arrow.svg'
                  alt='Continue to the next booking step'
                  className='size-4 invert'
                />
              </button>
              <p className='mt-2 text-center font-plus-jakarta-sans text-[11px] text-[#8a6a5a]'>
                {cart.length === 0
                  ? "Select at least one service"
                  : `${cart.length} ${cart.length === 1 ? "service" : "services"} • ${formatDuration(totals.totalDurationMinutes)}`}
              </p>
            </>
          ) : currentStep === 2 ? (
            <>
              <button
                type='button'
                onClick={handleSidebarContinue}
                disabled={!allConfigured}
                className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-base font-semibold text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#8e6655] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'>
                Continue
                <img
                  src='/icons/right-arrow.svg'
                  alt='Continue to the next booking step'
                  className='size-4 invert'
                />
              </button>
              <p className='mt-2 text-center font-plus-jakarta-sans text-[11px] text-[#8a6a5a]'>
                {!allConfigured
                  ? `${configuredCount}/${cart.length} scheduled — tap Services & Schedule to choose times`
                  : stylistLabel
                    ? `${stylistLabel} · ${configuredCount}/${cart.length} scheduled`
                    : "All services scheduled"}
              </p>
            </>
          ) : currentStep === 3 ? (
            <>
              <button
                type='button'
                onClick={handleSidebarContinue}
                disabled={
                  isConfirming || isQuoteLoading || !!depositError || !quote
                }
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#8e6655] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70'>
                {isConfirming ? (
                  <>
                    <Loader2 size={16} className='animate-spin' /> Booking...
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </button>
              {depositError && depositTouched ? (
                <p className='mt-2 text-center font-sans text-xs font-medium text-[#9f2d20]'>
                  {depositError}
                </p>
              ) : isQuoteLoading ? (
                <p className='mt-2 text-center font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                  Calculating quote...
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {showFinalAction ? (
        <div className='sticky bottom-0 border-t border-[#a57865]/15 bg-[#FAF7F3]/95 px-6 py-4 backdrop-blur-xl lg:hidden'>
          <button
            type='button'
            onClick={onConfirm}
            disabled={
              isConfirming || isQuoteLoading || !!depositError || !quote
            }
            className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-[#8e6655] active:scale-[0.97] disabled:opacity-70'>
            {isConfirming ? (
              <>
                <Loader2 size={16} className='animate-spin' /> Booking...
              </>
            ) : (
              "Confirm & Pay"
            )}
          </button>
          {depositError && depositTouched ? (
            <p className='mt-2 text-center font-sans text-xs font-medium text-[#9f2d20]'>
              {depositError}
            </p>
          ) : null}
        </div>
      ) : null}
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
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className='flex items-center gap-2 font-plus-jakarta-sans text-[12px] uppercase tracking-wider text-primary font-bold'>
      {label}
    </p>
  );
}

function SummaryBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <SectionLabel label={label} />
      <p className='font-commons-pro text-[15px] text-[#4a3429]'>
        {value ?? (
          <span className='font-dm-sans text-sm italic text-[#999999]'>
            Not selected
          </span>
        )}
      </p>
    </div>
  );
}

function CollectionBlock({
  collection,
  stylistLabel,
  stylistInitials,
  hasStylistSelection,
  isNoPreference,
}: {
  collection: Collection | null | undefined;
  stylistLabel: string | null;
  stylistInitials: string;
  hasStylistSelection: boolean;
  isNoPreference: boolean;
}) {
  return (
    <>
      {!collection ? (
        <div className='w-full h-52 rounded-2xl border hidden border-dashed border-[#e8ddd0] bg-[#fdf9f5] flex flex-col items-center justify-center gap-2 p-6 text-center'>
          <ShoppingBag size={22} className='text-[#c9a96e]' />
          <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
            No collection selected
          </p>
          <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
            Choose a collection to preview it here
          </p>
        </div>
      ) : (
        <div className='h-52 w-full rounded-2xl flex flex-col justify-between p-6 items-start relative overflow-hidden'>
          {(() => {
            const cImg = getOptimizedImageUrl(
              collection.image_url,
              "/imgs/image-4.webp",
            );
            return (
              <Image
                src={cImg}
                alt={`${collection.name} collection at Veebeez, Lekki`}
                fill
                sizes='400px'
                style={{ objectFit: "cover", objectPosition: "50% 30%" }}
                className='absolute inset-0 -z-10'
                unoptimized={shouldUnoptimize(cImg)}
              />
            );
          })()}
          <div
            className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-black/10 -z-10'
            aria-hidden='true'
          />
          {!hasStylistSelection ? (
            <div className='size-14 rounded-full flex bg-white/20 backdrop-blur-sm justify-center items-center overflow-hidden self-end border border-white/20'>
              <ShoppingBag size={18} className='text-white/70' />
            </div>
          ) : isNoPreference ? (
            <div className='size-14 rounded-full flex bg-[#2a2420] justify-center items-center overflow-hidden self-end'>
              <RxShuffle className='text-white text-xl' />
            </div>
          ) : (
            <div className='size-14 rounded-full flex bg-white justify-center items-center overflow-hidden self-end'>
              <p className='font-dm-sans text-lg font-semibold text-[#4a3429]'>
                {stylistInitials}
              </p>
            </div>
          )}

          <div className='flex flex-col gap-2.5'>
            {/* <div className='flex items-center gap-2'>
              <span className='size-1.5 shrink-0 rounded-full bg-[#c9a96e]' />
              <p className='font-dm-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80'>
                Collection
              </p>
              <span className='h-px w-6 bg-white/20' />
              <p className='font-dm-sans text-[10px] tracking-wide text-white/60'>
                {collection.category_count ??
                  collection.categories?.length ??
                  0}{" "}
                categories • {collection.service_count ?? 0} services
              </p>
            </div> */}

            <h3 className='font-cooper text-[22px] font-normal leading-none tracking-tight text-white'>
              {collection.name}
            </h3>

            {stylistLabel ? (
              <div className='inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-md w-fit'>
                <span className='flex size-5 items-center justify-center rounded-full bg-white/90'>
                  {isNoPreference ? (
                    <RxShuffle className='size-3 text-[#4a3429]' />
                  ) : (
                    <span className='font-dm-sans text-[10px] font-bold leading-none text-[#4a3429]'>
                      {stylistInitials}
                    </span>
                  )}
                </span>
                <p className='font-dm-sans text-[11px] font-medium tracking-wide text-white'>
                  {stylistLabel}
                </p>
                {/* <span className='size-1 rounded-full bg-[#c9a96e]' />
                <p className='font-dm-sans text-[10px] uppercase tracking-wide text-white/70'>
                  Stylist
                </p> */}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function Divider() {
  return <div className='h-px bg-[#c9a96e2e]' />;
}
