import { cn } from "@/lib/utils";

export type PaymentStatus = "pending" | "held" | "released" | "refunded" | "cancelled" | "disputed";

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
  className?: string;
};

const statusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  held: "Held",
  released: "Released",
  refunded: "Refunded",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const statusClasses: Record<PaymentStatus, string> = {
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  held: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  released: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  refunded: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
  disputed: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase",
        statusClasses[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
