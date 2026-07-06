import { cn } from "@/lib/utils";

export type RequestStatus =
  | "open"
  | "instant_open"
  | "instant_accepted"
  | "pending_instant"
  | "accepted"
  | "waiting_payment"
  | "paid"
  | "in_session"
  | "completed"
  | "cancelled"
  | "expired";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

type StatusBadgeProps = {
  status: RequestStatus | ApplicationStatus;
  className?: string;
};

const statusLabels: Record<RequestStatus | ApplicationStatus, string> = {
  open: "Open",
  instant_open: "Instant Open",
  instant_accepted: "Instant Accepted",
  pending_instant: "Pending Instant",
  accepted: "Accepted",
  waiting_payment: "Waiting Payment",
  paid: "Paid",
  in_session: "In Session",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
  rejected: "Rejected",
};

const statusClasses: Record<RequestStatus | ApplicationStatus, string> = {
  open: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  instant_open: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  instant_accepted: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  pending_instant: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  waiting_payment: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  in_session: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
  expired: "bg-red-500/10 text-red-400 border border-red-500/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  rejected: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export function RequestStatusBadge({ status, className }: StatusBadgeProps) {
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
