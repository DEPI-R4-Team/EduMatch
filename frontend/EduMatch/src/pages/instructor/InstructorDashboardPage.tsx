import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileText,
  UserPen,
  Wallet,
} from "lucide-react";
import { DashboardTopbarActions } from "@/components/layout/DashboardTopbarActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getMyApplications } from "@/services/applications.service";
import { getRequests } from "@/services/requests.service";
import { getMyReviews } from "@/services/reviews.service";
import { getMySessions } from "@/services/sessions.service";
import { getInstructorWallet } from "@/services/wallet.service";
import type { Application } from "@/types/application";
import type { LearningRequest } from "@/types/request";
import type { Review } from "@/types/review";
import type { Session } from "@/types/session";
import type { InstructorWallet } from "@/types/wallet";

type DashboardCard = {
  label: string;
  value: string;
  helper: string;
  icon: typeof FileText;
  to: string;
};

function formatMoney(value: string | null | undefined) {
  return `${Number.parseFloat(value ?? "0").toFixed(2)} EGP`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled yet";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-headline-md text-zinc-100">{title}</h2>
      <p className="mt-xs text-body-sm text-zinc-400">{description}</p>
    </div>
  );
}

export function InstructorDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wallet, setWallet] = useState<InstructorWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [requestData, applicationData, sessionData, walletData, reviewData] = await Promise.all([
          getRequests({ status: "open" }),
          getMyApplications(),
          getMySessions(),
          getInstructorWallet(),
          getMyReviews(),
        ]);
        setRequests(requestData);
        setApplications(applicationData);
        setSessions(sessionData);
        setWallet(walletData);
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

  const activeSessions = sessions.filter((session) => ["ready", "active"].includes(session.status));
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const pendingApplications = applications.filter((application) => application.status === "pending");
  const averageRating =
    reviews.length > 0 ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : "No reviews yet";

  const stats: DashboardCard[] = [
    {
      label: "Available Requests",
      value: String(requests.length),
      helper: "Open student requests",
      icon: ClipboardList,
      to: ROUTES.INSTRUCTOR.REQUESTS,
    },
    {
      label: "Pending Applications",
      value: String(pendingApplications.length),
      helper: "Waiting for student decision",
      icon: FileText,
      to: ROUTES.INSTRUCTOR.REQUESTS,
    },
    {
      label: "Ready Sessions",
      value: String(activeSessions.length),
      helper: `${completedSessions.length} completed sessions`,
      icon: CalendarClock,
      to: ROUTES.INSTRUCTOR.SESSIONS,
    },
    {
      label: "Wallet Balance",
      value: formatMoney(wallet?.available_balance),
      helper: `${formatMoney(wallet?.pending_balance)} pending`,
      icon: Wallet,
      to: ROUTES.INSTRUCTOR.WALLET,
    },
  ];

  const profile = user?.instructor_profile;
  const missingProfileItems = [
    !profile?.bio ? "Add bio" : null,
    !profile?.skills ? "Add skills" : null,
    !profile?.price_per_session ? "Add price per session" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-6 py-4">
        <div className="flex flex-col gap-lg lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-label-md uppercase text-[#8b5cf6]">Instructor Dashboard</p>
            <h1 className="mt-xs text-headline-lg text-zinc-100">Welcome back, {user?.full_name ?? "Instructor"}</h1>
            <p className="mt-xs text-body-sm text-zinc-400 sm:text-body-md">
              Manage your sessions, requests, students, and earnings from one place.
            </p>

            <div className="mt-md flex flex-wrap gap-sm">
              <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-body-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all hover:bg-[#7c3aed]" to={ROUTES.INSTRUCTOR.PROFILE}>
                <UserPen className="size-4" />
                Edit Profile
              </Link>
              <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.AVAILABILITY}>
                <Clock3 className="size-4" />
                Set Availability
              </Link>
              <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.REQUESTS}>
                <ClipboardList className="size-4" />
                View Requests
              </Link>
              <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.WALLET}>
                <Banknote className="size-4" />
                View Earnings
              </Link>
            </div>
          </div>

          <DashboardTopbarActions />
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading dashboard..." /> : null}

        <section className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link className={cn("group relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg transition-all duration-300", "hover:border-[#8b5cf6]/30 hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]")} key={stat.label} to={stat.to}>
                <div className="mb-lg flex items-center justify-between gap-md">
                  <p className="text-label-md uppercase text-zinc-400">{stat.label}</p>
                  <div className="w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]">
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                <p className="mt-xs text-body-sm text-zinc-400">{stat.helper}</p>
              </Link>
            );
          })}
        </section>

        <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-lg">
            <section className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
                <SectionHeader title="Open Student Requests" description="Real open requests from students." />
                <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.REQUESTS}>
                  View All
                  <ChevronRight className="size-4" />
                </Link>
              </div>

              <div className="mt-lg grid gap-md">
                {requests.slice(0, 3).length > 0 ? (
                  requests.slice(0, 3).map((request) => (
                    <Link className="rounded-2xl border border-[#27272A] bg-[#18181B] p-4 transition-all duration-300 hover:border-[#8b5cf6]/30 hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]" key={request.id} to={`/instructor/requests/${request.id}`}>
                      <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-body-md font-medium text-zinc-100">{request.title}</h3>
                          <p className="mt-xs text-body-sm text-zinc-400">Student: {request.student_name ?? "Student"}</p>
                        </div>
                        <p className="text-body-md font-semibold text-[#a78bfa]">{request.base_price ?? "Not set"} EGP</p>
                      </div>
                      <p className="mt-md text-body-sm text-zinc-400 line-clamp-2">{request.description}</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState message="New student requests will appear here when available." title="No open requests" />
                )}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
                <SectionHeader title="Upcoming Sessions" description="Ready and active assigned sessions." />
                <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.SESSIONS}>
                  View Schedule
                  <ChevronRight className="size-4" />
                </Link>
              </div>

              <div className="mt-lg grid gap-md lg:grid-cols-3">
                {activeSessions.slice(0, 3).length > 0 ? (
                  activeSessions.slice(0, 3).map((session) => (
                    <Link className="flex min-h-[210px] flex-col rounded-2xl border border-[#27272A] bg-[#18181B] p-4 transition-all duration-300 hover:border-[#8b5cf6]/30 hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]" key={session.id} to={`/instructor/sessions/${session.id}`}>
                      <div className="flex items-start justify-between gap-sm">
                        <div className="min-w-0">
                          <h3 className="text-body-md font-medium text-zinc-100">{session.request_title ?? "Learning Session"}</h3>
                          <p className="mt-xs text-body-sm text-zinc-400">Student: {session.student_name ?? "Student"}</p>
                        </div>
                        <SessionStatusBadge status={session.status} />
                      </div>
                      <p className="mt-md text-body-sm text-zinc-400">
                        <CalendarCheck className="mr-xs inline size-4 text-[#8b5cf6]" />
                        {formatDate(session.scheduled_at)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="lg:col-span-3">
                    <EmptyState message="Sessions will appear after a student accepts your application and completes payment." title="No sessions yet" />
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-lg">
            <section className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <div className="flex items-start justify-between gap-md">
                <div>
                  <p className="text-label-md uppercase text-[#8b5cf6]">Profile Status</p>
                  <p className="mt-xs text-headline-md text-zinc-100">{profile?.verification_status?.replaceAll("_", " ") ?? "Not added yet"}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]">
                  <UserPen className="size-5" />
                </div>
              </div>
              <p className="mt-md text-body-sm text-zinc-400">
                Rating: {averageRating}
              </p>
              <ul className="mt-md space-y-xs">
                {missingProfileItems.length > 0 ? (
                  missingProfileItems.map((item) => (
                    <li className="flex items-center gap-xs text-body-sm text-zinc-400" key={item}>
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-body-sm text-zinc-400">Core profile fields are added.</li>
                )}
              </ul>
              <Link className="mt-md inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-body-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all hover:bg-[#7c3aed]" to={ROUTES.INSTRUCTOR.PROFILE}>
                Complete Profile
              </Link>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
              <SectionHeader title="Wallet" description="Simulated earnings from completed sessions." />
              <dl className="mt-lg space-y-md text-body-sm">
                <div className="flex justify-between gap-md">
                  <dt className="text-zinc-400">Pending</dt>
                  <dd className="font-medium text-zinc-100">{formatMoney(wallet?.pending_balance)}</dd>
                </div>
                <div className="flex justify-between gap-md">
                  <dt className="text-zinc-400">Available</dt>
                  <dd className="font-medium text-zinc-100">{formatMoney(wallet?.available_balance)}</dd>
                </div>
                <div className="flex justify-between gap-md">
                  <dt className="text-zinc-400">Total earned</dt>
                  <dd className="font-medium text-zinc-100">{formatMoney(wallet?.total_earned)}</dd>
                </div>
              </dl>
              <Link className="mt-md inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#27272A] bg-transparent px-5 py-2.5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5" to={ROUTES.INSTRUCTOR.WALLET}>
                View Wallet
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
