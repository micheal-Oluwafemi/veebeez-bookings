/**
 * Shared helpers for the Step 2 ("Services & Schedule") wizard.
 *
 * When the user hits Continue (sidebar / mobile bar) while some services
 * are still unscheduled, we don't just block with an error — we dispatch
 * {@link FOCUS_NEXT_UNSCHEDULED_EVENT} so the wizard jumps to the next
 * service that still needs a professional + time.
 */

export const FOCUS_NEXT_UNSCHEDULED_EVENT =
  "veebeez:focus-next-unscheduled";

export function requestFocusNextUnscheduled() {
  window.dispatchEvent(new CustomEvent(FOCUS_NEXT_UNSCHEDULED_EVENT));
}

/**
 * Continue-as-next: move the wizard exactly one service forward in order
 * (mirrors the wizard's own Next button). Unlike
 * {@link FOCUS_NEXT_UNSCHEDULED_EVENT}, this does not skip ahead to the
 * next pending service — the caller decides when to use which (e.g. step
 * forward until the last service, then jump to remaining work).
 */
export const SCHEDULE_NEXT_SERVICE_EVENT = "veebeez:schedule-next-service";

export function requestNextService() {
  window.dispatchEvent(new CustomEvent(SCHEDULE_NEXT_SERVICE_EVENT));
}

/** Smooth-scroll to an element by id (Lenis-aware). No-op when missing. */
export function scrollToElementId(id: string, offset = 80): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  const lenis = (
    window as unknown as { lenis?: { scrollTo: (t: number) => void } }
  ).lenis;
  if (lenis?.scrollTo) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: "smooth" });
  return true;
}
