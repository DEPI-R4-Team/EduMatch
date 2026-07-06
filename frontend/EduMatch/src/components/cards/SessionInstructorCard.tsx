import { Link } from "react-router-dom";
import { ArrowUpRight, Star } from "lucide-react";
import type { SessionDetailsData } from "@/types/sessionDetails";

type SessionInstructorCardProps = {
  session: SessionDetailsData;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export function SessionInstructorCard({ session }: SessionInstructorCardProps) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Instructor</h2>

      <div className="mt-lg flex items-start gap-md">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-on-primary">
          {getInitials(session.instructorName)}
        </div>
        <div className="min-w-0">
          <p className="text-body-md font-medium text-zinc-100">{session.instructorName}</p>
          <p className="text-body-sm text-zinc-400">{session.instructorSpecialization}</p>
          <p className="mt-sm flex items-center gap-xs text-body-sm text-zinc-400">
            <Star className="size-4 fill-tertiary text-tertiary" />
            <span className="font-medium text-zinc-100">{session.instructorRating}</span>
            <span>({session.instructorReviews} reviews)</span>
          </p>
        </div>
      </div>

      <Link
        className="mt-lg inline-flex h-10 w-full items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
        to="/student/instructors/1"
      >
        View Profile
        <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
