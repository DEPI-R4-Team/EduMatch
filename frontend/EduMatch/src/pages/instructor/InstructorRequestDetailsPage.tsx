import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarClock,
  MessageSquareText,
  Send,
  User,
  Wallet,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { RequestStatusBadge } from "@/components/ui/RequestStatusBadge";
import { ROUTES } from "@/lib/routes";
import { applyToRequest } from "@/services/applications.service";
import { getRequestById } from "@/services/requests.service";
import type { LearningRequestDetail } from "@/types/request";

function formatDate(value: string | null) {
  if (!value) {
    return "Flexible";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

export function InstructorRequestDetailsPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<LearningRequestDetail | null>(null);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      if (!requestId) {
        setError("Missing request id.");
        setLoading(false);
        return;
      }

      const numericId = Number.parseInt(requestId, 10);
      if (Number.isNaN(numericId)) {
        setError("Invalid request id.");
        setLoading(false);
        return;
      }

      try {
        const data = await getRequestById(numericId);
        setRequest(data);
        setError("");
      } catch {
        setError("Could not load this request. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadRequest();
  }, [requestId]);

  async function handleApply() {
    if (!request) {
      return;
    }

    if (!message.trim() || !price.trim()) {
      setNotice("Add a short proposal message and proposed price first.");
      return;
    }

    setSubmitting(true);
    try {
      await applyToRequest({
        request_id: request.id,
        message: message.trim(),
        proposed_price: Number.parseFloat(price),
      });
      setNotice("Application sent. The student can now accept or reject it.");
      setMessage("");
      setPrice("");
    } catch {
      setNotice("Could not send application. You may have already applied to this request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton className="mb-md" fallback={ROUTES.INSTRUCTOR.REQUESTS} />
        {loading ? (
          <p className="text-body-sm text-zinc-400">Loading request...</p>
        ) : request ? (
          <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-headline-lg text-zinc-100">{request.title}</h1>
              <p className="mt-xs text-body-sm text-zinc-400">
                {request.subject} {request.level ? `- ${request.level}` : ""}
              </p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
        ) : null}
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? (
          <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {notice}
          </p>
        ) : null}

        {request ? (
          <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Request Details</h2>
              <div className="mt-lg grid gap-md sm:grid-cols-2">
                <div className="flex items-center gap-sm">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-primary">
                    <User className="size-4" />
                  </div>
                  <div>
                    <p className="text-label-md uppercase text-zinc-400">Student</p>
                    <p className="text-body-md text-zinc-100">{request.student_name ?? "Student"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-secondary">
                    <CalendarClock className="size-4" />
                  </div>
                  <div>
                    <p className="text-label-md uppercase text-zinc-400">Preferred Time</p>
                    <p className="text-body-md text-zinc-100">{formatDate(request.preferred_datetime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-tertiary">
                    <Wallet className="size-4" />
                  </div>
                  <div>
                    <p className="text-label-md uppercase text-zinc-400">Budget</p>
                    <p className="text-body-md text-zinc-100">{formatMoney(request.base_price)}</p>
                  </div>
                </div>
                {request.request_type === "group" ? (
                  <>
                    <div className="flex items-center gap-sm">
                      <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-primary">
                        <User className="size-4" />
                      </div>
                      <div>
                        <p className="text-label-md uppercase text-zinc-400">Group Price</p>
                        <p className="text-body-md text-zinc-100">{formatMoney(request.current_price_per_student ?? request.final_price_per_student)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-sm">
                      <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-secondary">
                        <User className="size-4" />
                      </div>
                      <div>
                        <p className="text-label-md uppercase text-zinc-400">Participants</p>
                        <p className="text-body-md text-zinc-100">Max {request.max_participants ?? request.max_students ?? "-"}</p>
                      </div>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center gap-sm">
                  <div className="flex size-9 items-center justify-center rounded-md bg-[#27272A] text-zinc-400">
                    <MessageSquareText className="size-4" />
                  </div>
                  <div>
                    <p className="text-label-md uppercase text-zinc-400">Applications</p>
                    <p className="text-body-md text-zinc-100">{request.applications_count}</p>
                  </div>
                </div>
              </div>

              <div className="mt-lg rounded-md border border-[#27272A] bg-[#121214] p-md">
                <p className="text-label-md uppercase text-zinc-400">Student Message</p>
                <p className="mt-xs text-body-sm leading-relaxed text-zinc-100">{request.description}</p>
              </div>
            </section>

            <aside className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Apply</h2>
              <div className="mt-md space-y-sm">
                <textarea
                  className="min-h-28 w-full rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#8b5cf6]"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a short proposal for the student"
                  value={message}
                />
                <Input
                  className="h-10 border-[#27272A] bg-[#121214] text-zinc-100"
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Proposed price"
                  type="number"
                  value={price}
                />
                <button
                  className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={submitting || request.status !== "open"}
                  onClick={() => void handleApply()}
                  type="button"
                >
                  <Send className="size-4" />
                  {submitting ? "Sending..." : "Send Application"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </>
  );
}
