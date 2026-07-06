import { Link } from "react-router-dom";
import { CalendarClock, MonitorPlay, RefreshCw, Video, WalletCards } from "lucide-react";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import { SessionStatusBadge, type SessionStatus } from "@/components/ui/SessionStatusBadge";

export type FeaturedSession = {
  id: string;
  instructor: string;
  subject: string;
  dateTime: string;
  type: "Online" | "Offline";
  status: SessionStatus;
  platform: string;
  paymentStatus: PaymentStatus;
  sessionMode: "Individual" | "Group";
};

type FeaturedSessionCardProps = {
  session: FeaturedSession;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export function FeaturedSessionCard({ session }: FeaturedSessionCardProps) {
  const metadata = [
    { icon: MonitorPlay, label: "Type", value: session.type },
    { icon: CalendarClock, label: "Status", value: "Scheduled" },
    { icon: Video, label: "Platform", value: session.platform },
    { icon: WalletCards, label: "Payment", value: "Held" },
  ];

  return (
    <section className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/15 via-surface-container to-surface-container p-lg shadow-[0_0_36px_rgba(192,193,255,0.10)]">
      <div className="flex flex-col gap-lg md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-md">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-body-md font-semibold text-on-primary">
            {getInitials(session.instructor)}
          </div>
          <div className="min-w-0">
            <div className="mb-sm flex flex-wrap items-center gap-sm">
              <span className="rounded-full bg-secondary/15 px-sm py-xs text-label-md uppercase text-secondary ring-1 ring-secondary/25">
                {session.dateTime}
              </span>
              <SessionStatusBadge status={session.status} />
            </div>
            <h2 className="text-headline-md text-zinc-100">{session.subject}</h2>
            <p className="mt-xs text-body-sm text-zinc-400">
              With {session.instructor} · {session.sessionMode} session
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-sm">
          <Link
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
            to={`/student/sessions/${session.id}`}
          >
            <RefreshCw className="size-4" />
            View
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
            to={`/student/sessions/${session.id}`}
          >
            <Video className="size-4" />
            Join Meeting
          </Link>
        </div>
      </div>

      <div className="mt-lg grid gap-sm md:grid-cols-2 xl:grid-cols-4">
        {metadata.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="rounded-md border border-[#27272A] bg-[#121214]/80 p-md"
              key={item.label}
            >
              <p className="flex items-center gap-sm text-body-sm text-zinc-400">
                <Icon className="size-4 text-secondary" />
                {item.label}
              </p>
              <div className="mt-xs">
                {item.label === "Payment" ? (
                  <PaymentStatusBadge status={session.paymentStatus} />
                ) : item.label === "Status" ? (
                  <SessionStatusBadge status={session.status} />
                ) : (
                  <p className="text-body-sm font-medium text-zinc-100">{item.value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
