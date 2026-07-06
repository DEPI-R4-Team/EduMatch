import { EmptyState } from "@/components/ui/EmptyState";
import type { SessionDetailsData } from "@/types/sessionDetails";

type GroupParticipantsCardProps = {
  session: SessionDetailsData;
};

export function GroupParticipantsCard({ session }: GroupParticipantsCardProps) {
  if (session.sessionMode !== "Group") {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-md uppercase text-secondary">Group Participants</p>
          <h2 className="mt-xs text-headline-md text-zinc-100">Students Joined</h2>
        </div>
        <span className="w-fit rounded-full bg-secondary/15 px-sm py-xs text-label-md uppercase text-secondary ring-1 ring-secondary/25">
          Not connected
        </span>
      </div>

      <EmptyState
        className="mt-lg"
        message="Group participant APIs are not connected yet. Individual sessions continue to use real backend data."
        title="Group participants are not connected yet"
      />
    </section>
  );
}
