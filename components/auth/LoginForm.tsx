"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/https";
import { loginCustomer } from "@/services/customer-auth-requests";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import type { AuthResponse } from "@/types/auth";

export default function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const setAuth = useCustomerAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      loginCustomer(body) as Promise<AuthResponse>,
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
        setError("Login succeeded but no token returned.");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
      else setError((err as Error).message ?? "Login failed");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        mutation.mutate({ email, password });
      }}
      className='space-y-4'>
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
        {mutation.isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
