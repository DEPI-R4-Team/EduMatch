import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/input";
import { getAdminRequests } from "@/services/admin.service";
import type { AdminRequest } from "@/types/admin";

function date(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function money(value: string | null) {
  return value ? `${Number(value).toFixed(2)} EGP` : "Not set";
}

export function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      setLoading(true);
      try {
        setRequests(await getAdminRequests({ search: search || undefined, status: status || undefined }));
        setError("");
      } catch {
        setError("Could not load requests. Admin access is required.");
      } finally {
        setLoading(false);
      }
    }
    void loadRequests();
  }, [search, status]);

  return (
    <AdminPage title="Requests" description="Read-only request monitoring." error={error} loading={loading} empty={!requests.length}>
      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input className="h-10 border-[#27272A] bg-[#18181B] pl-10 text-zinc-100" placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="h-10 rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-100" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "open", "waiting_payment", "paid", "in_session", "completed", "cancelled"].map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
        </select>
      </div>
      <Table headers={["Title", "Student", "Status", "Budget", "Applications", "Created"]}>
        {requests.map((request) => <div className="grid gap-md border-b border-[#27272A] px-lg py-md last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_130px_120px_110px_120px]" key={request.id}>
          <span className="min-w-0"><span className="block truncate text-body-sm font-medium text-zinc-100">{request.title}</span><span className="block truncate text-body-sm text-zinc-400">{request.subject}</span></span>
          <span className="text-body-sm text-zinc-400">{request.student_name ?? "Student"}</span>
          <span className="text-body-sm capitalize text-zinc-400">{request.status.replaceAll("_", " ")}</span>
          <span className="text-body-sm text-zinc-400">{money(request.budget)}</span>
          <span className="text-body-sm text-zinc-400">{request.applications_count}</span>
          <span className="text-body-sm text-zinc-400">{date(request.created_at)}</span>
        </div>)}
      </Table>
    </AdminPage>
  );
}

function AdminPage({ title, description, error, loading, empty, children }: { title: string; description: string; error: string; loading: boolean; empty: boolean; children: ReactNode }) {
  return <><header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop"><h1 className="text-headline-lg text-zinc-100">{title}</h1><p className="mt-xs text-body-sm text-zinc-400">{description}</p></header><div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">{error ? <ErrorState message={error} /> : null}{loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : null}{children}{!loading && empty ? <EmptyState title={`No ${title.toLowerCase()} found`} message="Real platform data will appear here when available." /> : null}</div></>;
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]"><div className="hidden gap-md border-b border-[#27272A] bg-[#121214] px-lg py-sm md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_130px_120px_110px_120px]">{headers.map((h) => <span className="text-label-md uppercase text-zinc-400" key={h}>{h}</span>)}</div>{children}</section>;
}
