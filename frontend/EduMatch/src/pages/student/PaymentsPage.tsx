import {
  BadgeDollarSign,
  CircleDollarSign,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HeldPaymentCard, type HeldPayment } from "@/components/cards/HeldPaymentCard";
import { PaymentSummaryCard } from "@/components/cards/PaymentSummaryCard";
import {
  StudentPaymentRequiredCard,
  type PendingPayment,
} from "@/components/cards/StudentPaymentRequiredCard";
import {
  PaymentHistoryTable,
  type PaymentHistoryRow,
} from "@/components/tables/PaymentHistoryTable";
import { getMyPayments } from "@/services/payments.service";
import { getMySessions } from "@/services/sessions.service";
import type { Payment } from "@/types/payment";
import type { Session } from "@/types/session";

const protectionSteps = [
  "Instructor Accepts",
  "Student Pays",
  "Platform Holds",
  "Session Completed",
  "Payment Released",
];

function formatMoney(value: string | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not paid yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function mapPendingSession(session: Session): PendingPayment {
  return {
    id: `session-${session.id}`,
    sessionId: String(session.id),
    session: session.request_title ?? "Learning Session",
    instructor: session.instructor_name ?? "Instructor",
    sessionPrice: formatMoney(session.payment_amount),
    platformFee: formatMoney(session.payment_platform_fee),
    total: formatMoney(session.payment_total_amount),
    status: "pending",
  };
}

function mapHeldPayment(payment: Payment): HeldPayment {
  return {
    id: String(payment.id),
    sessionId: String(payment.session_id),
    session: payment.request_title ?? "Learning Session",
    instructor: payment.instructor_name ?? "Instructor",
    sessionMode: "Individual",
    amountHeld: formatMoney(payment.amount),
    status: payment.status,
    sessionStatus: payment.session_status ?? "Ready",
  };
}

function mapHistoryPayment(payment: Payment): PaymentHistoryRow {
  return {
    id: String(payment.id),
    sessionId: String(payment.session_id),
    session: payment.request_title ?? "Learning Session",
    instructor: payment.instructor_name ?? "Instructor",
    amount: formatMoney(payment.amount),
    platformFee: formatMoney(payment.platform_fee),
    total: formatMoney(payment.total_amount),
    status: payment.status,
    date: formatDate(payment.paid_at ?? payment.created_at),
    action: payment.status === "pending" ? "Pay Now" : payment.status === "held" ? "View Session" : "View Receipt",
  };
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentHistoryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPayments() {
      try {
        const [paymentData, sessionData] = await Promise.all([getMyPayments(), getMySessions()]);
        setPayments(paymentData);
        setSessions(sessionData);
        setError("");
      } catch {
        setError("Could not load payments. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadPayments();
  }, []);

  const pendingPayments = useMemo(
    () => sessions.filter((session) => session.request_status === "waiting_payment").map(mapPendingSession),
    [sessions],
  );

  const heldPayments = useMemo(
    () => payments.filter((payment) => payment.status === "held").map(mapHeldPayment),
    [payments],
  );

  const historyRows = useMemo(() => payments.map(mapHistoryPayment), [payments]);

  const summaryCards = [
    {
      title: "Pending Payments",
      value: String(pendingPayments.length),
      description: "Awaiting your payment",
      icon: CircleDollarSign,
    },
    {
      title: "Held Payments",
      value: String(payments.filter((payment) => payment.status === "held").length),
      description: "Protected by platform",
      icon: ShieldCheck,
    },
    {
      title: "Released Payments",
      value: String(payments.filter((payment) => payment.status === "released").length),
      description: "Sent to instructors",
      icon: BadgeDollarSign,
    },
    {
      title: "Refunded Payments",
      value: String(payments.filter((payment) => payment.status === "refunded").length),
      description: "Returned payments",
      icon: RefreshCw,
    },
  ];

  return (
    <>
      <header className="border-b border-outline-variant bg-background/90 px-margin-mobile py-lg backdrop-blur md:px-margin-desktop">
        <div>
          <h1 className="text-headline-lg text-on-surface">Payments</h1>
          <p className="mt-xs max-w-2xl text-body-sm text-on-surface-variant">
            Track your session payments, held amounts, refunds, and payment history.
          </p>
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? (
          <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p>
        ) : null}

        <section className="grid gap-lg sm:grid-cols-2 2xl:grid-cols-4">
          {summaryCards.map((card) => (
            <PaymentSummaryCard
              description={card.description}
              icon={card.icon}
              key={card.title}
              title={card.title}
              value={card.value}
            />
          ))}
        </section>

        <div className="grid gap-lg 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <main className="min-w-0 space-y-lg">
            <section className="space-y-md rounded-lg border border-outline-variant bg-surface-container p-lg">
              <div>
                <p className="text-label-md uppercase text-secondary">Action Needed</p>
                <h2 className="mt-xs text-headline-md text-on-surface">Payment Required</h2>
              </div>
              <div className="space-y-md">
                {loading ? (
                  <p className="rounded-md border border-dashed border-outline bg-surface-container-low p-md text-body-sm text-on-surface-variant">
                    Loading payments...
                  </p>
                ) : pendingPayments.length > 0 ? (
                  pendingPayments.map((payment) => (
                    <StudentPaymentRequiredCard
                      key={payment.id}
                      payment={payment}
                    />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-outline bg-surface-container-low p-md text-body-sm text-on-surface-variant">
                    No sessions are waiting for payment.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-md rounded-lg border border-outline-variant bg-surface-container p-lg">
              <div>
                <p className="text-label-md uppercase text-secondary">Escrow</p>
                <h2 className="mt-xs text-headline-md text-on-surface">Held Payments</h2>
              </div>
              <div className="space-y-md">
                {heldPayments.length > 0 ? (
                  heldPayments.map((payment) => (
                    <HeldPaymentCard key={payment.id} payment={payment} />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-outline bg-surface-container-low p-md text-body-sm text-on-surface-variant">
                    No held payments yet.
                  </p>
                )}
              </div>
            </section>

            <PaymentHistoryTable onViewReceipt={setSelectedReceipt} rows={historyRows} />
          </main>

          <aside className="space-y-lg">
            <section className="rounded-lg border border-outline-variant bg-surface-container p-lg">
              <div className="flex items-start gap-md">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-headline-md text-on-surface">How Payment Protection Works</h2>
                  <p className="mt-sm text-body-sm text-on-surface-variant">
                    Your payment is not released to the instructor until the session is completed
                    and confirmed.
                  </p>
                </div>
              </div>
              <ol className="mt-lg space-y-sm">
                {protectionSteps.map((step, index) => (
                  <li className="flex items-center gap-sm" key={step}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-label-md text-on-primary">
                      {index + 1}
                    </span>
                    <span className="text-body-sm text-on-surface">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-outline-variant bg-surface-container p-lg">
              <div className="flex items-start gap-md">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h2 className="text-headline-md text-on-surface">Group Session Payments</h2>
                  <p className="mt-sm text-body-sm text-on-surface-variant">
                    Group payments use the same Paymob checkout flow. Each participant pays their
                    share individually.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-tertiary/30 bg-tertiary/10 p-lg">
              <div className="mb-sm flex items-center gap-sm text-tertiary">
                <WalletCards className="size-5" />
                <h2 className="text-headline-md">Paymob Test Mode</h2>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Payments are processed through Paymob in test mode. No real money is charged.
                Use test card numbers to simulate transactions.
              </p>
            </section>
          </aside>
        </div>
      </div>
      {selectedReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-margin-mobile">
          <section className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container p-lg shadow-xl">
            <div className="flex items-start justify-between gap-md">
              <div>
                <p className="text-label-md uppercase text-secondary">Receipt</p>
                <h2 className="mt-xs text-headline-md text-on-surface">{selectedReceipt.session}</h2>
              </div>
              <button
                aria-label="Close receipt"
                className="flex size-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
                onClick={() => setSelectedReceipt(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <dl className="mt-lg space-y-sm text-body-sm">
              {[
                ["Payment ID", selectedReceipt.id],
                ["Instructor", selectedReceipt.instructor],
                ["Amount", selectedReceipt.amount],
                ["Platform fee", selectedReceipt.platformFee],
                ["Total", selectedReceipt.total],
                ["Status", selectedReceipt.status],
                ["Date", selectedReceipt.date],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-md" key={label}>
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="text-right font-medium text-on-surface">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </>
  );
}
