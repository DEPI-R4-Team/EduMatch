import { Link } from "react-router-dom";
import { CalendarClock, MonitorPlay, Users } from "lucide-react";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { SessionStatusBadge, type SessionStatus } from "@/components/ui/SessionStatusBadge";

export type StudentSession = {
  id: string;
  instructor: string;
  subject: string;
  date: string;
  type: "Online" | "Offline";
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  sessionMode: "Individual" | "Group";
};

type SessionRowProps = {
  session: StudentSession;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function getAction(session: StudentSession) {
  if (session.paymentStatus === "pending" || session.paymentStatus === "unpaid" || session.paymentStatus === "cancelled" || session.paymentStatus === "failed" || session.paymentStatus === "expired") {
    return { label: "Pay Now", to: `/student/payments/session/${session.id}` };
  }

  if (session.status === "completed") {
    return { label: "Review", to: `/student/sessions/${session.id}` };
  }

  if (session.status === "cancelled") {
    return { label: "Details", to: `/student/sessions/${session.id}` };
  }

  return { label: "View", to: `/student/sessions/${session.id}` };
}

export function SessionRow({ session }: SessionRowProps) {
  const action = getAction(session);
  const canOpenChat = ["held", "released"].includes(session.paymentStatus) && ["ready", "active", "completed"].includes(session.status);

  return (
    <article className="flex flex-col gap-md rounded-lg border border-outline-variant bg-surface-container-low p-md transition hover:border-primary/40 hover:bg-surface-container-high lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 gap-md">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-body-sm font-semibold text-on-surface">
          {getInitials(session.instructor)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-body-md font-medium text-on-surface">{session.subject}</h3>
          <p className="mt-xs truncate text-body-sm text-on-surface-variant">{session.instructor}</p>
          <div className="mt-sm flex flex-wrap gap-sm text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-xs">
              <CalendarClock className="size-4 text-secondary" />
              {session.date}
            </span>
            <span className="flex items-center gap-xs">
              <MonitorPlay className="size-4 text-secondary" />
              {session.type}
            </span>
            <span className="flex items-center gap-xs">
              <Users className="size-4 text-secondary" />
              {session.sessionMode}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-sm lg:justify-end">
        <SessionStatusBadge status={session.status} />
        <PaymentStatusBadge status={session.paymentStatus} />
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
          to={action.to}
        >
          {action.label}
        </Link>
        {canOpenChat ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
            to={`/student/chat?sessionId=${session.id}`}
          >
            Open Chat
          </Link>
        ) : null}
      </div>
    </article>
  );
}
