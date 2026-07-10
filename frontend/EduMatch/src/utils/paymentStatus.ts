import type { PaymentStatus } from "@/types/payment";

const SUCCESS_STATUSES = new Set<PaymentStatus>(["held", "released"]);
const PENDING_STATUSES = new Set<PaymentStatus>(["pending"]);
const FAILED_STATUSES = new Set<PaymentStatus>(["cancelled", "refunded", "disputed"]);

export function isPaymentSuccessful(status: PaymentStatus) {
  return SUCCESS_STATUSES.has(status);
}

export function isPaymentPending(status: PaymentStatus) {
  return PENDING_STATUSES.has(status);
}

export function isPaymentFailed(status: PaymentStatus) {
  return FAILED_STATUSES.has(status);
}
