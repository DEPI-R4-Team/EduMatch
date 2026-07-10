import { BriefcaseBusiness, Star, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import {
  RequestStatusBadge,
  type ApplicationStatus,
} from "@/components/ui/RequestStatusBadge";

export type InstructorApplication = {
  id: string;
  instructorId: string;
  instructorName: string;
  specialization: string;
  rating: string;
  reviews: string;
  experience: string;
  proposedPrice: string;
  message: string;
  status: ApplicationStatus;
};

type InstructorApplicationCardProps = {
  application: InstructorApplication;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  showDecisionActions?: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export function InstructorApplicationCard({
  application,
  onAccept,
  onReject,
  showDecisionActions = true,
}: InstructorApplicationCardProps) {
  const isAccepted = application.status === "accepted";
  const isRejected = application.status === "rejected";

  return (
    <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg transition hover:border-primary/50 hover:bg-[#27272A]">
      <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 text-body-md font-semibold text-on-primary">
            {getInitials(application.instructorName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-sm">
              <h3 className="text-headline-md text-zinc-100">{application.instructorName}</h3>
              <RequestStatusBadge status={application.status} />
            </div>
            <p className="mt-xs text-body-sm text-zinc-400">{application.specialization}</p>
            <div className="mt-sm flex flex-wrap gap-sm text-body-sm text-zinc-400">
              <span className="flex items-center gap-xs rounded-full bg-tertiary/15 px-sm py-xs text-tertiary">
                <Star className="size-4 fill-current" />
                {application.rating}
              </span>
              <span className="rounded-full bg-[#121214] px-sm py-xs ring-1 ring-outline-variant">
                {application.reviews} reviews
              </span>
              <span className="flex items-center gap-xs rounded-full bg-[#121214] px-sm py-xs ring-1 ring-outline-variant">
                <BriefcaseBusiness className="size-4 text-secondary" />
                {application.experience}
              </span>
              <span className="flex items-center gap-xs rounded-full bg-[#121214] px-sm py-xs ring-1 ring-outline-variant">
                <WalletCards className="size-4 text-secondary" />
                {application.proposedPrice}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-sm lg:justify-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
            to={`/student/instructors/${application.instructorId}`}
          >
            View Profile
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm font-medium text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
            to={`/student/chat?applicationId=${application.id}`}
          >
            Message Applicant
          </Link>
          {showDecisionActions ? (
            <>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAccepted || isRejected}
                onClick={() => onAccept(application.id)}
                type="button"
              >
                Accept
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-error/40 px-md text-body-sm font-medium text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAccepted || isRejected}
                onClick={() => onReject(application.id)}
                type="button"
              >
                Reject
              </button>
            </>
          ) : null}
        </div>
      </div>

      <p className="mt-md rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm text-zinc-400">
        {application.message}
      </p>
    </article>
  );
}
