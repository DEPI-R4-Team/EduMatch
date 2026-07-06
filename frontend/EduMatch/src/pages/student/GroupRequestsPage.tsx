import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/input";
import { getGroupRequests, getMyGroupRequests } from "@/services/groupRequests.service";
import type { GroupRequest } from "@/types/groupRequest";

function money(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

export function GroupRequestsPage() {
  const [groups, setGroups] = useState<GroupRequest[]>([]);
  const [myGroups, setMyGroups] = useState<GroupRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGroups() {
      try {
        const [available, mine] = await Promise.all([getGroupRequests(), getMyGroupRequests()]);
        setGroups(available);
        setMyGroups(mine);
        setError("");
      } catch {
        setError("Could not load group requests. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    void loadGroups();
  }, []);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => !query || [group.title, group.subject, group.owner_name].join(" ").toLowerCase().includes(query));
  }, [groups, search]);

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">Group Requests</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Join classmates, split the session cost, and learn with a shared instructor.
            </p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary hover:bg-primary/90" to="/student/group-requests/create">
            Create Group Request
          </Link>
        </div>
      </header>

      <main className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        <section className="grid gap-md md:grid-cols-3">
          <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <p className="text-label-md uppercase text-secondary">My groups</p>
            <p className="mt-xs text-headline-lg text-zinc-100">{myGroups.length}</p>
          </div>
          <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <p className="text-label-md uppercase text-secondary">Available</p>
            <p className="mt-xs text-headline-lg text-zinc-100">{groups.length}</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input className="h-full min-h-16 border-[#27272A] bg-[#18181B] pl-10 text-zinc-100" onChange={(event) => setSearch(event.target.value)} placeholder="Search group requests..." value={search} />
          </div>
        </section>

        {loading ? (
          <LoadingState message="Loading group requests..." />
        ) : visibleGroups.length === 0 ? (
          <EmptyState title="No group requests available yet." message="Create the first group request or check again later." />
        ) : (
          <section className="grid gap-md lg:grid-cols-2">
            {visibleGroups.map((group) => (
              <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={group.id}>
                <div className="flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <h2 className="truncate text-headline-md text-zinc-100">{group.title}</h2>
                    <p className="mt-xs text-body-sm text-zinc-400">{group.subject}</p>
                  </div>
                  <span className="rounded-full bg-primary/15 px-sm py-xs text-label-md uppercase text-primary">{group.status}</span>
                </div>
                <p className="mt-md line-clamp-2 text-body-sm text-zinc-400">{group.description}</p>
                <div className="mt-lg grid gap-sm text-body-sm sm:grid-cols-2">
                  <span className="text-zinc-400">Owner: <b className="text-zinc-100">{group.owner_name ?? "Student"}</b></span>
                  <span className="text-zinc-400">Participants: <b className="text-zinc-100">{group.active_participants_count}/{group.max_participants ?? "-"}</b></span>
                  <span className="text-zinc-400">Current price: <b className="text-zinc-100">{money(group.current_price_per_student)}</b></span>
                  <span className="text-zinc-400">If you join: <b className="text-zinc-100">{money(group.price_if_you_join)}</b></span>
                </div>
                <Link className="mt-lg inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm text-secondary transition hover:bg-secondary/10" to={`/student/group-requests/${group.id}`}>
                  <Users className="size-4" />
                  View Details
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
