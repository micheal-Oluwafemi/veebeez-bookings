"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/https";
import { registerCustomer } from "@/services/customer-auth-requests";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import type { AuthResponse } from "@/types/auth";

export default function RegisterForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const setAuth = useCustomerAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (body: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      phone: string;
    }) => registerCustomer(body) as Promise<AuthResponse>,
    onSuccess: (data) => {
      const res = data as unknown as {
        user: AuthResponse["user"];
        access_token: string;
      };
      const token =
        (res as { access_token?: string }).access_token ??
        (data as { access_token?: string }).access_token ??
        "";
      const user =
        (res as { user?: AuthResponse["user"] }).user ??
        (data as { user?: AuthResponse["user"] }).user ??
        (res as unknown as AuthResponse).user;
      if (token && user) {
        setAuth(token, user);
        queryClient.invalidateQueries({ queryKey: ["customer", "profile"] });
        setError("");
        onSuccess?.();
      } else {
        setError("Account created but no token returned. Please sign in.");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
      else setError((err as Error).message ?? "Registration failed");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        mutation.mutate({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
        });
      }}
      className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
            First name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg'
            placeholder='Adaeze'
          />
        </div>
        <div>
          <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
            Last name
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg'
            placeholder='Okonkwo'
          />
        </div>
      </div>
      <div>
        <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
          Email
        </label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg'
          placeholder='adaeze@example.com'
        />
      </div>
      <div>
        <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
          Phone
        </label>
        <input
          type='tel'
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg'
          placeholder='+234 800 000 0000'
        />
      </div>
      <div>
        <label className='mb-2 block font-good-sans font-medium text-[11px] uppercase tracking-[0.1em] text-[#483630]'>
          Password
        </label>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className='w-full border  bg-[#fffdf9] px-4 py-3 font-plus-jakarta-sans text-base text-[#483630] outline-none placeholder:text-[#8a6a5a]/60 focus:border-neutral-300 rounded-lg'
          placeholder='••••••••'
        />
      </div>
      {error ? (
        <p className='font-plus-jakarta-sans text-sm text-[#9f2d20]'>{error}</p>
      ) : null}
      <button
        type='submit'
        disabled={mutation.isPending}
        className='w-full rounded-md bg-primary px-6 py-3 font-plus-jakarta-sans text-base font-medium text-white transition disabled:opacity-50'>
        {mutation.isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
