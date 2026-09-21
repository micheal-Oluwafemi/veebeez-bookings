"use client";

import { format } from "date-fns";
import { CalendarPlus, Download } from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { SkeletonReveal } from "@/components/skeleton/SkeletonReveal";
import { formatCurrency } from "@/lib/booking/format";
import { downloadICS, generateGoogleCalendarUrl } from "@/lib/booking/calendar";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/types/booking";
import { SiApple, SiGoogle } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";

function formatStatusLabel(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadgeClasses(s: string) {
  const norm = s.toLowerCase().replace(/\s+/g, "_");
  switch (norm) {
    case "confirmed":
      return "bg-[#e8f3ec] text-[#2f6b47]";
    case "pending":
      return "bg-[#fdf3e0] text-[#a06b12]";
    case "in_progress":
      return "bg-[#e7eef8] text-[#2c5aa0]";
    case "completed":
      return "bg-[#eee9f7] text-[#5b3f9e]";
    case "no_show":
      return "bg-[#fbe9e7] text-[#9f2d20]";
    default:
      return "bg-[#f3e8dd] text-[#8a6a5a]";
  }
}

function paymentStatusBadgeClasses(s: string) {
  const norm = s.toLowerCase().trim().replace(/\s+/g, "_");
  switch (norm) {
    case "paid":
      return "bg-[#e8f3ec] text-[#2f6b47]"; // green
    case "partial":
    case "partial_paid":
    case "partially_paid":
    case "partially":
    case "part_paid":
      return "bg-[#ecfdf5] text-[#047857]"; // emerald green (partial = green as requested)
    case "unpaid":
      return "bg-[#fbe9e7] text-[#9f2d20]"; // red
    case "failed":
      return "bg-[#fbe9e7] text-[#9f2d20]"; // red
    case "refunded":
      return "bg-[#eee9f7] text-[#5b3f9e]"; // purple
    case "pending":
      return "bg-[#fdf3e0] text-[#a06b12]"; // amber
    case "—":
    case "":
    case "-":
      return "bg-[#f3e8dd] text-[#8a6a5a]";
    default:
      return "bg-[#f3e8dd] text-[#8a6a5a]";
  }
}

function DetailSkeleton() {
  return (
    <div className='space-y-4 p-6'>
      <Skeleton className='h-5 w-32' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-20 w-full rounded-xl' />
      <Skeleton className='h-12 w-full rounded-xl' />
    </div>
  );
}

interface Props {
  booking: BookingDetail | Record<string, unknown> | null;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onRebook?: (b: Record<string, unknown>) => void;
}

export default function BookingDetailsContent({
  booking,
  isPending,
  isError,
  errorMessage,
  onClose,
  onRebook,
}: Props) {
  if (isError) {
    return (
      <div className='p-6 text-center'>
        <p className='font-plus-jakarta-sans text-sm font-medium text-[#9f2d20]'>
          {errorMessage ?? "Failed to load booking details"}
        </p>
        <button
          type='button'
          onClick={onClose}
          className='mt-4 rounded-full border border-[#e8ddd0] bg-white px-5 py-2.5 font-plus-jakarta-sans text-sm'>
          Close
        </button>
      </div>
    );
  }

  return (
    <SkeletonReveal
      loading={isPending}
      skeleton={<DetailSkeleton />}
      minHeight={320}>
      {!booking ? (
        <div className='p-6 text-center'>
          <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>No booking data.</p>
        </div>
      ) : (
        (() => {
          const b = booking as unknown as Record<string, unknown> &
            BookingDetail;
          const number = String(
            (b.appointment_number ??
              (b as unknown as { number?: string }).number ??
              "") as string,
          );
          const scheduled = String(
            (b.scheduled_at ??
              (b as unknown as { scheduled?: string }).scheduled ??
              "") as string,
          );
          const status = String(b.status ?? "");
          const total = (b.total_amount ??
            (b as unknown as { totalAmount?: string }).totalAmount ??
            "0") as string | number;
          const services = (b.services ??
            (b as unknown as { items?: unknown[] }).items ??
            []) as unknown as Array<Record<string, unknown>>;
          const schedDate = scheduled ? new Date(scheduled) : null;
          const isValid =
            schedDate !== null && !isNaN((schedDate as Date).getTime());
          const dateLabel = isValid
            ? format(schedDate as Date, "EEE, MMM d, yyyy • h:mm a")
            : String(scheduled || "—");
          const canCalendar = isValid && !!b.scheduled_at;

          const googleUrl = canCalendar
            ? generateGoogleCalendarUrl(b as unknown as BookingDetail)
            : "#";

          const handleAddToCalendarICS = () => {
            if (!canCalendar) return;
            downloadICS(b as unknown as BookingDetail);
          };

          return (
            <>
              <div className='px-4 md:px-6 pt-6 pb-4 border-b border-[#f3ece3] bg-white'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-lg leading-none text-[#1a1510] font-cooper'>
                      Booking details
                    </h3>
                    <p className='mt-1.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      {String(number)} •{" "}
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                          statusBadgeClasses(status),
                        )}>
                        {formatStatusLabel(status)}
                      </span>
                    </p>
                    <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      {dateLabel}
                    </p>
                  </div>
                </div>
                {b.stylist_name ? (
                  <p className='mt-2 font-plus-jakarta-sans text-xs text-[#483630]'>
                    Stylist: {String(b.stylist_name)}
                  </p>
                ) : null}
                {b.whatsapp_number ? (
                  <p className='mt-1 font-plus-jakarta-sans text-xs text-[#483630]'>
                    WhatsApp: {String(b.whatsapp_number)}
                  </p>
                ) : null}
              </div>

              <div className='flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-[#FFFBF8]'>
                <div className='rounded-xl bg-white border border-[#e8ddd0] p-4'>
                  <p className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#8a6a5a]'>
                    Services ({services.length})
                  </p>
                  {services.length ? (
                    <ul className='mt-3 space-y-2'>
                      {services.map((s, idx) => {
                        const sName = String(
                          (s.service_name ??
                            s.name ??
                            `Service ${idx + 1}`) as string,
                        );
                        // singular has unit_price/lines, list has line_total; prefer line_total fallback handled elsewhere
                        const sPriceRaw = (s.line_total ??
                          s.unit_price ??
                          s.price ??
                          "0") as string | number;
                        const rawDuration = (s.duration_minutes ??
                          (s as { durationMinutes?: unknown })
                            .durationMinutes) as string | number | undefined;
                        const sDurationStr =
                          rawDuration != null ? String(rawDuration) : "";
                        const answers = (s.answers ?? []) as Array<
                          Record<string, unknown>
                        >;
                        return (
                          <li
                            key={idx}
                            className='rounded-lg border border-[#f3ece3] bg-[#fdf9f5] px-3 py-2.5'>
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <p className='font-plus-jakarta-sans text-sm font-medium text-[#1a1510] truncate'>
                                  {sName}
                                </p>
                                {sDurationStr ? (
                                  <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                                    {sDurationStr} mins
                                  </p>
                                ) : null}
                                {answers.length ? (
                                  <p className='mt-1 font-plus-jakarta-sans text-xs text-[#2d8a4f]'>
                                    {answers
                                      .map((a) =>
                                        String(
                                          (a.value_text ??
                                            a.label ??
                                            a.value ??
                                            "") as string,
                                        ),
                                      )
                                      .join(", ")}
                                  </p>
                                ) : null}
                              </div>
                              <span className='font-sans text-sm font-semibold text-[#483630] shrink-0'>
                                {formatCurrency(Number(sPriceRaw))}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className='mt-3 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                      No services found for this booking.
                    </p>
                  )}
                </div>

                <div className='rounded-xl bg-white border border-[#e8ddd0] p-4'>
                  <div className='flex items-center justify-between'>
                    <span className='font-plus-jakarta-sans text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a5a]'>
                      Total
                    </span>
                    <span className='font-sans text-lg font-semibold text-[#483630]'>
                      {formatCurrency(Number(total))}
                    </span>
                  </div>
                  {(b.notes as string | null) ? (
                    <p className='mt-3 rounded-lg bg-[#fdf9f5] border border-[#e8ddd0] px-3 py-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Notes: {String(b.notes)}
                    </p>
                  ) : null}
                  <div className='mt-3 grid grid-cols-2 gap-2 text-xs font-plus-jakarta-sans text-[#8a6a5a]'>
                    <span className='inline-flex items-center gap-1.5 flex-wrap'>
                      <span className='shrink-0'>Payment:</span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                          paymentStatusBadgeClasses(
                            String(b.payment_status ?? "—"),
                          ),
                        )}>
                        {b.payment_status
                          ? formatStatusLabel(String(b.payment_status))
                          : "—"}
                      </span>
                    </span>
                    <span>
                      Duration: {String(b.duration_minutes ?? "—")} mins
                    </span>
                  </div>
                </div>

                {/* Add to Calendar */}
                <div className='rounded-xl bg-white border border-[#e8ddd0] p-4'>
                  <p className='font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#8a6a5a]'>
                    Add to Calendar
                  </p>
                  <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                    <a
                      href={googleUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      onClick={(e) => {
                        if (!canCalendar) e.preventDefault();
                      }}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-plus-jakarta-sans text-sm font-medium transition",
                        canCalendar
                          ? "bg-black/80 text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed",
                      )}>
                      <FcGoogle size={16} /> Google Calendar
                    </a>
                    <button
                      type='button'
                      onClick={handleAddToCalendarICS}
                      disabled={!canCalendar}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 font-plus-jakarta-sans text-sm font-medium transition",
                        canCalendar
                          ? "border-[#e8ddd0] bg-white text-[#483630] hover:bg-[#fdf9f5]"
                          : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed",
                      )}>
                      <SiApple size={16} /> Download .ics
                    </button>
                  </div>
                  {!canCalendar ? (
                    <p className='mt-2 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                      Calendar unavailable — invalid date.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className='flex gap-2 justify-end px-6 py-4 border-t border-[#f3ece3] bg-white'>
                <button
                  type='button'
                  onClick={onClose}
                  className='rounded-full border border-[#e8ddd0] bg-white px-5 py-2.5 font-plus-jakarta-sans text-sm font-medium text-[#483630] hover:bg-[#fdf9f5]'>
                  Close
                </button>
                {onRebook ? (
                  <button
                    type='button'
                    onClick={() =>
                      onRebook(b as unknown as Record<string, unknown>)
                    }
                    className='rounded-full bg-black/80 px-6 py-2.5 font-plus-jakarta-sans text-sm font-semibold text-white '>
                    Rebook
                  </button>
                ) : null}
              </div>
            </>
          );
        })()
      )}
    </SkeletonReveal>
  );
}
