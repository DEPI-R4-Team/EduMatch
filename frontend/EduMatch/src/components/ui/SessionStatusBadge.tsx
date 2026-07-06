import { cn } from "@/lib/utils";

export type SessionStatus =
  | "waiting_payment"
  | "ready"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

type SessionStatusBadgeProps = {
  status: SessionStatus;
  className?: string;
};

const statusLabels: Record<SessionStatus, string> = {
  waiting_payment: "Waiting Payment",
  ready: "Ready",
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const statusClasses: Record<SessionStatus, string> = {
  waiting_payment: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  ready: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  scheduled: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
  disputed: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export function SessionStatusBadge({ status, className }: SessionStatusBadgeProps) {
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
