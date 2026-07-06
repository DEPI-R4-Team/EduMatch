import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptInstantRequest,
  getOpenInstantRequests,
  updateInstantAvailability,
} from "@/services/instantRequests.service";
import type { InstantRequest } from "@/types/instantRequest";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { timeStyle: "short", dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

function money(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

function apiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not complete this action.";
}

export function InstructorInstantRequestsPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [available, setAvailable] = useState(Boolean(user?.instructor_profile?.is_available_for_instant));
  const [requests, setRequests] = useState<InstantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests() {
    if (!available) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      setRequests(await getOpenInstantRequests());
      setError("");
    } catch {
      setError("Could not load instant requests. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAvailable(Boolean(user?.instructor_profile?.is_available_for_instant));
  }, [user?.instructor_profile?.is_available_for_instant]);

  useEffect(() => {
    setLoading(true);
    void loadRequests();
    if (!available) return;
    const intervalId = window.setInterval(() => void loadRequests(), 15000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  async function handleToggle() {
    try {
      const next = !available;
      const result = await updateInstantAvailability(next);
      setAvailable(result.is_available_for_instant);
      await refreshUser();
      setMessage(result.is_available_for_instant ? "Instant availability is on." : "Instant availability is off.");
    } catch {
      setMessage("Could not update instant availability.");
    }
  }

  async function handleAccept(requestId: number) {
    try {
      const result = await acceptInstantRequest(requestId);
      setMessage("Instant request accepted.");
      navigate(result.session?.id ? `/instructor/sessions/${result.session.id}` : "/instructor/sessions");
    } catch (error) {
      setMessage(apiError(error));
      await loadRequests();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">Instant Requests</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Accept urgent student requests while your instant availability is on.
            </p>
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-400 hover:bg-[#27272A]" onClick={() => void handleToggle()} type="button">
            {available ? <ToggleRight className="size-5 text-secondary" /> : <ToggleLeft className="size-5" />}
            Available for instant requests
          </button>
        </div>
      </header>

      <main className="space-y-md px-margin-mobile py-lg md:px-margin-desktop">
        {message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}
        {error ? <ErrorState message={error} /> : null}

        {!available ? (
          <EmptyState title="Instant availability is off." message="Turn on instant availability to see urgent requests." />
        ) : loading ? (
          <LoadingState message="Loading instant requests..." />
        ) : requests.length === 0 ? (
          <EmptyState title="No open instant requests." message="You are available. New urgent requests will appear here." />
        ) : (
          <section className="grid gap-md lg:grid-cols-2">
            {requests.map((request) => (
              <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={request.id}>
                <div className="flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <h2 className="truncate text-headline-md text-zinc-100">{request.title}</h2>
                    <p className="mt-xs text-body-sm text-zinc-400">{request.subject}</p>
                  </div>
                  <span className="rounded-full bg-primary/15 px-sm py-xs text-label-md uppercase text-primary">{request.status}</span>
                </div>
                <p className="mt-md line-clamp-2 text-body-sm text-zinc-400">{request.description}</p>
                <div className="mt-lg grid gap-sm text-body-sm sm:grid-cols-2">
                  <span className="text-zinc-400">Student: <b className="text-zinc-100">{request.student_name ?? "Student"}</b></span>
                  <span className="text-zinc-400">Budget: <b className="text-zinc-100">{money(request.budget)}</b></span>
                  <span className="text-zinc-400">Expires: <b className="text-zinc-100">{formatDate(request.expires_at)}</b></span>
                  <span className="text-zinc-400">Urgency: <b className="text-zinc-100">{request.urgency_level ?? "Urgent"}</b></span>
                </div>
                <div className="mt-lg flex flex-wrap gap-sm">
                  <button className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary hover:bg-primary/90" onClick={() => void handleAccept(request.id)} type="button">
                    <Zap className="size-4" />
                    Accept
                  </button>
                  <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm text-secondary hover:bg-secondary/10" to={`/instructor/instant-requests/${request.id}`}>
                    <Clock className="size-4" />
                    Details
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
