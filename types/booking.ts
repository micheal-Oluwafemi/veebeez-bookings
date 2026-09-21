export type BookingStep = 1 | 2 | 3;
export type PricingType = "fixed" | "starting_at";

// ── API-native collection / category / service shapes ──

export interface Option {
  option_id: number;
  value: string;
  label: string;
  extra_cost: number | null;
  follow_up_question: Question | null;
}

export interface Question {
  question_id: number;
  slug: string;
  prompt: string;
  is_required: boolean;
  sort_order?: number;
  options: Option[];
}

// Service in collection-detail listing (has_questions flag, no questions array)
export interface ServiceListItem {
  service_id: number;
  slug: string;
  name: string;
  price: number | string;
  currency: string;
  duration_minutes: number;
  is_deposit_required: boolean;
  pricing_type: PricingType;
  has_questions: boolean;
  has_description?: boolean;
  // legacy compat — remove in Phase 10 after data/booking.ts is deleted
  id?: string;
  priceCurrency?: string;
  durationMinutes?: number;
  isDepositRequired?: boolean;
  isPublic?: boolean;
  pricingType?: PricingType;
  questions?: unknown;
}

// Service detail (full questions tree)
export interface ServiceDetail {
  service_id: number;
  slug: string;
  name: string;
  description: string | null;
  price: number | string;
  currency: string;
  duration_minutes: number;
  is_deposit_required: boolean;
  pricing_type: PricingType;
  meta_title: string | null;
  meta_description: string | null;
  category_slug: string;
  collection_slug: string;
  questions: Question[];
}

// Back-compat alias for places that used Service before — points to detail shape
export type Service = ServiceDetail;

export interface Category {
  category_id: number;
  slug: string;
  name: string;
  description: string | null;
  services: ServiceListItem[];
  // legacy compat
  id?: string;
}

export interface Collection {
  collection_id: number;
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  icon: string;
  sort_order?: number;
  meta_title: string | null;
  meta_description: string | null;
  category_count?: number;
  service_count?: number;
  categories?: Category[];
  // legacy compat
  id?: string;
  img?: string;
}

export interface Stylist {
  stylist_id: number;
  slug: string;
  display_name: string;
  title: string;
  bio: string | null;
  initials: string;
  avatar_path: string | null;
  avatar_url: string | null;
  accent: string | null;
  service_slugs: string[];
  // legacy compat
  id?: string;
  name?: string;
  role?: string;
  img?: string;
}

// ── Salon hours (array, not Record) ──

export interface SalonHour {
  id: number;
  day_of_week: number; // 0=Sun … 6=Sat (matches JS Date.getDay())
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  updated_at?: string;
}

// kept for internal calendar helper; not from API
export interface DayHours {
  open: string | null;
  close: string | null;
  closed: boolean;
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WeekHours = Record<Weekday, DayHours>;

// UI-only derived
export interface TimeSlot {
  label: string;
  value: string;
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  specialRequests: string;
}

// ── Calendar ──

export interface CalendarInterval {
  start: string;
  end: string;
}

export interface CalendarStylistAvailability {
  stylist_id: number;
  stylist_slug: string;
  blocked: boolean;
  blocked_reason: string | null;
  intervals: CalendarInterval[] | null;
}

export interface CalendarDay {
  day: string;
  stylist_id: number | null;
  stylist_slug: string;
  day_of_week: number;
  salon_closed: boolean;
  available: boolean;
  blocked: boolean;
  blocked_reason: string | null;
  intervals: CalendarInterval[] | null;
  stylists: CalendarStylistAvailability[] | null;
}

export interface CalendarResponse {
  start_date: string;
  end_date: string;
  stylist_id: number | null;
  days: CalendarDay[];
}

// ── Cart / booking ──

export interface CartAnswer {
  option_id: number;
  label: string;
  value: string;
  extra_cost: number | null;
}

export interface CartLineItem {
  service_id: number;
  service_slug: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  duration_minutes: number;
  category_id: number;
  category_name: string;
  collection_id: number;
  collection_name: string;
  answers: CartAnswer[];
  // per-service scheduling — null = not yet configured; stylist_id null = "any" (valid), scheduled_at null = needs time
  stylist_id: number | null;
  scheduled_at: string | null; // "Y-m-d H:i:s"
}

export function isItemConfigured(item: CartLineItem): boolean {
  return item.scheduled_at !== null;
}

export interface BookingPayload {
  items: {
    service_id: number;
    quantity: number;
    answers: { option_id: number }[];
    stylist_id?: number | null;
    scheduled_at: string;
  }[];
  currency: string;
  amount?: number;
  guest_email?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_phone?: string;
  whatsapp_number?: string;
  notes?: string;
}

export interface ReschedulePayload {
  services: { line_id: number; scheduled_at: string; stylist_id?: number | null }[];
  notes?: string;
}

// ── Quote ──

export interface QuoteRequest {
  items: { service_id: number; quantity: number; answers: { option_id: number }[] }[];
  currency?: string;
}

export interface QuoteLine {
  name: string;
  quantity: number;
  tax_rate?: number | null;
  extra_cost: number;
  line_total: number;
  service_id: number;
  tax_amount?: number | null;
  unit_price: number;
  duration_minutes: number;
  questions?: unknown[];
}

export interface QuoteResponse {
  lines: QuoteLine[];
  currency: string;
  subtotal: number;
  tax_amount?: number | null;
  extra_amount: number;
  total_amount: number;
  deposit_amount: number;
  duration_minutes: number;
}

export interface CreateBookingResponse {
  data: Booking & { payment_link?: string; checkout_url?: string };
  payment_link?: string;
  checkout_url?: string;
  amount?: number;
  minimum_due?: number;
  message?: string;
}

export interface BookingServiceLine {
  line_id: number;
  service_id: number;
  service_name: string;
  quantity: number;
  unit_price: number;
  extra_cost: number;
  line_total: number;
  duration_minutes: number;
  stylist_id: number | null;
  stylist_slug: string | null;
  stylist_name: string | null;
  scheduled_at: string | null;
  answers: {
    id: number;
    question_id: number;
    question_slug: string;
    prompt: string;
    option_id: number;
    value: string;
    value_text: string;
    extra_cost: number;
    answer_path: string;
  }[];
}

export interface BookingPayment {
  amount: number;
  status: string;
  gateway: string;
  paid_at: string;
  currency: string;
  net_amount: number;
  payment_id: number;
  gateway_fee: number;
  payment_method: string;
  gateway_reference: string;
}

export interface Booking {
  appointment_id: number;
  appointment_number: string;
  customer_id: number | null;
  guest_email: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_phone: string | null;
  whatsapp_number?: string | null;
  stylist_id: number | null;
  stylist_slug: string | null;
  stylist_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  currency: string;
  subtotal: string;
  extra_amount: string;
  deposit_amount: string;
  total_amount: string;
  notes: string | null;
  created_at: string;
  services: BookingServiceLine[];
  payments: BookingPayment[];
  payment_link: string | null;
}

// Detailed singular booking may also have guest fields even when logged-in
export type BookingDetail = Booking;

// legacy alias — ConfirmationScreen now reads Booking directly
export type BookingConfirmation = Booking;

export interface CartContext {
  categoryId: number;
  categoryName: string;
  collectionId: number;
  collectionName: string;
}

// ── Legacy compat (remove in Phase 10) ──
export type QuestionValue = string;
export interface AnswerOption {
  value: QuestionValue;
  label: string;
  extraCost: number | null;
  followUp?: ConditionalQuestion;
}
export interface ConditionalQuestion {
  id: string;
  prompt: string;
  required: boolean;
  options: AnswerOption[];
}
export interface AnsweredQuestion {
  questionId: string;
  prompt: string;
  chosenValue: QuestionValue;
  chosenLabel: string;
  extraCost: number;
}
export interface CartItem extends CartLineItem {
  // legacy aliases for old store/cart code
  serviceId: string;
  serviceName: string;
  categoryId: string | number;
  categoryName: string;
  collectionId: string | number;
  collectionName: string;
  pricingType: PricingType;
  isDepositRequired: boolean;
  basePrice: number;
  extraCost: number;
  totalPrice: number;
  durationMinutes: number;
  answeredQuestions: AnsweredQuestion[];
}
