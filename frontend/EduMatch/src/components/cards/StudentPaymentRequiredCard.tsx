import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";

export type PendingPayment = {
  id: string;
  sessionId: string;
  session: string;
  instructor: string;
  sessionPrice: string;
  platformFee: string;
  total: string;
  status: PaymentStatus;
};

type StudentPaymentRequiredCardProps = {
  payment: PendingPayment;
};

export function StudentPaymentRequiredCard({
  payment,
}: StudentPaymentRequiredCardProps) {
  const isPaid = payment.status === "held";

  return (
    <article className="rounded-lg border border-tertiary/30 bg-tertiary/10 p-lg">
      <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-sm flex flex-wrap items-center gap-sm">
            <h3 className="text-headline-md text-zinc-100">{payment.session}</h3>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="text-body-sm text-zinc-400">Instructor: {payment.instructor}</p>
          <p className="mt-md flex max-w-2xl items-start gap-sm text-body-sm text-zinc-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-tertiary" />
            Your payment will be held safely by the platform until the session is completed.
          </p>
        </div>

        <Link
          aria-disabled={isPaid}
          className="inline-flex h-10 items-center justify-center rounded-md bg-tertiary px-md text-body-sm font-medium text-on-tertiary transition hover:bg-tertiary/90 disabled:cursor-not-allowed disabled:opacity-60"
          to={isPaid ? "/student/payments" : `/student/payments/session/${payment.sessionId}`}
        >
          {isPaid ? "Payment Held" : "Pay Now"}
        </Link>
      </div>

      <dl className="mt-lg grid gap-sm rounded-md border border-tertiary/20 bg-[#121214]/80 p-md text-body-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-400">Session Price</dt>
          <dd className="mt-xs font-medium text-zinc-100">{payment.sessionPrice}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Platform Fee</dt>
          <dd className="mt-xs font-medium text-zinc-100">{payment.platformFee}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Total</dt>
          <dd className="mt-xs font-medium text-zinc-100">{payment.total}</dd>
        </div>
      </dl>
    </article>
  );
}
