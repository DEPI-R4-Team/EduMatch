import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EscrowProtectionCard } from "@/components/cards/EscrowProtectionCard";
import { OrderSummaryCard } from "@/components/cards/OrderSummaryCard";
import { PaymentSuccessCard } from "@/components/cards/PaymentSuccessCard";
import { SessionPaymentDetailsCard } from "@/components/cards/SessionPaymentDetailsCard";
import {
  PaymentMethodSelector,
  type PaymentMethod,
} from "@/components/forms/PaymentMethodSelector";
import { BackButton } from "@/components/ui/BackButton";
import type { PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { getGroupRequestById, payGroupRequest } from "@/services/groupRequests.service";
import { getPaymentBySession, payForSession } from "@/services/payments.service";
import { getSessionById } from "@/services/sessions.service";
import type { GroupRequest } from "@/types/groupRequest";
import type { Payment, PaymentMethod as ApiPaymentMethod } from "@/types/payment";
import type { Session } from "@/types/session";

function toApiPaymentMethod(method: PaymentMethod): ApiPaymentMethod {
  if (method === "wallet") {
    return "wallet_simulation";
  }
  if (method === "cash") {
    return "cash_simulation";
  }
  return "card_simulation";
}

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

function paymentMethodLabel(method: PaymentMethod) {
  if (method === "wallet") {
    return "Platform Wallet";
  }
  if (method === "cash") {
    return "Cash Simulation";
  }
  return "Credit / Debit Card";
}

export function PaymentConfirmationPage() {
  const { sessionId } = useParams();
  const numericSessionId = Number.parseInt(sessionId ?? "", 10);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [groupRequest, setGroupRequest] = useState<GroupRequest | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
  }, [numericSessionId]);

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

  async function handlePayNow() {
    if (Number.isNaN(numericSessionId) || paymentStatus === "held" || paymentStatus === "released") {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let paymentData: Payment;
      if (groupRequest) {
        const groupPayment = await payGroupRequest(groupRequest.id, toApiPaymentMethod(selectedMethod));
        paymentData = groupPayment.payment;
        setGroupRequest(groupPayment.group_request);
      } else {
        paymentData = await payForSession(numericSessionId, toApiPaymentMethod(selectedMethod));
      }
      setPayment(paymentData);
      setPaymentStatus(paymentData.status);
      setPaidMethod(selectedMethod);
    } catch {
      setError("Could not complete simulated payment. The request may not be waiting for payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto max-w-6xl space-y-lg">
        <BackButton fallback={`/student/sessions/${sessionId ?? ""}`} />

        <header>
          <p className="text-label-md uppercase text-secondary">Session #{sessionId}</p>
          <h1 className="mt-xs text-headline-lg text-zinc-100">Complete Payment</h1>
          <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
            Review session details and select a simulated payment method to confirm your booking.
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
                    <p className="mt-xs text-body-md font-semibold text-zinc-100">{groupRequest.paid_participants_count} of {groupRequest.total_required_participants}</p>
                  </div>
                  <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
                    <p className="text-label-md uppercase text-zinc-400">Your status</p>
                    <p className="mt-xs text-body-md font-semibold capitalize text-zinc-100">{groupRequest.current_user_payment_status ?? paymentStatus}</p>
                  </div>
                </div>
              </section>
            ) : null}
            <EscrowProtectionCard />
            <PaymentMethodSelector
              onSelectMethod={setSelectedMethod}
              selectedMethod={selectedMethod}
            />
            {paidMethod ? (
              <section className="rounded-lg border border-primary/30 bg-primary/10 p-md text-body-sm text-primary">
                Simulated payment completed with {paymentMethodLabel(paidMethod)}.
              </section>
            ) : null}
          </main>

          <OrderSummaryCard
            currency="EGP"
            onPayNow={() => void handlePayNow()}
            paymentStatus={submitting ? "pending" : paymentStatus}
            platformFee={paymentAmounts.platformFee}
            sessionPrice={paymentAmounts.sessionPrice}
            totalAmount={paymentAmounts.totalAmount}
          />
        </div>
      </div>
    </div>
  );
}
