import { CreditCard, ShieldCheck } from "lucide-react";

export type PaymentMethod = "paymob";

type PaymentMethodSelectorProps = {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
};

export function PaymentMethodSelector({
  selectedMethod: _selectedMethod,
  onSelectMethod: _onSelectMethod,
}: PaymentMethodSelectorProps) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container p-lg">
      <h2 className="text-headline-md text-on-surface">Payment Method</h2>
      <div className="mt-md space-y-sm">
        <div className="flex w-full items-center gap-md rounded-lg border border-primary/70 bg-primary/15 p-md shadow-[0_0_26px_rgba(192,193,255,0.08)]">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary bg-primary">
            <span className="size-2 rounded-full bg-on-primary" />
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
            <CreditCard className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-sm text-body-sm font-medium text-on-surface">
              Paymob Secure Checkout
            </span>
            <span className="mt-xs block text-body-sm text-on-surface-variant">
              Pay with card, mobile wallet, or other methods
            </span>
          </span>
        </div>

        <div className="flex items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-md">
          <ShieldCheck className="size-5 shrink-0 text-secondary" />
          <p className="text-body-sm text-on-surface-variant">
            You'll be redirected to Paymob's secure page to complete your payment.
            Your card details are never shared with us.
          </p>
        </div>
      </div>
    </section>
  );
}
