import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RequestStatusBadge } from "@/components/ui/RequestStatusBadge";
import { cn } from "@/lib/utils";
import { applyToRequest } from "@/services/applications.service";
import { getRequests } from "@/services/requests.service";
import type { LearningRequest } from "@/types/request";

type FilterValue = "all" | "open" | "waiting_payment" | "cancelled";
const ITEMS_PER_PAGE = 6;

const filterOptions: Array<{ label: string; value: FilterValue }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Waiting Payment", value: "waiting_payment" },
  { label: "Cancelled", value: "cancelled" },
];

function initials(name: string | null) {
  return (name ?? "ST")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function InstructorRequestsPage() {
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applyState, setApplyState] = useState<Record<number, { message: string; price: string }>>({});

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await getRequests(activeFilter === "all" ? undefined : { status: activeFilter });
      setRequests(data);
      setError("");
    } catch {
      setError("Could not load open requests. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) =>
      !query || [request.title, request.subject, request.student_name].join(" ").toLowerCase().includes(query),
    );
  }, [requests, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  async function handleApply(request: LearningRequest) {
    const state = applyState[request.id] ?? { message: "", price: "" };
    if (!state.message.trim() || !state.price.trim()) {
      setMessage("Add an application message and proposed price first.");
      return;
    }

    try {
      await applyToRequest({
        request_id: request.id,
        message: state.message.trim(),
        proposed_price: Number.parseFloat(state.price),
      });
      setMessage(`Application sent for "${request.title}".`);
      setApplyState((current) => ({ ...current, [request.id]: { message: "", price: "" } }));
    } catch {
      setMessage("Could not apply. You may have already applied to this request.");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">Browse Requests</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Review open student learning requests and send applications.
            </p>
          </div>

          <div className="flex w-full flex-col gap-sm sm:flex-row xl:w-auto">
            <div className="relative min-w-0 flex-1 xl:w-[280px]">
              <Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-10 border-[#27272A] bg-[#18181B] pl-10 text-zinc-100"
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search requests..."
                value={searchTerm}
              />
            </div>
            <div className="relative">
              <button
                className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
                onClick={() => setShowFilterMenu((prev) => !prev)}
                type="button"
              >
                <Filter className="size-4 text-secondary" />
                Filter
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-12 z-20 w-44 rounded-md border border-[#27272A] bg-[#18181B] p-xs shadow-lg">
                  {filterOptions.map((option) => (
                    <button
                      className={cn(
                        "block w-full rounded-md px-sm py-xs text-left text-body-sm transition",
                        activeFilter === option.value
                          ? "bg-primary/10 text-primary"
                          : "text-zinc-400 hover:bg-[#27272A] hover:text-zinc-100",
                      )}
                      key={option.value}
                      onClick={() => {
                        setActiveFilter(option.value);
                        setCurrentPage(1);
                        setShowFilterMenu(false);
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-md px-margin-mobile py-lg md:px-margin-desktop">
        {message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}
        {error ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p> : null}

        <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_130px_minmax(280px,1fr)] gap-md border-b border-[#27272A] bg-[#121214] px-lg py-sm md:grid">
            <span className="text-label-md uppercase text-zinc-400">Request</span>
            <span className="text-label-md uppercase text-zinc-400">Student</span>
            <span className="text-label-md uppercase text-zinc-400">Status</span>
            <span className="text-label-md uppercase text-zinc-400">Budget / Group</span>
            <span className="text-label-md uppercase text-zinc-400 text-right">Apply</span>
          </div>

          {loading ? (
            <div className="p-xl text-center text-body-sm text-zinc-400">Loading requests...</div>
          ) : paginatedRequests.length > 0 ? (
            paginatedRequests.map((request, index) => {
              const state = applyState[request.id] ?? { message: "", price: "" };
              return (
                <div
                  className={cn(
                    "grid gap-y-sm gap-x-md px-lg py-md md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_130px_minmax(280px,1fr)] md:items-center",
                    index !== paginatedRequests.length - 1 && "border-b border-[#27272A]",
                  )}
                  key={request.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-xs">
                      <p className="truncate text-body-md font-medium text-zinc-100">{request.title}</p>
                      {request.request_type === "group" ? (
                        <span className="rounded-full bg-secondary/15 px-xs py-0.5 text-[10px] font-semibold uppercase text-secondary">Group</span>
                      ) : null}
                    </div>
                    <p className="text-body-sm text-zinc-400">{request.subject}</p>
                  </div>

                  <div className="flex items-center gap-sm">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-label-md font-medium text-primary">
                      {initials(request.student_name)}
                    </span>
                    <span className="truncate text-body-sm text-zinc-100">{request.student_name ?? "Student"}</span>
                  </div>

                  <RequestStatusBadge status={request.status} />
                  <div className="text-body-sm text-zinc-400">
                    <p>{request.request_type === "group" ? request.current_price_per_student ?? request.final_price_per_student ?? request.base_price ?? "Not set" : request.base_price ?? "Not set"} EGP</p>
                    {request.request_type === "group" ? (
                      <p className="text-label-md">{request.max_participants ?? request.max_students ?? "-"} max participants</p>
                    ) : null}
                  </div>

                  <div className="grid gap-xs">
                    <Input
                      className="h-9 border-[#27272A] bg-[#121214] text-zinc-100"
                      onChange={(e) =>
                        setApplyState((current) => ({
                          ...current,
                          [request.id]: { ...state, message: e.target.value },
                        }))
                      }
                      placeholder="Short proposal message"
                      value={state.message}
                    />
                    <div className="flex gap-xs">
                      <Input
                        className="h-9 border-[#27272A] bg-[#121214] text-zinc-100"
                        onChange={(e) =>
                          setApplyState((current) => ({
                            ...current,
                            [request.id]: { ...state, price: e.target.value },
                          }))
                        }
                        placeholder="Price"
                        value={state.price}
                      />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
                        onClick={() => void handleApply(request)}
                        type="button"
                      >
                        Apply
                      </button>
                    </div>
                    <Link className="text-right text-body-sm text-secondary hover:text-secondary-fixed" to={`/instructor/requests/${request.id}`}>
                      Details
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-xl text-center">
              <h3 className="text-headline-md text-zinc-100">No requests found</h3>
              <p className="mt-sm text-body-sm text-zinc-400">No open student requests match your filter.</p>
            </div>
          )}

          {filteredRequests.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-sm border-t border-[#27272A] px-lg py-md sm:flex-row">
              <p className="text-body-sm text-zinc-400">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRequests.length)} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} of {filteredRequests.length} requests
              </p>
              <div className="flex items-center gap-xs">
                <button
                  className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-[#27272A] disabled:opacity-40"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  type="button"
                >
                  &lsaquo;
                </button>
                <span className="px-sm text-body-sm text-zinc-400">{currentPage} / {totalPages}</span>
                <button
                  className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-[#27272A] disabled:opacity-40"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  type="button"
                >
                  &rsaquo;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
