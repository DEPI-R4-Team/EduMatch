import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { EscrowProtectionCard } from "@/components/cards/EscrowProtectionCard";
import { OrderSummaryCard } from "@/components/cards/OrderSummaryCard";
import { PaymentSuccessCard } from "@/components/cards/PaymentSuccessCard";
import { SessionPaymentDetailsCard } from "@/components/cards/SessionPaymentDetailsCard";
import { BackButton } from "@/components/ui/BackButton";
import type { PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { getGroupRequestById, payGroupRequest } from "@/services/groupRequests.service";
import {
  devConfirmPayment,
  getPaymentBySession,
  getPaymentStatus,
  initiatePayment,
  isPaymentIntention,
  redirectToPaymobCheckout,
} from "@/services/payments.service";
import { getSessionById } from "@/services/sessions.service";
import type { GroupPaymentResponse, GroupRequest } from "@/types/groupRequest";
import type { Payment, PaymentIntentionResponse } from "@/types/payment";
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

function isGroupPaymentResponse(data: Payment | GroupPaymentResponse | PaymentIntentionResponse): data is GroupPaymentResponse {
  return "payment" in data && "group_request" in data;
}

export function PaymentConfirmationPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const numericSessionId = Number.parseInt(sessionId ?? "", 10);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [session, setSession] = useState<Session | null>(null);
  const [groupRequest, setGroupRequest] = useState<GroupRequest | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pollingPaymentId, setPollingPaymentId] = useState<number | null>(null);
  const paymentRequestInFlight = useRef(false);

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
        if (sessionData.session_mode === "group") {
          setGroupRequest(await getGroupRequestById(sessionData.request_id));
        } else {
          setGroupRequest(null);
        }

        try {
          const paymentData = await getPaymentBySession(numericSessionId);
          setPayment(paymentData);
          setPaymentStatus(paymentData.status);
          if (returnPaymentId && paymentData.status === "pending") {
            setPollingPaymentId(paymentData.id);
          }
        } catch {
          setPayment(null);
          setPaymentStatus("unpaid");
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

  useEffect(() => {
    if (!pollingPaymentId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

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
        } catch {
          // Keep polling briefly while Paymob/webhook settles.
        }
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
    if (groupRequest) {
      const amount = formatNumber(groupRequest.final_price_per_student ?? groupRequest.current_price_per_student);
      const platformFee = Number((amount * 0.1).toFixed(2));
      return {
        sessionPrice: amount,
        platformFee,
        totalAmount: amount + platformFee,
      };
    }

    return {
      sessionPrice: formatNumber(session?.payment_amount),
      platformFee: formatNumber(session?.payment_platform_fee),
      totalAmount: formatNumber(session?.payment_total_amount),
    };
  }, [groupRequest, payment, session]);

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
    if (
      paymentRequestInFlight.current ||
      Number.isNaN(numericSessionId) ||
      paymentStatus === "held" ||
      paymentStatus === "released"
    ) {
      return;
    }

    paymentRequestInFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = groupRequest ? await payGroupRequest(groupRequest.id) : await initiatePayment(numericSessionId);

      if (isPaymentIntention(response)) {
        redirectToPaymobCheckout(response);
        setPollingPaymentId(response.payment_id);
        return;
      }

      if (isGroupPaymentResponse(response)) {
        setPayment(response.payment);
        setPaymentStatus(response.payment.status);
        setGroupRequest(response.group_request);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment. The request may not be waiting for payment.");
    } finally {
      paymentRequestInFlight.current = false;
      setSubmitting(false);
    }
  }, [groupRequest, numericSessionId, paymentStatus]);

  const isPolling = pollingPaymentId !== null;

  return (
    <div className="min-h-screen bg-[#0f172a] px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto max-w-6xl space-y-lg">
        <BackButton fallback={`/student/sessions/${sessionId ?? ""}`} />

        <header>
          <p className="text-label-md uppercase text-secondary">Session #{sessionId}</p>
          <h1 className="mt-xs text-headline-lg text-zinc-100">Complete Payment</h1>
          <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
            Review session details and proceed to pay via Paymob's secure checkout.
          </p>
        </header>

        {loading ? (
          <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg text-body-sm text-zinc-400">
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
            {import.meta.env.DEV && pollingPaymentId ? (
              <button
                className="mt-md inline-flex h-9 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary hover:bg-primary/90"
                onClick={async () => {
                  try {
                    const confirmed = await devConfirmPayment(pollingPaymentId);
                    setPayment(confirmed);
                    setPaymentStatus(confirmed.status);
                    setPollingPaymentId(null);
                  } catch (err) {
                    console.error("Dev confirm failed", err);
                  }
                }}
                type="button"
              >
                Dev: Simulate Webhook Success
              </button>
            ) : null}
          </section>
        ) : null}

        {paymentStatus === "held" ? <PaymentSuccessCard sessionPath={`/student/sessions/${sessionId}`} /> : null}

        <div className="grid gap-lg xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <main className="space-y-lg">
            <SessionPaymentDetailsCard details={details} />
            {groupRequest ? (
              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <p className="text-label-md uppercase text-secondary">Group Session Payment</p>
                <h2 className="mt-xs text-headline-md text-zinc-100">Your group share</h2>
                <div className="mt-md grid gap-md sm:grid-cols-3">
                  <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
                    <p className="text-label-md uppercase text-zinc-400">Your amount</p>
                    <p className="mt-xs text-body-md font-semibold text-zinc-100">{paymentAmounts.sessionPrice.toFixed(2)} EGP</p>
                  </div>
                  <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
                    <p className="text-label-md uppercase text-zinc-400">Participants paid</p>
                    <p className="mt-xs text-body-md font-semibold text-zinc-100">
                      {groupRequest.paid_participants_count} of {groupRequest.total_required_participants}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
                    <p className="text-label-md uppercase text-zinc-400">Your status</p>
                    <p className="mt-xs text-body-md font-semibold capitalize text-zinc-100">
                      {groupRequest.current_user_payment_status ?? paymentStatus}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
            <EscrowProtectionCard />

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Payment Method</h2>
              <p className="mt-sm text-body-sm text-zinc-400">
                You will be redirected to Paymob's secure checkout page where you can choose your preferred
                payment method (credit/debit card, mobile wallet, etc.).
              </p>
              <div className="mt-md flex items-center gap-sm rounded-lg border border-primary/30 bg-primary/10 p-md">
                <svg className="size-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-body-sm text-primary">
                  Secured by Paymob - your payment details are never stored on our servers.
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
