import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Session, SessionStatus } from "@/types/session";

type MiniCalendarCardProps = {
  detailsBasePath?: string;
  sessions: Session[];
};

type CalendarDay = {
  date: Date;
  inCurrentMonth: boolean;
};

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateCalendarDays(month: Date): CalendarDay[] {
  const firstDay = startOfMonth(month);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function sessionDate(session: Session) {
  return session.scheduled_at ? new Date(session.scheduled_at) : null;
}

function statusDotClass(status: SessionStatus) {
  if (status === "completed") return "bg-emerald-400";
  if (status === "cancelled") return "bg-red-400";
  if (status === "active") return "bg-blue-300";
  return "bg-[#8b5cf6]";
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function MiniCalendarCard({ detailsBasePath = "/student/sessions", sessions }: MiniCalendarCardProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const calendarDays = useMemo(() => generateCalendarDays(currentMonth), [currentMonth]);

  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, Session[]>();

    sessions.forEach((session) => {
      const date = sessionDate(session);
      if (!date || Number.isNaN(date.getTime())) {
        return;
      }

      const key = localDateKey(date);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });

    return grouped;
  }, [sessions]);

  const todayKey = localDateKey(new Date());
  const selectedKey = localDateKey(selectedDate);
  const selectedSessions = sessionsByDate.get(selectedKey) ?? [];

  return (
    <section className="rounded-2xl border border-[#27272A] bg-[#18181B] p-6">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-lg font-bold text-zinc-100">
          {currentMonth.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-xs">
          <button
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272A] text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
            onClick={() => setCurrentMonth((month) => addMonths(month, -1))}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272A] text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
            onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-md grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day, index) => (
          <span className="mb-2 text-xs font-semibold uppercase text-zinc-400" key={`${day}-${index}`}>
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-x-1 gap-y-2 text-center">
        {calendarDays.map((day) => {
          const key = localDateKey(day.date);
          const daySessions = sessionsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          return (
            <button
              className={cn(
                "relative mx-auto flex h-8 w-8 flex-col items-center justify-center text-sm transition",
                day.inCurrentMonth ? "text-zinc-400 hover:bg-[#27272A] hover:text-zinc-100" : "text-zinc-400/35",
                isToday && "rounded-lg border border-[#8b5cf6]/50",
                isSelected && "rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] hover:text-white",
              )}
              key={key}
              onClick={() => setSelectedDate(day.date)}
              type="button"
            >
              <span>{day.date.getDate()}</span>
              {daySessions.length > 0 ? (
                <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", statusDotClass(daySessions[0].status))} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-lg rounded-xl border border-[#27272A] bg-[#121214] p-4">
        <h3 className="text-body-sm font-medium text-zinc-100">
          Sessions on {formatSelectedDate(selectedDate)}
        </h3>
        <div className="mt-sm space-y-xs">
          {selectedSessions.length > 0 ? (
            selectedSessions.map((session) => (
              <Link
                className="block rounded-md px-sm py-xs text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                key={session.id}
                to={`${detailsBasePath}/${session.id}`}
              >
                {session.request_title ?? "Learning Session"}
              </Link>
            ))
          ) : (
            <p className="text-body-sm text-zinc-400">No sessions scheduled for this date.</p>
          )}
        </div>
      </div>
    </section>
  );
}
