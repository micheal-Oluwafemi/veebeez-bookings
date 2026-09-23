"use client";

import { useState, useSyncExternalStore } from "react";
import { useMediaQuery } from "react-responsive";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquareHeart, Star, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { showToast } from "@/components/toast/app-toast";
import { ApiError } from "@/lib/https";
import { submitFeedback, type FeedbackPayload } from "@/services/feedback-requests";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { cn } from "@/lib/utils";

const NAME_MAX = 120;
const EMAIL_MAX = 255;
const MESSAGE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length > NAME_MAX) {
    errors.name = `Name must be ${NAME_MAX} characters or fewer`;
  }
  const trimmedEmail = email.trim();
  if (trimmedEmail) {
    if (trimmedEmail.length > EMAIL_MAX) {
      errors.email = `Email must be ${EMAIL_MAX} characters or fewer`;
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      errors.email = "Enter a valid email address";
    }
  }
  if (!message.trim()) {
    errors.message = "Please tell us what you think";
  } else if (message.trim().length > MESSAGE_MAX) {
    errors.message = `Message must be ${MESSAGE_MAX} characters or fewer`;
  }
  return errors;
}

const inputClass =
  "w-full rounded-lg border bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300";

// Hydration-safe "is mounted" without a setState-in-effect (server: false,
// client: true) so the mobile/desktop choice can't mismatch.
const noopSubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

export default function FeedbackFab() {
  const user = useCustomerAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const hasMounted = useSyncExternalStore(
    noopSubscribe,
    getMountedSnapshot,
    getServerSnapshot,
  );
  const isMobileQuery = useMediaQuery({ query: "(max-width: 767px)" });
  const isMobile = hasMounted ? isMobileQuery : false;

  const mutation = useMutation({
    mutationFn: (body: FeedbackPayload) => submitFeedback(body),
    onSuccess: () => {
      setOpen(false);
      showToast(
        "success",
        "Thanks for your feedback",
        "We appreciate you helping us improve.",
      );
    },
    onError: (err) => {
      showToast(
        "error",
        "Couldn't send feedback",
        err instanceof ApiError ? err.message : "Please try again in a moment.",
      );
    },
  });

  const openForm = () => {
    // Prefill name + email for signed-in customers (optional fields)
    setName(user ? `${user.first_name} ${user.last_name}`.trim() : "");
    setEmail(user?.email ?? "");
    setRating(0);
    setMessage("");
    setErrors({});
    setTouched(false);
    mutation.reset();
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(name, email, message);
    setErrors(errs);
    setTouched(true);
    if (Object.keys(errs).length) return;

    const payload: FeedbackPayload = { message: message.trim() };
    if (name.trim()) payload.name = name.trim();
    if (email.trim()) payload.email = email.trim();
    if (rating > 0) payload.rating = rating;

    mutation.mutate(payload);
  };

  const Content = (
    <div className='relative px-5 py-6 sm:px-8'>
      <button
        type='button'
        onClick={() => setOpen(false)}
        className='absolute right-4 top-4 rounded-full p-2 text-[#8a6a5a] transition hover:bg-[#f5ece4] hover:text-[#483630]'
        aria-label='Close feedback form'>
        <X size={20} />
      </button>

      <div className='pr-6'>
        <h2 className='font-cooper text-[22px] font-normal leading-tight text-[#1a1510] sm:text-[24px]'>
          Share your feedback
        </h2>
        <p className='mt-2 font-plus-jakarta-sans text-sm text-neutral-500'>
          Loved something or spotted an issue? Tell us — it only takes a minute.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='mt-6 space-y-4' noValidate>
        <div>
          <label className='mb-2 block font-good-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[#483630]'>
            Name <span className='normal-case tracking-normal text-[#8a6a5a]'>(optional)</span>
          </label>
          <input
            type='text'
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              if (touched) setErrors(validate(e.target.value, email, message));
            }}
            className={cn(inputClass, errors.name ? "border-[#9f2d20]" : "border-[#e8ddd0]")}
            placeholder='Ada'
            autoComplete='name'
          />
          {errors.name ? (
            <p className='mt-1.5 font-plus-jakarta-sans text-xs text-[#9f2d20]'>{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className='mb-2 block font-good-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[#483630]'>
            Email <span className='normal-case tracking-normal text-[#8a6a5a]'>(optional)</span>
          </label>
          <input
            type='email'
            value={email}
            maxLength={EMAIL_MAX}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched) setErrors(validate(name, e.target.value, message));
            }}
            className={cn(inputClass, errors.email ? "border-[#9f2d20]" : "border-[#e8ddd0]")}
            placeholder='ada@example.com'
            autoComplete='email'
          />
          {errors.email ? (
            <p className='mt-1.5 font-plus-jakarta-sans text-xs text-[#9f2d20]'>{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label className='mb-2 block font-good-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[#483630]'>
            Rating <span className='normal-case tracking-normal text-[#8a6a5a]'>(optional)</span>
          </label>
          <div className='flex items-center gap-1' role='radiogroup' aria-label='Rating'>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type='button'
                role='radio'
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(rating === n ? 0 : n)}
                className='rounded p-0.5 transition'>
                <Star
                  size={28}
                  className={cn(
                    "transition-colors",
                    n <= rating
                      ? "fill-[#e0a93b] text-[#e0a93b]"
                      : "text-[#d8c7b6] hover:text-[#e0a93b]",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className='mb-2 block font-good-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[#483630]'>
            Message <span className='text-[#9f2d20]'>*</span>
          </label>
          <textarea
            value={message}
            maxLength={MESSAGE_MAX}
            rows={4}
            onChange={(e) => {
              setMessage(e.target.value);
              if (touched) setErrors(validate(name, email, e.target.value));
            }}
            className={cn(
              inputClass,
              "resize-none",
              errors.message ? "border-[#9f2d20]" : "border-[#e8ddd0]",
            )}
            placeholder='Loved the service...'
          />
          <div className='mt-1.5 flex items-center justify-between gap-3'>
            {errors.message ? (
              <p className='font-plus-jakarta-sans text-xs text-[#9f2d20]'>{errors.message}</p>
            ) : (
              <span />
            )}
            <span className='font-plus-jakarta-sans text-[11px] text-[#8a6a5a]'>
              {message.trim().length}/{MESSAGE_MAX}
            </span>
          </div>
        </div>

        <button
          type='submit'
          disabled={mutation.isPending}
          className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#a57865] px-6 py-3 font-plus-jakarta-sans text-base font-medium text-white transition hover:bg-[#8e6655] disabled:opacity-50'>
          {mutation.isPending ? (
            <>
              <Loader2 size={16} className='animate-spin' /> Sending...
            </>
          ) : (
            "Send feedback"
          )}
        </button>
      </form>
    </div>
  );

  return (
    <>
      <button
        type='button'
        onClick={openForm}
        aria-label='Give feedback'
        title='Give feedback'
        className='fixed bottom-20 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-[#e8ddd0] bg-white/95 px-3.5 py-3 text-[#483630] shadow-lg shadow-black/5 backdrop-blur transition hover:border-[#a57865]/40 hover:text-[#a57865] md:bottom-6 md:left-6'>
        <MessageSquareHeart size={18} className='text-[#a57865]' />
        <span className='hidden font-plus-jakarta-sans text-sm font-medium sm:inline'>
          Feedback
        </span>
      </button>

      {hasMounted && isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent
            data-lenis-prevent
            className='rounded-t-[30px]! bg-white p-0 max-h-[92vh] overflow-y-auto'>
            <div className='mx-auto mt-3 h-1.5 w-10 rounded-full bg-[#e8ddd0]' />
            {Content}
          </DrawerContent>
        </Drawer>
      ) : hasMounted ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            data-lenis-prevent
            className='max-h-[90vh] overflow-y-auto rounded-2xl p-0 md:max-w-[480px]'>
            {Content}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
