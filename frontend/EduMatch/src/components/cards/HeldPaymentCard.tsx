import { Link } from "react-router-dom";
import { Users, WalletCards } from "lucide-react";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";

export type HeldPayment = {
  id: string;
  sessionId?: string;
  session: string;
  instructor: string;
  sessionMode: "Individual" | "Group";
  studentsJoined?: string;
  yourShare?: string;
  instructorTotal?: string;
  amountHeld?: string;
  status: PaymentStatus;
  sessionStatus: string;
};

type HeldPaymentCardProps = {
  payment: HeldPayment;
};

export function HeldPaymentCard({ payment }: HeldPaymentCardProps) {
  return (
    <article className="rounded-lg border border-primary/25 bg-primary/10 p-lg">
      <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-sm flex flex-wrap items-center gap-sm">
            <h3 className="text-headline-md text-zinc-100">{payment.session}</h3>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="text-body-sm text-zinc-400">Instructor: {payment.instructor}</p>
          <p className="mt-md text-body-sm text-zinc-400">
            The instructor will receive the payment after the session is completed and confirmed.
          </p>
        </div>

        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
          to={`/student/sessions/${payment.sessionId ?? "1"}`}
        >
          View Session
        </Link>
      </div>

      <dl className="mt-lg grid gap-sm rounded-md border border-primary/20 bg-[#121214]/80 p-md text-body-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="flex items-center gap-xs text-zinc-400">
            <Users className="size-4 text-secondary" />
            Session Mode
          </dt>
          <dd className="mt-xs font-medium text-zinc-100">{payment.sessionMode}</dd>
        </div>
        {payment.sessionMode === "Group" ? (
          <>
            <div>
              <dt className="text-zinc-400">Students Joined</dt>
              <dd className="mt-xs font-medium text-zinc-100">{payment.studentsJoined}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Your Share</dt>
              <dd className="mt-xs font-medium text-zinc-100">{payment.yourShare}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Instructor Total</dt>
              <dd className="mt-xs font-medium text-zinc-100">{payment.instructorTotal}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="flex items-center gap-xs text-zinc-400">
              <WalletCards className="size-4 text-secondary" />
              Amount Held
            </dt>
            <dd className="mt-xs font-medium text-zinc-100">{payment.amountHeld}</dd>
          </div>
        )}
        <div>
          <dt className="text-zinc-400">Session Status</dt>
          <dd className="mt-xs font-medium text-zinc-100">{payment.sessionStatus}</dd>
        </div>
      </dl>
    </article>
  );
}
