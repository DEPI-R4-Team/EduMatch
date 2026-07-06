import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Monitor,
  Users,
  Video,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { ROUTES } from "@/lib/routes";
import { getSessionById, instructorCompleteSession, startSession } from "@/services/sessions.service";
import type { Session } from "@/types/session";

function formatDateTime(value: string | null) {
  if (!value) {
    return "To be scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: string | null) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function InstructorSessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericSessionId = Number.parseInt(sessionId ?? "", 10);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSession() {
    if (Number.isNaN(numericSessionId)) {
      setError("Invalid session id.");
      setLoading(false);
      return;
    }

    try {
      const data = await getSessionById(numericSessionId);
      setSession(data);
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

  const metadata = useMemo(
    () =>
      session
        ? [
            { icon: CalendarClock, label: formatDateTime(session.scheduled_at) },
            { icon: Clock3, label: "60 Minutes" },
            { icon: Monitor, label: session.session_type === "offline" ? "Offline" : "Online" },
            { icon: Users, label: session.session_mode === "group" ? "Group" : "Individual" },
            { icon: Video, label: session.session_type === "offline" ? "Offline location" : "Online meeting" },
          ]
        : [],
    [session],
  );

  async function handleStartSession() {
    try {
      const updated = await startSession(numericSessionId);
      setSession(updated);
      setNotice("Session started.");
    } catch {
      setNotice("Could not start this session. Payment must be held first.");
    }
  }

  async function handleMarkCompleted() {
    try {
      const updated = await instructorCompleteSession(numericSessionId);
      setSession(updated);
      setNotice("Session marked as completed. Waiting for student confirmation.");
    } catch {
      setNotice("Could not mark this session as completed.");
    }
  }

  if (loading) {
    return <div className="p-lg text-body-sm text-zinc-400">Loading session details...</div>;
  }

  if (error || !session) {
    return <div className="p-lg text-body-sm text-error">{error || "Session not found."}</div>;
  }

  const studentName = session.student_name ?? "Student";
  const canMarkCompleted = ["ready", "active"].includes(session.status) && !session.instructor_marked_completed_at;

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton className="mb-md" fallback={ROUTES.INSTRUCTOR.SESSIONS} />
        <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">{session.request_title ?? "Learning Session"}</h1>
            <p className="mt-xs text-body-sm text-zinc-400">Session ID: {session.id}</p>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {notice ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {notice}
          </p>
        ) : null}

        <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-lg">
            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Session Overview</h2>
              <p className="mt-md text-body-sm leading-relaxed text-zinc-400">
                Session created from an accepted EduMatch request.
              </p>
              <div className="mt-lg grid gap-md sm:grid-cols-2">
                {metadata.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="flex items-center gap-sm text-body-sm" key={item.label}>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#27272A] text-zinc-400">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-zinc-100">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Payment Summary</h2>
              <div className="mt-md space-y-sm">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-zinc-400">Session Price</span>
                  <span className="text-zinc-100">{formatMoney(session.payment_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-zinc-400">Payment Status</span>
                  <span className="text-zinc-100">{session.payment_status ?? "pending"}</span>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-lg">
            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Student</h2>
              <div className="mt-md flex items-center gap-sm">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-body-sm font-medium text-primary">
                  {initials(studentName)}
                </div>
                <div>
                  <p className="text-body-md font-medium text-zinc-100">{studentName}</p>
                  <p className="text-body-sm text-zinc-400">Student</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Completion</h2>
              <dl className="mt-md space-y-sm text-body-sm">
                <div className="flex justify-between gap-md">
                  <dt className="text-zinc-400">Instructor completion</dt>
                  <dd className="text-right text-zinc-100">{session.instructor_marked_completed_at ? "Marked" : "Not marked"}</dd>
                </div>
                <div className="flex justify-between gap-md">
                  <dt className="text-zinc-400">Student confirmation</dt>
                  <dd className="text-right text-zinc-100">{session.student_confirmed_completed_at ? "Confirmed" : "Pending"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Quick Actions</h2>
              <div className="mt-md space-y-sm">
                {session.status === "ready" ? (
                  <button
                    className="flex h-10 w-full cursor-pointer items-center justify-center gap-xs rounded-md bg-primary text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
                    onClick={() => void handleStartSession()}
                    type="button"
                  >
                    <Video className="size-4" />
                    Start Session
                  </button>
                ) : null}
                <button
                  className="flex h-10 w-full cursor-pointer items-center justify-center gap-xs rounded-md border border-emerald-400/40 text-body-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canMarkCompleted}
                  onClick={() => void handleMarkCompleted()}
                  type="button"
                >
                  <CheckCircle2 className="size-4" />
                  Mark as Completed
                </button>
                <Link
                  className="flex h-10 w-full items-center justify-center gap-xs rounded-md border border-[#27272A] text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                  to={`/instructor/chat?sessionId=${session.id}`}
                >
                  <MessageSquareText className="size-4" />
                  Open Chat
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
