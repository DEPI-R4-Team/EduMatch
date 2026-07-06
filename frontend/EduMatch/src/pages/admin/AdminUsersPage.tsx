import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AxiosError } from "axios";
import { CheckCircle2, Search, ShieldOff, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { activateUser, getAdminUsers, rejectInstructor, suspendUser, verifyInstructor } from "@/services/admin.service";
import type { AdminUser } from "@/types/admin";

const roles = ["", "student", "instructor", "admin"];
const statuses = ["", "active", "suspended", "pending"];

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getAdminUsers({ search: search || undefined, role: role || undefined, status: status || undefined }));
      setError("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        setError("Admin access is required. Please log in with an admin account.");
      } else if (err instanceof AxiosError && err.response?.status === 401) {
        setError("Please log in again.");
      } else if (err instanceof AxiosError && !err.response) {
        setError("Cannot connect to server.");
      } else {
        setError("Could not load users.");
      }
    } finally {
      setLoading(false);
    }
  }, [role, search, status]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function runAction(key: string, successText: string, action: () => Promise<unknown>) {
    setActionId(key);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successText);
      await loadUsers();
    } catch (caughtError) {
      setError((caughtError as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Admin action failed.");
    } finally {
      setActionId(null);
    }
  }

  return <AdminTablePage title="Users" description="Manage users and instructor verification." error={error} message={message} loading={loading} empty={!users.length} filters={<Filters search={search} setSearch={setSearch} role={role} setRole={setRole} status={status} setStatus={setStatus} />}>
    <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_90px_100px_minmax(0,1fr)_260px] gap-md border-b border-[#27272A] bg-[#121214] px-lg py-sm md:grid">
      {["Name", "Email", "Role", "Status", "Profile", "Actions"].map((h) => <span className="text-label-md uppercase text-zinc-400" key={h}>{h}</span>)}
    </div>
    {users.map((user) => <div className="grid gap-md border-b border-[#27272A] px-lg py-md last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_90px_100px_minmax(0,1fr)_260px]" key={user.id}>
      <span className="text-body-sm font-medium text-zinc-100">{user.full_name}</span>
      <span className="truncate text-body-sm text-zinc-400">{user.email}</span>
      <span className="text-body-sm capitalize text-zinc-400">{user.role}</span>
      <span className="text-body-sm capitalize text-zinc-400">{user.status}</span>
      <span className="text-body-sm text-zinc-400">{user.instructor_profile?.verification_status ?? user.student_profile?.education_level ?? "Not added yet"}</span>
      <div className="flex flex-wrap gap-xs">
        {user.role === "instructor" && user.instructor_profile?.verification_status !== "verified" ? (
          <button className="inline-flex h-8 items-center gap-xs rounded-md bg-emerald-400/15 px-sm text-label-md text-emerald-300 ring-1 ring-emerald-400/25 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Are you sure you want to verify this instructor?")) void runAction(`verify-${user.id}`, "Instructor verified.", () => verifyInstructor(user.id)); }} type="button">
            <CheckCircle2 className="size-3.5" /> Verify
          </button>
        ) : null}
        {user.role === "instructor" && user.instructor_profile?.verification_status !== "rejected" ? (
          <button className="inline-flex h-8 items-center gap-xs rounded-md bg-error/10 px-sm text-label-md text-error ring-1 ring-error/25 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Are you sure you want to reject this instructor?")) void runAction(`reject-${user.id}`, "Instructor rejected.", () => rejectInstructor(user.id)); }} type="button">
            <XCircle className="size-3.5" /> Reject
          </button>
        ) : null}
        {user.id !== currentUser?.id && user.status !== "suspended" ? (
          <button className="inline-flex h-8 items-center gap-xs rounded-md border border-[#27272A] px-sm text-label-md text-zinc-400 transition hover:bg-[#27272A] disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Are you sure you want to suspend this user?")) void runAction(`suspend-${user.id}`, "User suspended.", () => suspendUser(user.id)); }} type="button">
            <ShieldOff className="size-3.5" /> Suspend
          </button>
        ) : null}
        {user.status === "suspended" ? (
          <button className="inline-flex h-8 items-center gap-xs rounded-md border border-secondary/40 px-sm text-label-md text-secondary transition hover:bg-secondary/10 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Activate this user account?")) void runAction(`activate-${user.id}`, "User activated.", () => activateUser(user.id)); }} type="button">
            Activate
          </button>
        ) : null}
      </div>
    </div>)}
  </AdminTablePage>;
}

function Filters({ search, setSearch, role, setRole, status, setStatus }: { search: string; setSearch: (v: string) => void; role: string; setRole: (v: string) => void; status: string; setStatus: (v: string) => void }) {
  return <div className="flex flex-col gap-sm sm:flex-row">
    <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input className="h-10 border-[#27272A] bg-[#18181B] pl-10 text-zinc-100" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <select className="h-10 rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-100" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((item) => <option key={item} value={item}>{item || "All roles"}</option>)}</select>
    <select className="h-10 rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-100" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}</select>
  </div>;
}

function AdminTablePage({ title, description, error, message, loading, empty, filters, children }: { title: string; description: string; error: string; message: string; loading: boolean; empty: boolean; filters?: ReactNode; children: ReactNode }) {
  return <><header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop"><h1 className="text-headline-lg text-zinc-100">{title}</h1><p className="mt-xs text-body-sm text-zinc-400">{description}</p></header><div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">{filters}{message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}{error ? <ErrorState message={error} /> : null}{loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : null}{!loading && empty ? <EmptyState title={`No ${title.toLowerCase()} found`} message="Real platform data will appear here when available." /> : null}{!empty ? <section className="overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]">{children}</section> : null}</div></>;
}
