import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { EscrowProtectionCard } from "@/components/cards/EscrowProtectionCard";
import { OrderSummaryCard } from "@/components/cards/OrderSummaryCard";
import { PaymentSuccessCard } from "@/components/cards/PaymentSuccessCard";
import { SessionPaymentDetailsCard } from "@/components/cards/SessionPaymentDetailsCard";
import { BackButton } from "@/components/ui/BackButton";
import type { PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import {
  devConfirmPayment,
  getPaymentBySession,
  getPaymentStatus,
  initiatePayment,
  isPaymentIntention,
} from "@/services/payments.service";
import { getSessionById } from "@/services/sessions.service";
import type { Payment } from "@/types/payment";
import type { Session } from "@/types/session";

function formatDate(value: string | null) {
  if (!value) {
    return "To be scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export function PaymentConfirmationPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const numericSessionId = Number.parseInt(sessionId ?? "", 10);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [session, setSession] = useState<Session | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pollingPaymentId, setPollingPaymentId] = useState<number | null>(null);

  // Check if we're returning from Paymob checkout (has payment_id in URL)
  const returnPaymentId = searchParams.get("payment_id");

  useEffect(() => {
    async function loadPaymentContext() {
      if (Number.isNaN(numericSessionId)) {
        setError("Invalid session id.");
        setLoading(false);
        return;
      }

      try {
        const sessionData = await getSessionById(numericSessionId);
        setSession(sessionData);
        try {
          const paymentData = await getPaymentBySession(numericSessionId);
          setPayment(paymentData);
          setPaymentStatus(paymentData.status);

          // If returning from Paymob and payment is still pending, start polling
          if (returnPaymentId && paymentData.status === "pending") {
            setPollingPaymentId(paymentData.id);
          }
        } catch {
          setPayment(null);
          setPaymentStatus("pending");
        }
        setError("");
      } catch {
        setError("Could not load session details. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadPaymentContext();
  }, [numericSessionId, returnPaymentId]);

  // Poll payment status after Paymob redirect
  useEffect(() => {
    if (!pollingPaymentId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 x 2s = 60s max polling
    let devConfirmAttempted = false;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const updated = await getPaymentStatus(pollingPaymentId);
          if (updated.status !== "pending") {
            setPayment(updated);
            setPaymentStatus(updated.status);
            setPollingPaymentId(null);
            return;
          }

          // After a few polls, try dev-confirm to handle the case where
          // Paymob's webhook can't reach localhost during development
          if (attempts >= 3 && !devConfirmAttempted) {
            devConfirmAttempted = true;
            try {
              const confirmed = await devConfirmPayment(pollingPaymentId);
              if (confirmed.status !== "pending") {
                setPayment(confirmed);
                setPaymentStatus(confirmed.status);
                setPollingPaymentId(null);
                return;
              }
            } catch {
              // dev-confirm not available (production) — continue polling for webhook
            }
          }
        } catch {
          // ignore polling errors
        }
        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [pollingPaymentId]);

  const paymentAmounts = useMemo(() => {
    if (payment) {
      return {
        sessionPrice: formatNumber(payment.amount),
        platformFee: formatNumber(payment.platform_fee),
        totalAmount: formatNumber(payment.total_amount),
      };
    }

    return {
      sessionPrice: formatNumber(session?.payment_amount),
      platformFee: formatNumber(session?.payment_platform_fee),
      totalAmount: formatNumber(session?.payment_total_amount),
    };
  }, [payment, session]);

  const details = {
    instructorName: session?.instructor_name ?? payment?.instructor_name ?? "Instructor",
    instructorRole: "Instructor",
    subject: session?.request_title ?? payment?.request_title ?? "Learning Session",
    duration: "60 Minutes",
    dateTime: formatDate(session?.scheduled_at ?? null),
    sessionType: session?.session_type === "offline" ? "Offline" : "Online",
    sessionMode: session?.session_mode === "group" ? "Group" : "Individual",
  };

  const handlePayNow = useCallback(async () => {
    if (Number.isNaN(numericSessionId) || paymentStatus === "held" || paymentStatus === "released") {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await initiatePayment(numericSessionId);

      if (isPaymentIntention(response)) {
        // Open Paymob checkout in a new tab
        window.open(response.checkout_url, "_blank");
        // Start polling for payment status on this tab
        setPayment({ ...payment!, id: response.payment_id } as typeof payment);
        setPollingPaymentId(response.payment_id);
        setSubmitting(false);
      } else {
        // Dev mode fallback — payment created as pending, no Paymob
        setPayment(response);
        setPaymentStatus(response.status);

        if (response.status === "pending") {
          // Auto dev-confirm for seamless local testing
          try {
            const confirmed = await devConfirmPayment(response.id);
            setPayment(confirmed);
            setPaymentStatus(confirmed.status);
          } catch {
            // Dev-confirm not available, payment stays pending
            setError(
              "Payment created as pending. Paymob is not configured. " +
                "The payment can be confirmed via the dev-confirm endpoint."
            );
          }
        }
      }
    } catch {
      setError("Could not complete payment. The request may not be waiting for payment.");
    } finally {
      setSubmitting(false);
    }
  }, [numericSessionId, paymentStatus, payment]);

  const isPolling = pollingPaymentId !== null;

  return (
    <div className="min-h-screen bg-[#0f172a] px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto max-w-6xl space-y-lg">
        <BackButton fallback={`/student/sessions/${sessionId ?? ""}`} />

        <header>
          <p className="text-label-md uppercase text-secondary">Session #{sessionId}</p>
          <h1 className="mt-xs text-headline-lg text-on-surface">Complete Payment</h1>
          <p className="mt-xs max-w-2xl text-body-sm text-on-surface-variant">
            Review session details and proceed to pay via Paymob's secure checkout.
          </p>
        </header>

        {loading ? (
          <section className="rounded-lg border border-outline-variant bg-surface-container p-lg text-body-sm text-on-surface-variant">
            Loading payment details...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-error/25 bg-error/10 p-md text-body-sm text-error">
            {error}
          </section>
        ) : null}

        {isPolling ? (
          <section className="rounded-lg border border-primary/30 bg-primary/10 p-md text-body-sm text-primary">
            <div className="flex items-center gap-sm">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Waiting for payment confirmation from Paymob...
            </div>
          </section>
        ) : null}

        {paymentStatus === "held" ? <PaymentSuccessCard sessionPath={`/student/sessions/${sessionId}`} /> : null}

        <div className="grid gap-lg xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <main className="space-y-lg">
            <SessionPaymentDetailsCard details={details} />
            <EscrowProtectionCard />

            {/* Payment method info — Paymob handles method selection on their checkout page */}
            <section className="rounded-lg border border-outline-variant bg-surface-container p-lg">
              <h2 className="text-headline-md text-on-surface">Payment Method</h2>
              <p className="mt-sm text-body-sm text-on-surface-variant">
                You will be redirected to Paymob's secure checkout page where you can choose your preferred
                payment method (credit/debit card, mobile wallet, etc.).
              </p>
              <div className="mt-md flex items-center gap-sm rounded-lg border border-primary/30 bg-primary/10 p-md">
                <svg className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-body-sm text-primary">
                  Secured by Paymob — your payment details are never stored on our servers.
                </span>
              </div>
            </section>
          </main>

          <OrderSummaryCard
            currency="EGP"
            isProcessing={submitting || isPolling}
            onPayNow={() => void handlePayNow()}
            paymentStatus={paymentStatus}
            platformFee={paymentAmounts.platformFee}
            sessionPrice={paymentAmounts.sessionPrice}
            totalAmount={paymentAmounts.totalAmount}
          />
        </div>
      </div>
    </div>
  );
}
