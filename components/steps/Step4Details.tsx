"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCustomerProfileQueryOptions } from "@/services/customer-auth-requests";
import { useBookingStore } from "@/store/useBookingStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { ErrorState } from "@/components/ui/error-state";
import { PanelHead } from "./Step1Services";

interface Step4DetailsProps {
  reviewBeforeConfirm?: boolean;
  onReviewCart?: () => void;
}

export default function Step4Details({}: Step4DetailsProps) {
  const guestDetails = useBookingStore((s) => s.guestDetails);
  const setGuestDetails = useBookingStore((s) => s.setGuestDetails);
  const token = useCustomerAuthStore((s) => s.token);
  const user = useCustomerAuthStore((s) => s.user);
  const isAuthenticated = !!token && !!user;

  const {
    data: profileData,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
    isFetching: isProfileFetching,
  } = useQuery({
    ...getCustomerProfileQueryOptions(),
    enabled: isAuthenticated,
  });

  // Prefill whatsapp_number with registered phone if empty (editable)
  const registeredPhone = React.useMemo(() => {
    if (!profileData || typeof profileData !== "object") return "";
    const p = profileData as Record<string, unknown>;
    if (typeof p.phone === "string" && p.phone) return p.phone;
    const nested = p.user as Record<string, unknown> | undefined;
    if (nested && typeof nested.phone === "string" && nested.phone) return nested.phone;
    return "";
  }, [profileData]);

  const hasPrefilledRef = React.useRef(false);
  React.useEffect(() => {
    if (!isAuthenticated || hasPrefilledRef.current) return;
    if (!registeredPhone) return;
    if (guestDetails.whatsappNumber && guestDetails.whatsappNumber.trim()) return;
    // prefill whatsappNumber with registered phone, remain editable
    setGuestDetails({ whatsappNumber: registeredPhone });
    hasPrefilledRef.current = true;
  }, [isAuthenticated, registeredPhone, guestDetails.whatsappNumber, setGuestDetails]);

  // Reset prefill guard on logout
  React.useEffect(() => {
    if (!isAuthenticated) hasPrefilledRef.current = false;
  }, [isAuthenticated]);

  return (
    <div>
      <PanelHead
        eyebrow='Your Details'
        title='Almost there'
        sub='Just a few details and your appointment is ready.'
      />

      {isAuthenticated ? (
        <div className='mb-6 flex items-center justify-between rounded-xl border border-[#a57865]/20 bg-[#fdf9f5] px-4 py-3'>
          <p className='font-plus-jakarta-sans text-sm text-[#483630]'>
            Signed in as{" "}
            <span className='font-semibold'>
              {user?.first_name} {user?.last_name}
            </span>{" "}
            ({user?.email})
          </p>

          {/* <button
            type='button'
            onClick={clearAuth}
            className='font-plus-jakarta-sans text-xs uppercase tracking-[0.1em] text-[#9f2d20] hover:text-[#6b1a10]'>
            Sign out
          </button> */}
        </div>
      ) : null}

      {isAuthenticated && isProfileError ? (
        <div className='mb-6'>
          <ErrorState
            variant='inline'
            title='Profile unavailable'
            message="We couldn't load your profile for autofill. You can still continue — or try again."
            error={profileError}
            onRetry={() => refetchProfile()}
            retryLabel={isProfileFetching ? "Retrying..." : "Try again"}
          />
        </div>
      ) : null}

      {!isAuthenticated ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field
            label='First Name'
            value={guestDetails.firstName}
            onChange={(v) => setGuestDetails({ firstName: v })}
            placeholder='e.g. Adaeze'
            required
          />
          <Field
            label='Last Name'
            value={guestDetails.lastName}
            onChange={(v) => setGuestDetails({ lastName: v })}
            placeholder='e.g. Okonkwo'
            required
          />
          <Field
            label='Email Address'
            value={guestDetails.email}
            onChange={(v) => setGuestDetails({ email: v })}
            placeholder='adaeze@example.com'
            className='sm:col-span-2'
            type='email'
            required
          />
          <Field
            label='Phone Number'
            value={guestDetails.phone}
            onChange={(v) => setGuestDetails({ phone: v })}
            placeholder='+234 800 000 0000'
            className='sm:col-span-2'
            type='tel'
            required
          />
          <Field
            label='WhatsApp Number'
            value={guestDetails.whatsappNumber}
            onChange={(v) => setGuestDetails({ whatsappNumber: v })}
            placeholder='09161689303'
            className='sm:col-span-2'
            type='tel'
            required
          />
          <div className='sm:col-span-2'>
            <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
              Special Requests
            </label>
            <textarea
              value={guestDetails.specialRequests}
              onChange={(e) =>
                setGuestDetails({ specialRequests: e.target.value })
              }
              placeholder='Hair length, preferences, allergies - anything your stylist should know'
              className='w-full h-28 border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-neutral-400 focus:border-neutral-300 rounded-lg'
            />
          </div>
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field
            label='WhatsApp Number'
            value={guestDetails.whatsappNumber}
            onChange={(v) => setGuestDetails({ whatsappNumber: v })}
            placeholder='09161689303'
            className='sm:col-span-2'
            type='tel'
            required
          />
          <div className='sm:col-span-2'>
            <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
              Special Requests
            </label>
            <textarea
              value={guestDetails.specialRequests}
              onChange={(e) =>
                setGuestDetails({ specialRequests: e.target.value })
              }
              placeholder='WhatsApp prefilled from your phone — editable'
              className='w-full h-28 border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-neutral-400 focus:border-neutral-300 rounded-lg'
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
        {label} {required && <span className='text-[#9f2d20]'>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-[16.1px] text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg aria-[invalid=true]:border-[#9f2d20] focus:aria-[invalid=true]:border-[#9f2d20]'
      />
    </div>
  );
}
