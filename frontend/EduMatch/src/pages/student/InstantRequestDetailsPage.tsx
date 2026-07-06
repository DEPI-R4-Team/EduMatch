import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, MessageSquareText, WalletCards } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cancelInstantRequest, getInstantRequestById } from "@/services/instantRequests.service";
import type { InstantRequest } from "@/types/instantRequest";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function money(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

export function InstantRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number.parseInt(id ?? "", 10);
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

  async function handleCancel() {
    if (!request) return;
    try {
      setRequest(await cancelInstantRequest(request.id));
      setMessage("Instant request cancelled.");
    } catch {
      setMessage("Could not cancel this instant request.");
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
          <BackButton fallback="/student/instant-requests" />
        </div>
      </header>

      <main className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}
        <section className="grid gap-lg rounded-lg border border-[#27272A] bg-[#18181B] p-lg xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <span className="rounded-full bg-secondary/15 px-sm py-xs text-label-md uppercase text-secondary">{request.status}</span>
            <p className="mt-md text-body-md text-zinc-400">{request.description}</p>
            <div className="mt-lg grid gap-sm md:grid-cols-2">
              <Info label="Subject" value={request.subject} />
              <Info label="Budget" value={money(request.budget)} />
              <Info label="Level" value={request.skill_level ?? "Not set"} />
              <Info label="Urgency" value={request.urgency_level ?? "Not set"} />
              <Info label="Expires" value={formatDate(request.expires_at)} />
              <Info label="Accepted Instructor" value={request.accepted_instructor_name ?? "Not accepted yet"} />
            </div>
          </div>

          <aside className="rounded-md border border-[#27272A] bg-[#121214] p-md">
            <h2 className="text-headline-md text-zinc-100">Next Step</h2>
            <p className="mt-sm text-body-sm text-zinc-400">
              {request.status === "instant_open"
                ? "Waiting for the first available instructor to accept."
                : request.status === "waiting_payment"
                  ? "Complete payment to hold funds in escrow."
                  : "Continue from the linked session when available."}
            </p>
            <div className="mt-lg grid gap-sm">
              {request.status === "waiting_payment" && request.session_id ? (
                <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary hover:bg-primary/90" to={`/student/payments/session/${request.session_id}`}>
                  <WalletCards className="size-4" />
                  Pay Now
                </Link>
              ) : null}
              {request.session_id && ["paid", "in_session", "completed"].includes(request.status) ? (
                <Link className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 hover:bg-[#27272A]" to={`/student/sessions/${request.session_id}`}>
                  <MessageSquareText className="size-4" />
                  Open Session
                </Link>
              ) : null}
              {request.status === "instant_open" || request.status === "waiting_payment" ? (
                <button className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-error/35 px-md text-body-sm text-error hover:bg-error/10" onClick={() => void handleCancel()} type="button">
                  <Clock className="size-4" />
                  Cancel Request
                </button>
              ) : null}
            </div>
          </aside>
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
