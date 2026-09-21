export function formatCurrency(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export function formatDuration(minutes: number) {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)}day`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}hour ${mins}mins` : `${hours} hour`;
  }
  return `${minutes} mins`;
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${String(minute).padStart(2, "0")} ${suffix}`;
}
