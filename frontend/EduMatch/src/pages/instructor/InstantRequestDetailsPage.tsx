import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Zap } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { acceptInstantRequest, getInstantRequestById } from "@/services/instantRequests.service";
import type { InstantRequest } from "@/types/instantRequest";

function money(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function apiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not accept this instant request.";
}

export function InstructorInstantRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number.parseInt(id ?? "", 10);
  const navigate = useNavigate();
  const [request, setRequest] = useState<InstantRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequest() {
    if (Number.isNaN(requestId)) {
      setError("Invalid instant request id.");
      setLoading(false);
      return;
    }
    try {
      setRequest(await getInstantRequestById(requestId));
      setError("");
    } catch {
      setError("Could not load instant request.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleAccept() {
    if (!request) return;
    try {
      const result = await acceptInstantRequest(request.id);
      navigate(result.session?.id ? `/instructor/sessions/${result.session.id}` : "/instructor/sessions");
    } catch (error) {
      setMessage(apiError(error));
      await loadRequest();
    }
  }

  if (loading) return <LoadingState message="Loading instant request..." />;
  if (error || !request) return <ErrorState message={error || "Instant request not found."} />;

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-label-md uppercase text-secondary">Instant request #{request.id}</p>
            <h1 className="mt-xs text-headline-lg text-zinc-100">{request.title}</h1>
          </div>
          <BackButton fallback="/instructor/instant-requests" />
        </div>
      </header>

      <main className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {message ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{message}</p> : null}
        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          <span className="rounded-full bg-primary/15 px-sm py-xs text-label-md uppercase text-primary">{request.status}</span>
          <p className="mt-md text-body-md text-zinc-400">{request.description}</p>
          <div className="mt-lg grid gap-sm md:grid-cols-2 xl:grid-cols-3">
            <Info label="Subject" value={request.subject} />
            <Info label="Student" value={request.student_name ?? "Student"} />
            <Info label="Budget" value={money(request.budget)} />
            <Info label="Expires" value={formatDate(request.expires_at)} />
            <Info label="Level" value={request.skill_level ?? "Not set"} />
            <Info label="Urgency" value={request.urgency_level ?? "Urgent"} />
          </div>
          {request.status === "instant_open" ? (
            <button className="mt-lg inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary hover:bg-primary/90" onClick={() => void handleAccept()} type="button">
              <Zap className="size-4" />
              Accept Request
            </button>
          ) : null}
        </section>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
      <p className="text-label-md uppercase text-zinc-400">{label}</p>
      <p className="mt-xs text-body-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
