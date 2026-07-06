import { CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

type PaymentRequiredCardProps = {
  instructorName: string;
  sessionPrice: string;
  platformFee: string;
  totalAmount: string;
  paymentPath?: string;
};

export function PaymentRequiredCard({
  instructorName,
  sessionPrice,
  platformFee,
  totalAmount,
  paymentPath = "/student/payments",
}: PaymentRequiredCardProps) {
  return (
    <section className="rounded-lg border border-tertiary/30 bg-tertiary/10 p-lg">
      <div className="flex flex-col gap-lg lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-sm flex items-center gap-sm text-tertiary">
            <CreditCard className="size-5" />
            <h2 className="text-headline-md">Payment Required</h2>
          </div>
          <p className="max-w-3xl text-body-sm text-zinc-400">
            The instructor has been accepted. Complete the simulated payment to hold your
            session payment safely until the session is completed.
          </p>
        </div>

        <Link
          className="inline-flex h-11 items-center justify-center rounded-md bg-tertiary px-md text-body-sm font-medium text-on-tertiary transition hover:bg-tertiary/90"
          to={paymentPath}
        >
          Pay Now
        </Link>
      </div>

      <dl className="mt-lg grid gap-sm rounded-md border border-tertiary/20 bg-[#121214]/80 p-md text-body-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-zinc-400">Instructor</dt>
          <dd className="mt-xs font-medium text-zinc-100">{instructorName}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Session price</dt>
          <dd className="mt-xs font-medium text-zinc-100">{sessionPrice}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Platform fee</dt>
          <dd className="mt-xs font-medium text-zinc-100">{platformFee}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Total amount</dt>
          <dd className="mt-xs font-medium text-zinc-100">{totalAmount}</dd>
        </div>
      </dl>
    </section>
  );
}
