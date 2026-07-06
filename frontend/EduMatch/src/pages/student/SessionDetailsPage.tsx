import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Star, X } from "lucide-react";
import { GroupParticipantsCard } from "@/components/cards/GroupParticipantsCard";
import { MeetingAccessCard } from "@/components/cards/MeetingAccessCard";
import { RelatedRequestCard } from "@/components/cards/RelatedRequestCard";
import { SessionActionsCard } from "@/components/cards/SessionActionsCard";
import { SessionChatPreviewCard } from "@/components/cards/SessionChatPreviewCard";
import { SessionInstructorCard } from "@/components/cards/SessionInstructorCard";
import { SessionOverviewCard } from "@/components/cards/SessionOverviewCard";
import { SessionPaymentSummaryCard } from "@/components/cards/SessionPaymentSummaryCard";
import { SessionStatusTimelineCard } from "@/components/cards/SessionStatusTimelineCard";
import { BackButton } from "@/components/ui/BackButton";
import type { PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { createReview } from "@/services/reviews.service";
import { cancelSession, confirmSessionCompletion, getSessionById, rescheduleSession, startSession } from "@/services/sessions.service";
import type { Session } from "@/types/session";
import type { SessionDetailsData } from "@/types/sessionDetails";

function formatDate(value: string | null) {
  if (!value) {
    return "To be scheduled";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "Flexible";
  }
  return new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(value));
}

function formatMoney(value: string | null) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

function toDatetimeLocalValue(value: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return fallback;
}

function mapSession(session: Session): SessionDetailsData {
  return {
    id: String(session.id),
    subject: session.request_title ?? "Learning Session",
    instructorName: session.instructor_name ?? "Instructor",
    instructorRole: "Instructor",
    instructorSpecialization: "EduMatch Instructor",
    instructorRating: 0,
    instructorReviews: 0,
    requestTitle: session.request_title ?? "Learning Request",
    requestType: session.request_type,
    sessionType: session.session_type === "offline" ? "Offline" : "Online",
    sessionMode: session.session_mode === "group" ? "Group" : "Individual",
    status: session.status,
    paymentStatus: (session.payment_status ?? "pending") as PaymentStatus,
    date: formatDate(session.scheduled_at),
    time: formatTime(session.scheduled_at),
    duration: "60 Minutes",
    platform: session.session_type === "offline" ? "Offline location" : "Online meeting",
    meetingLink: "Academic placeholder",
    price: formatMoney(session.payment_amount),
    platformFee: formatMoney(session.payment_platform_fee),
    totalPaid: formatMoney(session.payment_total_amount),
    escrowStatus: session.payment_status === "released" ? "Released" : "Held by platform",
    description: "Session created from your accepted learning request.",
  };
}

export function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericSessionId = Number.parseInt(sessionId ?? "", 10);
  const [backendSession, setBackendSession] = useState<Session | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [meetingMessage, setMeetingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  async function loadSession() {
    if (Number.isNaN(numericSessionId)) {
      setError("Invalid session id.");
      setLoading(false);
      return;
    }

    try {
      const data = await getSessionById(numericSessionId);
      setBackendSession(data);
      setReviewSubmitted(data.has_review);
      setError("");
    } catch {
      setError("Could not load session details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericSessionId]);

  const session = useMemo(
    () => (backendSession ? mapSession(backendSession) : null),
    [backendSession],
  );

  async function handleStartSession() {
    try {
      const updated = await startSession(numericSessionId);
      setBackendSession(updated);
      setMeetingMessage("Session started.");
    } catch {
      setMeetingMessage("Could not start this session. Make sure payment is held.");
    }
  }

  async function handleConfirmComplete() {
    try {
      const updated = await confirmSessionCompletion(numericSessionId);
      setBackendSession(updated);
      setCompletionMessage("Session completed successfully. Payment has been released to the instructor.");
    } catch {
      setCompletionMessage("Could not confirm completion. The instructor must mark the session completed first.");
    }
  }

  function handleJoinMeeting() {
    void handleStartSession();
  }

  function handleOpenReschedule() {
    setRescheduleValue(toDatetimeLocalValue(backendSession?.scheduled_at ?? null));
    setRescheduleError("");
    setRescheduleOpen(true);
  }

  async function handleSubmitReschedule() {
    if (!rescheduleValue) {
      setRescheduleError("Choose a new date and time.");
      return;
    }

    const nextDate = new Date(rescheduleValue);
    if (Number.isNaN(nextDate.getTime())) {
      setRescheduleError("Choose a valid date and time.");
      return;
    }

    setRescheduleSaving(true);
    setRescheduleError("");
    try {
      const updated = await rescheduleSession(numericSessionId, nextDate.toISOString());
      setBackendSession(updated);
      setMeetingMessage("Session rescheduled successfully.");
      setRescheduleOpen(false);
    } catch (error) {
      setRescheduleError(parseApiError(error, "Could not reschedule this session."));
    } finally {
      setRescheduleSaving(false);
    }
  }

  async function handleCancelSession() {
    try {
      const updated = await cancelSession(numericSessionId);
      setBackendSession(updated);
      setCompletionMessage("Session cancelled. Any held payment has been refunded in simulation.");
    } catch {
      setCompletionMessage("Could not cancel this session.");
    }
  }

  async function handleSubmitReview() {
    if (!reviewComment.trim()) {
      setMeetingMessage("Add a short review comment before submitting.");
      return;
    }

    try {
      await createReview({ session_id: numericSessionId, rating: reviewRating, comment: reviewComment.trim() });
      setReviewSubmitted(true);
      setReviewOpen(false);
      setMeetingMessage("Review submitted successfully.");
      await loadSession();
    } catch {
      setMeetingMessage("Could not submit review. You may have already reviewed this session.");
    }
  }

  if (loading) {
    return <div className="p-lg text-body-sm text-zinc-400">Loading session details...</div>;
  }

  if (error || !session) {
    return <div className="p-lg text-body-sm text-error">{error || "Session not found."}</div>;
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton fallback="/student/sessions" />
        <div className="mt-md">
          <p className="text-label-md uppercase text-secondary">Session #{session.id}</p>
          <h1 className="mt-xs text-headline-lg text-zinc-100">Session Details</h1>
          <p className="mt-xs max-w-3xl text-body-sm text-zinc-400">
            Review session information, payment status, meeting access, and completion actions.
          </p>
        </div>
      </header>

      <div className="grid gap-lg px-margin-mobile py-lg md:px-margin-desktop xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-lg">
          <SessionOverviewCard session={session} />
          <RelatedRequestCard session={session} />
          <MeetingAccessCard session={session} />
          {meetingMessage ? (
            <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
              {meetingMessage}
            </p>
          ) : null}
          {backendSession?.instructor_marked_completed_at ? (
            <p className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-md py-sm text-body-sm text-emerald-300">
              Instructor marked this session as completed. You can confirm completion when ready.
            </p>
          ) : null}
          <SessionChatPreviewCard sessionId={sessionId} />
          <GroupParticipantsCard session={session} />
        </main>

        <aside className="space-y-lg">
          <SessionStatusTimelineCard session={session} />
          <SessionPaymentSummaryCard session={session} />
          <SessionActionsCard
            completedMessage={completionMessage}
            onCancelSession={handleCancelSession}
            onConfirmComplete={handleConfirmComplete}
            onJoinMeeting={handleJoinMeeting}
            onLeaveReview={() => setReviewOpen(true)}
            onReschedule={handleOpenReschedule}
            session={session}
          />
          {session.status === "completed" && reviewSubmitted ? (
            <p className="rounded-md border border-primary/25 bg-primary/10 px-md py-sm text-body-sm text-primary">
              Review submitted.
            </p>
          ) : null}
          <SessionInstructorCard session={session} />
        </aside>
      </div>

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-margin-mobile">
          <section className="w-full max-w-lg rounded-lg border border-[#27272A] bg-[#18181B] p-lg shadow-xl">
            <div className="flex items-start justify-between gap-md">
              <div>
                <p className="text-label-md uppercase text-secondary">Review</p>
                <h2 className="mt-xs text-headline-md text-zinc-100">Leave Review</h2>
              </div>
              <button
                aria-label="Close review modal"
                className="flex size-9 items-center justify-center rounded-md border border-[#27272A] text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                onClick={() => setReviewOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-lg space-y-md">
              <div>
                <p className="text-label-md uppercase text-zinc-400">Rating</p>
                <div className="mt-sm flex gap-xs">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      aria-label={`Rate ${rating}`}
                      className="text-tertiary"
                      key={rating}
                      onClick={() => setReviewRating(rating)}
                      type="button"
                    >
                      <Star className={rating <= reviewRating ? "size-7 fill-tertiary" : "size-7"} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="min-h-28 w-full rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#8b5cf6]"
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Share how the session went..."
                value={reviewComment}
              />
              <div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A]"
                  onClick={() => setReviewOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
                  onClick={() => void handleSubmitReview()}
                  type="button"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {rescheduleOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-margin-mobile">
          <section className="w-full max-w-lg rounded-lg border border-[#27272A] bg-[#18181B] p-lg shadow-xl">
            <div className="flex items-start justify-between gap-md">
              <div>
                <p className="text-label-md uppercase text-secondary">Schedule</p>
                <h2 className="mt-xs text-headline-md text-zinc-100">Reschedule Session</h2>
                <p className="mt-xs text-body-sm text-zinc-400">
                  Choose a new future date and time for this normal session.
                </p>
              </div>
              <button
                aria-label="Close reschedule modal"
                className="flex size-9 items-center justify-center rounded-md border border-[#27272A] text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                onClick={() => setRescheduleOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-lg space-y-md">
              <div className="rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm">
                <p className="text-zinc-400">Current schedule</p>
                <p className="mt-xs font-medium text-zinc-100">
                  {formatDate(backendSession?.scheduled_at ?? null)} at {formatTime(backendSession?.scheduled_at ?? null)}
                </p>
              </div>

              <label className="block space-y-sm">
                <span className="text-body-sm font-medium text-zinc-100">New date and time</span>
                <input
                  className="h-11 w-full rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#8b5cf6]"
                  min={toDatetimeLocalValue(null)}
                  onChange={(event) => setRescheduleValue(event.target.value)}
                  type="datetime-local"
                  value={rescheduleValue}
                />
              </label>

              {rescheduleError ? (
                <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">
                  {rescheduleError}
                </p>
              ) : null}

              <div className="flex flex-col gap-sm sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A]"
                  onClick={() => setRescheduleOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={rescheduleSaving}
                  onClick={() => void handleSubmitReschedule()}
                  type="button"
                >
                  {rescheduleSaving ? "Saving..." : "Save New Schedule"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
