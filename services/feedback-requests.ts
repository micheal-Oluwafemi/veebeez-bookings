import { PostRequest } from "@/lib/https";

export interface FeedbackPayload {
  /** Optional — string, max 120 */
  name?: string;
  /** Optional — email, max 255 */
  email?: string;
  /** Optional — integer, one of 1..5 */
  rating?: number;
  /** Required — string, max 5000 */
  message: string;
}

export const submitFeedback = (body: FeedbackPayload) =>
  PostRequest("booking-system/feedback", body);
