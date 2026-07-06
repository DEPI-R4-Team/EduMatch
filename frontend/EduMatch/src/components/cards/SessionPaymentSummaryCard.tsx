import { Link } from "react-router-dom";
import { ArrowUpRight, WalletCards } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import type { SessionDetailsData } from "@/types/sessionDetails";

type SessionPaymentSummaryCardProps = {
  session: SessionDetailsData;
};

export function SessionPaymentSummaryCard({ session }: SessionPaymentSummaryCardProps) {
  const rows = [
    { label: "Session Price", value: session.price },
    { label: "Platform Fee", value: session.platformFee },
    { label: "Total Paid", value: session.totalPaid },
  ];

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center gap-sm">
        <WalletCards className="size-5 text-secondary" />
        <h2 className="text-headline-md text-zinc-100">Payment Summary</h2>
      </div>

      <div className="mt-lg space-y-sm">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-md text-body-sm" key={row.label}>
            <span className="text-zinc-400">{row.label}</span>
            <span className="font-medium text-zinc-100">{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-md border-t border-[#27272A] pt-sm text-body-sm">
          <span className="text-zinc-400">Current Status</span>
          <PaymentStatusBadge status={session.paymentStatus} />
        </div>
      </div>

      <p className="mt-lg rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm text-zinc-400">
        Your payment is held by the platform and will be released to the instructor after the session is completed and confirmed.
      </p>

      <Link
        className="mt-lg inline-flex h-10 w-full items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
        to="/student/payments"
      >
        View Payment
        <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
