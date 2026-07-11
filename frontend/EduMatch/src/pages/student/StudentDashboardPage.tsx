import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  AlertCircle,
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

type DashboardSectionKey = "requests" | "sessions" | "payments" | "reviews";
type DashboardSectionErrors = Partial<Record<DashboardSectionKey, string>>;

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

function getApiErrorDetail(error: unknown) {
  if (!isAxiosError(error)) {
    return null;
  }

  const detail = error.response?.data && typeof error.response.data === "object" && "detail" in error.response.data
    ? (error.response.data as { detail?: unknown }).detail
    : null;

  return typeof detail === "string" ? detail : error.message;
}

function classifyDashboardFailure(endpoint: string, error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const detail = getApiErrorDetail(error);

    if (!error.response) {
      return {
        isBackendUnavailable: true,
        status: error.code ?? "network",
        message: `${endpoint} could not reach the backend. Check the deployed API URL or network connection.`,
      };
    }

    if (status === 401) {
      return {
        isBackendUnavailable: false,
        status,
        message: `${endpoint} returned 401. Your session may have expired. Please sign in again.`,
      };
    }

    if (status === 403) {
      return {
        isBackendUnavailable: false,
        status,
        message: `${endpoint} returned 403. This account is not allowed to load that dashboard section.`,
      };
    }

    if (status === 404) {
      return {
        isBackendUnavailable: false,
        status,
        message: `${endpoint} returned 404. The endpoint or resource was not found.`,
      };
    }

    if (status === 422) {
      return {
        isBackendUnavailable: false,
        status,
        message: `${endpoint} returned 422. The request parameters were rejected by the API.`,
      };
    }

    if (status && status >= 500) {
      return {
        isBackendUnavailable: false,
        status,
        message: `${endpoint} returned ${status}. ${detail ?? "The server could not load this section."}`,
      };
    }

    return {
      isBackendUnavailable: false,
      status: status ?? "unknown",
      message: `${endpoint} failed. ${detail ?? "This section could not be loaded."}`,
    };
  }

  return {
    isBackendUnavailable: false,
    status: "unknown",
    message: `${endpoint} failed with an unexpected frontend error.`,
  };
}

function DashboardSectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-sm rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-body-sm text-amber-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
      <p>{message}</p>
    </div>
  );
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<DashboardSectionErrors>({});

  useEffect(() => {
    async function loadDashboard() {
      const nextSectionErrors: DashboardSectionErrors = {};
      let networkFailures = 0;

      function handleResult<T>(
        result: PromiseSettledResult<T>,
        section: DashboardSectionKey,
        endpoint: string,
        applyData: (data: T) => void,
      ) {
        if (result.status === "fulfilled") {
          applyData(result.value);
          return;
        }

        const failure = classifyDashboardFailure(endpoint, result.reason);
        if (failure.isBackendUnavailable) {
          networkFailures += 1;
        }
        nextSectionErrors[section] = failure.message;
        console.warn("[STUDENT-DASHBOARD] request failed", {
          endpoint,
          status: failure.status,
          message: failure.message,
        });
      }

      const [requestResult, sessionResult, paymentResult, reviewResult] = await Promise.allSettled([
        getMyRequests(),
        getMySessions(),
        getMyPayments(),
        getMyReviews(),
      ]);

      handleResult(requestResult, "requests", "/requests/my", setRequests);
      handleResult(sessionResult, "sessions", "/sessions/my", setSessions);
      handleResult(paymentResult, "payments", "/payments/my", setPayments);
      handleResult(reviewResult, "reviews", "/reviews/my", setReviews);

      setSectionErrors(nextSectionErrors);
      setError(
        networkFailures === 4
          ? "Could not reach the backend API. Check VITE_API_BASE_URL and confirm the Railway service is reachable."
          : "",
      );
      setLoading(false);
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
  const sectionErrorEntries = Object.entries(sectionErrors) as [DashboardSectionKey, string][];

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
        {!error && sectionErrorEntries.length > 0 ? (
          <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-4 text-body-sm text-zinc-300">
            <p className="font-medium text-zinc-100">Some dashboard sections could not load.</p>
            <p className="mt-xs text-zinc-400">The rest of the dashboard is still available.</p>
            <ul className="mt-sm space-y-xs">
              {sectionErrorEntries.map(([section, message]) => (
                <li className="text-zinc-400" key={section}>
                  <span className="font-medium capitalize text-zinc-200">{section}:</span> {message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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

              {sectionErrors.requests ? (
                <DashboardSectionError message={sectionErrors.requests} />
              ) : recentRequests.length > 0 ? (
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

              {sectionErrors.sessions ? (
                <DashboardSectionError message={sectionErrors.sessions} />
              ) : nextSessions.length > 0 ? (
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

              {sectionErrors.payments ? (
                <div className="mt-md">
                  <DashboardSectionError message={sectionErrors.payments} />
                </div>
              ) : null}

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
