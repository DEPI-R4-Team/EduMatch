import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Clock3,
  Filter,
  Search,
  Video,
} from "lucide-react";
import { MiniCalendarCard } from "@/components/cards/MiniCalendarCard";
import { SessionStatsCard } from "@/components/cards/SessionStatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/input";
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
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">Sessions</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Manage your scheduled sessions with students.
            </p>
          </div>
          <div className="flex w-full flex-col gap-sm sm:flex-row xl:w-auto">
            <div className="relative min-w-0 flex-1 xl:w-[280px]">
              <Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-10 border-[#27272A] bg-[#18181B] pl-10 text-zinc-100"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                value={searchTerm}
              />
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              type="button"
            >
              <Filter className="size-4 text-secondary" />
              Filter
            </button>
            {showFilterMenu && (
              <div className="rounded-md border border-[#27272A] bg-[#18181B] p-xs sm:absolute sm:right-margin-desktop sm:top-24 sm:z-20 sm:w-44">
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

      <div className="grid gap-lg px-margin-mobile py-lg md:px-margin-desktop 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-lg">
        {notice ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{notice}</p> : null}
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading sessions..." /> : null}

        {nextSession ? (
          <Link className="block rounded-lg border border-primary/30 bg-primary/10 p-lg transition hover:border-primary/50" to={`/instructor/sessions/${nextSession.id}`}>
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-label-md uppercase text-primary">Next Session</p>
                <h2 className="mt-xs text-headline-md text-zinc-100">{nextSession.request_title ?? "Learning Session"}</h2>
                <p className="mt-xs text-body-sm text-zinc-400">Student: {nextSession.student_name ?? "Student"}</p>
              </div>
              <SessionStatusBadge status={nextSession.status} />
            </div>
            <div className="mt-md flex flex-wrap gap-md text-body-sm text-zinc-400">
              <span className="flex items-center gap-xs">
                <CalendarClock className="size-4" />
                {formatDate(nextSession.scheduled_at)}
              </span>
              <span className="flex items-center gap-xs capitalize">
                <Video className="size-4" />
                {nextSession.session_type}
              </span>
            </div>
          </Link>
        ) : null}

        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-label-md uppercase text-secondary">Sessions</p>
              <h2 className="mt-xs text-headline-md text-zinc-100">My Sessions</h2>
            </div>
            <div className="flex max-w-full gap-xs overflow-x-auto rounded-lg border border-[#27272A] bg-[#121214] p-xs">
              {filters.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter.value}
                  className={cn(
                    "h-9 shrink-0 rounded-md px-md text-body-sm font-medium transition",
                    activeFilter === filter.value
                      ? "bg-primary text-on-primary"
                      : "text-zinc-400 hover:bg-[#27272A] hover:text-zinc-100",
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
            {loading ? null : visibleSessions.length > 0 ? (
              visibleSessions.map((session) => (
                <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={session.id}>
                  <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                    <Link className="min-w-0 transition hover:text-primary" to={`/instructor/sessions/${session.id}`}>
                      <p className="truncate text-body-md font-medium text-zinc-100">{session.request_title ?? "Learning Session"}</p>
                      <p className="text-body-sm text-zinc-400">Student: {session.student_name ?? "Student"}</p>
                    </Link>
                    <div className="flex flex-wrap items-center gap-sm">
                      <span className="flex items-center gap-xs text-body-sm text-zinc-400">
                        <Clock3 className="size-4" />
                        {formatDate(session.scheduled_at)}
                      </span>
                      <SessionStatusBadge status={session.status} />
                    </div>
                  </div>
                  <div className="mt-md flex flex-wrap gap-sm">
                    <Link className="inline-flex h-9 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" to={`/instructor/chat?sessionId=${session.id}`}>
                      Open Chat
                    </Link>
                    {session.status === "active" || session.status === "ready" ? (
                      <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" onClick={() => void handleMarkCompleted(session.id)} type="button">
                        Mark Completed
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                message="Sessions will appear after a student accepts your application and completes payment."
                title="No sessions yet"
              />
            )}
          </div>
        </section>
        </main>

        <aside className="space-y-lg">
          <SessionStatsCard loading={loading} sessions={sessions} />
          <MiniCalendarCard detailsBasePath="/instructor/sessions" sessions={sessions} />
        </aside>
      </div>
    </>
  );
}
