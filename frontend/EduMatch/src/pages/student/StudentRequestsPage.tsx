import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BadgeDollarSign,
  BookOpen,
  FileText,
  Plus,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyRequests } from "@/services/requests.service";
import type { LearningRequest } from "@/types/request";

type FilterValue = "all" | "open" | "accepted" | "waiting_payment" | "in_session" | "completed" | "cancelled";
type RequestStatus =
  | "open"
  | "instant_open"
  | "pending_instant"
  | "instant_accepted"
  | "accepted"
  | "waiting_payment"
  | "paid"
  | "in_session"
  | "completed"
  | "cancelled"
  | "expired";

type StudentRequest = {
  id: number;
  title: string;
  description: string;
  requestType: "Instant" | "Normal";
  sessionMode: "Individual" | "Group";
  status: RequestStatus;
  applications: number;
  paymentStatus: string;
  priceLabel: string;
  studentsJoined?: number;
};

const filters: Array<{ label: string; value: FilterValue }> = [
  { label: "All Requests", value: "all" },
  { label: "Open", value: "open" },
  { label: "Accepted", value: "accepted" },
  { label: "Waiting Payment", value: "waiting_payment" },
  { label: "In Session", value: "in_session" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const TAB_STATUS_MAP: Record<Exclude<FilterValue, "all">, RequestStatus[]> = {
  open: ["open", "instant_open", "pending_instant"],
  accepted: ["accepted", "instant_accepted", "paid"],
  waiting_payment: ["waiting_payment"],
  in_session: ["in_session"],
  completed: ["completed"],
  cancelled: ["cancelled", "expired"],
};

const statusLabels: Record<RequestStatus, string> = {
  open: "Open",
  instant_open: "Instant Open",
  pending_instant: "Pending Instant",
  instant_accepted: "Instant Accepted",
  accepted: "Accepted",
  waiting_payment: "Waiting Payment",
  paid: "Paid",
  in_session: "In Session",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const statusClasses: Record<RequestStatus, string> = {
  open: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  instant_open: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  pending_instant: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  instant_accepted: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  accepted: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  waiting_payment: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  in_session: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
  expired: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-semibold uppercase",
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function RequestFilters({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}) {
  return (
    <div className="flex max-w-full gap-xs overflow-x-auto rounded-lg border border-[#27272A] bg-[#18181B] p-xs">
      {filters.map((filter) => (
        <button
          aria-pressed={activeFilter === filter.value}
          className={cn(
            "h-10 shrink-0 rounded-md px-md text-body-sm font-medium transition",
            activeFilter === filter.value
              ? "bg-primary text-on-primary shadow-[0_0_24px_rgba(192,193,255,0.16)]"
              : "text-zinc-400 hover:bg-[#27272A] hover:text-zinc-100",
          )}
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function RequestCard({ request }: { request: StudentRequest }) {
  const metadata = [
    { icon: BookOpen, label: request.requestType },
    { icon: Users, label: request.sessionMode },
    { icon: FileText, label: `${request.applications} applications` },
    ...(request.studentsJoined
      ? [{ icon: Users, label: `${request.studentsJoined} students joined` }]
      : []),
    { icon: BadgeDollarSign, label: request.paymentStatus },
    { icon: WalletCards, label: request.priceLabel },
  ];

  return (
    <article className="flex min-h-[300px] flex-col rounded-lg border border-[#27272A] bg-[#18181B] p-lg transition hover:border-primary/50 hover:bg-[#27272A]">
      <div className="mb-md flex items-start justify-between gap-md">
        <h2 className="text-headline-md text-zinc-100">{request.title}</h2>
        <RequestStatusBadge status={request.status} />
      </div>

      <p className="line-clamp-4 flex-1 text-body-sm text-zinc-400">
        {request.description}
      </p>

      <div className="mt-lg grid gap-sm border-t border-[#27272A] pt-md sm:grid-cols-2">
        {metadata.map((item) => {
          const Icon = item.icon;

          return (
            <div className="flex min-w-0 items-center gap-xs text-body-sm text-zinc-400" key={item.label}>
              <Icon className="size-4 shrink-0 text-secondary" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>

      <Link
        className="mt-lg inline-flex h-9 w-fit items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
        to={`/student/requests/${request.id}`}
      >
        View Details
      </Link>
    </article>
  );
}

function CreateRequestCard() {
  return (
    <Link
      className="group flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-[#27272A] bg-[#18181B]/70 p-lg text-center transition hover:border-primary hover:bg-[#27272A] hover:shadow-[0_0_36px_rgba(192,193,255,0.14)]"
      to="/student/requests/create"
    >
      <span className="mb-md flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 transition group-hover:bg-primary group-hover:text-on-primary">
        <Plus className="size-6" />
      </span>
      <h2 className="text-headline-md text-zinc-100">Create New Request</h2>
      <p className="mt-sm max-w-sm text-body-sm text-zinc-400">
        Start a new learning request and find a suitable instructor.
      </p>
      <span className="mt-lg inline-flex h-9 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition group-hover:bg-secondary/10">
        Create Request
      </span>
    </Link>
  );
}

export function StudentRequestsPage() {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getMyRequests();
        if (!cancelled && requestIdRef.current === currentRequestId) {
          setRequests(data);
          setError("");
          hasLoadedRef.current = true;
        }
      } catch {
        if (!cancelled && requestIdRef.current === currentRequestId) {
          setError("Could not load your requests. Make sure the backend is running.");
        }
      } finally {
        if (!cancelled && requestIdRef.current === currentRequestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  const mappedRequests = useMemo(() => requests.map(mapRequest), [requests]);

  const visibleRequests = useMemo(() => {
    if (activeFilter === "all") {
      return mappedRequests;
    }

    const statuses = TAB_STATUS_MAP[activeFilter];
    return mappedRequests.filter((request) => statuses.includes(request.status));
  }, [activeFilter, mappedRequests]);

  return (
    <>
          <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-headline-lg text-zinc-100">My Requests</h1>
                <p className="mt-xs text-body-sm text-zinc-400">
                  Manage and track your learning requests.
                </p>
              </div>

              <div className="flex items-center gap-sm">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-secondary px-md text-body-sm font-medium text-on-secondary transition hover:bg-secondary/90"
                  to="/student/requests/create"
                >
                  <Plus className="size-4" />
                  New Request
                </Link>
              </div>
            </div>
          </header>

          <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
            <RequestFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            {refreshing ? (
              <p className="text-body-sm text-zinc-400" role="status">
                Refreshing requests...
              </p>
            ) : null}

            <section className="grid gap-lg md:grid-cols-2">
              {loading ? (
                <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg text-body-sm text-zinc-400">
                  Loading requests...
                </div>
              ) : error ? (
                <div className="rounded-lg border border-error/25 bg-error/10 p-lg text-body-sm text-error">
                  {error}
                </div>
              ) : visibleRequests.length > 0 ? (
                visibleRequests.map((request) => <RequestCard key={request.id} request={request} />)
              ) : (
                <div className="rounded-lg border border-dashed border-[#27272A] bg-[#18181B]/70 p-lg text-center">
                  <h2 className="text-headline-md text-zinc-100">No requests yet</h2>
                  <p className="mt-sm text-body-sm text-zinc-400">
                    Create your first learning request to start receiving applications.
                  </p>
                </div>
              )}
              <CreateRequestCard />
            </section>
          </div>
    </>
  );
}

function mapRequest(request: LearningRequest): StudentRequest {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    requestType: request.request_type === "instant" ? "Instant" : "Normal",
    sessionMode: request.session_mode === "group" ? "Group" : "Individual",
    status: request.status as RequestStatus,
    applications: request.applications_count,
    paymentStatus: request.status === "waiting_payment" ? "Waiting Payment" : "Not Required Yet",
    priceLabel: request.base_price ? `${request.base_price} EGP` : "Not set",
    studentsJoined: request.max_students ?? undefined,
  };
}
