import type { CalendarInterval, TimeSlot } from "@/types/booking";
import { formatTime } from "./format";

export function generateSlotsFromIntervals(
  intervals: CalendarInterval[] | null | undefined,
  totalDurationMinutes: number,
  stepMinutes = 15,
): TimeSlot[] {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];
  const slotMap = new Map<string, TimeSlot>();

  // Sort intervals chronologically so generation is deterministic
  const sortedIntervals = [...intervals].sort((a, b) => {
    if (!a?.start || !b?.start) return 0;
    return a.start.localeCompare(b.start);
  });

  for (const interval of sortedIntervals) {
    if (!interval || typeof interval.start !== "string" || typeof interval.end !== "string") continue;
    const [sH, sM] = interval.start.split(":").map(Number);
    const [eH, eM] = interval.end.split(":").map(Number);
    if (Number.isNaN(sH) || Number.isNaN(sM) || Number.isNaN(eH) || Number.isNaN(eM)) continue;
    const start = sH * 60 + sM;
    const end = eH * 60 + eM;

    for (let t = start; t + totalDurationMinutes <= end; t += stepMinutes) {
      const hour = Math.floor(t / 60);
      const minute = t % 60;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      if (!slotMap.has(value)) {
        slotMap.set(value, {
          label: formatTime(hour, minute),
          value,
        });
      }
    }
  }

  // Return chronologically sorted unique slots
  return Array.from(slotMap.values()).sort((a, b) => a.value.localeCompare(b.value));
}

// legacy — keep for fallback, but prefer generateSlotsFromIntervals
export function generateTimeSlots(dayHours: { open: string | null; close: string | null; closed: boolean }): TimeSlot[] {
  if (dayHours.closed || !dayHours.open || !dayHours.close) return [];
  return generateSlotsFromIntervals(
    [{ start: dayHours.open, end: dayHours.close }],
    30,
    30,
  );
}
