"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface AuthGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestContinue: () => void;
}

export default function AuthGate({
  open,
  onOpenChange,
  onGuestContinue,
}: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const isMobileQuery = useMediaQuery({ query: "(max-width: 767px)" });
  const isMobile = hasMounted ? isMobileQuery : false;

  const handleLoginSuccess = () => {
    onOpenChange(false);
    // small delay to let dialog close then proceed
    setTimeout(() => onGuestContinue(), 300);
  };

  const handleGuest = () => {
    onOpenChange(false);
    setTimeout(() => onGuestContinue(), 200);
  };

  const Content = (
    <div className='px-5 py-6 sm:px-8'>
      <button
        type='button'
        onClick={() => onOpenChange(false)}
        className='absolute right-4 top-4 rounded-full p-2 text-[#8a6a5a] hover:bg-[#f5ece4] hover:text-[#483630]'
        aria-label='Close'>
        <X size={20} />
      </button>

      <div className='pr-6'>
        <h2 className='font-cooper text-[22px] font-normal leading-tight text-[#1a1510] sm:text-[24px]'>
          Log in or sign up to book
        </h2>
        <p className='mt-2 font-plus-jakarta-sans text-sm text-neutral-500'>
          We&apos;ll need to verify it&apos;s you to continue
        </p>
      </div>

      <div className='mt-6'>
        {mode === "login" ? (
          <>
            <LoginForm onSuccess={handleLoginSuccess} />
            <p className='mt-3 text-center font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
              Don&apos;t have an account?{" "}
              <button
                type='button'
                onClick={() => setMode("register")}
                className='font-semibold text-[#a57865] underline'>
                Create one
              </button>
            </p>
          </>
        ) : (
          <>
            <RegisterForm onSuccess={handleLoginSuccess} />
            <p className='mt-3 text-center font-plus-jakarta-sans text-sm text-[#8a6a5a]'>
              Already have an account?{" "}
              <button
                type='button'
                onClick={() => setMode("login")}
                className='font-semibold text-[#a57865] underline'>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>

      <div className='my-6 flex items-center gap-4'>
        <span className='h-px flex-1 bg-[#e8ddd0]' />
        <span className='font-plus-jakarta-sans text-xs uppercase tracking-[0.15em] text-[#8a6a5a]'>
          OR
        </span>
        <span className='h-px flex-1 bg-[#e8ddd0]' />
      </div>

      <button
        type='button'
        onClick={handleGuest}
        className='w-full rounded-lg border border-[#e8ddd0] bg-white px-6 py-3 font-plus-jakarta-sans text-sm font-medium text-[#483630] transition hover:bg-[#fdf9f5]'>
        Continue as guest
      </button>
    </div>
  );

  if (!hasMounted) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='rounded-t-[30px]! bg-white p-0 max-h-[92vh] overflow-y-auto'>
          <div className='mx-auto mt-3 h-1.5 w-10 rounded-full bg-[#e8ddd0]' />
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto md:max-w-[480px] rounded-2xl p-0'>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
