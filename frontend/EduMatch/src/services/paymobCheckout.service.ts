import { AUTH_TOKEN_KEY } from "@/services/api";
import type { PaymobCheckoutPayload, PaymobCheckoutResponse } from "@/types/paymobCheckout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function createPaymobIframeCheckout(payload: PaymobCheckoutPayload): Promise<PaymobCheckoutResponse> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(buildApiUrl("/api/payments/checkout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Could not start Paymob checkout.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the safe generic message.
    }
    throw new Error(message);
  }

  return (await response.json()) as PaymobCheckoutResponse;
}

export function redirectToPaymobIframe(checkout: PaymobCheckoutResponse) {
  const url = new URL(checkout.iframe_url);
  if (url.protocol !== "https:" || url.hostname !== "accept.paymob.com") {
    throw new Error("The payment provider returned an invalid iframe URL.");
  }

  window.location.assign(url.toString());
}
