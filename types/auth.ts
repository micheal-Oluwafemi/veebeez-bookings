export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: "customer";
  phone?: string | null;
}

export interface CustomerProfile {
  user_id: number;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  user: Customer;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  user: Customer;
  access_token: string;
  message?: string;
}
