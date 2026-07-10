import { Loader2, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPaymobIframeCheckout, redirectToPaymobIframe } from "@/services/paymobCheckout.service";
import type { PaymobBillingData, PaymobCheckoutItem } from "@/types/paymobCheckout";

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  billingData: PaymobBillingData;
  items: PaymobCheckoutItem[];
  merchantOrderId?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CheckoutModal({
  open,
  onClose,
  title = "Review EduMatch order",
  billingData,
  items,
  merchantOrderId,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.amount * (item.quantity ?? 1), 0),
    [items],
  );

  if (!open) return null;

  async function handlePayNow() {
    setLoading(true);
    setError("");
    try {
      const checkout = await createPaymobIframeCheckout({
        amount: total,
        currency: "EGP",
        billing_data: billingData,
        items,
        merchant_order_id: merchantOrderId,
      });
      redirectToPaymobIframe(checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] text-zinc-100 shadow-[0_10px_50px_rgba(0,0,0,0.7)]">
        <header className="flex items-start justify-between border-b border-[#27272A] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b5cf6]">Secure Checkout</p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">You will be redirected to Paymob test checkout.</p>
          </div>
          <button
            className="rounded-xl border border-[#27272A] p-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-[#27272A] bg-[#121214] p-4" key={item.name}>
                <div>
                  <p className="font-semibold text-zinc-100">{item.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">{item.description ?? "EduMatch learning session"}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">Qty {item.quantity ?? 1}</p>
                </div>
                <p className="font-bold text-zinc-100">{formatMoney(item.amount * (item.quantity ?? 1))}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#27272A] bg-[#09090B] p-4">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Total</span>
              <span className="text-2xl font-bold text-zinc-100">{formatMoney(total)}</span>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Paymob handles card details. EduMatch never stores payment credentials.
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[#27272A] px-6 py-5 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[#27272A] px-5 py-2.5 font-semibold text-zinc-100 transition hover:bg-white/5 disabled:opacity-60"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading || items.length === 0 || total <= 0}
            onClick={() => void handlePayNow()}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Generating token..." : "Pay Now"}
          </button>
        </footer>
      </div>
    </div>
  );
}
