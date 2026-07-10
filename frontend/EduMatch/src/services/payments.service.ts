import { api, AUTH_TOKEN_KEY } from "@/services/api";
import type { Payment, PaymentIntentionResponse } from "@/types/payment";

const LAST_PAYMOB_PAYMENT_ID_KEY = "edumatch:last-paymob-payment-id";

/**
 * Initiate payment for a session via Paymob.
 *
 * If Paymob is configured, returns a `PaymentIntentionResponse` with a
 * `checkout_url` the student should be redirected to.
 *
 * If Paymob is NOT configured (dev mode), returns a `Payment` object directly.
 */
export async function initiatePayment(sessionId: number): Promise<PaymentIntentionResponse> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/payments/session/${sessionId}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ payment_method: "paymob_card" }),
  });

  if (!response.ok) {
    let message = response.status === 400 ? "Already paid" : "Could not complete payment.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the safe fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as PaymentIntentionResponse;
}

/**
 * Check if the response from `initiatePayment` is a Paymob checkout redirect.
 */
export function isPaymentIntention(data: unknown): data is PaymentIntentionResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "checkout_url" in data &&
    "client_secret" in data
  );
}

export function redirectToPaymobCheckout(data: PaymentIntentionResponse) {
  const checkoutUrl = new URL(data.checkout_url);
  const isPaymobHost = checkoutUrl.hostname === "accept.paymob.com" || checkoutUrl.hostname.endsWith(".paymob.com");

  if (checkoutUrl.protocol !== "https:" || !isPaymobHost) {
    throw new Error("The payment provider returned an invalid checkout URL.");
  }

  sessionStorage.setItem(LAST_PAYMOB_PAYMENT_ID_KEY, String(data.payment_id));
  window.location.assign(checkoutUrl.toString());
}

export function getLastPaymobPaymentId(): string | null {
  return sessionStorage.getItem(LAST_PAYMOB_PAYMENT_ID_KEY);
}

export function clearLastPaymobPaymentId() {
  sessionStorage.removeItem(LAST_PAYMOB_PAYMENT_ID_KEY);
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
