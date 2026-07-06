import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquareText, ReceiptText, RefreshCw, Star, Video, XCircle } from "lucide-react";
import { canRescheduleNormalSession } from "@/lib/sessionPermissions";
import type { SessionDetailsData } from "@/types/sessionDetails";

type SessionActionsCardProps = {
  completedMessage: string | null;
  onCancelSession: () => void;
  onConfirmComplete: () => void;
  onJoinMeeting: () => void;
  onLeaveReview: () => void;
  onReschedule: () => void;
  session: SessionDetailsData;
};

export function SessionActionsCard({
  completedMessage,
  onCancelSession,
  onConfirmComplete,
  onJoinMeeting,
  onLeaveReview,
  onReschedule,
  session,
}: SessionActionsCardProps) {
  const canReschedule = canRescheduleNormalSession({
    request_type: session.requestType,
    status: session.status,
  });

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Session Actions</h2>

      <div className="mt-lg grid gap-sm">
        {session.status === "completed" ? (
          <>
            <button
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
              onClick={onLeaveReview}
              type="button"
            >
              <Star className="size-4" />
              Leave Review
            </button>
            <Link
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] px-md text-body-sm font-medium text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
              to="/student/payments"
            >
              <ReceiptText className="size-4" />
              View Receipt
            </Link>
          </>
        ) : (
          <>
            <button
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
              onClick={onJoinMeeting}
              type="button"
            >
              <Video className="size-4" />
              Join Meeting
            </button>
            <Link
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
              to={`/student/chat?sessionId=${session.id}`}
            >
              <MessageSquareText className="size-4" />
              Open Chat
            </Link>
            <button
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-emerald-400/40 px-md text-body-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10"
              onClick={onConfirmComplete}
              type="button"
            >
              <CheckCircle2 className="size-4" />
              Confirm Session Completed
            </button>
            {canReschedule ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] px-md text-body-sm font-medium text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                onClick={onReschedule}
                type="button"
              >
                <RefreshCw className="size-4" />
                Reschedule
              </button>
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-error/40 px-md text-body-sm font-medium text-error transition hover:bg-error/10"
              onClick={onCancelSession}
              type="button"
            >
              <XCircle className="size-4" />
              Cancel Session
            </button>
          </>
        )}
      </div>

      {completedMessage ? (
        <p className="mt-sm rounded-md border border-emerald-400/25 bg-emerald-400/10 px-md py-sm text-body-sm text-emerald-300">
          {completedMessage}
        </p>
      ) : null}
    </section>
  );
}
