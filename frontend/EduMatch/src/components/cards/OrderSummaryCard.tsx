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

  return (
    <aside className="sticky top-lg rounded-lg border border-outline-variant bg-surface-container p-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-headline-md text-on-surface">Order Summary</h2>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      <dl className="mt-lg space-y-md text-body-sm">
        <div className="flex justify-between gap-md">
          <dt className="text-on-surface-variant">Session Price</dt>
          <dd className="font-medium text-on-surface">
            {sessionPrice} {currency}
          </dd>
        </div>
        <div className="flex justify-between gap-md">
          <dt className="text-on-surface-variant">Platform Fee (10%)</dt>
          <dd className="font-medium text-on-surface">
            {platformFee} {currency}
          </dd>
        </div>
        <div className="border-t border-outline-variant pt-md">
          <div className="flex justify-between gap-md">
            <dt className="text-body-md font-medium text-on-surface">Total Amount</dt>
            <dd className="text-body-md font-semibold text-on-surface">
              {totalAmount} {currency}
            </dd>
          </div>
        </div>
      </dl>

      <button
        className="mt-lg inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={paymentHeld || paymentStatus === "released" || isProcessing}
        onClick={onPayNow}
        type="button"
      >
        {paymentHeld ? "Payment Held" : paymentStatus === "released" ? "Payment Released" : isProcessing ? "Processing..." : "Pay with Paymob"}
      </button>
      <p className="mt-sm text-center text-label-md text-on-surface-variant">
        Funds are held in escrow.
      </p>
    </aside>
  );
}
