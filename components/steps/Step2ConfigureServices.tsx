"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/store/useBookingStore";
import { getStylistsQueryOptions } from "@/services/booking-catalog-requests";
import { isItemConfigured } from "@/types/booking";
import type { Stylist } from "@/types/booking";
import { formatDuration } from "@/lib/booking/format";
import {
  FOCUS_NEXT_UNSCHEDULED_EVENT,
  SCHEDULE_NEXT_SERVICE_EVENT,
} from "@/lib/booking/schedule-focus";
import StylistStrip from "../services/StylistStrip";
import BookingCalendar from "../datetime/BookingCalendar";
import TimeSlotGrid from "../datetime/TimeSlotGrid";
import { PanelHead } from "./Step1Services";

/**
 * Switch the wizard to service `idx` with a clean slate, then scroll back
 * to the top so the service name header is in view. When the target has
 * no time yet, the pending date/time shims are cleared so the previous
 * service's date highlight and time slots don't leak over — and the
 * stylist is left at its default ("Any Professional"). Targets that
 * are already scheduled (e.g. navigating back) keep showing their saved
 * values.
 */
function advanceWizardTo(idx: number, setActive: (i: number) => void) {
  const state = useBookingStore.getState();
  const list = state.cart;
  if (idx < 0 || idx >= list.length) return;
  const target = list[idx];
  if (target && !target.scheduled_at) {
    state.clearPendingDateTime();
  }
  setActive(idx);
  // defer so the remounted panel is measured, not the outgoing one
  window.setTimeout(() => {
    const lenis = (
      window as unknown as {
        lenis?: { scrollTo: (to: number) => void };
      }
    ).lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, 80);
}

function formatScheduledSummary(scheduled_at: string | null): string | null {
  if (!scheduled_at) return null;
  try {
    const d = new Date(scheduled_at.replace(" ", "T"));
    if (isNaN(d.getTime())) return scheduled_at;
    const dateLabel = new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const timeLabel = new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return `${dateLabel} · ${timeLabel}`;
  } catch {
    return scheduled_at;
  }
}

export default function Step2ConfigureServices() {
  const cart = useBookingStore((s) => s.cart);
  const configuringItemIndex = useBookingStore((s) => s.configuringItemIndex);
  const setConfiguringItemIndex = useBookingStore(
    (s) => s.setConfiguringItemIndex,
  );

  const { data: stylistsData } = useQuery(getStylistsQueryOptions());
  const stylists = (stylistsData as Stylist[] | undefined) ?? [];
  const stylistMap = useMemo(() => {
    const m = new Map<number, Stylist>();
    for (const s of stylists) m.set(s.stylist_id, s);
    return m;
  }, [stylists]);

  const allConfigured = cart.length > 0 && cart.every(isItemConfigured);
  const configuredCount = cart.filter(isItemConfigured).length;

  // ── wizard state: which service is currently being scheduled ──
  // Start on the first service still needing a time (index 0 on fresh
  // entry) — never the last-added one. Clamped during render so no
  // sync effects needed.
  const [activeIndexState, setActiveIndex] = useState<number>(() => {
    const list = useBookingStore.getState().cart;
    const firstPending = list.findIndex((c) => !c.scheduled_at);
    return firstPending !== -1 ? firstPending : 0;
  });
  const safeIndex =
    cart.length === 0
      ? 0
      : Math.min(Math.max(activeIndexState, 0), cart.length - 1);

  // Keep store scope in sync so StylistStrip / Calendar / TimeSlotGrid
  // read + write the active wizard service
  useEffect(() => {
    if (cart.length === 0) return;
    if (configuringItemIndex !== safeIndex) {
      setConfiguringItemIndex(safeIndex);
    }
  }, [safeIndex, cart.length, configuringItemIndex, setConfiguringItemIndex]);

  // Continue (sidebar / mobile bar) doubles as "next": when some services
  // are still unscheduled, jump the wizard to the next one needing a time
  useEffect(() => {
    const focusHandler = () => {
      const state = useBookingStore.getState();
      const list = state.cart;
      if (list.length === 0) return;
      const from = state.configuringItemIndex ?? 0;
      let next = list.findIndex((c, i) => i >= from && !c.scheduled_at);
      if (next === -1) next = list.findIndex((c) => !c.scheduled_at);
      if (next === -1) return;
      advanceWizardTo(next, setActiveIndex);
    };
    // Continue-as-next: step exactly one service forward in order
    // (mirrors the wizard's own Next button, stops at the last service)
    const nextHandler = () => {
      const state = useBookingStore.getState();
      const list = state.cart;
      if (list.length === 0) return;
      const from = state.configuringItemIndex ?? 0;
      const next = Math.min(from + 1, list.length - 1);
      advanceWizardTo(next, setActiveIndex);
    };
    window.addEventListener(FOCUS_NEXT_UNSCHEDULED_EVENT, focusHandler);
    window.addEventListener(SCHEDULE_NEXT_SERVICE_EVENT, nextHandler);
    return () => {
      window.removeEventListener(FOCUS_NEXT_UNSCHEDULED_EVENT, focusHandler);
      window.removeEventListener(SCHEDULE_NEXT_SERVICE_EVENT, nextHandler);
    };
  }, []);

  // Auto-advance to the next unscheduled service when the current one
  // gets its FIRST time — gives the wizard forward momentum. Deliberately
  // does NOT fire when re-picking a time on an already-scheduled service,
  // so customers can fix a mistake without being yanked away mid-edit.
  const activeScheduledAt =
    cart.length > 0 && safeIndex < cart.length
      ? (cart[safeIndex]?.scheduled_at ?? null)
      : null;
  const prevScheduledAtRef = useRef<string | null>(null);
  const prevAdvanceIndexRef = useRef(safeIndex);
  useEffect(() => {
    if (prevAdvanceIndexRef.current !== safeIndex) {
      // switched services: re-baseline, never advance on arrival
      prevAdvanceIndexRef.current = safeIndex;
      prevScheduledAtRef.current = activeScheduledAt;
      return;
    }
    const wasEdit =
      prevScheduledAtRef.current !== null && activeScheduledAt !== null;
    prevScheduledAtRef.current = activeScheduledAt;
    if (!activeScheduledAt || cart.length <= 1 || wasEdit) return;
    const fromIndex = safeIndex;
    const t = setTimeout(() => {
      const state = useBookingStore.getState();
      const current = state.cart;
      // find next unconfigured after active, else first unconfigured overall
      let next = -1;
      for (let i = fromIndex + 1; i < current.length; i++) {
        if (!current[i]?.scheduled_at) {
          next = i;
          break;
        }
      }
      if (next === -1) {
        for (let i = 0; i < current.length; i++) {
          if (!current[i]?.scheduled_at) {
            next = i;
            break;
          }
        }
      }
      if (next !== -1 && next !== fromIndex)
        advanceWizardTo(next, setActiveIndex);
    }, 650);
    return () => clearTimeout(t);
  }, [activeScheduledAt, safeIndex, cart.length]);

  if (cart.length === 0) {
    return (
      <div>
        <PanelHead
          eyebrow='Services & Schedule'
          title='Schedule your services'
          sub='Select at least one service to schedule it with your preferred professional and time.'
        />
        <div className='rounded-xl border border-dashed border-[#e8ddd0] bg-[#fdf9f5] px-6 py-10 text-center'>
          <p className='font-plus-jakarta-sans text-sm font-medium text-[#483630]'>
            No services selected
          </p>
          <p className='mt-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
            Go back to Services and pick at least one service to continue.
          </p>
        </div>
      </div>
    );
  }

  const activeItem = cart[safeIndex] ?? cart[0];
  const activeStylist = activeItem.stylist_id
    ? stylistMap.get(activeItem.stylist_id)
    : null;
  const activeStylistLabel =
    activeItem.stylist_id === null
      ? "Any Professional"
      : (activeStylist?.display_name ?? `Stylist #${activeItem.stylist_id}`);
  const activeSummary = isItemConfigured(activeItem)
    ? `${activeStylistLabel} · ${formatScheduledSummary(activeItem.scheduled_at) ?? activeItem.scheduled_at}`
    : null;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === cart.length - 1;
  const progressPct =
    cart.length > 0 ? Math.round((configuredCount / cart.length) * 100) : 0;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= cart.length || idx === safeIndex) return;
    advanceWizardTo(idx, setActiveIndex);
  };

  return (
    <div id='step2-configure'>
      <PanelHead
        eyebrow='Services & Schedule'
        title='Schedule your services'
        sub={
          cart.length > 1
            ? "One service at a time — pick a professional and time, then move to the next."
            : "Pick your preferred professional and time below."
        }
      />

      {/* Progress summary */}
      <div className='mb-4 flex flex-wrap items-center gap-2 text-xs font-plus-jakarta-sans'>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            allConfigured
              ? "bg-[#e8f3ec] text-[#2f6b47]"
              : "bg-[#fdf3e0] text-[#8a6a5a]",
          )}>
          {allConfigured ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {configuredCount}/{cart.length} scheduled
        </span>
        {cart.length > 1 ? (
          <span className='text-[#8a6a5a]'>
            Service {safeIndex + 1} of {cart.length}
          </span>
        ) : null}
        {allConfigured ? (
          <span className='text-[#2f6b47]'>— ready to continue</span>
        ) : null}
      </div>

      {/* Progress bar */}
      <div
        className='mb-5 h-1.5 overflow-hidden rounded-full bg-[#f3ece3]'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={cart.length}
        aria-valuenow={configuredCount}
        aria-label='Scheduling progress'>
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            allConfigured ? "bg-[#2f6b47]" : "bg-[#a57865]",
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Service stepper — only when booking multiple services */}
      {cart.length > 1 ? (
        <ol
          aria-label='Services to schedule'
          className='mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
          {cart.map((item, idx) => {
            const done = isItemConfigured(item);
            const isActive = idx === safeIndex;
            return (
              <li key={item.service_id} className='shrink-0'>
                <button
                  type='button'
                  onClick={() => goTo(idx)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex max-w-[200px] items-center gap-2 rounded-full border px-3 py-2 text-left transition",
                    isActive
                      ? "border-[#a57865] bg-[#fdf9f5] shadow-sm ring-2 ring-[#a57865]/20"
                      : done
                        ? "border-[#c9e8d3] bg-[#f4faf6] hover:border-[#2f6b47]/40"
                        : "border-[#e8ddd0] bg-white hover:border-[#a57865]/40",
                  )}>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      done
                        ? "bg-[#2f6b47] text-white"
                        : isActive
                          ? "bg-[#a57865] text-white"
                          : "bg-[#f3ece3] text-[#8a6a5a]",
                    )}>
                    {done ? <CheckCircle2 size={14} /> : idx + 1}
                  </span>
                  <span className='min-w-0'>
                    <span className='block truncate font-plus-jakarta-sans text-xs font-semibold text-[#1a1510]'>
                      {item.service_name}
                    </span>
                    <span className='block font-plus-jakarta-sans text-[10px] text-[#8a6a5a]'>
                      {done ? "Scheduled" : isActive ? "Scheduling…" : "Not scheduled"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      {/* Active service wizard panel — keyed by service so switching
          services fully resets the view (calendar month, scroll, local
          state); all scheduling data itself comes from the store */}
      <div
        key={activeItem.service_id}
        className='overflow-hidden rounded-2xl border border-[#a57865]/30 bg-white ring-2 ring-[#a57865]/15'>
        <div className='flex items-center gap-3 border-b border-[#f3ece3] bg-[#FFFBF8] px-4 py-4 sm:px-5'>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border",
              isItemConfigured(activeItem)
                ? "border-[#c9e8d3] bg-[#e8f3ec] text-[#2f6b47]"
                : "border-[#e8ddd0] bg-[#fdf9f5] text-[#8a6a5a]",
            )}>
            {isItemConfigured(activeItem) ? (
              <CheckCircle2 size={18} />
            ) : (
              <Clock size={16} />
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate font-plus-jakarta-sans text-sm font-semibold text-[#1a1510]'>
              {cart.length > 1 ? (
                <>
                  <span className='mr-1.5 rounded-full bg-[#a57865]/10 px-2 py-0.5 text-[10px] font-bold text-[#a57865]'>
                    {safeIndex + 1}/{cart.length}
                  </span>
                  {activeItem.service_name}
                </>
              ) : (
                activeItem.service_name
              )}
            </p>
            <p className='mt-0.5 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
              {formatDuration(activeItem.duration_minutes)}
              {activeSummary ? (
                <span className='ml-1.5 font-medium text-[#2f6b47]'>
                  · {activeSummary}
                </span>
              ) : (
                <span className='ml-1.5 rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[10px] font-medium text-[#a06b12]'>
                  Not scheduled
                </span>
              )}
            </p>
          </div>
        </div>

        <div className='space-y-6 bg-[#FFFBF8] px-4 py-5 sm:px-5'>
          <div id='schedule-stylist' className='scroll-mt-24'>
            <p className='mb-3 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
              1. Choose professional
            </p>
            <StylistStrip />
          </div>

          <div
            id='schedule-date'
            className='rounded-2xl border border-[#e8ddd0] bg-white p-4 scroll-mt-24'>
            <p className='mb-3 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
              2. Choose date
            </p>
            <BookingCalendar />
          </div>

          <div>
            <TimeSlotGrid />
          </div>
        </div>

        {/* Wizard prev/next */}
        {cart.length > 1 ? (
          <div className='flex items-center justify-between gap-3 border-t border-[#f3ece3] bg-white px-4 py-3 sm:px-5'>
            <button
              type='button'
              onClick={() => goTo(safeIndex - 1)}
              disabled={isFirst}
              className='inline-flex items-center gap-1.5 rounded-full border border-[#e8ddd0] bg-white px-4 py-2 font-plus-jakarta-sans text-xs font-semibold text-[#483630] transition hover:bg-[#fdf9f5] disabled:cursor-not-allowed disabled:opacity-40'>
              <ArrowLeft size={14} />
              Previous
            </button>
            <span className='font-plus-jakarta-sans text-[11px] font-medium text-[#8a6a5a]'>
              {safeIndex + 1} of {cart.length}
            </span>
            {isLast ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-plus-jakarta-sans text-xs font-semibold",
                  allConfigured
                    ? "bg-[#e8f3ec] text-[#2f6b47]"
                    : "bg-[#f3ece3] text-[#8a6a5a]",
                )}>
                {allConfigured ? (
                  <>
                    <CheckCircle2 size={14} /> All scheduled
                  </>
                ) : (
                  "Last service"
                )}
              </span>
            ) : (
              <button
                type='button'
                onClick={() => goTo(safeIndex + 1)}
                className='inline-flex items-center gap-1.5 rounded-full bg-[#a57865] px-4 py-2 font-plus-jakarta-sans text-xs font-semibold text-white transition hover:bg-[#8e6655]'>
                Next service
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {!allConfigured ? (
        <p className='mt-4 rounded-xl bg-[#fdf3e0] px-4 py-3 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
          {cart.length > 1
            ? "Schedule every service to continue to Your Details. Use Next / Previous to move between services."
            : "Choose a professional, date and time to continue to Your Details."}
        </p>
      ) : (
        <p className='mt-4 rounded-xl bg-[#e8f3ec] px-4 py-3 font-plus-jakarta-sans text-xs font-medium text-[#2f6b47]'>
          All services scheduled — you can review above and continue.
        </p>
      )}
    </div>
  );
}
