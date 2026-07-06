import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Home,
  Plus,
  Search,
} from "lucide-react";
import { DashboardTopbarActions } from "@/components/layout/DashboardTopbarActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getMyPayments } from "@/services/payments.service";
import { getMyRequests } from "@/services/requests.service";
import { getMyReviews } from "@/services/reviews.service";
import { getMySessions } from "@/services/sessions.service";
import type { Payment } from "@/types/payment";
import type { LearningRequest } from "@/types/request";
import type { Review } from "@/types/review";
import type { Session } from "@/types/session";

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: typeof FileText;
  tone: "primary" | "cyan" | "amber" | "green";
};

const toneClasses: Record<Metric["tone"], string> = {
  primary: "w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]",
  cyan: "w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]",
  amber: "w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]",
  green: "w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]",
};

const statusClasses: Record<string, string> = {
  open: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  waiting_payment: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  in_session: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} EGP`;
}

function moneyToNumber(value: string | null | undefined) {
  return Number.parseFloat(value ?? "0") || 0;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled yet";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [requestData, sessionData, paymentData, reviewData] = await Promise.all([
          getMyRequests(),
          getMySessions(),
          getMyPayments(),
          getMyReviews(),
        ]);
        setRequests(requestData);
        setSessions(sessionData);
        setPayments(paymentData);
        setReviews(reviewData);
        setError("");
      } catch {
        setError("Could not load dashboard data. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const metrics = useMemo<Metric[]>(() => {
    const activeRequests = requests.filter((request) => ["open", "accepted", "waiting_payment", "paid", "in_session"].includes(request.status));
    const readySessions = sessions.filter((session) => ["ready", "active"].includes(session.status));
    const completedSessions = sessions.filter((session) => session.status === "completed");
    const heldTotal = payments
      .filter((payment) => payment.status === "held")
      .reduce((total, payment) => total + moneyToNumber(payment.amount), 0);
    const averageGiven =
      reviews.length > 0
        ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
        : "No reviews yet";

    return [
      {
        label: "Active Requests",
        value: String(activeRequests.length),
        helper: `${requests.filter((request) => request.status === "waiting_payment").length} waiting for payment`,
        icon: FileText,
        tone: "primary",
      },
      {
        label: "Ready Sessions",
        value: String(readySessions.length),
        helper: `${completedSessions.length} completed sessions`,
        icon: CalendarClock,
        tone: "cyan",
      },
      {
        label: "Held Payments",
        value: formatMoney(heldTotal),
        helper: "Protected until completion",
        icon: CircleDollarSign,
        tone: "amber",
      },
      {
        label: "Reviews Given",
        value: String(reviews.length),
        helper: typeof averageGiven === "string" && averageGiven.includes("No") ? averageGiven : `Average rating ${averageGiven}`,
        icon: CheckCircle2,
        tone: "green",
      },
    ];
  }, [payments, requests, reviews, sessions]);

  const recentRequests = requests.slice(0, 3);
  const nextSessions = sessions.filter((session) => ["ready", "active"].includes(session.status)).slice(0, 3);
  const heldTotal = payments
    .filter((payment) => payment.status === "held")
    .reduce((total, payment) => total + moneyToNumber(payment.amount), 0);
  const releasedTotal = payments
    .filter((payment) => payment.status === "released")
    .reduce((total, payment) => total + moneyToNumber(payment.amount), 0);

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-6 py-4">
        <div className="flex flex-col gap-lg lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-xs flex items-center gap-sm text-body-sm text-zinc-400">
              <Home className="size-4" />
              <span>Student</span>
              <ChevronRight className="size-4" />
              <span className="text-zinc-100">Dashboard</span>
            </div>
            <h1 className="text-headline-lg text-zinc-100">Welcome back, {user?.full_name ?? "Student"}</h1>
            <p className="text-body-sm text-zinc-400">
              Track your learning requests, upcoming sessions, applications, and protected payments.
            </p>

            <div className="mt-md flex flex-wrap items-center gap-sm">
              <Link
                className="flex h-10 min-w-0 items-center gap-sm rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-2.5 text-zinc-400 transition-all hover:border-[#8b5cf6] hover:text-zinc-100 md:w-72"
                to="/student/requests"
              >
                <Search className="size-4 shrink-0" />
                <span className="truncate text-body-sm">Search your requests...</span>
              </Link>
              <Button className="h-10 bg-[#8b5cf6] px-5 py-2.5 text-zinc-100 hover:bg-[#7c3aed]" render={<Link to="/student/requests/create" />}>
                <Plus className="size-4" />
                New Request
              </Button>
            </div>
          </div>

          <DashboardTopbarActions />
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading dashboard..." /> : null}

        <section className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg" key={metric.label}>
                <div className="mb-lg flex items-center justify-between gap-md">
                  <div className={cn(toneClasses[metric.tone])}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-label-md uppercase text-zinc-400">Live</span>
                </div>
                <p className="text-body-sm text-zinc-400">{metric.label}</p>
                <p className="mt-xs text-2xl font-bold text-zinc-100">{metric.value}</p>
                <p className="mt-sm text-body-sm text-zinc-400">{metric.helper}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-lg xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-lg">
            <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <div className="mb-lg flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-headline-md text-zinc-100">Active Learning Requests</h2>
                  <p className="text-body-sm text-zinc-400">
                    Compare applications and move accepted requests into payment.
                  </p>
                </div>
                <Button className="w-fit border-[#27272A] bg-transparent text-zinc-100 hover:bg-white/5" render={<Link to="/student/requests" />} variant="outline">
                  View all
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {recentRequests.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B]">
                  {recentRequests.map((request, index) => (
                    <Link
                      className={cn(
                        "grid gap-md border-b border-[#27272A] bg-[#18181B] p-4 transition-all duration-300 hover:border-[#8b5cf6]/30 hover:bg-[#09090B]/60 hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)] md:grid-cols-[minmax(0,1fr)_120px_120px_120px]",
                        index === recentRequests.length - 1 && "border-b-0",
                      )}
                      key={request.id}
                      to={`/student/requests/${request.id}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body-md font-medium text-zinc-100">{request.title}</p>
                        <p className="text-body-sm text-zinc-400">{request.subject}</p>
                      </div>
                      <div>
                        <p className="text-label-md uppercase text-zinc-400">Applications</p>
                        <p className="text-body-sm text-zinc-300">{request.applications_count}</p>
                      </div>
                      <div>
                        <p className="text-label-md uppercase text-zinc-400">Budget</p>
                        <p className="text-body-sm text-zinc-300">{request.base_price ?? "Not set"} EGP</p>
                      </div>
                      <div className="flex items-center md:justify-end">
                        <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold capitalize", statusClasses[request.status] ?? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20")}>
                          {formatStatus(request.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  action={
                    <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-body-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all hover:bg-[#7c3aed]" to="/student/requests/create">
                      Create Request
                    </Link>
                  }
                  message="Create your first learning request to start receiving instructor applications."
                  title="No requests yet"
                />
              )}
            </article>
          </div>

          <div className="space-y-lg">
            <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <div className="mb-lg flex items-center justify-between">
                <div>
                  <h2 className="text-headline-md text-zinc-100">Next Sessions</h2>
                  <p className="text-body-sm text-zinc-400">Ready or active sessions.</p>
                </div>
                <BookOpenCheck className="size-5 text-[#8b5cf6]" />
              </div>

              {nextSessions.length > 0 ? (
                <div className="space-y-md">
                  {nextSessions.map((session) => (
                    <Link className="block rounded-2xl border border-[#27272A] bg-[#18181B] p-4 transition-all duration-300 hover:border-[#8b5cf6]/30 hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]" key={session.id} to={`/student/sessions/${session.id}`}>
                      <div className="mb-md flex items-start justify-between gap-md">
                        <div>
                          <p className="text-body-md font-medium text-zinc-100">{session.request_title ?? "Learning Session"}</p>
                          <p className="text-body-sm text-zinc-400">{session.instructor_name ?? "Instructor"}</p>
                        </div>
                        <span className="rounded-md bg-[#8b5cf6]/10 px-2.5 py-1 text-xs font-semibold capitalize text-[#8b5cf6] border border-[#8b5cf6]/20">{session.status}</span>
                      </div>
                      <div className="flex items-center gap-sm text-body-sm text-zinc-400">
                        <CalendarClock className="size-4" />
                        <span>{formatDate(session.scheduled_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message="Sessions will appear after you accept an instructor and complete payment."
                  title="No sessions yet"
                />
              )}
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <h2 className="text-headline-md text-zinc-100">Payment Protection</h2>
              <p className="mt-xs text-body-sm text-zinc-400">
                Simulated escrow keeps session money held until you confirm completion.
              </p>

              <div className="my-lg rounded-2xl border border-[#27272A] bg-[#09090B]/70 p-4">
                <div className="mb-sm flex items-center justify-between text-body-sm">
                  <span className="text-zinc-400">Held</span>
                  <span className="font-medium text-zinc-100">{formatMoney(heldTotal)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: heldTotal + releasedTotal > 0 ? `${(heldTotal / (heldTotal + releasedTotal)) * 100}%` : "0%" }} />
                </div>
                <div className="mt-sm flex items-center justify-between text-body-sm">
                  <span className="text-zinc-400">Released</span>
                  <span className="text-zinc-100">{formatMoney(releasedTotal)}</span>
                </div>
              </div>

              <Button className="w-full bg-[#8b5cf6] text-zinc-100 hover:bg-[#7c3aed]" render={<Link to="/student/payments" />}>
                Review payments
              </Button>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}
