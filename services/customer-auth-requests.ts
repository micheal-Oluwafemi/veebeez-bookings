import { queryOptions } from "@tanstack/react-query";
import { GetRequest, PostRequest } from "@/lib/https";
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from "@/types/auth";

export const registerCustomer = (body: RegisterPayload) =>
  PostRequest<AuthResponse>("customer-auth/register", body);
export const loginCustomer = (body: LoginPayload) =>
  PostRequest<AuthResponse>("customer-auth/login", body);
export const logoutCustomer = () => PostRequest("customer-auth/logout");
export const forgotPassword = (body: ForgotPasswordPayload) =>
  PostRequest("customer-auth/forgot-password", body);
export const resetPassword = (body: ResetPasswordPayload) =>
  PostRequest("customer-auth/reset-password", body);

export const getCustomerProfileQueryOptions = () =>
  queryOptions({
    queryKey: ["customer", "profile"] as const,
    queryFn: async () => {
      const res = (await GetRequest("customer-auth/me")) as { data: unknown };
      // handle both {data: user} and direct user
      const data = (res as { data: unknown }).data ?? res;
      return data as unknown;
    },
    staleTime: 1000 * 60 * 5,
  });
