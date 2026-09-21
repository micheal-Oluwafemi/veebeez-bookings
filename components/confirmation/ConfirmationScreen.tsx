"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Calendar, Clock, User, MapPin, Sparkles } from "lucide-react";
import { formatCurrency, formatDuration } from "@/lib/booking/format";
import { useBookingStore } from "@/store/useBookingStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";

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

export default function ConfirmationScreen() {
  const confirmation = useBookingStore((s) => s.confirmation);
  const selectedCollectionSlug = useBookingStore(
    (s) => s.selectedCollectionSlug,
  );
  const guestDetails = useBookingStore((s) => s.guestDetails);
  const resetBooking = useBookingStore((s) => s.resetBooking);
  const token = useCustomerAuthStore((s) => s.token);
  const user = useCustomerAuthStore((s) => s.user);
  const isAuthenticated = !!token && !!user;
  const [showConfetti, setShowConfetti] = useState(false);

  // Phase 5: read per-service fields from booking response, not legacy globals
  const hasRequiredData = useMemo(() => {
    if (!confirmation) return false;
    const hasCollection = !!selectedCollectionSlug;
    const hasServices = Array.isArray(confirmation.services) && confirmation.services.length > 0;
    const hasSchedule = hasServices && confirmation.services.every((s) => !!s.scheduled_at);
    const hasUser = isAuthenticated
      ? !!user && !!guestDetails.whatsappNumber.trim()
      : !!guestDetails.firstName.trim() &&
        !!guestDetails.lastName.trim() &&
        !!guestDetails.email.trim() &&
        !!guestDetails.phone.trim() &&
        !!guestDetails.whatsappNumber.trim();
    return hasCollection && hasServices && hasSchedule && hasUser;
  }, [
    confirmation,
    selectedCollectionSlug,
    guestDetails,
    isAuthenticated,
    user,
  ]);

  useEffect(() => {
    if (!confirmation || !hasRequiredData) return;
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

      // center burst
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
  }, [confirmation, hasRequiredData]);

  if (!confirmation) return null;

  if (!hasRequiredData) {
    return (
      <div className='mx-auto max-w-xl px-4 py-16 text-center'>
        <div className='rounded-2xl border border-[#e8ddd0] bg-white p-8'>
          <p className='font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
            Incomplete booking details. Please start a new appointment.
          </p>
          <button
            type='button'
            onClick={resetBooking}
            className='mt-4 rounded-full bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-sm font-semibold text-white hover:bg-[#8e6655]'>
            Start over
          </button>
        </div>
      </div>
    );
  }

  const totalNumber = Number(confirmation.total_amount);
  const duration = confirmation.duration_minutes;
  const { dateLabel: scheduledDate, timeLabel: scheduledTime } =
    formatScheduledAt(confirmation.scheduled_at);

  return (
    <div className='mx-auto max-w-2xl px-4 md:py-10 sm:py-14'>
      {/* header */}
      <div className='text-center'>
        <div className='mx-auto mb-5 flex size-14 lg:size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a57865] to-[#8e6655] shadow-lg shadow-[#a57865]/30'>
          <Check size={36} className='text-white' strokeWidth={2.5} />
        </div>
        {/* <p className='font-plus-jakarta-sans text-[11px] uppercase tracking-[0.28em] text-[#a57865]'>
          Booking Confirmed
        </p> */}
        <h3 className='lg:max-w-xl max-w-sm font-cooper font-normal text-[26px] leading-[1.05] text-black/80 md:text-[36px]'>
          Booking Confirmed
        </h3>
        <p className='mx-auto mt-3 max-w-md font-plus-jakarta-sans text-[15px] leading-relaxed text-[#8a6a5a]'>
          We&apos;re saving your spot at Veebeez. A confirmation has been sent
          to your email — we can&apos;t wait to see you.
        </p>
        <div className='mt-6 inline-flex items-center gap-2 rounded-full border border-[#a57865]/20 bg-[#fdf9f5] px-5 py-2'>
          <Sparkles size={16} className='text-[#a57865]' />
          <span className='font-plus-jakarta-sans text-xs font-semibold tracking-[0.1em] text-[#483630]'>
            REF: {confirmation.appointment_number}
          </span>
        </div>
      </div>

      {/* details card */}
      <div className='mt-8 overflow-hidden rounded-2xl border border-[#e8ddd0] bg-white '>
        <div className='grid gap-0 divide-y divide-[#f0e6dc] sm:grid-cols-2 sm:divide-x sm:divide-y-0'>
          <div className='p-5 sm:p-6'>
            <p className='font-plus-jakarta-sans text-[11px] uppercase tracking-[0.1em] text-[#a78a6f]'>
              Date & Time
            </p>
            <div className='mt-3 flex items-start gap-3'>
              <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fdf9f5] text-[#a57865]'>
                <Calendar size={18} />
              </span>
              <div>
                <p className='font-plus-jakarta-sans text-[15px] font-medium text-[#1a1510]'>
                  {scheduledDate}
                </p>
                <p className='mt-1 flex items-center gap-1.5 font-plus-jakarta-sans text-sm text-[#483630]'>
                  <Clock size={14} className='text-[#a78a6f]' />
                  {scheduledTime}
                  {confirmation.stylist_name ? (
                    <span className='text-[#8a6a5a]'>
                      with {confirmation.stylist_name}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
          <div className='p-5 sm:p-6'>
            <p className='font-plus-jakarta-sans text-[11px] uppercase tracking-[0.1em] text-[#a78a6f]'>
              Duration & Total
            </p>
            <div className='mt-3'>
              <p className='font-sans text-2xl font-medium text-[#1a1510]'>
                {formatCurrency(totalNumber)}
              </p>
              <p className='mt-1 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
                {formatDuration(duration)} total
              </p>
            </div>
          </div>
        </div>

        <div className='border-t border-[#f0e6dc] bg-[#fdf9f5]/60 px-5 py-4 sm:px-6'>
          <p className='flex items-center gap-2 font-plus-jakarta-sans text-xs uppercase tracking-[0.1em] text-[#a78a6f]'>
            <User size={14} /> {isAuthenticated ? "Account" : "Guest"}
          </p>
          <p className='mt-2 font-plus-jakarta-sans text-sm text-[#483630]'>
            {isAuthenticated && user ? (
              <>
                <span className='font-medium'>
                  {user.first_name} {user.last_name}
                </span>{" "}
                <span className='text-[#8a6a5a]'>({user.email})</span>
              </>
            ) : (
              <>
                <span className='font-medium'>
                  {guestDetails.firstName} {guestDetails.lastName}
                </span>{" "}
                <span className='text-[#8a6a5a]'>
                  ({guestDetails.email} · {guestDetails.phone})
                </span>
              </>
            )}
          </p>
          {guestDetails.specialRequests ? (
            <p className='mt-2 rounded-lg bg-white px-3 py-2 font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
              “{guestDetails.specialRequests}”
            </p>
          ) : null}
        </div>

        {confirmation.services &&
        Array.isArray(confirmation.services) &&
        confirmation.services.length > 0 ? (
          <div className='border-t border-[#f0e6dc] px-5 py-4 sm:px-6'>
            <p className='font-plus-jakarta-sans text-xs uppercase tracking-[0.1em] text-[#a78a6f]'>
              Services — per-service schedule
            </p>
            <ul className='mt-3 space-y-2'>
              {(confirmation.services as unknown as import("@/types/booking").BookingServiceLine[]).map((s) => {
                const sched = s.scheduled_at ? formatScheduledAt(s.scheduled_at) : null;
                return (
                  <li
                    key={s.line_id ?? s.service_id}
                    className='flex items-start justify-between gap-3 rounded-xl border border-[#f3ece3] bg-[#fdfaf5] px-3 py-3'>
                    <div className='min-w-0'>
                      <p className='font-plus-jakarta-sans text-sm font-medium text-[#1a1510] truncate'>
                        {s.service_name}
                      </p>
                      <p className='font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                        {s.duration_minutes ? `${s.duration_minutes} mins` : ""}{sched ? ` · ${sched.dateLabel} · ${sched.timeLabel}` : ""}
                      </p>
                      <p className='font-plus-jakarta-sans text-xs text-[#483630]'>
                        {s.stylist_name ?? (s.stylist_id === null ? "Any Professional" : `Stylist #${s.stylist_id}`)}
                      </p>
                    </div>
                    <span className='shrink-0 font-sans text-xs font-medium text-[#8a6a5a]'>{s.stylist_slug ?? ""}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className='flex items-center gap-2 border-t border-[#f0e6dc] bg-white px-5 py-3 text-[#8a6a5a]'>
          <MapPin size={16} className='text-[#a78a6f]' />
          <p className='font-plus-jakarta-sans text-xs'>
            Dulux paints Admiralty-Lekki, Fola Osibo Road, Lagos
          </p>
        </div>
      </div>

      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center'>
        {confirmation.payment_link ? (
          <a
            href={confirmation.payment_link}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center justify-center rounded-full bg-[#1a1510] px-8 py-3 font-plus-jakarta-sans text-sm font-semibold text-white transition hover:bg-black'>
            Pay now
          </a>
        ) : null}
        <button
          type='button'
          onClick={resetBooking}
          className='inline-flex items-center justify-center rounded-full border border-[#e8ddd0] bg-white px-8 py-3 font-plus-jakarta-sans text-sm font-semibold text-[#483630] transition hover:bg-[#fdf9f5]'>
          Book Another Appointment
        </button>
      </div>

      {showConfetti ? <span className='sr-only'>confetti</span> : null}
    </div>
  );
}
