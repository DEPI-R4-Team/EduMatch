import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Clock3,
  Filter,
  MessageSquareText,
  MonitorPlay,
  RefreshCw,
  Search,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";
import { MiniCalendarCard } from "@/components/cards/MiniCalendarCard";
import { SessionStatsCard } from "@/components/cards/SessionStatsCard";
import { Input } from "@/components/ui/input";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { cn } from "@/lib/utils";
import { getMySessions, instructorCompleteSession } from "@/services/sessions.service";
import type { Session, SessionStatus } from "@/types/session";

type FilterValue = "all" | SessionStatus;

const filters: Array<{ label: string; value: FilterValue }> = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled yet";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function formatSessionType(session: Session) {
  return session.session_type === "offline" ? "Offline" : "Online";
}

function formatSessionMode(session: Session) {
  return session.session_mode === "group" ? "Group" : "Individual";
}

function paymentStatusFor(session: Session): PaymentStatus {
  const status = session.payment_status;

  if (
    status === "held" ||
    status === "released" ||
    status === "refunded" ||
    status === "pending" ||
    status === "cancelled" ||
    status === "disputed" ||
    status === "expired" ||
    status === "failed" ||
    status === "unpaid"
  ) {
    return status;
  }

  return session.request_status === "waiting_payment" ? "pending" : "held";
}

function canMarkCompleted(session: Session) {
  return session.status === "active" || session.status === "ready";
}

export function InstructorSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSessions() {
    try {
      const data = await getMySessions();
      setSessions(data);
      setError("");
    } catch {
      setError("Could not load sessions. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  const visibleSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      const searchable = [session.student_name, session.request_title, session.session_type, session.session_mode]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesFilter = activeFilter === "all" || session.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, searchTerm, sessions]);

  const nextSession = sessions.find((session) => ["ready", "active"].includes(session.status));

  async function handleMarkCompleted(sessionId: number) {
    try {
      await instructorCompleteSession(sessionId);
      setNotice("Session marked as completed. Waiting for the student to confirm.");
      await loadSessions();
    } catch {
      setNotice("Could not mark this session as completed.");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-[#27272A] bg-[#09090B]/95 px-margin-mobile py-xl backdrop-blur-xl md:px-margin-desktop">
        <div className="flex flex-col gap-lg xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold leading-tight text-zinc-100 md:text-[2.25rem]">Scheduled Sessions</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Manage your upcoming teaching sessions and completed student meetings.
            </p>
          </div>
          <div className="flex w-full flex-col gap-sm sm:flex-row xl:w-auto">
            <div className="relative min-w-0 flex-1 xl:w-[350px]">
              <Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-12 rounded-xl border-[#27272A] bg-[#18181B] pl-11 text-zinc-100 placeholder:text-zinc-500"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                value={searchTerm}
              />
            </div>
            <button
              className="inline-flex h-12 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              type="button"
            >
              <Filter className="size-4 text-secondary" />
              Filter
            </button>
            {showFilterMenu && (
              <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-xs shadow-[0_10px_50px_rgba(0,0,0,0.45)] sm:absolute sm:right-margin-desktop sm:top-28 sm:z-[80] sm:w-44">
                {filters.map((filter) => (
                  <button
                    className="block w-full rounded-md px-sm py-xs text-left text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                    key={filter.value}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setShowFilterMenu(false);
                    }}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-margin-mobile py-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="col-span-1 flex flex-col gap-6 lg:col-span-8">
        {notice ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">
            {error}
          </p>
        ) : null}

        {nextSession ? (
          <section className="relative rounded-2xl border border-[#8b5cf6]/20 bg-[#18181B] p-6 shadow-lg">
            <div className="flex flex-col gap-lg md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]/20 text-xl font-bold text-[#8b5cf6]">
                  {getInitials(nextSession.student_name ?? "Student")}
                </div>
                <div className="min-w-0">
                  <div className="mb-sm flex flex-wrap items-center gap-sm">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase text-blue-400">
                      {formatDate(nextSession.scheduled_at)}
                    </span>
                    <SessionStatusBadge status={nextSession.status} />
                  </div>
                  <h2 className="text-[1.625rem] font-bold leading-tight text-zinc-100">
                    {nextSession.request_title ?? "Learning Session"}
                  </h2>
                  <p className="mt-xs text-body-sm text-zinc-400">
                    With {nextSession.student_name ?? "Student"} · {formatSessionMode(nextSession)} session
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-sm">
                <Link
                  className="inline-flex items-center justify-center gap-xs rounded-lg border border-[#27272A] bg-[#09090B] px-4 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-[#27272A] hover:text-zinc-100"
                  to={`/instructor/sessions/${nextSession.id}`}
                >
                  <RefreshCw className="size-4" />
                  View
                </Link>
                <Link
                  className="inline-flex items-center justify-center gap-xs rounded-lg border border-[#27272A] bg-[#09090B] px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-[#27272A] hover:text-zinc-100"
                  to={`/instructor/chat?sessionId=${nextSession.id}`}
                >
                  <MessageSquareText className="size-4" />
                  Open Chat
                </Link>
                {canMarkCompleted(nextSession) ? (
                  <button
                    className="inline-flex items-center justify-center gap-xs rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-4 py-2 text-sm font-semibold text-[#8b5cf6] transition-colors hover:bg-[#8b5cf6] hover:text-white"
                    onClick={() => void handleMarkCompleted(nextSession.id)}
                    type="button"
                  >
                    <Video className="size-4" />
                    Mark Completed
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1 rounded-xl border border-[#27272A] bg-[#09090B] p-4">
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                  <MonitorPlay className="size-4 text-secondary" />
                  Type
                </p>
                <p className="text-sm font-semibold text-zinc-200">{formatSessionType(nextSession)}</p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-[#27272A] bg-[#09090B] p-4">
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                  <CalendarClock className="size-4 text-secondary" />
                  Status
                </p>
                <div>
                  <SessionStatusBadge status={nextSession.status} />
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-[#27272A] bg-[#09090B] p-4">
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                  <Video className="size-4 text-secondary" />
                  Platform
                </p>
                <p className="text-sm font-semibold text-zinc-200">
                  {formatSessionType(nextSession) === "Online" ? "Online meeting" : "Offline"}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-[#27272A] bg-[#09090B] p-4">
                <p className="flex items-center gap-2 text-xs text-zinc-400">
                  <WalletCards className="size-4 text-secondary" />
                  Payment
                </p>
                <div>
                  <PaymentStatusBadge status={paymentStatusFor(nextSession)} />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#27272A] bg-[#18181B] p-6">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">Sessions</p>
              <h2 className="mt-xs text-xl font-bold text-zinc-100">Later This Week</h2>
            </div>
            <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-[#27272A] bg-[#09090B] p-1">
              {filters.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter.value}
                  className={cn(
                    "shrink-0 rounded-lg px-4 py-1.5 text-sm transition",
                    activeFilter === filter.value
                      ? "bg-[#8b5cf6] text-white"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-lg space-y-md">
            {loading ? (
              <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-xl text-center">
                <p className="text-body-sm text-zinc-400">Loading sessions...</p>
              </div>
            ) : visibleSessions.length > 0 ? (
              visibleSessions.map((session) => (
                <article
                  className="mt-4 flex flex-col items-start justify-between gap-md rounded-xl border border-[#27272A] bg-[#121214] p-4 transition hover:border-primary/40 lg:flex-row"
                  key={session.id}
                >
                  <div className="flex min-w-0 gap-md">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#2b2b38] text-body-sm font-semibold text-zinc-100">
                      {getInitials(session.student_name ?? "Student")}
                    </div>
                    <div className="min-w-0">
                      <Link className="transition hover:text-primary" to={`/instructor/sessions/${session.id}`}>
                        <h3 className="truncate text-body-md font-medium text-on-surface">
                          {session.request_title ?? "Learning Session"}
                        </h3>
                      </Link>
                      <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                        Student: {session.student_name ?? "Student"}
                      </p>
                      <div className="mt-sm flex flex-wrap gap-sm text-body-sm text-on-surface-variant">
                        <span className="flex items-center gap-xs">
                          <Clock3 className="size-4 text-secondary" />
                          {formatDate(session.scheduled_at)}
                        </span>
                        <span className="flex items-center gap-xs">
                          <MonitorPlay className="size-4 text-secondary" />
                          {formatSessionType(session)}
                        </span>
                        <span className="flex items-center gap-xs">
                          <UserRound className="size-4 text-secondary" />
                          {formatSessionMode(session)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-sm lg:flex-col lg:items-end lg:justify-center">
                    <div className="flex flex-wrap items-center gap-sm lg:justify-end">
                      <SessionStatusBadge status={session.status} />
                      <PaymentStatusBadge status={paymentStatusFor(session)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-sm lg:justify-end">
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
                        to={`/instructor/sessions/${session.id}`}
                      >
                        View
                      </Link>
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                        to={`/instructor/chat?sessionId=${session.id}`}
                      >
                        Open Chat
                      </Link>
                      {canMarkCompleted(session) ? (
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
                          onClick={() => void handleMarkCompleted(session.id)}
                          type="button"
                        >
                          Mark Completed
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-xl text-center">
                <h3 className="text-headline-md text-zinc-100">No sessions yet</h3>
                <p className="mx-auto mt-sm max-w-sm text-body-sm leading-relaxed text-zinc-400">
                  Sessions will appear after a student accepts your application and completes payment.
                </p>
              </div>
            )}
          </div>
        </section>
          </div>

          <div className="col-span-1 flex flex-col gap-6 lg:col-span-4">
            <SessionStatsCard loading={loading} sessions={sessions} />
            <MiniCalendarCard detailsBasePath="/instructor/sessions" sessions={sessions} />
          </div>
        </div>
      </div>
    </>
  );
}
