"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, CalendarDays, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/store/useBookingStore";
import { getStylistsQueryOptions } from "@/services/booking-catalog-requests";
import { isItemConfigured } from "@/types/booking";
import type { Stylist } from "@/types/booking";
import { formatDuration } from "@/lib/booking/format";
import StylistStrip from "../services/StylistStrip";
import BookingCalendar from "../datetime/BookingCalendar";
import TimeSlotGrid from "../datetime/TimeSlotGrid";
import { PanelHead } from "./Step1Services";

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
  const setConfiguringItemIndex = useBookingStore((s) => s.setConfiguringItemIndex);

  const { data: stylistsData } = useQuery(getStylistsQueryOptions());
  const stylists = (stylistsData as Stylist[] | undefined) ?? [];
  const stylistMap = useMemo(() => {
    const m = new Map<number, Stylist>();
    for (const s of stylists) m.set(s.stylist_id, s);
    return m;
  }, [stylists]);

  const allConfigured = cart.length > 0 && cart.every(isItemConfigured);
  const configuredCount = cart.filter(isItemConfigured).length;

  // Auto-collapse when an item becomes configured (scheduled_at set)
  useEffect(() => {
    if (configuringItemIndex === null) return;
    const item = cart[configuringItemIndex];
    if (!item) return;
    if (item.scheduled_at) {
      // small delay so user sees selection feedback before collapse
      const t = setTimeout(() => {
        // only collapse if still the same item and still configured
        const current = useBookingStore.getState().cart[configuringItemIndex];
        if (current?.scheduled_at) {
          useBookingStore.getState().setConfiguringItemIndex(null);
        }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [cart, configuringItemIndex]);

  // If cart becomes empty, clear configurator
  useEffect(() => {
    if (cart.length === 0 && configuringItemIndex !== null) {
      setConfiguringItemIndex(null);
    }
  }, [cart.length, configuringItemIndex, setConfiguringItemIndex]);

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

  return (
    <div id='step2-configure'>
      <PanelHead
        eyebrow='Services & Schedule'
        title='Schedule your services'
        sub='Tap a service to choose its professional and time. You can schedule in any order.'
      />

      {/* Progress summary */}
      <div className='mb-4 flex items-center gap-2 text-xs font-plus-jakarta-sans'>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            allConfigured ? "bg-[#e8f3ec] text-[#2f6b47]" : "bg-[#fdf3e0] text-[#8a6a5a]",
          )}>
          {allConfigured ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {configuredCount}/{cart.length} scheduled
        </span>
        {allConfigured ? (
          <span className='text-[#2f6b47]'>— ready to continue</span>
        ) : (
          <span className='text-[#8a6a5a]'>— tap a service below</span>
        )}
      </div>

      <div className='space-y-3'>
        {cart.map((item, idx) => {
          const isConfigured = isItemConfigured(item);
          const isExpanded = configuringItemIndex === idx;
          const stylist = item.stylist_id ? stylistMap.get(item.stylist_id) : null;
          const stylistLabel = item.stylist_id === null ? "Any Professional" : (stylist?.display_name ?? `Stylist #${item.stylist_id}`);
          const summary = isConfigured
            ? `${stylistLabel} · ${formatScheduledSummary(item.scheduled_at) ?? item.scheduled_at}`
            : null;

          return (
            <div
              key={item.service_id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white transition",
                isConfigured ? "border-[#e8f3ec] bg-[#fdfdfb]" : "border-[#e8ddd0]",
                isExpanded ? "ring-2 ring-[#a57865]/20 border-[#a57865]/30" : "hover:border-[#a57865]/30",
              )}>
              {/* Card header — tappable row */}
              <button
                type='button'
                onClick={() => setConfiguringItemIndex(isExpanded ? null : idx)}
                className='flex w-full items-center gap-3 px-4 py-4 text-left'>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border",
                    isConfigured ? "border-[#c9e8d3] bg-[#e8f3ec] text-[#2f6b47]" : "border-[#e8ddd0] bg-[#fdf9f5] text-[#8a6a5a]",
                  )}>
                  {isConfigured ? <CheckCircle2 size={18} /> : <CalendarDays size={16} />}
                </div>

                <div className='min-w-0 flex-1'>
                  <p className='font-plus-jakarta-sans text-sm font-semibold text-[#1a1510] truncate'>
                    {item.service_name}
                  </p>
                  <p className='mt-0.5 flex items-center gap-1 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
                    <Clock size={12} />
                    {formatDuration(item.duration_minutes)}
                    {isConfigured ? (
                      <>
                        <span className='mx-1 text-[#e8ddd0]'>·</span>
                        <User size={12} />
                        <span className='truncate'>{summary}</span>
                      </>
                    ) : (
                      <span className='ml-1 rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[10px] font-medium text-[#a06b12]'>
                        Not scheduled
                      </span>
                    )}
                  </p>
                </div>

                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-[#8a6a5a] transition-transform",
                    isExpanded ? "rotate-180" : "",
                  )}
                />
              </button>

              {/* Expanded inline configurator */}
              {isExpanded ? (
                <div className='border-t border-[#f3ece3] bg-[#FFFBF8] px-4 py-5 space-y-6'>
                  <div>
                    <p className='mb-3 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                      1. Choose professional
                    </p>
                    <StylistStrip />
                  </div>

                  <div className='rounded-2xl bg-white border border-[#e8ddd0] p-4'>
                    <p className='mb-3 font-plus-jakarta-sans text-xs font-semibold uppercase tracking-[0.08em] text-[#483630]'>
                      2. Choose date
                    </p>
                    <BookingCalendar />
                  </div>

                  <div>
                    <TimeSlotGrid />
                  </div>

                  {/* Done affordance (auto-collapse also happens) */}
                  <div className='flex justify-end'>
                    <button
                      type='button'
                      onClick={() => setConfiguringItemIndex(null)}
                      className='rounded-full border border-[#e8ddd0] bg-white px-4 py-2 font-plus-jakarta-sans text-xs font-medium text-[#483630] hover:bg-[#fdf9f5]'>
                      Done
                    </button>
                  </div>
                </div>
              ) : isConfigured ? (
                <div className='px-4 pb-3'>
                  <p className='rounded-full bg-[#e8f3ec] px-3 py-1.5 font-plus-jakarta-sans text-xs font-medium text-[#2f6b47] inline-flex'>
                    {summary}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!allConfigured ? (
        <p className='mt-4 rounded-xl bg-[#fdf3e0] px-4 py-3 font-plus-jakarta-sans text-xs text-[#8a6a5a]'>
          Schedule every service to continue to Your Details. Tap any card to pick its professional and time.
        </p>
      ) : (
        <p className='mt-4 rounded-xl bg-[#e8f3ec] px-4 py-3 font-plus-jakarta-sans text-xs font-medium text-[#2f6b47]'>
          All services scheduled — you can review above and continue.
        </p>
      )}
    </div>
  );
}
