import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from "lucide-react";
import { getLastPaymobPaymentId, getPaymentBySession, getPaymentStatus } from "@/services/payments.service";
import type { Payment } from "@/types/payment";
import { isPaymentFailed, isPaymentPending, isPaymentSuccessful } from "@/utils/paymentStatus";

type ResultState = "checking" | "success" | "pending" | "failed" | "error" | "missing";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 24;

function formatMoney(value: string | number | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available yet";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseNumericParam(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function ResultIcon({ state }: { state: ResultState }) {
  const classes = "mx-auto flex size-16 items-center justify-center rounded-2xl border";
  if (state === "success") {
    return (
      <div className={`${classes} border-emerald-500/20 bg-emerald-500/10 text-emerald-400`}>
        <CheckCircle2 className="size-8" />
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className={`${classes} border-red-500/20 bg-red-500/10 text-red-400`}>
        <XCircle className="size-8" />
      </div>
    );
  }
  if (state === "pending") {
    return (
      <div className={`${classes} border-amber-500/20 bg-amber-500/10 text-amber-400`}>
        <Clock3 className="size-8" />
      </div>
    );
  }
  if (state === "error" || state === "missing") {
    return (
      <div className={`${classes} border-red-500/20 bg-red-500/10 text-red-400`}>
        <AlertTriangle className="size-8" />
      </div>
    );
  }
  return (
    <div className={`${classes} border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6]`}>
      <Loader2 className="size-8 animate-spin" />
    </div>
  );
}

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const paymentId = parseNumericParam(searchParams.get("payment_id")) ?? parseNumericParam(getLastPaymobPaymentId());
  const sessionId = parseNumericParam(searchParams.get("session_id"));
  const [state, setState] = useState<ResultState>("checking");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    console.info("[PAYMENT-TRACE-FRONTEND] RESULT PAGE LOADED", {
      sessionId,
      paymentId,
      queryParams: Object.fromEntries(searchParams.entries()),
    });
  }, [paymentId, searchParams, sessionId]);

  const paymentPagePath = payment?.session_id
    ? `/student/payments/session/${payment.session_id}`
    : sessionId
      ? `/student/payments/session/${sessionId}`
      : "/student/payments";
  const sessionPath = payment?.session_id
    ? `/student/sessions/${payment.session_id}`
    : sessionId
      ? `/student/sessions/${sessionId}`
      : "/student/sessions";

  const fetchPayment = useCallback(async () => {
    if (sessionId) {
      if (paymentId) {
        console.info("[PAYMENT-TRACE-FRONTEND] STATUS REQUEST", {
          endpoint: `/payments/${paymentId}/status`,
          paymentId,
          sessionId,
          pollAttempt: attemptsRef.current,
        });
        const paymentById = await getPaymentStatus(paymentId);
        if (isPaymentSuccessful(paymentById.status) || isPaymentFailed(paymentById.status)) {
          return paymentById;
        }
      }
      console.info("[PAYMENT-TRACE-FRONTEND] STATUS REQUEST", {
        endpoint: `/payments/session/${sessionId}`,
        paymentId,
        sessionId,
        pollAttempt: attemptsRef.current,
      });
      return getPaymentBySession(sessionId);
    }
    if (paymentId) {
      console.info("[PAYMENT-TRACE-FRONTEND] STATUS REQUEST", {
        endpoint: `/payments/${paymentId}/status`,
        paymentId,
        sessionId,
        pollAttempt: attemptsRef.current,
      });
      return getPaymentStatus(paymentId);
    }
    throw new Error("missing-reference");
  }, [paymentId, sessionId]);

  const evaluatePayment = useCallback((data: Payment) => {
    setPayment(data);
    const successful = isPaymentSuccessful(data.status);
    const pending = isPaymentPending(data.status);
    const failed = isPaymentFailed(data.status);
    console.info("[PAYMENT-TRACE-FRONTEND] RAW STATUS RESPONSE", {
      status: data.status,
      paymentId: data.id,
      sessionId: data.session_id,
      pollAttempt: attemptsRef.current,
    });
    console.info("[PAYMENT-TRACE-FRONTEND] STATUS CLASSIFICATION", {
      isPending: pending,
      isSuccessful: successful,
      isFailed: failed,
    });
    if (successful) {
      setState("success");
      setMessage("Your payment was completed successfully and the session is now ready.");
      return true;
    }
    if (failed) {
      setState("failed");
      setMessage("Your payment was not completed. You can return and try again.");
      return true;
    }
    setState("checking");
    setMessage("Confirming your payment...");
    return false;
  }, []);

  const checkStatus = useCallback(
    async (resetAttempts = false) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (resetAttempts) {
        attemptsRef.current = 0;
      }
      if (!paymentId && !sessionId) {
        setState("missing");
        setMessage("No payment reference was provided. Please open your Payments page to check your latest payment status.");
        return;
      }

      attemptsRef.current += 1;
      console.info("[PAYMENT-TRACE-FRONTEND] STATUS POLL", {
        attempt: attemptsRef.current,
        paymentId,
        sessionId,
      });
      setState("checking");
      setMessage("Confirming your payment...");

      try {
        const data = await fetchPayment();
        const done = evaluatePayment(data);
        if (done) {
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.message === "missing-reference") {
          setState("missing");
          setMessage("No payment reference was provided. Please open your Payments page to check your latest payment status.");
          return;
        }
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setState("error");
          setMessage("We couldn't confirm your payment status right now.");
          return;
        }
      }

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setState("pending");
        setMessage("Your payment is still being verified. You can check your Payments page for the latest status.");
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        void checkStatus(false);
      }, POLL_INTERVAL_MS);
    },
    [evaluatePayment, fetchPayment, paymentId, sessionId],
  );

  useEffect(() => {
    void checkStatus(true);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [checkStatus]);

  const content = useMemo(() => {
    if (state === "success") {
      return {
        title: "Payment Successful",
        body: message,
      };
    }
    if (state === "failed") {
      return {
        title: "Payment Not Completed",
        body: message,
      };
    }
    if (state === "pending") {
      return {
        title: "Payment confirmation is taking longer than expected",
        body: message,
      };
    }
    if (state === "error") {
      return {
        title: "Unable to Confirm Payment",
        body: message,
      };
    }
    if (state === "missing") {
      return {
        title: "Payment Reference Missing",
        body: message,
      };
    }
    return {
      title: "Confirming your payment...",
      body: "Please wait while EduMatch checks the real payment status from the backend.",
    };
  }, [message, state]);

  return (
    <div className="min-h-screen bg-[#09090B] px-margin-mobile py-16 text-zinc-100 md:px-margin-desktop">
      <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[#8b5cf6]/10 blur-[140px]" />
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-[#27272A] bg-[#18181B] p-8 text-center shadow-[0_10px_50px_rgba(0,0,0,0.35)]">
          <ResultIcon state={state} />
          <p className="mt-6 text-label-md uppercase tracking-wide text-[#8b5cf6]">Payment Result</p>
          <h1 className="mt-2 text-headline-lg text-zinc-100">{content.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-zinc-400">{content.body}</p>

          {payment ? (
            <dl className="mt-8 grid gap-3 rounded-xl border border-[#27272A] bg-[#121214] p-4 text-left sm:grid-cols-2">
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Session</dt>
                <dd className="mt-1 text-body-sm font-medium text-zinc-100">{payment.request_title ?? `Session #${payment.session_id}`}</dd>
              </div>
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Instructor</dt>
                <dd className="mt-1 text-body-sm font-medium text-zinc-100">{payment.instructor_name ?? "Instructor"}</dd>
              </div>
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Amount</dt>
                <dd className="mt-1 text-body-sm font-medium text-zinc-100">{formatMoney(payment.total_amount)}</dd>
              </div>
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Payment Reference</dt>
                <dd className="mt-1 text-body-sm font-medium text-zinc-100">#{payment.id}</dd>
              </div>
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Status</dt>
                <dd className="mt-1 text-body-sm font-medium capitalize text-zinc-100">{payment.status}</dd>
              </div>
              <div>
                <dt className="text-label-md uppercase text-zinc-500">Paid At</dt>
                <dd className="mt-1 text-body-sm font-medium text-zinc-100">{formatDate(payment.paid_at)}</dd>
              </div>
            </dl>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {state === "success" ? (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#8b5cf6] px-5 text-body-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition hover:bg-[#7c3aed]"
                to={sessionPath}
              >
                Go to Session
              </Link>
            ) : null}

            {state === "pending" || state === "error" ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 text-body-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition hover:bg-[#7c3aed]"
                onClick={() => void checkStatus(true)}
                type="button"
              >
                <RefreshCw className="size-4" />
                Retry Status Check
              </button>
            ) : null}

            {state === "failed" ? (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#8b5cf6] px-5 text-body-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition hover:bg-[#7c3aed]"
                to={paymentPagePath}
              >
                Return to Payment
              </Link>
            ) : null}

            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#27272A] px-5 text-body-sm font-semibold text-zinc-100 transition hover:bg-white/5"
              to="/student/payments"
            >
              View Payments
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
