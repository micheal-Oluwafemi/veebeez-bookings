"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";

interface RedirectToGatewayDialogProps {
  open: boolean;
}

/**
 * Blocking "don't close the tab" overlay shown while the booking is being
 * created and the user is about to be redirected to the payment gateway.
 * Driven by `reviewMutation.isPending` so it appears the instant Confirm &
 * Pay succeeds validation, across desktop sidebar / mobile bar / review
 * drawer. Non-dismissable by design — no close button, ESC, or overlay tap.
 */
export default function RedirectToGatewayDialog({
  open,
}: RedirectToGatewayDialogProps) {
  // Lock background scroll while the redirect is pending.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  if (!open) return null;

  return (
    <div
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='redirect-gateway-title'
      aria-describedby='redirect-gateway-desc'
      aria-busy='true'
      className='fixed inset-0 z-[1000] flex items-center justify-center bg-[#1a1510]/60 p-4 backdrop-blur-sm'>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className='w-full max-w-[380px] rounded-2xl border border-[#e8ddd0] bg-white p-6 text-center shadow-2xl'>
        <div className='mx-auto flex size-14 items-center justify-center rounded-full bg-[#a57865]/10'>
          <Loader2 size={26} className='animate-spin text-[#a57865]' />
        </div>

        <h2
          id='redirect-gateway-title'
          className='mt-4 font-cooper text-[20px] leading-tight font-normal text-[#483630]'>
          Redirecting you to payment…
        </h2>
        <p
          id='redirect-gateway-desc'
          className='mt-2 font-plus-jakarta-sans text-sm leading-relaxed text-[#8a6a5a]'>
          Don&apos;t close this tab. Stay tuned while we redirect you to our
          secure payment gateway.
        </p>
        <p className='mt-2 font-plus-jakarta-sans text-[11px] tracking-wide text-[#b89a85]'>
          This may take a few seconds — please keep this tab open.
        </p>

        <div
          aria-hidden='true'
          className='mt-4 flex items-center justify-center gap-1.5'>
          <span className='size-1.5 animate-bounce rounded-full bg-[#a57865] [animation-delay:0ms]' />
          <span className='size-1.5 animate-bounce rounded-full bg-[#a57865] [animation-delay:150ms]' />
          <span className='size-1.5 animate-bounce rounded-full bg-[#a57865] [animation-delay:300ms]' />
        </div>

        <p className='mt-4 flex items-center justify-center gap-1.5 font-plus-jakarta-sans text-[11px] font-medium text-[#2f6b47]'>
          <ShieldCheck size={13} />
          Secured checkout
        </p>
      </motion.div>
    </div>
  );
}
