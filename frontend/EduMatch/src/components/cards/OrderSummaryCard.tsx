import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";

type OrderSummaryCardProps = {
  sessionPrice: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  isProcessing?: boolean;
  onPayNow: () => void;
};

export function OrderSummaryCard({
  sessionPrice,
  platformFee,
  totalAmount,
  currency,
  paymentStatus,
  isProcessing,
  onPayNow,
}: OrderSummaryCardProps) {
  const paymentHeld = paymentStatus === "held";
  const paymentReleased = paymentStatus === "released";

  return (
    <aside className="sticky top-lg rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-headline-md text-zinc-100">Order Summary</h2>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      <dl className="mt-lg space-y-md text-body-sm">
        <div className="flex justify-between gap-md">
          <dt className="text-zinc-400">Session Price</dt>
          <dd className="font-medium text-zinc-100">
            {sessionPrice} {currency}
          </dd>
        </div>
        <div className="flex justify-between gap-md">
          <dt className="text-zinc-400">Platform Fee (10%)</dt>
          <dd className="font-medium text-zinc-100">
            {platformFee} {currency}
          </dd>
        </div>
        <div className="border-t border-[#27272A] pt-md">
          <div className="flex justify-between gap-md">
            <dt className="text-body-md font-medium text-zinc-100">Total Amount</dt>
            <dd className="text-body-md font-semibold text-zinc-100">
              {totalAmount} {currency}
            </dd>
          </div>
        </div>
      </dl>

      <button
        className="mt-lg inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={paymentHeld || paymentReleased || isProcessing}
        onClick={onPayNow}
        type="button"
      >
        {paymentReleased ? "Payment Released" : paymentHeld ? "Payment Held" : isProcessing ? "Processing..." : "Pay with Paymob"}
      </button>
      <p className="mt-sm text-center text-label-md text-zinc-400">
        Funds are held in escrow.
      </p>
    </aside>
  );
}
