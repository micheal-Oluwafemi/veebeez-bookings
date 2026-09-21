"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Mail,
  ArrowRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/booking/format";
import { ApiError } from "@/lib/https";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { Lottie } from "lottie-react";
import bookingAnimation from "@/public/booking.json";
import {
  getBookingByAppointmentNumberQueryOptions,
  getSearchBookingsQueryOptions,
} from "@/services/booking-requests";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import BookingDetailsContent from "@/components/bookings/BookingDetailsContent";
import type { BookingDetail } from "@/types/booking";

function normalizeStatus(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_");
}
function formatStatusLabel(s: string) {
  return normalizeStatus(s)
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function statusBadgeClasses(s: string) {
  switch (normalizeStatus(s)) {
    case "confirmed":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "pending":
      return "bg-[#fdf3e0] text-[#a06b12]";
    case "in_progress":
      return "bg-[#e7eef8] text-[#2c5aa0]";
    case "completed":
      return "bg-[#eee9f7] text-[#5b3f9e]";
    case "paid":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "unpaid":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    default:
      return "bg-[#f3e8dd] text-[#8a6a5a]";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SearchBookingsPage() {
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [searchNonce, setSearchNonce] = useState(0);
  const [touched, setTouched] = useState(false);
  const [selectedAppointmentNumber, setSelectedAppointmentNumber] = useState<
    string | null
  >(null);

  const [hasMounted, setHasMounted] = useState(false);
  React.useEffect(() => setHasMounted(true), []);
  const isDesktopQuery = useMediaQuery({ query: "(min-width: 768px)" });
  const isDesktop = hasMounted ? isDesktopQuery : false;

  const trimmedInput = emailInput.trim();
  const isInputValid = EMAIL_RE.test(trimmedInput);
  const showInputError = touched && trimmedInput.length > 0 && !isInputValid;

  const searchOptions = getSearchBookingsQueryOptions(submittedEmail, {
    per_page: 15,
  });
  const { data, isPending, isError, error, isFetching, isRefetching } =
    useQuery({
      ...searchOptions,
      // include nonce so same email search re-triggers fetch - allows search anytime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryKey: [
        ...(searchOptions.queryKey as unknown as unknown[]),
        searchNonce,
      ] as any,
      enabled: !!submittedEmail && EMAIL_RE.test(submittedEmail),
    });

  const bookingsRaw = data as unknown as unknown[] | undefined;
  const list: Record<string, unknown>[] = Array.isArray(bookingsRaw)
    ? (bookingsRaw as Record<string, unknown>[])
    : [];

  const {
    data: detailData,
    isPending: isDetailPending,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    ...getBookingByAppointmentNumberQueryOptions(
      selectedAppointmentNumber ?? "",
    ),
    enabled: !!selectedAppointmentNumber,
  });

  const bookingDetail = detailData as unknown as BookingDetail | null;
  const fallbackDetail = useMemo(() => {
    if (!selectedAppointmentNumber) return null;
    return (
      list.find(
        (b) =>
          String(b.appointment_number ?? b.appointment_id) ===
          String(selectedAppointmentNumber),
      ) ?? null
    );
  }, [list, selectedAppointmentNumber]);
  const displayBooking =
    (bookingDetail as unknown as Record<string, unknown>) ?? fallbackDetail;

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    const email = emailInput.trim();
    if (!email) {
      return;
    }
    if (!EMAIL_RE.test(email)) {
      return;
    }
    setSubmittedEmail(email);
    // increment nonce to force refetch even for same email; allows search anytime
    setSearchNonce((n) => n + 1);
  };

  const hasSearched = !!submittedEmail && EMAIL_RE.test(submittedEmail);
  const isSearching = hasSearched && (isPending || isFetching || isRefetching);
  const showEmpty =
    hasSearched && !isSearching && !isError && list.length === 0;
  const showResults =
    hasSearched && !isSearching && !isError && list.length > 0;

  const bookingsSkeleton = (
    <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='flex flex-col rounded-2xl border border-[#e8ddd0] bg-white p-5'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='mt-3 h-5 w-20 rounded-full' />
          <div className='mt-4 space-y-2.5'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </div>
          <Skeleton className='mt-4 h-6 w-full' />
          <div className='mt-4 flex gap-2'>
            <Skeleton className='h-9 flex-1 rounded-lg' />
            <Skeleton className='h-9 flex-1 rounded-lg' />
          </div>
        </div>
      ))}
    </div>
  );

  const isDetailsOpen = selectedAppointmentNumber !== null;
  const detailContent = (
    <BookingDetailsContent
      booking={displayBooking as unknown as BookingDetail}
      isPending={isDetailPending && !fallbackDetail}
      isError={isDetailError}
      errorMessage={
        detailError instanceof ApiError
          ? detailError.message
          : detailError instanceof Error
            ? detailError.message
            : undefined
      }
      onClose={() => setSelectedAppointmentNumber(null)}
      onRebook={undefined}
    />
  );

  return (
    <section className='bg-[#FAF7F3] min-h-screen'>
      <div className='block-spacing lg:px-6 py-8 lg:py-12'>
        {/* Header */}
        <div className='max-w-2xl'>
          {/* <div className='inline-flex items-center gap-2 rounded-full border border-[#e8ddd0] bg-white px-3 py-1 text-[#8a6a5a]'>
            <Search size={14} className='text-[#A57865]' />
            <span className='font-plus-jakarta-sans text-xs font-medium tracking-[0.08em] uppercase'>
              Guest Access
            </span>
          </div> */}
          <h1 className='mt-4 font-cooper font-normal text-[24px] leading-[1.05] text-black/80 md:text-[36px]'>
            Find your bookings
          </h1>
          <p className='mt-3 max-w-xl font-plus-jakarta-sans text-[15px] leading-relaxed text-[#8a6a5a]'>
            Enter the email you used when booking, whether you were signed in or
            booked as a guest — and we’ll instantly pull up all your
            appointments. Works for everyone, no sign-in required.
          </p>
        </div>

        {/* Search Card */}
        <form
          onSubmit={handleSearch}
          className='mt-8 max-w-2xl rounded-2xl border border-[#e8ddd0] bg-white p-4 shadow-sm sm:p-6'>
          <label
            htmlFor='search-email'
            className='mb-2 block font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.1em] text-[#483630]'>
            Email address
          </label>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <span className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a6a5a]'>
                <Mail size={16} />
              </span>
              <input
                id='search-email'
                type='email'
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (touched) setTouched(true);
                }}
                onBlur={() => setTouched(true)}
                placeholder='e.g. adaeze@example.com'
                className={cn(
                  "w-full rounded-xl border bg-[#fffdf9] py-3 pl-10 pr-4 font-plus-jakarta-sans text-base! text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-[#A57865] focus:ring-2 focus:ring-[#A57865]/20",
                  showInputError
                    ? "border-[#9f2d20] focus:border-[#9f2d20] focus:ring-[#9f2d20]/20"
                    : "border-[#e8ddd0]",
                )}
                aria-invalid={showInputError}
                aria-describedby={showInputError ? "email-error" : undefined}
              />
            </div>
            <button
              type='submit'
              disabled={isSearching}
              className='inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3a2520] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a1510] active:scale-[0.98] disabled:opacity-60 sm:w-auto'>
              {isSearching ? (
                "Searching..."
              ) : (
                <>
                  Search <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {showInputError && (
            <p
              id='email-error'
              className='mt-2 font-plus-jakarta-sans text-xs font-medium text-[#9f2d20]'>
              Please enter a valid email address
            </p>
          )}

          {hasSearched && !showInputError && (
            <p className='mt-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
              Showing results for{" "}
              <span className='font-medium text-[#483630]'>
                {submittedEmail}
              </span>
              <button
                type='button'
                onClick={() => {
                  setEmailInput(submittedEmail);
                }}
                className='ml-2 font-medium text-[#A57865] underline'>
                Edit
              </button>
            </p>
          )}
        </form>

        {/* States */}
        <div className='mt-8'>
          {/* {!hasSearched && !isSearching && (
            <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8ddd0] bg-white/60 px-6 py-12 text-center'>
              <div className='flex size-14 items-center justify-center rounded-full bg-[#fdf9f5] border border-[#e8ddd0]'>
                <CalendarIcon size={20} className='text-[#A57865]' />
              </div>
              <h3 className='mt-4 font-cooper text-lg text-[#1a1510]'>
                No search yet
              </h3>
              <p className='mt-2 max-w-sm font-plus-jakarta-sans text-sm leading-relaxed text-[#8a6a5a]'>
                Enter your email above to see all bookings linked to it —
                including guest bookings. You don’t need an account.
              </p>
              <div className='mt-6 flex items-center justify-center'>
                <div className='w-[220px] opacity-70'>
                  <Lottie
                    src={bookingAnimation}
                    loop
                    autoplay
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          )} */}

          <SkeletonReveal
            loading={isSearching}
            skeleton={bookingsSkeleton}
            minHeight={320}>
            {isError ? (
              <div className='flex items-center justify-center py-12'>
                <div className='w-full max-w-md rounded-2xl border border-[#e8ddd0] bg-white p-6 text-center'>
                  <h3 className='font-plus-jakarta-sans text-lg text-[#1a1510]'>
                    Something went wrong
                  </h3>
                  <p className='mt-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                    We couldn’t search bookings. Please check your email and try
                    again.
                  </p>
                  <div className='mx-auto mt-4 max-w-sm rounded-lg bg-[#9f2d20]/10 px-3 py-2'>
                    <p className='font-plus-jakarta-sans text-sm font-medium text-[#9f2d20]'>
                      {error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : "Search failed"}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      // retry same email – increment nonce to force refetch even if email unchanged
                      if (submittedEmail && EMAIL_RE.test(submittedEmail)) {
                        setSearchNonce((n) => n + 1);
                      } else {
                        handleSearch();
                      }
                    }}
                    className='mt-6 inline-flex items-center justify-center rounded-full bg-[#3a2520] px-6 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-white'>
                    Try again
                  </button>
                </div>
              </div>
            ) : showEmpty ? (
              <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8ddd0] bg-white px-6 py-12 text-center'>
                <img
                  src='/icons/calendar.png'
                  alt='calendar-icon'
                  className='h-10'
                />
                <h3 className='mt-4 font-cooper text-lg text-[#1a1510]'>
                  No bookings found
                </h3>
                <p className='mt-2 max-w-sm font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                  We couldn’t find any bookings for{" "}
                  <span className='font-medium text-[#483630]'>
                    {submittedEmail}
                  </span>
                  . Check the email for typos or try another email you may have
                  used.
                </p>
                <p className='mt-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                  Tip: guest bookings are found by the email you entered at
                  checkout.
                </p>
              </div>
            ) : showResults ? (
              <>
                <div className='flex items-center justify-between'>
                  <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                    Found{" "}
                    <span className='font-semibold text-[#1a1510]'>
                      {list.length}
                    </span>{" "}
                    {list.length === 1 ? "booking" : "bookings"}
                  </p>
                  <span className='hidden font-plus-jakarta-sans text-xs text-[#8a6a5a] sm:block'>
                    Tap a card to view receipt
                  </span>
                </div>
                <div className='mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {list.map((b) => {
                    const id = (b.appointment_number ??
                      b.appointment_id ??
                      b.id) as string;
                    const number = String(
                      b.appointment_number ?? b.appointment_id ?? "",
                    );
                    const scheduled = String(b.scheduled_at ?? "");
                    const status = String(b.status ?? "");
                    const paymentStatus = String(b.payment_status ?? "");
                    const total = (b.total_amount ?? "0") as string | number;
                    const services = (b.services ?? []) as Array<
                      Record<string, unknown>
                    >;
                    const schedDate = scheduled ? new Date(scheduled) : null;
                    const isValid = schedDate && !isNaN(schedDate.getTime());
                    const dateStr = isValid
                      ? format(schedDate as Date, "EEE, MMM d, yyyy")
                      : scheduled
                        ? String(scheduled)
                        : "—";
                    const timeStr = isValid
                      ? format(schedDate as Date, "h:mm a")
                      : "—";
                    const primaryService = services[0] as
                      | Record<string, unknown>
                      | undefined;
                    const serviceName = primaryService
                      ? String(
                          primaryService.service_name ??
                            primaryService.name ??
                            "",
                        )
                      : "";
                    return (
                      <div
                        key={String(id)}
                        role='button'
                        tabIndex={0}
                        onClick={() =>
                          setSelectedAppointmentNumber(
                            String(b.appointment_number ?? b.appointment_id),
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedAppointmentNumber(
                              String(b.appointment_number ?? b.appointment_id),
                            );
                          }
                        }}
                        className='flex flex-col rounded-2xl border border-[#e8ddd0] bg-white p-5 cursor-pointer hover:shadow-md hover:border-[#a57865]/30 transition text-left focus:outline-none focus:ring-2 focus:ring-[#a57865]/20'>
                        <div className='flex items-start justify-between gap-3'>
                          <p className='font-plus-jakarta-sans text-xs uppercase tracking-[0.06em] font-medium truncate pr-2'>
                            {number}
                          </p>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-plus-jakarta-sans text-[10px] font-semibold uppercase tracking-[0.08em]",
                              statusBadgeClasses(status),
                            )}>
                            {formatStatusLabel(status)}
                          </span>
                        </div>
                        {serviceName ? (
                          <p className='mt-2 font-plus-jakarta-sans text-xs text-[#8a6a5a] truncate'>
                            {serviceName}
                            {services.length > 1
                              ? ` +${services.length - 1} more`
                              : ""}
                          </p>
                        ) : null}
                        <dl className='mt-3 space-y-2 border-t border-[#f3ece3] pt-3'>
                          <div className='flex items-center justify-between gap-3'>
                            <dt className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                              Date
                            </dt>
                            <dd className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                              {dateStr}
                            </dd>
                          </div>
                          <div className='flex items-center justify-between gap-3'>
                            <dt className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                              Time
                            </dt>
                            <dd className='font-plus-jakarta-sans text-sm font-semibold text-[#483630]'>
                              {timeStr}
                            </dd>
                          </div>
                        </dl>
                        <div className='mt-3 flex items-center justify-between border-t border-[#f3ece3] pt-3'>
                          <span className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                            Total
                          </span>
                          <span className='font-sans text-lg font-semibold text-[#483630]'>
                            {formatCurrency(Number(total))}
                          </span>
                        </div>
                        <div className='mt-2 flex items-center justify-between'>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              statusBadgeClasses(paymentStatus),
                            )}>
                            {paymentStatus || "—"}
                          </span>
                          <span className='font-plus-jakarta-sans text-xs text-[#a57865]'>
                            View →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </SkeletonReveal>
        </div>
      </div>

      {/* Details */}
      {isDesktop ? (
        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedAppointmentNumber(null);
          }}>
          <DialogContent className='bg-white max-w-[560px]! p-0 gap-0 overflow-hidden rounded-2xl border border-[#e8ddd0] shadow-xl max-h-[85vh] flex flex-col'>
            <BookingDetailsContent
              booking={displayBooking as unknown as BookingDetail}
              isPending={isDetailPending && !fallbackDetail}
              isError={isDetailError}
              errorMessage={
                detailError instanceof ApiError
                  ? detailError.message
                  : detailError instanceof Error
                    ? detailError.message
                    : undefined
              }
              onClose={() => setSelectedAppointmentNumber(null)}
              onRebook={undefined}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={isDetailsOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedAppointmentNumber(null);
          }}>
          <DrawerContent className=' overflow-hidden rounded-t-[28px]! border border-black/10 bg-white p-0 text-black'>
            <div className='mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10' />
            <div className='min-h-0 overflow-y-auto flex flex-col max-h-[88dvh]'>
              <BookingDetailsContent
                booking={displayBooking as unknown as BookingDetail}
                isPending={isDetailPending && !fallbackDetail}
                isError={isDetailError}
                errorMessage={
                  detailError instanceof ApiError
                    ? detailError.message
                    : detailError instanceof Error
                      ? detailError.message
                      : undefined
                }
                onClose={() => setSelectedAppointmentNumber(null)}
                onRebook={undefined}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </section>
  );
}
