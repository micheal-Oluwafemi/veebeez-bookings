"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Booking, BookingStep, CartLineItem, GuestDetails, TimeSlot } from "@/types/booking";
import { isItemConfigured } from "@/types/booking";

interface BookingState {
  currentStep: BookingStep;
  selectedCollectionSlug: string | null;
  cart: CartLineItem[];
  configuringItemIndex: number | null;
  guestDetails: GuestDetails;
  confirmation: Booking | null;
  depositInput: number | null;
  // ── per-item scheduling helpers ──
  setConfiguringItemIndex: (index: number | null) => void;
  updateCartItemSchedule: (
    serviceId: number,
    patch: {
      stylist_id?: number | null;
      scheduled_at?: string | null;
      date?: Date | null;
      timeSlot?: TimeSlot | null;
    },
  ) => void;
  // ── deprecated global shims (kept for Phase 1 compat, not persisted) ──
  /** @deprecated use cart[].stylist_id — will be removed in Phase 3 */
  selectedStylistId: number | null;
  /** @deprecated use cart.every(isItemConfigured) — will be removed in Phase 3 */
  hasStylistSelection: boolean;
  /** @deprecated use cart[].scheduled_at — will be removed in Phase 3 */
  selectedDate: Date | null;
  /** @deprecated use cart[].scheduled_at — will be removed in Phase 3 */
  selectedTimeSlot: TimeSlot | null;
  setStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setCollectionSlug: (slug: string) => void;
  setStylistId: (id: number | null) => void;
  // legacy aliases
  setCollection: (slugOrCollection: string | { slug: string }) => void;
  setStylist: (stylist: { stylist_id: number } | number | null) => void;
  addToCart: (item: CartLineItem) => void;
  removeFromCart: (serviceId: number) => void;
  clearCart: () => void;
  setDate: (date: Date) => void;
  setTimeSlot: (slot: TimeSlot) => void;
  setGuestDetails: (details: Partial<GuestDetails>) => void;
  setDepositInput: (value: number | null) => void;
  confirmBooking: () => boolean;
  setConfirmation: (booking: Booking) => void;
  resetBooking: () => void;
}

type PersistedBookingState = Pick<
  BookingState,
  | "currentStep"
  | "selectedCollectionSlug"
  | "cart"
  | "configuringItemIndex"
  | "guestDetails"
  | "confirmation"
  | "depositInput"
>;

const initialGuest: GuestDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  specialRequests: "",
};

const initialBookingState: PersistedBookingState & {
  // deprecated fields live only in memory, not persisted from v7 onward
  selectedStylistId: number | null;
  hasStylistSelection: boolean;
  selectedDate: Date | null;
  selectedTimeSlot: TimeSlot | null;
} = {
  currentStep: 1,
  selectedCollectionSlug: null,
  cart: [],
  configuringItemIndex: null,
  guestDetails: initialGuest,
  confirmation: null,
  depositInput: null,
  selectedStylistId: null,
  hasStylistSelection: false,
  selectedDate: null,
  selectedTimeSlot: null,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function combineScheduledAt(date: Date, slot: TimeSlot): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${slot.value}:00`;
}

export const useBookingStore = create<BookingState>()(
  persist<BookingState, [], [], PersistedBookingState>(
    (set, get) => ({
      ...initialBookingState,

      setDepositInput: (value) => set({ depositInput: value }),

      setConfiguringItemIndex: (index) => set({ configuringItemIndex: index }),

      updateCartItemSchedule: (serviceId, patch) =>
        set((state) => {
          const idx = state.cart.findIndex((c) => c.service_id === serviceId);
          if (idx === -1) return state;
          const item = state.cart[idx];
          let nextScheduled = item.scheduled_at;
          let nextStylist = item.stylist_id;

          if ("stylist_id" in patch) {
            nextStylist = patch.stylist_id ?? null;
          }

          if ("scheduled_at" in patch) {
            nextScheduled = patch.scheduled_at ?? null;
          } else if ("date" in patch || "timeSlot" in patch) {
            const date = (patch as { date?: Date | null }).date;
            const timeSlot = (patch as { timeSlot?: TimeSlot | null }).timeSlot;
            // need both to form a complete timestamp
            if (date && timeSlot) {
              nextScheduled = combineScheduledAt(date, timeSlot);
            } else if (date === null || timeSlot === null) {
              nextScheduled = null;
            } else if (date !== undefined || timeSlot !== undefined) {
              // partial update without both parts — treat as incomplete
              // if caller sent only date without slot, clear scheduled_at until slot is chosen
              nextScheduled = null;
            }
          }

          const nextCart = [...state.cart];
          nextCart[idx] = { ...item, stylist_id: nextStylist, scheduled_at: nextScheduled };

          // keep deprecated globals in sync for legacy readers (first item mirror)
          const first = nextCart[0];
          const legacyPatch: Partial<BookingState> = {};
          if (first) {
            // mirror first item's scheduling to globals so old UI that reads globals still shows something
            if ("stylist_id" in patch || nextScheduled !== item.scheduled_at) {
              legacyPatch.selectedStylistId = first.stylist_id;
              legacyPatch.hasStylistSelection = nextCart.every(isItemConfigured);
              if (first.scheduled_at) {
                const d = new Date(first.scheduled_at.replace(" ", "T"));
                legacyPatch.selectedDate = isNaN(d.getTime()) ? null : d;
                const timePart = first.scheduled_at.split(" ")[1]?.slice(0, 5) ?? "";
                legacyPatch.selectedTimeSlot = timePart ? { value: timePart, label: timePart } : null;
              } else {
                legacyPatch.selectedDate = null;
                legacyPatch.selectedTimeSlot = null;
              }
            }
          }

          return { cart: nextCart, depositInput: null, ...legacyPatch } as unknown as Partial<BookingState>;
        }),

      setStep: (step) => {
        const { currentStep } = get();
        if (step <= currentStep) set({ currentStep: step });
      },

      nextStep: () => {
        const { currentStep, cart } = get();
        if (currentStep === 1 && cart.length === 0) return;
        // Step 2 is now "Services & Schedule" (merged Professional+DateTime).
        // Gate on every cart item having a scheduled_at (stylist null = "any" is valid).
        const allConfigured = cart.length > 0 && cart.every(isItemConfigured);
        if (currentStep === 2 && !allConfigured) return;
        if (currentStep < 3) {
          set({ currentStep: (currentStep + 1) as BookingStep });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as BookingStep });
        }
      },

      setCollectionSlug: (slug) => {
        const { selectedCollectionSlug } = get();
        if (selectedCollectionSlug === slug) return;
        set({
          selectedCollectionSlug: slug,
          cart: [],
          configuringItemIndex: null,
          confirmation: null,
          currentStep: 1,
          // clear deprecated globals to avoid stale cross-contamination
          selectedStylistId: null,
          hasStylistSelection: false,
          selectedDate: null,
          selectedTimeSlot: null,
        });
      },

      setCollection: (slugOrCollection) => {
        const slug = typeof slugOrCollection === "string" ? slugOrCollection : slugOrCollection.slug;
        const { selectedCollectionSlug } = get();
        if (selectedCollectionSlug === slug) return;
        set({
          selectedCollectionSlug: slug,
          cart: [],
          configuringItemIndex: null,
          confirmation: null,
          currentStep: 1,
          selectedStylistId: null,
          hasStylistSelection: false,
          selectedDate: null,
          selectedTimeSlot: null,
        });
      },

      setStylistId: (id) => {
        // legacy shim: apply to configuring item if open, else first item, else just set global
        const { cart, configuringItemIndex } = get();
        if (cart.length === 0) {
          set({ selectedStylistId: id, hasStylistSelection: true });
          return;
        }
        const targetIdx = configuringItemIndex !== null && configuringItemIndex < cart.length ? configuringItemIndex : 0;
        const serviceId = cart[targetIdx]?.service_id;
        if (serviceId !== undefined) {
          get().updateCartItemSchedule(serviceId, { stylist_id: id });
          // also keep global for compat
          set({ selectedStylistId: id, hasStylistSelection: true });
          return;
        }
        set({ selectedStylistId: id, hasStylistSelection: true });
      },

      setStylist: (stylist) => {
        let id: number | null = null;
        if (stylist === null) id = null;
        else if (typeof stylist === "number") id = stylist;
        else id = stylist.stylist_id;
        get().setStylistId(id);
      },

      addToCart: (item) => {
        set((state) => {
          const exists = state.cart.some((c) => c.service_id === item.service_id);
          const nextCart = exists
            ? state.cart.filter((c) => c.service_id !== item.service_id)
            : [...state.cart, { ...item, stylist_id: item.stylist_id ?? null, scheduled_at: item.scheduled_at ?? null }];

          // keep deprecated mirrors in sync (first-item mirror)
          const first = nextCart[0];
          let legacy: Partial<BookingState> = {};
          if (first) {
            legacy.hasStylistSelection = nextCart.every(isItemConfigured);
            legacy.selectedStylistId = first.stylist_id;
            if (first.scheduled_at) {
              const d = new Date(first.scheduled_at.replace(" ", "T"));
              legacy.selectedDate = isNaN(d.getTime()) ? null : d;
              const tp = first.scheduled_at.split(" ")[1]?.slice(0, 5) ?? "";
              legacy.selectedTimeSlot = tp ? { value: tp, label: tp } : null;
            } else {
              legacy.selectedDate = null;
              legacy.selectedTimeSlot = null;
            }
          } else {
            legacy = { hasStylistSelection: false, selectedStylistId: null, selectedDate: null, selectedTimeSlot: null };
          }

          // auto-point configurator to newly added item if it was an add (not remove)
          let nextConfiguring = state.configuringItemIndex;
          if (!exists && nextCart.length) {
            const addedIdx = nextCart.findIndex((c) => c.service_id === item.service_id);
            nextConfiguring = addedIdx !== -1 ? addedIdx : state.configuringItemIndex;
          } else if (exists) {
            // if we removed the configuring item, clear the pointer
            if (state.configuringItemIndex !== null && state.configuringItemIndex >= nextCart.length) {
              nextConfiguring = null;
            } else if (
              state.configuringItemIndex !== null &&
              state.cart[state.configuringItemIndex]?.service_id === item.service_id
            ) {
              nextConfiguring = null;
            }
          }

          return {
            cart: nextCart,
            depositInput: null,
            configuringItemIndex: nextConfiguring,
            ...legacy,
          } as unknown as Partial<BookingState>;
        });
      },

      removeFromCart: (serviceId) => {
        set((state) => {
          const nextCart = state.cart.filter((item) => item.service_id !== serviceId);
          let nextConfiguring = state.configuringItemIndex;
          if (state.configuringItemIndex !== null) {
            if (state.configuringItemIndex >= nextCart.length) nextConfiguring = null;
            else if (state.cart[state.configuringItemIndex]?.service_id === serviceId) nextConfiguring = null;
          }
          const first = nextCart[0];
          let legacy: Partial<BookingState> = {};
          if (first) {
            legacy.hasStylistSelection = nextCart.every(isItemConfigured);
            legacy.selectedStylistId = first.stylist_id;
            if (first.scheduled_at) {
              const d = new Date(first.scheduled_at.replace(" ", "T"));
              legacy.selectedDate = isNaN(d.getTime()) ? null : d;
              const tp = first.scheduled_at.split(" ")[1]?.slice(0, 5) ?? "";
              legacy.selectedTimeSlot = tp ? { value: tp, label: tp } : null;
            } else {
              legacy.selectedDate = null;
              legacy.selectedTimeSlot = null;
            }
          } else {
            legacy = { hasStylistSelection: false, selectedStylistId: null, selectedDate: null, selectedTimeSlot: null };
          }
          return {
            cart: nextCart,
            depositInput: null,
            configuringItemIndex: nextConfiguring,
            ...legacy,
          } as unknown as Partial<BookingState>;
        });
      },

      clearCart: () => {
        set({
          cart: [],
          depositInput: null,
          currentStep: 1,
          configuringItemIndex: null,
          hasStylistSelection: false,
          selectedStylistId: null,
          selectedDate: null,
          selectedTimeSlot: null,
        });
      },

      setDate: (date) => {
        // legacy shim: map to per-item scheduled_at (keep time if already set)
        const { cart, configuringItemIndex, selectedTimeSlot } = get();
        if (cart.length === 0) {
          set({ selectedDate: date, selectedTimeSlot: null });
          return;
        }
        const idx = configuringItemIndex !== null && configuringItemIndex < cart.length ? configuringItemIndex : 0;
        const svc = cart[idx];
        if (!svc) {
          set({ selectedDate: date, selectedTimeSlot: null });
          return;
        }
        // preserve time if we have a slot for that item or global fallback
        let slot: TimeSlot | null = null;
        if (svc.scheduled_at) {
          const tp = svc.scheduled_at.split(" ")[1]?.slice(0, 5) ?? "";
          slot = tp ? { value: tp, label: tp } : null;
        } else {
          slot = selectedTimeSlot;
        }
        if (slot) {
          get().updateCartItemSchedule(svc.service_id, { date, timeSlot: slot });
        } else {
          // date without slot = incomplete, clear scheduled_at
          get().updateCartItemSchedule(svc.service_id, { scheduled_at: null });
          set({ selectedDate: date, selectedTimeSlot: null });
        }
      },

      setTimeSlot: (slot) => {
        const { cart, configuringItemIndex, selectedDate } = get();
        if (cart.length === 0) {
          set({ selectedTimeSlot: slot });
          return;
        }
        const idx = configuringItemIndex !== null && configuringItemIndex < cart.length ? configuringItemIndex : 0;
        const svc = cart[idx];
        if (!svc) {
          set({ selectedTimeSlot: slot });
          return;
        }
        let date: Date | null = null;
        if (svc.scheduled_at) {
          const d = new Date(svc.scheduled_at.replace(" ", "T"));
          date = isNaN(d.getTime()) ? null : d;
        } else {
          date = selectedDate;
        }
        if (date) {
          get().updateCartItemSchedule(svc.service_id, { date, timeSlot: slot });
        } else {
          // slot without date = incomplete
          get().updateCartItemSchedule(svc.service_id, { scheduled_at: null });
          set({ selectedTimeSlot: slot });
        }
      },

      setGuestDetails: (details) => {
        set((state) => ({
          guestDetails: { ...state.guestDetails, ...details },
        }));
      },

      confirmBooking: () => {
        const { cart, guestDetails } = get();
        if (
          !guestDetails.firstName.trim() ||
          !guestDetails.lastName.trim() ||
          !guestDetails.email.trim() ||
          !guestDetails.phone.trim() ||
          !guestDetails.whatsappNumber.trim()
        ) {
          return false;
        }
        if (cart.length === 0 || !cart.every(isItemConfigured)) return false;
        return true;
      },

      setConfirmation: (booking) => {
        set({ confirmation: booking });
      },

      resetBooking: () => {
        set({
          ...initialBookingState,
          guestDetails: { ...initialGuest },
        });
      },
    }),
    {
      name: "veebeez-booking",
      version: 8,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedCollectionSlug: state.selectedCollectionSlug,
        cart: state.cart,
        configuringItemIndex: state.configuringItemIndex,
        guestDetails: state.guestDetails,
        confirmation: state.confirmation,
        depositInput: state.depositInput,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object" || version < 3) {
          return initialBookingState as unknown as PersistedBookingState;
        }
        const state = persistedState as PersistedBookingState & Record<string, unknown>;
        // v3->v4 step renumbering
        if (version < 4) {
          if ((state as unknown as { currentStep: number }).currentStep === 2)
            (state as unknown as { currentStep: number }).currentStep = 3;
          else if ((state as unknown as { currentStep: number }).currentStep === 3)
            (state as unknown as { currentStep: number }).currentStep = 4;
        }
        if (version < 5) {
          const gd = (state as unknown as { guestDetails?: GuestDetails }).guestDetails as unknown as Record<string, unknown> | undefined;
          if (gd && !("whatsappNumber" in gd)) {
            (state as Record<string, unknown>).guestDetails = {
              ...initialGuest,
              ...(gd as unknown as GuestDetails),
              whatsappNumber: (gd.whatsappNumber as string | undefined) ?? (gd.phone as string | undefined) ?? "",
            };
          }
        }
        if (version < 6) {
          if (!("depositInput" in (state as unknown as Record<string, unknown>))) {
            (state as Record<string, unknown>).depositInput = null;
          }
        }
        if (version < 7) {
          // Drop global scheduling fields and add per-item scheduling
          const oldCart = (state as unknown as { cart?: unknown[] }).cart ?? [];
          const cart = (Array.isArray(oldCart) ? oldCart : []).map((raw: unknown) => {
            const item = raw as Record<string, unknown>;
            return {
              ...item,
              stylist_id: typeof item.stylist_id === "number" || item.stylist_id === null ? (item.stylist_id as number | null) : null,
              scheduled_at: typeof item.scheduled_at === "string" ? (item.scheduled_at as string) : null,
            } as CartLineItem;
          });
          (state as Record<string, unknown>).cart = cart;
          if (!("configuringItemIndex" in (state as Record<string, unknown>))) {
            (state as Record<string, unknown>).configuringItemIndex = null;
          }
          // purge legacy globals if present in persisted blob
          delete (state as Record<string, unknown>).selectedStylistId;
          delete (state as Record<string, unknown>).hasStylistSelection;
          delete (state as Record<string, unknown>).selectedDate;
          delete (state as Record<string, unknown>).selectedTimeSlot;
        }
        if (version < 8) {
          // Phase 3: merged Professional+DateTime into single "Services & Schedule" step 2
          // Old 4 steps (1 Services, 2 Professional, 3 Date&Time, 4 Details) → new 3 steps (1 Services, 2 Schedule, 3 Details)
          const cs = (state as unknown as { currentStep: number }).currentStep;
          if (cs === 4) (state as unknown as { currentStep: number }).currentStep = 3;
          else if (cs === 3) (state as unknown as { currentStep: number }).currentStep = 2;
          // cs 2 stays 2, cs 1 stays 1
        }
        return state as unknown as PersistedBookingState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PersistedBookingState> & Record<string, unknown>;
        if (!persisted || Object.keys(persisted).length === 0) {
          return { ...currentState, ...initialBookingState };
        }
        // ensure cart items always have per-item scheduling fields (defensive for manually edited storage)
        let cart = (persisted.cart ?? currentState.cart) as CartLineItem[];
        if (Array.isArray(cart)) {
          cart = cart.map((item: unknown) => {
            const c = item as Record<string, unknown>;
            return {
              ...(c as object),
              stylist_id: typeof c.stylist_id === "number" || c.stylist_id === null ? (c.stylist_id as number | null) : null,
              scheduled_at: typeof c.scheduled_at === "string" ? (c.scheduled_at as string) : null,
            } as CartLineItem;
          });
        }
        return {
          ...currentState,
          ...persisted,
          cart,
          configuringItemIndex:
            typeof persisted.configuringItemIndex === "number" || persisted.configuringItemIndex === null
              ? (persisted.configuringItemIndex as number | null)
              : null,
          guestDetails: {
            ...initialGuest,
            ...persisted.guestDetails,
          },
          depositInput: persisted.depositInput ?? null,
          // deprecated globals always reset to in-memory defaults; they are not persisted and are derived from cart
          selectedStylistId: null,
          hasStylistSelection: Array.isArray(cart) && cart.length > 0 ? cart.every(isItemConfigured) : false,
          selectedDate: null,
          selectedTimeSlot: null,
        };
      },
    },
  ),
);
