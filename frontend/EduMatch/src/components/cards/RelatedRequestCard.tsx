import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { SessionDetailsData } from "@/types/sessionDetails";

type RelatedRequestCardProps = {
  session: SessionDetailsData;
};

const skills = ["React", "JavaScript", "Tailwind CSS"];

export function RelatedRequestCard({ session }: RelatedRequestCardProps) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-md uppercase text-secondary">Related Request</p>
          <h2 className="mt-xs text-headline-md text-zinc-100">{session.requestTitle}</h2>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
          to="/student/requests/1"
        >
          View Request
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <p className="mt-md text-body-sm text-zinc-400">{session.description}</p>

      <div className="mt-lg grid gap-sm sm:grid-cols-2">
        <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
          <p className="text-label-md uppercase text-secondary">Learning Level</p>
          <p className="mt-xs text-body-sm font-medium text-zinc-100">Beginner</p>
        </div>
        <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
          <p className="text-label-md uppercase text-secondary">Preferred Language</p>
          <p className="mt-xs text-body-sm font-medium text-zinc-100">English</p>
        </div>
      </div>

      <div className="mt-lg">
        <p className="flex items-center gap-sm text-label-md uppercase text-secondary">
          <BookOpen className="size-4" />
          Required Skills
        </p>
        <div className="mt-sm flex flex-wrap gap-sm">
          {skills.map((skill) => (
            <span className="rounded-full bg-secondary/15 px-sm py-xs text-label-md uppercase text-secondary ring-1 ring-secondary/25" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
