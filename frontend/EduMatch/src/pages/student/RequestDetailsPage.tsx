import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Languages,
  SlidersHorizontal,
  Users,
  Video,
  WalletCards,
  Pencil,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import {
  InstructorApplicationCard,
  type InstructorApplication,
} from "@/components/cards/InstructorApplicationCard";
import { PaymentRequiredCard } from "@/components/cards/PaymentRequiredCard";
import { RequestSummaryCard } from "@/components/cards/RequestSummaryCard";
import { RequestStatusBadge, type RequestStatus } from "@/components/ui/RequestStatusBadge";
import { acceptApplication, getApplicationsForRequest, rejectApplication } from "@/services/applications.service";
import { getRequestById } from "@/services/requests.service";
import { getMySessions } from "@/services/sessions.service";
import type { Application } from "@/types/application";
import type { LearningRequestDetail } from "@/types/request";

function formatCurrency(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function mapApplication(application: Application): InstructorApplication {
  return {
    id: String(application.id),
    instructorId: String(application.instructor_id),
    instructorName: application.instructor_name ?? "Instructor",
    specialization: application.instructor_specialization ?? "Instructor",
    rating: application.instructor_rating ?? "0.00",
    reviews: "0",
    experience: "Profile",
    proposedPrice: formatCurrency(application.proposed_price),
    message: application.message,
    status: application.status,
  };
}

export function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const [request, setRequest] = useState<LearningRequestDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);

  async function loadDetails() {
    if (!Number.isFinite(requestId)) {
      setError("Invalid request id.");
      setLoading(false);
      return;
    }

    try {
      const [requestData, applicationData] = await Promise.all([
        getRequestById(requestId),
        getApplicationsForRequest(requestId),
      ]);
      setRequest(requestData);
      setApplications(applicationData);
      if (requestData.status === "waiting_payment") {
        const sessions = await getMySessions();
        const matchingSession = sessions.find((session) => session.request_id === requestData.id);
        setSessionId(matchingSession?.id ?? null);
      }
    } catch {
      setError("Could not load request details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const acceptedApplication = useMemo(
    () => applications.find((application) => application.status === "accepted"),
    [applications],
  );

  async function handleAccept(applicationId: string) {
    try {
      const result = await acceptApplication(Number(applicationId));
      setSessionId(result.session?.id ?? null);
      setMessage("Instructor accepted. Please complete payment to continue.");
      await loadDetails();
    } catch {
      setMessage("Could not accept this application.");
    }
  }

  async function handleReject(applicationId: string) {
    try {
      await rejectApplication(Number(applicationId));
      setMessage("Application rejected.");
      await loadDetails();
    } catch {
      setMessage("Could not reject this application.");
    }
  }

  if (loading) {
    return <div className="p-lg text-body-sm text-zinc-400">Loading request details...</div>;
  }

  if (error || !request) {
    return <div className="p-lg text-body-sm text-error">{error || "Request not found."}</div>;
  }

  const metadataItems = [
    { icon: BookOpen, label: "Request Type", value: request.request_type },
    { icon: Users, label: "Session Mode", value: request.session_mode },
    { icon: Video, label: "Session Type", value: request.session_type },
    { icon: GraduationCap, label: "Learning Level", value: request.level ?? "Not set" },
    { icon: Languages, label: "Preferred Language", value: "Not set" },
    { icon: WalletCards, label: "Budget", value: formatCurrency(request.base_price) },
  ];

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-label-md uppercase text-secondary">Request #{request.id}</p>
            <h1 className="mt-xs text-headline-lg text-zinc-100">Request Details</h1>
          </div>

          <BackButton fallback="/student/requests" />
          <button
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] px-md text-body-sm font-medium text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
            onClick={() => setMessage("Edit request will be available later.")}
            type="button"
          >
            <Pencil className="size-4" />
            Edit Request
          </button>
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {message ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {message}
          </p>
        ) : null}

        <section className="grid gap-lg rounded-lg border border-[#27272A] bg-[#18181B] p-lg xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-md flex flex-wrap items-center gap-sm">
              <RequestStatusBadge status={request.status as RequestStatus} />
              <span className="inline-flex items-center gap-xs text-body-sm text-zinc-400">
                <CalendarDays className="size-4 text-secondary" />
                Posted {formatDate(request.created_at)}
              </span>
            </div>

            <h2 className="text-headline-lg-mobile text-zinc-100 md:text-headline-lg">{request.title}</h2>
            <p className="mt-md max-w-4xl text-body-md text-zinc-400">{request.description}</p>

            <div className="mt-lg grid gap-sm md:grid-cols-2 xl:grid-cols-3">
              {metadataItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={item.label}>
                    <dt className="flex items-center gap-sm text-body-sm text-zinc-400">
                      <Icon className="size-4 text-secondary" />
                      {item.label}
                    </dt>
                    <dd className="mt-xs text-body-sm font-medium text-zinc-100">{item.value}</dd>
                  </div>
                );
              })}
            </div>
          </div>

          <RequestSummaryCard
            applicationsCount={applications.length}
            budget={formatCurrency(request.base_price)}
            paymentStatus={request.status === "waiting_payment" ? "Pending" : "Not Required Yet"}
            requestStatus={request.status as RequestStatus}
          />
        </section>

        {acceptedApplication && request.status === "waiting_payment" ? (
          <PaymentRequiredCard
            instructorName={acceptedApplication.instructor_name ?? "Instructor"}
            paymentPath={sessionId ? `/student/payments/session/${sessionId}` : "/student/payments"}
            platformFee={`${(Number.parseFloat(acceptedApplication.proposed_price) * 0.1).toFixed(2)} EGP`}
            sessionPrice={formatCurrency(acceptedApplication.proposed_price)}
            totalAmount={`${(Number.parseFloat(acceptedApplication.proposed_price) * 1.1).toFixed(2)} EGP`}
          />
        ) : null}

        <section className="space-y-md">
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-headline-md text-zinc-100">Instructor Applications</h2>
              <p className="mt-xs text-body-sm text-zinc-400">
                Compare instructor proposals and choose the best fit for this request.
              </p>
            </div>

            <button
              className="inline-flex h-10 w-fit items-center gap-sm rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
              onClick={() => setMessage("Sorting will be available later.")}
              type="button"
            >
              <SlidersHorizontal className="size-4 text-secondary" />
              Sort by: Rating
            </button>
          </div>

          <div className="space-y-md">
            {applications.length > 0 ? (
              applications.map((application) => (
                <InstructorApplicationCard
                  application={mapApplication(application)}
                  key={application.id}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-lg text-center text-body-sm text-zinc-400">
                No instructor applications yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
