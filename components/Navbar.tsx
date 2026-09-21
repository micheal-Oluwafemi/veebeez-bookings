"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import {
  Menu,
  Search,
  X,
  CalendarDays,
  ClipboardList,
  LogOut,
  ShoppingBag,
  User,
  ChevronLeft,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { useBookingStore } from "@/store/useBookingStore";
import { AnimatePresence, motion } from "framer-motion";
import LoginForm from "./auth/LoginForm";
import { CgMenuRight } from "react-icons/cg";
import RegisterForm from "./auth/RegisterForm";

const NAV_LINKS = [
  { href: "/", label: "Book Appointment", icon: CalendarDays },
  { href: "/bookings", label: "My Bookings", icon: ClipboardList },
  { href: "/faq", label: "FAQs", icon: ClipboardList },
];

// Single source of truth for the recurring brand tokens used below,
// so the palette can't drift between the desktop and mobile markup.
const COLORS = {
  bg: "#FAF7F3",
  border: "#EDE3D3",
  text: "#3A2A22",
  textMuted: "#8A6A5A",
  accent: "#A57865",
  accentDeep: "#8B5E4D",
  gold: "#C9A96E",
  danger: "#B2483B",
};

export default function Navbar() {
  const pathname = usePathname();
  const user = useCustomerAuthStore((s) => s.user);
  const token = useCustomerAuthStore((s) => s.token);
  const clearAuth = useCustomerAuthStore((s) => s.clearAuth);
  const cartCount = useBookingStore((s) => s.cart.length);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const isMobileQuery = useMediaQuery({ query: "(max-width: 767px)" });
  const isMobile = hasMounted ? isMobileQuery : false;
  const currentStep = useBookingStore((s) => s.currentStep);
  const prevStep = useBookingStore((s) => s.prevStep);
  const confirmation = useBookingStore((s) => s.confirmation);
  const showBackButton = pathname === "/" && !confirmation && currentStep > 1;

  const initials = user
    ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <>
      <header className='sticky block-spacing top-0 z-40 w-full border-b border-[#EDE3D3] bg-[#FAF7F3]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FAF7F3]/70'>
        <div className='flex h-16 items-center justify-between gap-2 md:gap-3 lg:gap-5'>
          {/* Left: Logo + Nav */}
          <div className='flex min-w-0 flex-1 items-center gap-2 md:gap-2 lg:gap-3'>
            <AnimatePresence initial={false}>
              {showBackButton && (
                <motion.div
                  key='navbar-back'
                  layout
                  initial={{ width: 0, opacity: 0, x: -12, marginRight: -12 }}
                  animate={{ width: 40, opacity: 1, x: 0, marginRight: 0 }}
                  exit={{ width: 0, opacity: 0, x: -12, marginRight: -12 }}
                  transition={{
                    duration: 0.32,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className='overflow-hidden md:hidden shrink-0'>
                  <motion.button
                    type='button'
                    onClick={() => {
                      prevStep();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    aria-label='Go back to previous step'
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    transition={{
                      duration: 0.32,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                    className='flex size-10 items-center justify-center rounded-full border border-[#EDE3D3] bg-white text-[#3A2A22] shadow-sm transition-colors hover:bg-[#FDF9F5] active:bg-[#EDE3D3]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/40'>
                    <ChevronLeft size={20} className='shrink-0' />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {showBackButton && (
                <motion.div
                  key='navbar-divider'
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.4 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  aria-hidden='true'
                  className='h-6 w-px shrink-0 origin-center bg-[#EDE3D3] md:hidden'
                />
              )}
            </AnimatePresence>

            <Link
              href='/'
              className='flex shrink-0 items-center gap-2.5 rounded-md p-1 -m-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/40'>
              <img
                src='/imgs/logo.svg'
                alt='Veebeez'
                className='h-10 w-auto object-contain'
              />
              {/* <span className='hidden font-cooper text-[19px] font-normal tracking-tight text-[#3A2A22] sm:block'>
                Veebeez
              </span> */}
            </Link>

            <nav className='hidden items-center gap-0.5 md:flex md:gap-1 lg:gap-1'>
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;
                const showBadge = link.href === "/" && cartCount > 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-1 md:gap-1.5 rounded-full px-2.5 py-2 md:px-3 lg:px-4 font-plus-jakarta-sans text-[13px] md:text-[13px] lg:text-sm tracking-tight font-medium whitespace-nowrap transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-b from-[#A57865] to-[#8B5E4D] text-white shadow-sm shadow-[#8B5E4D]/30"
                        : "text-[#8A6A5A] hover:bg-[#EDE3D3]/70 hover:text-[#A57865]"
                    }`}>
                    <Icon
                      size={14}
                      className={active ? "text-white" : "text-[#C9A96E]"}
                    />
                    <span className='hidden lg:inline'>{link.label}</span>
                    <span className='lg:hidden'>
                      {link.label === "Book Appointment"
                        ? "Book"
                        : link.label === "My Bookings"
                          ? "Bookings"
                          : link.label}
                    </span>
                    {showBadge && (
                      <span
                        className={`flex size-[18px] items-center justify-center rounded-full font-plus-jakarta-sans text-[10px] font-semibold ${
                          active
                            ? "bg-white text-[#8B5E4D]"
                            : "bg-[#A57865] text-white"
                        }`}>
                        {cartCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Auth + Search */}
          <div className='flex shrink-0 items-center gap-1.5 md:gap-2'>
            <Link
              href='/search-bookings'
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-2 md:px-3 lg:px-4 font-plus-jakarta-sans text-[13px] lg:text-sm font-medium whitespace-nowrap transition-colors duration-200 md:inline-flex ${
                pathname === "/search-bookings"
                  ? "border-[#A57865] bg-[#A57865] text-white shadow-sm"
                  : "border-[#EDE3D3] bg-white text-[#3A2A22] hover:border-[#A57865]/30 hover:bg-[#FDF9F5]"
              }`}>
              <Search
                size={13}
                className={
                  pathname === "/search-bookings"
                    ? "text-white"
                    : "text-[#A57865]"
                }
              />
              <span className='hidden lg:inline'>Find my bookings</span>
              <span className='lg:hidden'>Find</span>
            </Link>
            {token && user ? (
              <div className='hidden items-center gap-2 md:flex lg:gap-3'>
                <div className='flex items-center gap-1.5 md:gap-2 rounded-full border border-[#EDE3D3] bg-white px-2 py-1.5 shadow-sm shadow-black/[0.03]'>
                  <div className='flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#A57865] to-[#8B5E4D] font-plus-jakarta-sans text-[11px] font-semibold text-white'>
                    {initials || <User size={14} />}
                  </div>
                  <span className='hidden pr-1 font-plus-jakarta-sans text-[13px] font-medium text-[#3A2A22] lg:inline'>
                    {user.first_name}
                  </span>
                </div>
                <button
                  type='button'
                  onClick={clearAuth}
                  className='inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-[#EDE3D3] bg-white px-2.5 py-2 md:px-3 lg:px-4 font-plus-jakarta-sans text-[13px] lg:text-sm font-medium whitespace-nowrap text-[#B2483B] transition-colors duration-200 hover:border-[#B2483B]/30 hover:bg-[#B2483B]/5'>
                  <LogOut size={13} />
                  <span className='hidden lg:inline'>Sign out</span>
                  <span className='lg:hidden'>Out</span>
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
                className='hidden rounded-full bg-gradient-to-b from-[#A57865] to-[#8B5E4D] px-4 py-2 md:px-5 md:py-2.5 font-plus-jakarta-sans text-[13px] lg:text-sm font-medium tracking-[0.02em] text-white shadow-sm shadow-[#8B5E4D]/25 transition-transform duration-200 hover:brightness-105 active:scale-[0.98] md:inline-flex'>
                Sign in
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              type='button'
              onClick={() => setMobileOpen(true)}
              className='inline-flex size-9 items-center justify-center text-[#3A2A22] shadow-sm shadow-black/[0.03] transition-colors duration-200 hover:border-[#A57865]/40 md:hidden'
              aria-label='Open menu'>
              <CgMenuRight size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className='bg-[#FAF7F3] p-0 rounded-t-[30px]!'>
          <DrawerHeader className='flex flex-row items-center justify-between border-b border-[#EDE3D3] px-5 py-4'>
            <div className='flex items-center gap-2'>
              <img src='/imgs/logo.svg' alt='Veebeez' className='h-6 w-auto' />
              <DrawerTitle className='font-cooper text-base font-normal text-[#3A2A22]'>
                Veebeez
              </DrawerTitle>
            </div>
            <button
              type='button'
              onClick={() => setMobileOpen(false)}
              aria-label='Close menu'
              className='flex size-8 items-center justify-center rounded-full border border-[#EDE3D3] bg-white transition-colors duration-200 hover:bg-[#EDE3D3]/60'>
              <X size={16} />
            </button>
          </DrawerHeader>

          <div className='flex flex-col gap-2 px-3 py-4'>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              const showBadge = link.href === "/" && cartCount > 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 font-plus-jakarta-sans text-[15px] font-medium transition-colors duration-200 ${
                    active
                      ? "bg-gradient-to-b from-[#A57865] to-[#8B5E4D] text-white shadow-sm shadow-[#8B5E4D]/25"
                      : "border border-[#EDE3D3] bg-white text-[#3A2A22]"
                  }`}>
                  <Icon
                    size={16}
                    className={active ? "text-white" : "text-[#C9A96E]"}
                  />
                  {link.label}
                  {showBadge && (
                    <span
                      className={`ml-auto flex size-6 items-center justify-center rounded-full font-plus-jakarta-sans text-xs font-semibold ${
                        active
                          ? "bg-white text-[#8B5E4D]"
                          : "bg-[#A57865] text-white"
                      }`}>
                      {cartCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              href='/search-bookings'
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3.5 font-plus-jakarta-sans text-[15px] font-medium transition-colors duration-200 ${
                pathname === "/search-bookings"
                  ? "bg-gradient-to-b from-[#A57865] to-[#8B5E4D] text-white shadow-sm shadow-[#8B5E4D]/25"
                  : "border border-[#EDE3D3] bg-white text-[#3A2A22]"
              }`}>
              <Search
                size={16}
                className={
                  pathname === "/search-bookings"
                    ? "text-white"
                    : "text-[#C9A96E]"
                }
              />
              Find my bookings
            </Link>
          </div>

          <div className='border-t border-[#EDE3D3] bg-white px-4 py-4'>
            {token && user ? (
              <div className='space-y-3'>
                <div className='flex items-center gap-3 rounded-xl border border-[#EDE3D3] bg-[#FDF9F5] px-3 py-3'>
                  <div className='flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A57865] to-[#8B5E4D] text-sm font-semibold text-white'>
                    {initials}
                  </div>
                  <div className='min-w-0'>
                    <p className='truncate font-plus-jakarta-sans text-sm font-semibold text-[#3A2A22]'>
                      {user.first_name} {user.last_name}
                    </p>
                    <p className='truncate font-plus-jakarta-sans text-xs text-[#8A6A5A]'>
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    clearAuth();
                    setMobileOpen(false);
                  }}
                  className='flex w-full items-center justify-center gap-2 rounded-lg border border-[#B2483B]/25 bg-[#B2483B]/5 py-3 font-plus-jakarta-sans text-sm font-medium text-[#B2483B] transition-colors duration-200 active:bg-[#B2483B]/10'>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthMode("login");
                    setTimeout(() => setAuthOpen(true), 200);
                  }}
                  className='rounded-full bg-gradient-to-b from-[#A57865] to-[#8B5E4D] py-3 font-plus-jakarta-sans text-sm font-medium text-white shadow-sm shadow-[#8B5E4D]/25'>
                  Sign in
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthMode("register");
                    setTimeout(() => setAuthOpen(true), 200);
                  }}
                  className='rounded-full border border-[#EDE3D3] bg-white py-3 font-plus-jakarta-sans text-sm font-semibold text-[#3A2A22]'>
                  Create account
                </button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Auth — Drawer on mobile (<md), Dialog on md+ */}
      {hasMounted && isMobile ? (
        <Drawer open={authOpen} onOpenChange={setAuthOpen}>
          <DrawerContent className='bg-white p-0 rounded-t-[30px]! max-h-[92vh] overflow-y-auto'>
            <div className='mx-auto mt-3 h-1.5 w-10 rounded-full bg-[#e8ddd0]' />
            <div className='mx-auto w-full max-w-md px-6 py-8 pt-4'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='font-cooper text-2xl text-[#3A2A22]'>
                  {authMode === "login" ? "Welcome back" : "Create account"}
                </h2>
                <button
                  type='button'
                  onClick={() => setAuthOpen(false)}
                  aria-label='Close'
                  className='flex size-8 items-center justify-center rounded-full border border-[#EDE3D3] transition-colors duration-200 hover:bg-[#EDE3D3]/60'>
                  <X size={14} />
                </button>
              </div>

              {authMode === "login" ? (
                <>
                  <LoginForm onSuccess={() => setAuthOpen(false)} />
                  <p className='mt-4 text-center font-plus-jakarta-sans text-xs text-[#8A6A5A]'>
                    No account?{" "}
                    <button
                      type='button'
                      onClick={() => setAuthMode("register")}
                      className='font-semibold text-[#3A2A22] underline'>
                      Create one
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <RegisterForm onSuccess={() => setAuthOpen(false)} />
                  <p className='mt-4 text-center font-plus-jakarta-sans text-xs text-[#8A6A5A]'>
                    Already have an account?{" "}
                    <button
                      type='button'
                      onClick={() => setAuthMode("login")}
                      className='font-semibold text-[#3A2A22] underline'>
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      ) : hasMounted ? (
        <Dialog open={authOpen} onOpenChange={setAuthOpen}>
          <DialogContent className='max-h-[90vh] overflow-y-auto md:max-w-[480px] rounded-2xl p-0'>
            <div className='px-6 py-8'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='font-cooper text-2xl text-[#3A2A22]'>
                  {authMode === "login" ? "Welcome back" : "Create account"}
                </h2>
                <button
                  type='button'
                  onClick={() => setAuthOpen(false)}
                  aria-label='Close'
                  className='flex size-8 items-center justify-center rounded-full border border-[#EDE3D3] transition-colors duration-200 hover:bg-[#EDE3D3]/60'>
                  <X size={14} />
                </button>
              </div>

              {authMode === "login" ? (
                <>
                  <LoginForm onSuccess={() => setAuthOpen(false)} />
                  <p className='mt-4 text-center font-plus-jakarta-sans text-sm text-[#8A6A5A]'>
                    No account?{" "}
                    <button
                      type='button'
                      onClick={() => setAuthMode("register")}
                      className='font-semibold text-[#3A2A22] underline'>
                      Create one
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <RegisterForm onSuccess={() => setAuthOpen(false)} />
                  <p className='mt-4 text-center font-plus-jakarta-sans text-sm text-[#8A6A5A]'>
                    Already have an account?{" "}
                    <button
                      type='button'
                      onClick={() => setAuthMode("login")}
                      className='font-semibold text-[#3A2A22] underline'>
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
