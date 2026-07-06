import { Check, Clock3, ShieldCheck } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import type { SessionDetailsData } from "@/types/sessionDetails";
import { cn } from "@/lib/utils";

type SessionStatusTimelineCardProps = {
  session: SessionDetailsData;
};

export function SessionStatusTimelineCard({ session }: SessionStatusTimelineCardProps) {
  const timeline = [
    { label: "Instructor Accepted", complete: true },
    { label: "Student Paid", complete: true },
    { label: "Payment Held", complete: true },
    { label: "Session Scheduled", complete: true },
    { label: "Completion Pending", complete: session.status === "completed" },
    { label: "Payment Release Pending", complete: session.paymentStatus === "released" },
  ];

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Session Status</h2>

      <div className="mt-md flex flex-wrap gap-sm">
        <SessionStatusBadge status={session.status} />
        <PaymentStatusBadge status={session.paymentStatus} />
        <span className="inline-flex w-fit items-center rounded-full bg-primary/15 px-sm py-xs text-label-md uppercase text-primary ring-1 ring-primary/25">
          Protected
        </span>
      </div>

      <ol className="mt-lg space-y-sm">
        {timeline.map((step) => (
          <li className="flex items-center gap-sm" key={step.label}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
                step.complete
                  ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25"
                  : "bg-[#27272A] text-zinc-400 ring-outline-variant",
              )}
            >
              {step.complete ? <Check className="size-4" /> : <Clock3 className="size-4" />}
            </span>
            <span className={cn("text-body-sm", step.complete ? "text-zinc-100" : "text-zinc-400")}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-lg flex items-start gap-sm rounded-md border border-primary/20 bg-primary/10 p-md text-body-sm text-zinc-400">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Escrow status: {session.escrowStatus}
      </p>
    </section>
  );
}
