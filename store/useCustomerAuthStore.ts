"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Customer } from "@/types/auth";

interface CustomerAuthState {
  token: string | null;
  user: Customer | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (token: string, user: Customer) => void;
  clearAuth: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setAuth: (token, user) => {
        if (typeof window !== "undefined")
          localStorage.setItem("customerToken", token);
        set({ token, user });
      },
      clearAuth: () => {
        if (typeof window !== "undefined")
          localStorage.removeItem("customerToken");
        set({ token: null, user: null });
      },
    }),
    {
      name: "veebeez-customer-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useCustomerAuthStore.getState().setHasHydrated(true);
          return;
        }
        if (state?.token && typeof window !== "undefined") {
          localStorage.setItem("customerToken", state.token);
        }
        useCustomerAuthStore.getState().setHasHydrated(true);
      },
    },
  ),
);

// Ensure hasHydrated is true even if persist callback is missed (client mount fallback)
if (typeof window !== "undefined") {
  // Zustand persist is async; fallback sets hydrated after next tick if still false
  setTimeout(() => {
    const s = useCustomerAuthStore.getState();
    if (!s._hasHydrated) s.setHasHydrated(true);
  }, 0);
}
