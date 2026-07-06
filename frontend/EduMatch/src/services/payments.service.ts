import { api } from "@/services/api";
import type { Payment, PaymentIntentionResponse } from "@/types/payment";

/**
 * Initiate payment for a session via Paymob.
 *
 * If Paymob is configured, returns a `PaymentIntentionResponse` with a
 * `checkout_url` the student should be redirected to.
 *
 * If Paymob is NOT configured (dev mode), returns a `Payment` object directly.
 */
export async function initiatePayment(sessionId: number): Promise<PaymentIntentionResponse | Payment> {
  const response = await api.post<PaymentIntentionResponse | Payment>(`/payments/session/${sessionId}/pay`, {
    payment_method: "paymob_card",
  });
  return response.data;
}

/**
 * Check if the response from `initiatePayment` is a Paymob checkout redirect.
 */
export function isPaymentIntention(data: PaymentIntentionResponse | Payment): data is PaymentIntentionResponse {
  return "checkout_url" in data && "client_secret" in data;
}

/**
 * Poll payment status after Paymob redirect.
 */
export async function getPaymentStatus(paymentId: number): Promise<Payment> {
  const response = await api.get<Payment>(`/payments/${paymentId}/status`);
  return response.data;
}

/**
 * Dev-only: confirm a pending payment without Paymob webhook.
 */
export async function devConfirmPayment(paymentId: number): Promise<Payment> {
  const response = await api.post<Payment>(`/payments/${paymentId}/dev-confirm`);
  return response.data;
}

export async function getMyPayments(): Promise<Payment[]> {
  const response = await api.get<Payment[]>("/payments/my");
  return response.data;
}

export async function getPaymentBySession(sessionId: number): Promise<Payment> {
  const response = await api.get<Payment>(`/payments/session/${sessionId}`);
  return response.data;
}

export async function releasePayment(paymentId: number): Promise<Payment> {
  const response = await api.post<Payment>(`/payments/${paymentId}/release`);
  return response.data;
}
