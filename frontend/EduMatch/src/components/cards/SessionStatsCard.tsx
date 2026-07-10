import { CalendarCheck, CalendarClock, CirclePause, XCircle } from "lucide-react";
import { useMemo } from "react";
import type { Session } from "@/types/session";

type SessionStatsCardProps = {
  loading?: boolean;
  sessions: Session[];
};

const statMeta = [
  { key: "completed", label: "Completed", icon: CalendarCheck, className: "text-emerald-400" },
  { key: "upcoming", label: "Upcoming", icon: CalendarClock, className: "text-[#8b5cf6]" },
  { key: "active", label: "Active", icon: CirclePause, className: "text-[#8b5cf6]" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, className: "text-red-400" },
] as const;

export function SessionStatsCard({ loading = false, sessions }: SessionStatsCardProps) {
  const stats = useMemo(() => {
    return {
      completed: sessions.filter((session) => session.status === "completed").length,
      upcoming: sessions.filter((session) => session.status === "ready").length,
      active: sessions.filter((session) => session.status === "active").length,
      cancelled: sessions.filter((session) => session.status === "cancelled").length,
    };
  }, [sessions]);

  return (
    <section className="rounded-2xl border border-[#27272A] bg-[#18181B] p-6">
      <h2 className="mb-4 text-lg font-bold text-zinc-100">Session Stats</h2>
      <div className="grid grid-cols-2 gap-4">
        {statMeta.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="flex flex-col rounded-xl border border-[#27272A] bg-[#121214] p-4" key={stat.key}>
              <Icon className={`size-5 ${stat.className}`} />
              <p className="mt-2 text-2xl font-bold text-zinc-100">{loading ? "-" : stats[stat.key]}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
