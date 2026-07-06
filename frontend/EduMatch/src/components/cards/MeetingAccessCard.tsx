import { useState } from "react";
import { Video } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import type { SessionDetailsData } from "@/types/sessionDetails";

type MeetingAccessCardProps = {
  session: SessionDetailsData;
};

export function MeetingAccessCard({ session }: MeetingAccessCardProps) {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-md uppercase text-secondary">Meeting Access</p>
          <h2 className="mt-xs text-headline-md text-zinc-100">{session.platform}</h2>
        </div>
        <PaymentStatusBadge status={session.paymentStatus} />
      </div>

      <div className="mt-lg grid gap-sm sm:grid-cols-2">
        <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
          <p className="text-label-md uppercase text-secondary">Platform</p>
          <p className="mt-xs text-body-sm font-medium text-zinc-100">{session.platform}</p>
        </div>
        <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
          <p className="text-label-md uppercase text-secondary">Meeting Status</p>
          <p className="mt-xs text-body-sm font-medium text-zinc-100">Available after payment</p>
        </div>
      </div>

      <p className="mt-md text-body-sm text-zinc-400">You can join when the session time starts.</p>

      <button
        className="mt-lg inline-flex h-10 w-full items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 sm:w-auto"
        onClick={() => setShowMessage(true)}
        type="button"
      >
        <Video className="size-4" />
        Join Meeting
      </button>

      {showMessage ? (
        <p className="mt-sm rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
          Meeting link is a placeholder in this academic version.
        </p>
      ) : null}
    </section>
  );
}
