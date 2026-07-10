import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clearLastPaymobPaymentId, devConfirmPayment, getLastPaymobPaymentId, getPaymentStatus } from "@/services/payments.service";
import type { Payment } from "@/types/payment";

/**
 * This page is where Paymob redirects the student after checkout.
 * Route: /student/payment/callback?payment_id=123
 *
 * It polls the payment status and redirects to the appropriate page.
 */
export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") ?? getLastPaymobPaymentId();
  const [status, setStatus] = useState<string>("checking");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setError("No payment ID found in the URL.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const data = await getPaymentStatus(Number(paymentId));
          setPayment(data);

          if (data.status === "held" || data.status === "released") {
            clearLastPaymobPaymentId();
            setStatus("success");
            // Redirect to the payment confirmation page after a brief delay
            setTimeout(() => {
              if (!cancelled) {
                navigate(`/student/payments/session/${data.session_id}?payment_id=${data.id}`, {
                  replace: true,
                });
              }
            }, 2000);
            return;
          } else if (data.status === "cancelled") {
            clearLastPaymobPaymentId();
            setStatus("failed");
            return;
          }
        } catch {
          // ignore errors and retry
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setStatus("timeout");
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [paymentId, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-margin-mobile">
      <div className="mx-auto w-full max-w-md space-y-lg text-center">
        {status === "checking" && (
          <div className="space-y-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15">
              <svg className="size-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h1 className="text-headline-lg text-on-surface">Processing Payment</h1>
            <p className="text-body-sm text-on-surface-variant">
              Please wait while we confirm your payment with Paymob...
            </p>
            {import.meta.env.DEV && paymentId && (
              <button
                className="mt-md inline-flex h-9 items-center justify-center rounded-md bg-secondary px-sm text-body-sm font-medium text-on-secondary hover:bg-secondary/90"
                onClick={async () => {
                  try {
                    const confirmed = await devConfirmPayment(Number(paymentId));
                    setPayment(confirmed);
                    if (confirmed.status === "held" || confirmed.status === "released") {
                      clearLastPaymobPaymentId();
                      setStatus("success");
                      setTimeout(() => {
                        navigate(`/student/payments/session/${confirmed.session_id}?payment_id=${confirmed.id}`, { replace: true });
                      }, 2000);
                    }
                  } catch (err) {
                    console.error("Dev confirm failed", err);
                  }
                }}
                type="button"
              >
                Dev: Simulate Webhook Success
              </button>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="space-y-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500/15">
              <svg className="size-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-headline-lg text-on-surface">Payment Successful!</h1>
            <p className="text-body-sm text-on-surface-variant">
              Your payment has been confirmed. Redirecting you back to your session...
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-error/15">
              <svg className="size-8 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-headline-lg text-on-surface">Payment Failed</h1>
            <p className="text-body-sm text-on-surface-variant">
              Your payment could not be processed. Please try again.
            </p>
            <button
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-lg text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
              onClick={() => {
                if (payment) {
                  navigate(`/student/payments/session/${payment.session_id}`, { replace: true });
                } else {
                  navigate("/student/payments", { replace: true });
                }
              }}
              type="button"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "timeout" && (
          <div className="space-y-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-yellow-500/15">
              <svg className="size-8 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-headline-lg text-on-surface">Still Processing</h1>
            <p className="text-body-sm text-on-surface-variant">
              Your payment is still being processed. You can check the status on your payments page.
            </p>
            {import.meta.env.DEV && paymentId && (
              <button
                className="mt-md inline-flex h-11 w-full items-center justify-center rounded-md bg-secondary px-lg text-body-sm font-medium text-on-secondary hover:bg-secondary/90"
                onClick={async () => {
                  try {
                    const confirmed = await devConfirmPayment(Number(paymentId));
                    setPayment(confirmed);
                    if (confirmed.status === "held" || confirmed.status === "released") {
                      clearLastPaymobPaymentId();
                      setStatus("success");
                      setTimeout(() => {
                        navigate(`/student/payments/session/${confirmed.session_id}?payment_id=${confirmed.id}`, { replace: true });
                      }, 2000);
                    }
                  } catch (err) {
                    console.error("Dev confirm failed", err);
                  }
                }}
                type="button"
              >
                Dev: Simulate Webhook Success
              </button>
            )}
            <button
              className="mt-sm inline-flex h-11 items-center justify-center rounded-md border border-outline-variant px-lg text-body-sm font-medium text-on-surface transition hover:bg-surface-container-high"
              onClick={() => navigate("/student/payments", { replace: true })}
              type="button"
            >
              Go to Payments
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-error/15">
              <svg className="size-8 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-headline-lg text-on-surface">Something Went Wrong</h1>
            <p className="text-body-sm text-on-surface-variant">{error || "An unknown error occurred."}</p>
            <button
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-lg text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
              onClick={() => navigate("/student/payments", { replace: true })}
              type="button"
            >
              Go to Payments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
