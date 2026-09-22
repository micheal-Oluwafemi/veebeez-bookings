"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useBookingStore } from "@/store/useBookingStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import {
  bookingQueryKeys,
  getCollectionsQueryOptions,
} from "@/services/booking-catalog-requests";
import { placeBooking } from "@/services/booking-requests";
import AuthGate from "@/components/auth/AuthGate";
import CartPanel from "@/components/cart/CartPanel";
import Step1Services from "@/components/steps/Step1Services";
import Step2ConfigureServices from "@/components/steps/Step2ConfigureServices";
import Step4Details from "@/components/steps/Step4Details";
import BookingBreadcrumbs from "@/components/navigation/BookingBreadcrumbs";
import BookingBackButton from "@/components/navigation/BookingBackButton";
import MobileBookingActionBar from "@/components/MobileBookingActionBar";
import { showToast } from "@/components/toast/app-toast";
import { useQuote } from "@/hooks/useQuote";
import { getEffectiveDepositMin } from "@/lib/booking/deposit";
import { ApiError } from "@/lib/https";
import { HomeButton } from "@/components/home-button";
import type { Collection } from "@/types/booking";
import { isItemConfigured } from "@/types/booking";

// ---- helpers for robust collection param -> slug/name matching ----
function slugifyAnd(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function slugifyRaw(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function alphaNum(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findMatchingCollection(
  collections: Collection[],
  param: string,
): Collection | undefined {
  const pTrim = param.trim();
  if (!pTrim) return undefined;
  const pLower = pTrim.toLowerCase();
  const pSlugAnd = slugifyAnd(pTrim);
  const pSlugRaw = slugifyRaw(pTrim);
  const pAlpha = alphaNum(pTrim);
  const pAlphaAnd = alphaNum(pTrim.replace(/&/g, "and"));

  // 1. exact slug (case-insensitive)
  let m = collections.find((c) => c.slug.toLowerCase() === pLower);
  if (m) return m;
  // 2. exact name
  m = collections.find((c) => c.name.toLowerCase() === pLower);
  if (m) return m;
  // 3. slugifyAnd equality (covers "Washing & Texturizing" -> "washing-and-texturizing")
  m = collections.find(
    (c) => slugifyAnd(c.slug) === pSlugAnd || slugifyAnd(c.name) === pSlugAnd,
  );
  if (m) return m;
  // 4. slugifyRaw equality (covers "washing-texturizing" style slugs)
  m = collections.find(
    (c) => slugifyRaw(c.slug) === pSlugRaw || slugifyRaw(c.name) === pSlugRaw,
  );
  if (m) return m;
  // 5. cross: slugifyAnd(collection) vs raw param (when slug omits "and")
  m = collections.find(
    (c) => slugifyAnd(c.slug) === pSlugRaw || slugifyAnd(c.name) === pSlugRaw,
  );
  if (m) return m;
  m = collections.find(
    (c) => slugifyRaw(c.slug) === pSlugAnd || slugifyRaw(c.name) === pSlugAnd,
  );
  if (m) return m;
  // 6. alphanumeric-only (most permissive: "Washing & Texturizing" <-> "washing-texturizing")
  m = collections.find(
    (c) => alphaNum(c.slug) === pAlpha || alphaNum(c.name) === pAlpha,
  );
  if (m) return m;
  m = collections.find(
    (c) => alphaNum(c.slug) === pAlphaAnd || alphaNum(c.name) === pAlphaAnd,
  );
  if (m) return m;
  // 7. fallback: contains (handles partial)
  m = collections.find(
    (c) =>
      slugifyAnd(c.name).includes(pSlugAnd) ||
      pSlugAnd.includes(slugifyAnd(c.name)) ||
      slugifyRaw(c.name).includes(pSlugRaw) ||
      pSlugRaw.includes(slugifyRaw(c.name)),
  );
  if (m) return m;
  return undefined;
}

/**
 * Reads ?collection=... from URL, selects the matching collection and
 * navigates to Step 1 exactly once (idempotent guard).
 * Must be rendered inside <Suspense> because it uses useSearchParams().
 */
function CollectionParamSync() {
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("collection");
  // useSearchParams already decodes, but handle double-encoding defensively
  let collectionParam: string | null = null;
  if (rawParam) {
    try {
      collectionParam = decodeURIComponent(rawParam).trim();
    } catch {
      collectionParam = rawParam.trim();
    }
    if (collectionParam === "") collectionParam = null;
  }

  const { data } = useQuery(getCollectionsQueryOptions());
  const collections = (data as Collection[] | undefined) ?? [];
  // idempotency guard keyed by param value — satisfies Requirement 3:
  // does not reset to Step 1 on every step navigation while ?collection= stays in URL,
  // but will re-run if user lands with a *different* collection value.
  const handledParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!collectionParam) return;
    if (handledParamRef.current === collectionParam) return;
    if (!collections.length) return;

    const matched = findMatchingCollection(collections, collectionParam);
    // mark handled regardless of match to prevent infinite retry loops for this param
    handledParamRef.current = collectionParam;

    if (!matched) return;

    // read fresh state via getState() to avoid effect re-trigger on step changes
    const state = useBookingStore.getState();
    if (state.selectedCollectionSlug !== matched.slug) {
      // setCollectionSlug switches the browsed collection (cart is kept)
      // and forces currentStep=1
      state.setCollectionSlug(matched.slug);
    } else if (state.currentStep !== 1) {
      // already on correct collection but not on step 1 (e.g. persisted step 3) -> go to 1
      state.setStep(1);
    }
  }, [collectionParam, collections]);

  return null;
}

export default function page() {
  const currentStep = useBookingStore((state) => state.currentStep);
  const cart = useBookingStore((state) => state.cart);
  const nextStep = useBookingStore((state) => state.nextStep);
  const guestDetails = useBookingStore((state) => state.guestDetails);
  const depositInput = useBookingStore((state) => state.depositInput);
  const setConfirmation = useBookingStore((state) => state.setConfirmation);
  const token = useCustomerAuthStore((s) => s.token);
  const user = useCustomerAuthStore((s) => s.user);
  const isAuthenticated = !!token && !!user;
  const setStep = useBookingStore((s) => s.setStep);
  const isMobileQuery = useMediaQuery({ query: "(max-width: 767px)" });
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const isMobile = hasMounted ? isMobileQuery : false;
  const [showCartReview, setShowCartReview] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: quote } = useQuote();

  // Auth gate is triggered by CartPanel/Mobile when attempting Step2→3 while unauthenticated; no auto-reopen for guest (transient)

  // Guarantee the viewport resets to the top on every step transition.
  // Scrolling *before* nextStep()/setStep() is unreliable: the new step's
  // content renders after the scroll starts, and Lenis can cancel raw
  // window.scrollTo calls — so the page sometimes lands mid-step. Waiting
  // for paint and going through Lenis (instant, not smooth) fixes that.
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const lenis = (
          window as unknown as {
            lenis?: {
              scrollTo: (to: number, options?: { immediate?: boolean }) => void;
            };
          }
        ).lenis;
        if (lenis?.scrollTo) lenis.scrollTo(0, { immediate: true });
        else window.scrollTo({ top: 0, behavior: "auto" });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [currentStep]);

  const showMobileReview = isMobile && showCartReview && currentStep === 3;
  // Only show mobile bar after a service is selected (cart not empty)
  const showMobileActionBar =
    isMobile &&
    !showMobileReview &&
    cart.length > 0 &&
    (currentStep === 1 || currentStep === 2 || currentStep === 3);

  const handleMobileContinue = () => {
    if (currentStep === 3) {
      handleReviewConfirm();
      return;
    }
    // viewport reset is handled by the currentStep effect (post-transition)
    nextStep();
  };

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Cart is empty");
      if (!cart.every(isItemConfigured)) {
        const un = cart.filter((i) => !i.scheduled_at).map((i) => i.service_name);
        throw new Error(`Please schedule: ${un.join(", ")}`);
      }
      if (!quote)
        throw new Error("Quote not available. Please select services again.");
      // deposit_amount: 0 means no partial deposit — full payment is the minimum
      const depositMin = getEffectiveDepositMin(quote);
      if (depositInput == null) {
        throw new Error(
          `Enter a deposit of at least ₦${depositMin.toLocaleString("en-NG")}`,
        );
      }
      const amountToPay = depositInput;
      if (amountToPay < depositMin) {
        throw new Error(
          `Deposit must be at least ₦${depositMin.toLocaleString("en-NG")}`,
        );
      }
      // Per-service scheduling: each item carries its own stylist_id (null = any) and scheduled_at (required).
      // No top-level stylist_id/scheduled_at — those would 422.
      const whatsapp_number = (
        guestDetails.whatsappNumber ||
        guestDetails.phone ||
        ""
      ).trim();
      // Build payload with strict per-item shape; omit undefined optional keys so JSON.stringify drops them.
      const payload: import("@/types/booking").BookingPayload = {
        items: cart.map((c) => ({
          service_id: c.service_id,
          quantity: c.quantity ?? 1,
          answers: c.answers.map((a) => ({ option_id: a.option_id })),
          stylist_id: c.stylist_id, // null is valid ("any"), not undefined
          scheduled_at: c.scheduled_at!, // guaranteed non-null by allConfigured gate above
        })),
        currency: quote.currency ?? cart[0]?.currency ?? "NGN",
        ...(whatsapp_number ? { whatsapp_number } : {}),
        ...(guestDetails.specialRequests ? { notes: guestDetails.specialRequests } : {}),
        ...(amountToPay !== undefined && amountToPay !== null ? { amount: amountToPay } : {}),
        ...(!token
          ? {
              guest_email: guestDetails.email || undefined,
              guest_first_name: guestDetails.firstName || undefined,
              guest_last_name: guestDetails.lastName || undefined,
              guest_phone: guestDetails.phone || undefined,
            }
          : {}),
      };
      // Safety: ensure no top-level scheduling fields leak (would 422). If any previous code added them, delete.
      // JSON.stringify drops undefined, but we explicitly delete to be safe.
      delete (payload as unknown as Record<string, unknown>).scheduled_at;
      delete (payload as unknown as Record<string, unknown>).stylist_id;
      // Verify payload has no top-level scheduling keys before sending (dev check)
      if ("scheduled_at" in (payload as unknown as Record<string, unknown>) || "stylist_id" in (payload as unknown as Record<string, unknown>)) {
        // should never happen — indicates a bug where deprecated fields were re-added
        const p = payload as unknown as Record<string, unknown>;
        if (p.scheduled_at !== undefined || p.stylist_id !== undefined) {
          throw new Error("Payload contains forbidden top-level scheduling fields");
        }
      }
      return (await placeBooking(payload)) as unknown as {
        data: {
          appointment_number: string;
          payment_link?: string;
          checkout_url?: string;
          services?: unknown[];
          [k: string]: unknown;
        };
        payment_link?: string;
        checkout_url?: string;
      };
    },
    onSuccess: (res) => {
      const wrapper = res as unknown as {
        data?: Record<string, unknown>;
        payment_link?: string;
        checkout_url?: string;
      };
      const data = wrapper?.data as (import("@/types/booking").Booking & Record<string, unknown>) | undefined;
      // Phase 5 setup: pass full booking object through (services[] carries per-service stylist/scheduled_at), not flattened globals
      if (data && data.appointment_id) {
        try {
          setConfirmation(data as import("@/types/booking").Booking);
        } catch {}
      }
      const checkoutUrl =
        (data?.checkout_url as string | undefined) ??
        (data?.payment_link as string | undefined) ??
        (wrapper.checkout_url as string | undefined) ??
        (wrapper.payment_link as string | undefined);

      queryClient.invalidateQueries({
        queryKey:
          bookingQueryKeys.myBookings() as unknown as readonly unknown[],
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      // Fallback: if backend didn't return a payment link, still try to go to confirmation with appointment_number
      const fallbackRef =
        (data?.appointment_number as string | undefined) ??
        ((wrapper as unknown as Record<string, unknown>).appointment_number as
          | string
          | undefined);
      if (fallbackRef) {
        window.location.href = `/booking-confirmation?tx_ref=${encodeURIComponent(fallbackRef)}`;
        return;
      }
      showToast(
        "error",
        "Booking created",
        "No payment link returned. Check My Bookings.",
      );
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create booking";
      showToast("error", "Booking failed", msg);
    },
  });

  const handleReviewConfirm = () => {
    reviewMutation.mutate();
  };

  return (
    <section className='bg-[#FAF7F3]'>
      {/* SEO: Single H1 for the booking page — targets "hair salon Lekki", "Fola Osibo" */}
      <h1 className='sr-only'>
        Book Hair, Wig Styling & Installation, Nails, Pedicure & Lash Services at Veebeez — The Valerie Brand, Fola
        Osibo Street, Lekki Phase 1, Lagos
      </h1>
      {/* URL -> collection auto-select, idempotent (see CollectionParamSync) */}
      <Suspense fallback={null}>
        <CollectionParamSync />
      </Suspense>

      <AuthGate
        open={authGateOpen}
        onOpenChange={(o) => {
          setAuthGateOpen(o);
          if (!o && currentStep === 3 && !isAuthenticated) {
            setStep(2);
          }
        }}
        onGuestContinue={() => {
          setAuthGateOpen(false);
          setTimeout(() => {
            if (useBookingStore.getState().currentStep === 3) {
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            if (useBookingStore.getState().currentStep === 2) {
              // step transition scrolls via the currentStep effect
              useBookingStore.getState().nextStep();
            }
          }, 250);
        }}
      />

      <div className='relative z-[2] grid block-spacing lg:grid-cols-[minmax(0,1fr)_450px]'>
        <div
          className={cn(
            "relative md:pt-5 pb-10 sm:px-8 lg:pl-14 lg:pr-7",
            showMobileActionBar && "pb-28",
          )}>
          {/* <div className='pointer-events-none absolute bottom-[-50px] right-[-30px] select-none font-good-sans text-[22vw] italic leading-none text-[#c9a96e08]'>
            Veebeez
          </div> */}
          {/* <HomeButton label='Go Back' /> */}

          <div className='relative mt-5'>
            {!showMobileReview && (
              <>
                <BookingBackButton />
                <BookingBreadcrumbs />
              </>
            )}

            {showMobileReview ? (
              <CartPanel
                variant='page'
                onBack={() => setShowCartReview(false)}
                onConfirm={handleReviewConfirm}
                showFinalAction
                isConfirming={reviewMutation.isPending}
              />
            ) : (
              <>
                {currentStep === 1 ? <Step1Services /> : null}
                {currentStep === 2 ? <Step2ConfigureServices /> : null}
                {currentStep === 3 ? (
                  <Step4Details
                    reviewBeforeConfirm={isMobile}
                    onReviewCart={() => setShowCartReview(true)}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className='hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:items-center lg:py-6'>
          <div className='w-full'>
            <CartPanel
              onConfirm={handleReviewConfirm}
              isConfirming={reviewMutation.isPending}
            />
          </div>
        </div>
      </div>

      <MobileBookingActionBar
        visible={showMobileActionBar}
        onContinue={handleMobileContinue}
        isConfirming={reviewMutation.isPending}
      />
    </section>
  );
}
