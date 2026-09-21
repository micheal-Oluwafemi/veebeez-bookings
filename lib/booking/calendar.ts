import type { Booking, BookingDetail, SalonHour } from "@/types/booking";

export function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isPastDate(date: Date) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date < startOfToday;
}

export function isClosedDate(date: Date, hours: SalonHour[]) {
  const dow = date.getDay(); // 0=Sun
  const entry = hours.find((h) => h.day_of_week === dow);
  return entry ? entry.is_closed : false;
}

export function buildMonthDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return {
    leadingBlanks: Array.from({ length: offset }, (_, index) => index),
    days: Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
  };
}

export function formatMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: toISO(start), endDate: toISO(end) };
}

// ── Add to Calendar (ICS / Google) ──

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function toGoogleDate(d: Date) {
  return toICSDate(d).replace(/[-:]/g, "");
}

function parseScheduledAt(scheduled_at: string): Date | null {
  if (!scheduled_at) return null;
  const iso = scheduled_at.includes(" ") ? scheduled_at.replace(" ", "T") : scheduled_at;
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTZ ? iso : iso);
  if (isNaN(d.getTime())) {
    const fallback = new Date(scheduled_at.replace(" ", "T") + "Z");
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  if (!hasTZ) {
    const local = new Date(scheduled_at.replace(" ", "T"));
    return isNaN(local.getTime()) ? d : local;
  }
  return d;
}

function getBookingEnd(b: Booking | BookingDetail): Date | null {
  const start = parseScheduledAt(b.scheduled_at);
  if (!start) return null;
  const duration = Number(b.duration_minutes ?? 0) || 60;
  return new Date(start.getTime() + duration * 60_000);
}

export function generateGoogleCalendarUrl(booking: Booking | BookingDetail): string {
  const start = parseScheduledAt(booking.scheduled_at);
  const end = getBookingEnd(booking);
  if (!start || !end) return "#";
  const serviceNames =
    booking.services?.map((s: unknown) => (s as { service_name?: string }).service_name ?? "").filter(Boolean).join(", ") || "Veebeez Appointment";
  const title = encodeURIComponent(`Veebeez - ${serviceNames}`);
  const details = encodeURIComponent(
    `Booking ${booking.appointment_number}\n${booking.services
      ?.map((s: unknown) => {
        const svc = s as { service_name?: string; duration_minutes?: number };
        return `- ${svc.service_name} (${svc.duration_minutes ?? booking.duration_minutes}m)`;
      })
      .join("\n") ?? ""}\n\nStylist: ${booking.stylist_name ?? "No preference"}\nTotal: ${booking.total_amount} ${booking.currency}`,
  );
  const location = encodeURIComponent("Veebeez Beauty Salon, Lagos");
  const dates = `${toGoogleDate(start)}/${toGoogleDate(end)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function generateICSContent(booking: Booking | BookingDetail): string {
  const start = parseScheduledAt(booking.scheduled_at);
  const end = getBookingEnd(booking);
  if (!start || !end) return "";
  const serviceNames =
    booking.services?.map((s: unknown) => (s as { service_name?: string }).service_name ?? "").filter(Boolean).join(", ") || "Veebeez Appointment";
  const uid = `${booking.appointment_number}@veebeez.ng`;
  const dtStamp = toICSDate(new Date());
  const dtStart = toICSDate(start);
  const dtEnd = toICSDate(end);
  const description = `Booking ${booking.appointment_number}\\nStylist: ${booking.stylist_name ?? "No preference"}\\nServices: ${serviceNames}\\nTotal: ${booking.total_amount} ${booking.currency}`.replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Veebeez//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Veebeez - ${serviceNames}`,
    `DESCRIPTION:${description}`,
    "LOCATION:Veebeez Beauty Salon, Lagos",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadICS(booking: Booking | BookingDetail) {
  const content = generateICSContent(booking);
  if (!content) return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${booking.appointment_number}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
